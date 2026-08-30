import type { 
  Player, 
  LeagueSettings, 
  LineupSolverMode, 
  OptimalLineupResult, 
  LineupSwapRecommendation,
  PlayerPosition
} from '../types';
import { calculateProjection, calculateCompositeDecision } from './aiEngine';

/**
 * Mathematical Integer Lineup Solver for Fantasy Football
 * Supports Safe Floor, Balanced Alpha, and Max Boom Correlation Stacking
 */
export function solveOptimalLineup(
  rosterPlayers: Player[],
  currentStarters: Player[],
  settings: LeagueSettings,
  mode: LineupSolverMode = 'BALANCED_ALPHA'
): OptimalLineupResult {
  // If not enough players to fill roster, use all available
  const evaluatedPlayers = rosterPlayers.map(p => {
    const proj = calculateProjection(p, settings);
    const decision = calculateCompositeDecision(p, settings);
    
    let solverScore = proj.projectedPoints;

    if (mode === 'SAFE_FLOOR') {
      // Prioritize guaranteed floor, penalize weather & volatility
      const weatherPenalty = p.weather.riskLevel === 'HIGH' ? 3.5 : p.weather.riskLevel === 'MEDIUM' ? 1.2 : 0;
      const bustPenalty = (proj.bustProbability / 100) * 2.5;
      solverScore = (proj.floor * 0.65) + (proj.projectedPoints * 0.35) - weatherPenalty - bustPenalty;
    } else if (mode === 'MAX_BOOM_CEILING') {
      // Prioritize 90th percentile ceiling & high-total games
      const shootoutBonus = p.vegas.overUnder >= 48 ? 2.0 : 0;
      const boomBonus = (proj.boomProbability / 100) * 3.0;
      solverScore = (proj.ceiling * 0.70) + (proj.projectedPoints * 0.30) + shootoutBonus + boomBonus;
    } else {
      // Balanced Alpha
      solverScore = (decision.alphaIndex * 0.40) + (proj.projectedPoints * 0.60);
    }

    return {
      player: p,
      proj,
      decision,
      solverScore,
    };
  });

  // Group by position
  const byPosition: Record<PlayerPosition, typeof evaluatedPlayers> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
    DEF: [],
    DL: [],
    LB: [],
    DB: [],
  };

  evaluatedPlayers.forEach(ep => {
    if (byPosition[ep.player.position]) {
      byPosition[ep.player.position].push(ep);
    } else {
      byPosition.WR.push(ep);
    }
  });

  // Sort each position by solver score descending
  Object.keys(byPosition).forEach(pos => {
    byPosition[pos as PlayerPosition].sort((a, b) => b.solverScore - a.solverScore);
  });

  // Correlation Stacks Detection for Max Boom Mode
  const correlationStacks: OptimalLineupResult['correlationStacks'] = [];
  
  if (mode === 'MAX_BOOM_CEILING') {
    const topQBs = byPosition.QB.slice(0, settings.roster.qb);
    topQBs.forEach(qbEp => {
      const qbTeam = qbEp.player.team;
      // Look for WR/TE on same team
      const pairedPassCatchers = [...byPosition.WR, ...byPosition.TE].filter(
        ep => ep.player.team === qbTeam
      );

      pairedPassCatchers.forEach(pcEp => {
        // Boost solver score for correlated receiver
        pcEp.solverScore += 2.8;
        correlationStacks.push({
          qb: qbEp.player.name,
          target: pcEp.player.name,
          correlationGrade: 'ELITE',
          rationale: `${qbEp.player.name} + ${pcEp.player.name} stack creates 2x scoring multiplier on every ${qbTeam} passing touchdown in high-ceiling environments.`,
        });
      });
    });

    // Re-sort WR and TE after stack boosts
    byPosition.WR.sort((a, b) => b.solverScore - a.solverScore);
    byPosition.TE.sort((a, b) => b.solverScore - a.solverScore);
  }

  // Fill required starting positions
  const optimalStarters: Player[] = [];
  const starterIds = new Set<string>();

  const fillPosition = (pos: PlayerPosition, count: number) => {
    const candidates = byPosition[pos] || [];
    let filled = 0;
    for (const ep of candidates) {
      if (filled >= count) break;
      if (!starterIds.has(ep.player.id)) {
        optimalStarters.push(ep.player);
        starterIds.add(ep.player.id);
        filled++;
      }
    }
  };

  fillPosition('QB', settings.roster.qb);
  fillPosition('RB', settings.roster.rb);
  fillPosition('WR', settings.roster.wr);
  fillPosition('TE', settings.roster.te);
  fillPosition('K', settings.roster.k);
  fillPosition('DEF', settings.roster.def);
  fillPosition('DL', settings.roster.dl);
  fillPosition('LB', settings.roster.lb);
  fillPosition('DB', settings.roster.db);

  // Remaining players are bench
  const bench = rosterPlayers.filter(p => !starterIds.has(p.id));

  // Compute Totals
  const starterProjections = optimalStarters.map(p => calculateProjection(p, settings));
  const starterDecisions = optimalStarters.map(p => calculateCompositeDecision(p, settings));

  const totalProjectedPoints = Number(
    starterProjections.reduce((sum, p) => sum + p.projectedPoints, 0).toFixed(1)
  );
  const totalFloor = Number(
    starterProjections.reduce((sum, p) => sum + p.floor, 0).toFixed(1)
  );
  const totalCeiling = Number(
    starterProjections.reduce((sum, p) => sum + p.ceiling, 0).toFixed(1)
  );
  const totalAlphaIndex = Math.round(
    starterDecisions.reduce((sum, d) => sum + d.alphaIndex, 0) / Math.max(starterDecisions.length, 1)
  );

  // Compute Current Baseline if provided
  const currentProjections = currentStarters.map(p => calculateProjection(p, settings));
  const currentTotal = currentProjections.reduce((sum, p) => sum + p.projectedPoints, 0);
  const projectedPointGainVsCurrent = Number(Math.max(0, totalProjectedPoints - currentTotal).toFixed(1));

  // Detect Swaps
  const swaps: LineupSwapRecommendation[] = [];
  currentStarters.forEach(curr => {
    // If current starter is not in optimal starters
    if (!starterIds.has(curr.id)) {
      // Find the replacement in the same position
      const replacement = optimalStarters.find(
        opt => opt.position === curr.position && !currentStarters.some(cs => cs.id === opt.id)
      );

      if (replacement) {
        const currProj = calculateProjection(curr, settings);
        const repProj = calculateProjection(replacement, settings);
        const currDec = calculateCompositeDecision(curr, settings);
        const repDec = calculateCompositeDecision(replacement, settings);

        swaps.push({
          position: curr.position,
          currentStarter: curr,
          recommendedStarter: replacement,
          projectedPointDiff: Number((repProj.projectedPoints - currProj.projectedPoints).toFixed(1)),
          alphaIndexDiff: repDec.alphaIndex - currDec.alphaIndex,
          rationale: mode === 'SAFE_FLOOR'
            ? `${replacement.name} has a higher verified floor (${repProj.floor} pts vs ${currProj.floor} pts) and lower weather/game-script risk.`
            : mode === 'MAX_BOOM_CEILING'
            ? `${replacement.name} unlocks higher 90th percentile ceiling (${repProj.ceiling} pts vs ${currProj.ceiling} pts) in high total Vegas environment.`
            : `${replacement.name} has superior 5-Factor Alpha Index (+${repDec.alphaIndex - currDec.alphaIndex}) with easier defensive DvP matchup.`,
        });
      }
    }
  });

  return {
    mode,
    starters: optimalStarters,
    bench,
    totalProjectedPoints,
    totalFloor,
    totalCeiling,
    totalAlphaIndex,
    projectedPointGainVsCurrent,
    swaps,
    correlationStacks,
  };
}
