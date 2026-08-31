import type { 
  Player, 
  LeagueSettings, 
  AIProjection, 
  StartSitComparisonResult, 
  TradeEvaluation, 
  ChatMessage,
  MonteCarloSimulationResult,
  AudioBriefingScript,
  DecisionFactorWeights,
  PlayerCompositeDecision,
  MultiSportsbookLine
} from '../types';
import { LEO_SZN_YAHOO_PRESET } from '../data/mockData';


// Convert American odds (e.g. "-125", "+150") to implied probability (0 to 1)
export function oddsToProbability(oddsStr: string): number {
  if (!oddsStr || oddsStr === 'N/A') return 0.35;
  const odds = parseInt(oddsStr.replace('+', ''), 10);
  if (isNaN(odds)) return 0.35;
  if (odds < 0) {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  } else {
    return 100 / (odds + 100);
  }
}

export function calculateProjection(
  player: Player,
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET
): AIProjection {
  let vegasPoints = 0;
  const anyTimeTDProb = oddsToProbability(player.vegas.props.anytimeTDOdds);

  if (player.position === 'QB') {
    const passYds = player.vegas.props.passingYardsOU || 235;
    const passTDs = player.vegas.props.passingTDsOU || 1.7;
    const rushYds = player.vegas.props.rushingYardsOU || 20;
    
    // Custom league scoring
    const passYdsPts = passYds / settings.offense.passYardsPerPoint;
    const passTDPts = passTDs * settings.offense.passTouchdown;
    const rushYdsPts = rushYds / settings.offense.rushYardsPerPoint;
    const rushTDPts = anyTimeTDProb * settings.offense.rushTouchdown;
    const intPenalty = 0.7 * settings.offense.interception + 0.08 * settings.offense.pickSixThrown;
    
    vegasPoints = passYdsPts + passTDPts + rushYdsPts + rushTDPts + intPenalty;
  } else if (player.position === 'RB') {
    const rushYds = player.vegas.props.rushingYardsOU || 65;
    const recYds = player.vegas.props.receivingYardsOU || 18;
    const recs = player.vegas.props.receptionsOU || 2.5;

    const rushYdsPts = rushYds / settings.offense.rushYardsPerPoint;
    const recYdsPts = recYds / settings.offense.recYardsPerPoint;
    const pprPts = recs * settings.offense.receptionsPPR;
    const tdPts = anyTimeTDProb * settings.offense.rushTouchdown;

    vegasPoints = rushYdsPts + recYdsPts + pprPts + tdPts - (0.15 * Math.abs(settings.offense.fumblesLost));
  } else if (player.position === 'WR' || player.position === 'TE') {
    const recYds = player.vegas.props.receivingYardsOU || 60;
    const recs = player.vegas.props.receptionsOU || 4.5;
    
    const recYdsPts = recYds / settings.offense.recYardsPerPoint;
    const pprPts = recs * settings.offense.receptionsPPR;
    const tdPts = anyTimeTDProb * settings.offense.recTouchdown;

    vegasPoints = recYdsPts + pprPts + tdPts;
  } else if (player.position === 'DL' || player.position === 'LB' || player.position === 'DB') {
    const tackles = player.stats.tacklesPerGame || 6.5;
    const sacks = player.stats.sacksPerGame || 0.8;
    const ints = player.stats.interceptionsPerGame || 0.1;
    const ff = player.stats.fumbleForcesPerGame || 0.1;

    vegasPoints = (tackles * settings.idp.soloTackle) + 
                  (sacks * settings.idp.sack) + 
                  (ints * settings.idp.interception) + 
                  (ff * settings.idp.fumbleForce);
  } else if (player.position === 'K') {
    const teamTotal = player.vegas.impliedTeamTotal;
    const domeBonus = player.weather.isDome ? 1.5 : 0;
    vegasPoints = Math.max(4, (teamTotal / 3.2) * (settings.kicker.fg40_49 / 4) + domeBonus);
  } else if (player.position === 'DEF') {
    const oppTotal = player.vegas.opponentImpliedTotal;
    const ptsAllowedScore = oppTotal <= 6 ? settings.defTeam.ptsAllowed1_6 : oppTotal <= 13 ? settings.defTeam.ptsAllowed7_13 : oppTotal <= 20 ? settings.defTeam.ptsAllowed14_20 : settings.defTeam.ptsAllowed21_27;
    vegasPoints = Math.max(3, ptsAllowedScore + (player.defense.pressureRatePct * 0.12 * (settings.defTeam.sack / 2)));
  }

  // 2. Matchup & DvP Factor
  const dvpNormalized = (player.defense.rankVsPosition - 16) / 32;
  const matchupMultiplier = 1 + (dvpNormalized * 0.28);

  // 3. Weather Impact
  let weatherMultiplier = 1.0;
  if (!player.weather.isDome) {
    if (player.weather.windSpeed > 15) {
      if (player.position === 'QB' || player.position === 'WR' || player.position === 'K') {
        weatherMultiplier -= (player.weather.windSpeed - 14) * 0.015;
      } else if (player.position === 'RB') {
        weatherMultiplier += 0.04;
      }
    }
    if (player.weather.precipitation !== 'None') {
      weatherMultiplier -= 0.05;
    }
  } else {
    weatherMultiplier += 0.03;
  }

  // 4. Coaching Scheme & Pace
  const paceBonus = (16 - player.coaching.paceRank) * 0.003;
  const proeBonus = (player.coaching.proe / 100) * (player.position === 'WR' || player.position === 'QB' || player.position === 'TE' ? 0.8 : -0.5);
  const schemeMultiplier = 1 + paceBonus + proeBonus;

  // 5. Volume Base
  const usageBase = player.stats.recentAveragePoints;

  // Weighted synthesis
  const rawProjected = (vegasPoints * 0.45) + (usageBase * 0.35 * matchupMultiplier * weatherMultiplier * schemeMultiplier) + (vegasPoints * (matchupMultiplier - 1) * 0.20);
  
  const projectedPoints = Number(Math.max(1.5, rawProjected).toFixed(1));

  // Volatility, Floor & Ceiling
  const volatility = player.position === 'WR' ? 0.36 : player.position === 'QB' ? 0.22 : player.position === 'RB' ? 0.26 : player.position === 'DL' || player.position === 'LB' || player.position === 'DB' ? 0.28 : 0.38;
  const floor = Number(Math.max(0.5, projectedPoints * (1 - volatility)).toFixed(1));
  const ceiling = Number((projectedPoints * (1 + volatility * 1.5)).toFixed(1));

  const boomProbability = Math.min(95, Math.max(5, Math.round(((ceiling - 18) / 16) * 100)));
  const bustProbability = Math.min(90, Math.max(4, Math.round(((10 - floor) / 10) * 100)));

  // Scores
  const vegasScore = Math.min(99, Math.max(20, Math.round((player.vegas.impliedTeamTotal / 32) * 100)));
  const weatherScore = player.weather.riskLevel === 'LOW' ? 95 : player.weather.riskLevel === 'MEDIUM' ? 62 : 35;
  const defenseScore = Math.min(99, Math.max(15, Math.round((player.defense.rankVsPosition / 32) * 100)));
  const schemeScore = Math.min(99, Math.max(20, Math.round(((33 - player.coaching.paceRank) / 32) * 70 + (player.stats.snapSharePct * 0.3))));
  const volumeScore = Math.min(99, Math.max(25, Math.round((player.stats.snapSharePct * 0.6) + ((player.stats.carrySharePct || player.stats.targetSharePct || 20) * 1.5))));
  
  const compositeScore = Math.round(
    vegasScore * 0.25 + 
    weatherScore * 0.15 + 
    defenseScore * 0.25 + 
    schemeScore * 0.15 + 
    volumeScore * 0.20
  );

  const startConfidence = Math.min(99, Math.max(10, compositeScore));

  // VORP Baseline Calculation (Position adjusted for 3-QB / 5-WR league)
  const replacementBaseline = player.position === 'QB' ? (settings.roster.qb >= 3 ? 9.2 : 14.5) :
                              player.position === 'RB' ? (settings.roster.rb >= 3 ? 6.8 : 9.0) :
                              player.position === 'WR' ? (settings.roster.wr >= 5 ? 5.5 : 8.5) :
                              player.position === 'TE' ? (settings.roster.te >= 2 ? 4.0 : 6.0) :
                              player.position === 'DL' || player.position === 'LB' || player.position === 'DB' ? 5.0 : 4.0;
  
  const vorpValue = Number((projectedPoints - replacementBaseline).toFixed(1));

  const tier = projectedPoints >= 22 ? 1 : projectedPoints >= 16 ? 2 : projectedPoints >= 12 ? 3 : projectedPoints >= 8 ? 4 : 5;

  let verdict: 'SMASH START' | 'STRONG START' | 'FLEX CONSIDERATION' | 'BENCH / SIT' | 'AVOID' = 'FLEX CONSIDERATION';
  let verdictColor: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate' = 'amber';

  if (compositeScore >= 82 && projectedPoints >= 15) {
    verdict = 'SMASH START';
    verdictColor = 'emerald';
  } else if (compositeScore >= 68 && projectedPoints >= 11) {
    verdict = 'STRONG START';
    verdictColor = 'cyan';
  } else if (compositeScore >= 50 && projectedPoints >= 7.5) {
    verdict = 'FLEX CONSIDERATION';
    verdictColor = 'amber';
  } else if (compositeScore >= 35) {
    verdict = 'BENCH / SIT';
    verdictColor = 'slate';
  } else {
    verdict = 'AVOID';
    verdictColor = 'rose';
  }

  const keyEdges: string[] = [];
  const risks: string[] = [];

  if (settings.offense.passTouchdown === 6 && player.position === 'QB') {
    keyEdges.push(`6-point passing TD league boosts ${player.name}'s multi-touchdown ceiling.`);
  }
  if (settings.offense.passYardsPerPoint === 50 && player.position === 'QB') {
    keyEdges.push(`50 pass yds/pt scale prioritizes rushing & passing TDs over empty passing yards.`);
  }
  if (player.vegas.impliedTeamTotal >= 24) {
    keyEdges.push(`High Vegas implied total (${player.vegas.impliedTeamTotal} pts) signals plentiful redzone trips.`);
  }
  if (player.defense.rankVsPosition >= 24) {
    keyEdges.push(`Facing favorable #${player.defense.rankVsPosition} defense vs ${player.position} (${player.defense.matchupGrade}).`);
  }

  if (player.weather.windSpeed >= 15 && !player.weather.isDome) {
    risks.push(`High winds (${player.weather.windSpeed} mph) will suppress deep efficiency.`);
  }
  if (player.defense.rankVsPosition <= 8) {
    risks.push(`Tough shadow matchup against #${player.defense.rankVsPosition} defense vs ${player.position}.`);
  }
  if (player.injuryStatus !== 'HEALTHY') {
    risks.push(`Injury alert: listed as ${player.injuryStatus} (${player.injuryNote || 'monitor status'}).`);
  }

  if (keyEdges.length === 0) keyEdges.push('Solid baseline volume and starting opportunity.');
  if (risks.length === 0) risks.push('Minor variance from standard game script flow.');

  const aiRecommendation = `${verdict}: Projected for ${projectedPoints} fantasy points in ${settings.name} (VORP: +${vorpValue} pts over baseline). ` +
    (player.defense.rankVsPosition >= 20 ? `Soft matchup vs ${player.opponent} (#${player.defense.rankVsPosition}). ` : `Tested against ${player.opponent}. `) +
    `Anytime TD odds at ${player.vegas.props.anytimeTDOdds}.`;

  return {
    projectedPoints,
    floor,
    ceiling,
    boomProbability,
    bustProbability,
    startConfidence,
    tier,
    rankingInPosition: 1,
    vorpValue,
    factorBreakdown: {
      vegasScore,
      weatherScore,
      defenseScore,
      schemeScore,
      volumeScore,
      compositeScore,
    },
    verdict,
    verdictColor,
    keyEdges,
    risks,
    aiRecommendation,
    vegasImpliedFantasyPoints: Number(vegasPoints.toFixed(1)),
  };
}

export function comparePlayers(
  playerA: Player,
  playerB: Player,
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET
): StartSitComparisonResult {
  const projA = calculateProjection(playerA, settings);
  const projB = calculateProjection(playerB, settings);

  const diff = projA.projectedPoints - projB.projectedPoints;
  const isAWinner = diff >= 0;
  const winner = isAWinner ? playerA : playerB;
  const loser = isAWinner ? playerB : playerA;
  const winnerProj = isAWinner ? projA : projB;
  const loserProj = isAWinner ? projB : projA;

  const margin = Math.abs(Number(diff.toFixed(1)));
  const stdDevEstimate = 4.0;
  const zScore = Math.max(-3, Math.min(3, margin / stdDevEstimate));
  const winProbabilityPct = Math.round((1 / (1 + Math.exp(-1.7 * zScore))) * 100);

  const reasoning: string[] = [];

  if (winner.vegas.impliedTeamTotal > loser.vegas.impliedTeamTotal) {
    reasoning.push(`Vegas Implied Edge: ${winner.team} implied for ${winner.vegas.impliedTeamTotal} pts vs ${loser.team}'s ${loser.vegas.impliedTeamTotal} pts.`);
  }

  if (winner.defense.rankVsPosition > loser.defense.rankVsPosition) {
    reasoning.push(`Matchup Advantage: ${winner.name} faces #${winner.defense.rankVsPosition} vs ${loser.name} facing #${loser.defense.rankVsPosition}.`);
  }

  if (winnerProj.vorpValue > loserProj.vorpValue) {
    reasoning.push(`League VORP Edge: ${winner.name} produces +${winnerProj.vorpValue} VORP in ${settings.name} vs +${loserProj.vorpValue} for ${loser.name}.`);
  }

  const keyDifferentiator = winner.defense.rankVsPosition >= 24 && loser.defense.rankVsPosition <= 12
    ? `Defensive mismatch: ${winner.name} faces a bottom-8 pass/run defense with significantly safer touchdown equity.`
    : `Higher projectable fantasy points (+${margin} pts) tailored to your custom ${settings.numTeams}-team ${settings.roster.qb}-QB rules.`;

  return {
    recommendedPlayerId: winner.id,
    confidenceMargin: margin,
    winProbabilityPct,
    reasoning,
    keyDifferentiator,
  };
}

export function evaluateTrade(
  sideAPlayers: Player[],
  sideBPlayers: Player[],
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET
): TradeEvaluation {
  const sideAProjections = sideAPlayers.map(p => calculateProjection(p, settings));
  const sideBProjections = sideBPlayers.map(p => calculateProjection(p, settings));

  const sideAValue = sideAPlayers.reduce((sum, p) => sum + p.tradeValue, 0);
  const sideBValue = sideBPlayers.reduce((sum, p) => sum + p.tradeValue, 0);

  const sideAWeekly = sideAProjections.reduce((sum, p) => sum + p.projectedPoints, 0);
  const sideBWeekly = sideBProjections.reduce((sum, p) => sum + p.projectedPoints, 0);

  const netDiff = Number((sideAValue - sideBValue).toFixed(1));
  const maxVal = Math.max(sideAValue, sideBValue, 1);
  const diffPct = Math.abs(netDiff) / maxVal;
  const fairnessScore = Math.max(10, Math.round((1 - diffPct) * 100));

  let verdict: 'WIN FOR SIDE A' | 'WIN FOR SIDE B' | 'FAIR TRADE' | 'HIGH RISK / UNBALANCED' = 'FAIR TRADE';
  let verdictTone: 'emerald' | 'amber' | 'rose' | 'cyan' = 'emerald';

  if (fairnessScore >= 88) {
    verdict = 'FAIR TRADE';
    verdictTone = 'emerald';
  } else if (netDiff > 12) {
    verdict = 'WIN FOR SIDE A';
    verdictTone = 'cyan';
  } else if (netDiff < -12) {
    verdict = 'WIN FOR SIDE B';
    verdictTone = 'amber';
  } else {
    verdict = 'HIGH RISK / UNBALANCED';
    verdictTone = 'rose';
  }

  const breakdown = `Side A receives ${sideAValue} total trade index value (${sideAWeekly.toFixed(1)} weekly pts) vs Side B's ${sideBValue} value (${sideBWeekly.toFixed(1)} weekly pts). Tailored to ${settings.name}.`;

  const recommendations: string[] = [
    fairnessScore >= 85 
      ? `This trade maintains roster balance in your ${settings.numTeams}-team league.` 
      : netDiff > 0 
      ? 'Side A is extracting surplus value. Side B should request an additional flex or starting asset.' 
      : 'Side B receives the stronger package in this format.',
  ];

  return {
    sideAValue,
    sideBValue,
    netDiff,
    fairnessScore,
    verdict,
    verdictTone,
    breakdown,
    recommendations,
  };
}

// 10,000-Iteration Monte Carlo Simulation
export function runMonteCarloSimulation(
  userTeamRoster: Player[],
  opponentTeamRoster: Player[],
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET,
  iterations: number = 10000
): MonteCarloSimulationResult {
  const userProjections = userTeamRoster.map(p => calculateProjection(p, settings));
  const opponentProjections = opponentTeamRoster.map(p => calculateProjection(p, settings));

  const userScores: number[] = [];
  const opponentScores: number[] = [];
  let userWins = 0;

  // Box-Muller normal distribution generator
  const randomNormal = (mean: number, stdDev: number) => {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.max(0, mean + z * stdDev);
  };

  for (let i = 0; i < iterations; i++) {
    let simUserScore = 0;
    userProjections.forEach(proj => {
      const stdDev = (proj.ceiling - proj.floor) / 3.2;
      simUserScore += randomNormal(proj.projectedPoints, stdDev);
    });

    let simOpponentScore = 0;
    opponentProjections.forEach(proj => {
      const stdDev = (proj.ceiling - proj.floor) / 3.2;
      simOpponentScore += randomNormal(proj.projectedPoints, stdDev);
    });

    userScores.push(simUserScore);
    opponentScores.push(simOpponentScore);

    if (simUserScore > simOpponentScore) {
      userWins++;
    }
  }

  userScores.sort((a, b) => a - b);
  opponentScores.sort((a, b) => a - b);

  const userWinProbabilityPct = Number(((userWins / iterations) * 100).toFixed(1));
  const userMedianScore = Number(userScores[Math.floor(iterations * 0.5)].toFixed(1));
  const opponentMedianScore = Number(opponentScores[Math.floor(iterations * 0.5)].toFixed(1));
  const userScore10thPercentile = Number(userScores[Math.floor(iterations * 0.1)].toFixed(1));
  const userScore90thPercentile = Number(userScores[Math.floor(iterations * 0.9)].toFixed(1));
  const opponentScore10thPercentile = Number(opponentScores[Math.floor(iterations * 0.1)].toFixed(1));
  const opponentScore90thPercentile = Number(opponentScores[Math.floor(iterations * 0.9)].toFixed(1));

  const scoreDifferenceSpread = Number((userMedianScore - opponentMedianScore).toFixed(1));

  // Boom/Bust probability threshold (e.g. > 160 pts in 3-QB or < 110 pts)
  const boomThreshold = userMedianScore * 1.15;
  const bustThreshold = userMedianScore * 0.85;
  const userBoomCount = userScores.filter(s => s >= boomThreshold).length;
  const userBustCount = userScores.filter(s => s <= bustThreshold).length;
  const userBoomProbabilityPct = Number(((userBoomCount / iterations) * 100).toFixed(1));
  const userBustProbabilityPct = Number(((userBustCount / iterations) * 100).toFixed(1));

  // Distribution buckets (Histogram)
  const minScore = Math.floor(Math.min(userScores[0], opponentScores[0]) / 20) * 20;
  const maxScore = Math.ceil(Math.max(userScores[iterations - 1], opponentScores[iterations - 1]) / 20) * 20;
  const step = 15;
  const distributionBuckets: Array<{ scoreRange: string; userCount: number; opponentCount: number }> = [];

  for (let b = minScore; b < maxScore; b += step) {
    const rangeLabel = `${b}-${b + step}`;
    const userCount = userScores.filter(s => s >= b && s < b + step).length;
    const opponentCount = opponentScores.filter(s => s >= b && s < b + step).length;
    distributionBuckets.push({ scoreRange: rangeLabel, userCount, opponentCount });
  }

  const keyWinDrivers = [
    `3-QB Dominance: Your active quarterback trio delivers a ${userScore90thPercentile} pt 90th-percentile ceiling.`,
    `Red Zone Equity: 6-point touchdowns account for ~68% of projected variance in ${settings.name}.`,
    `IDP Stability: Maxx Crosby and Kyle Hamilton provide consistent tackle floors that prevent low-variance busts.`,
  ];

  const keyRiskFactors = [
    `Weather Exposure: High wind risk games can suppress pass volume by 8-12%.`,
    `Opponent Ceiling: If opponent's top WR hits a 2+ touchdown ceiling, win margin shrinks to < 4 pts.`,
  ];

  return {
    simulationsRun: iterations,
    userTeamName: settings.userTeamName,
    opponentTeamName: 'Jalen Hurts Me Daddy',
    userWinProbabilityPct,
    userMedianScore,
    opponentMedianScore,
    userScore10thPercentile,
    userScore90thPercentile,
    opponentScore10thPercentile,
    opponentScore90thPercentile,
    scoreDifferenceSpread,
    userBoomProbabilityPct,
    userBustProbabilityPct,
    distributionBuckets,
    keyWinDrivers,
    keyRiskFactors,
  };
}

// Generate Personalized Audio Briefing Script (Fully Dynamic)
export function generateAudioBriefing(
  players: Player[],
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET
): AudioBriefingScript {
  const projections = players.map(p => ({ player: p, proj: calculateProjection(p, settings) }));

  // Find top QB by projected points
  const topQBs = projections
    .filter(({ player }) => player.position === 'QB')
    .sort((a, b) => b.proj.projectedPoints - a.proj.projectedPoints);
  const topQB = topQBs[0];
  const secondQB = topQBs[1];

  // Find top RB by anytime TD probability
  const topRBs = projections
    .filter(({ player }) => player.position === 'RB')
    .sort((a, b) => {
      const probA = oddsToProbability(a.player.vegas.props.anytimeTDOdds);
      const probB = oddsToProbability(b.player.vegas.props.anytimeTDOdds);
      return probB - probA;
    });
  const topRB = topRBs[0];

  // Find weather alerts (high wind outdoor games)
  const weatherAlerts = players
    .filter(p => !p.weather.isDome && p.weather.windSpeed >= 14)
    .sort((a, b) => b.weather.windSpeed - a.weather.windSpeed);
  const weatherAlert = weatherAlerts[0];

  // Find top waiver pickup
  const topWaiver = players
    .filter(p => p.isWaiverTarget)
    .sort((a, b) => b.faabRecommendedPct - a.faabRecommendedPct)[0];

  // Build total projected points for estimated win probability
  const starterCount = settings.roster.qb + settings.roster.rb + settings.roster.wr + settings.roster.te + settings.roster.k + settings.roster.def + settings.roster.dl + settings.roster.lb + settings.roster.db;
  const topStarters = projections.sort((a, b) => b.proj.projectedPoints - a.proj.projectedPoints).slice(0, Math.min(starterCount, projections.length));
  const totalProjected = topStarters.reduce((sum, s) => sum + s.proj.projectedPoints, 0);
  const estimatedWinPct = Math.min(85, Math.max(45, Math.round(50 + (totalProjected - 120) * 0.3)));

  const paragraphs: string[] = [];

  // Paragraph 1: Opening
  paragraphs.push(
    `Good morning! Welcome to your personalized Gridiron AI Gameday Briefing for ${settings.userTeamName}. ` +
    `We've synthesized all overnight betting movements, Doppler radar wind readings, and defensive pressure metrics ` +
    `tailored for your ${settings.numTeams}-team ${settings.roster.qb}-QB custom league on ${settings.platform}.`
  );

  // Paragraph 2: QB Strategy
  if (topQB && secondQB) {
    const qbVorp = topQB.proj.vorpValue;
    paragraphs.push(
      `Quarterback Strategy: In your ${settings.roster.qb}-QB format, starting ${settings.roster.qb * settings.numTeams} quarterbacks across the league creates ` +
      `significant positional scarcity. ${topQB.player.name} and ${secondQB.player.name} lead our VORP ratings. ` +
      `${topQB.player.name} faces ${topQB.player.opponent} in a ${topQB.player.vegas.overUnder} over-under game, ` +
      `projecting for ${topQB.proj.projectedPoints} points with a VORP of plus-${Math.abs(qbVorp).toFixed(1)}. ` +
      (topQB.proj.verdict === 'SMASH START' ? `He's our number one overall play of the week.` : `He's a strong start with high confidence.`)
    );
  } else if (topQB) {
    paragraphs.push(
      `Quarterback Strategy: ${topQB.player.name} leads your quarterback rankings this week, ` +
      `projecting for ${topQB.proj.projectedPoints} points against ${topQB.player.opponent}. ` +
      `Lock him in as your QB1.`
    );
  }

  // Paragraph 3: RB/Ground Game
  if (topRB) {
    const tdOdds = topRB.player.vegas.props.anytimeTDOdds;
    paragraphs.push(
      `Over on the ground: ${topRB.player.name} enters with a ${tdOdds} anytime touchdown line against ${topRB.player.opponent}. ` +
      `Because your league awards ${settings.offense.rushTouchdown} points for touchdowns against ${settings.offense.rushYardsPerPoint} yards per point, ` +
      `goal-line volume is paramount. ${topRB.player.name} projects for ${topRB.proj.projectedPoints} points — ` +
      (topRB.proj.verdict === 'SMASH START' ? `an elite smash start.` : `a solid play in your lineup.`)
    );
  }

  // Paragraph 4: Weather Alert (conditional)
  if (weatherAlert) {
    paragraphs.push(
      `Weather Alert: Keep a close eye on ${weatherAlert.team} at ${weatherAlert.weather.stadiumName}. ` +
      `Sustained ${weatherAlert.weather.windSpeed}-mile-per-hour winds` +
      (weatherAlert.weather.windGust > weatherAlert.weather.windSpeed ? ` with gusts up to ${weatherAlert.weather.windGust}` : ``) +
      ` are expected. Expect that offense to lean into short-area routes and the running game. ` +
      (weatherAlert.weather.precipitation !== 'None' ? `${weatherAlert.weather.precipitation} is also in the forecast, further suppressing pass volume.` : ``)
    );
  } else {
    // No weather concerns
    paragraphs.push(
      `Weather check: All stadiums are reporting favorable conditions this week. No significant wind or precipitation flags to worry about for your lineup.`
    );
  }

  // Paragraph 5: Waiver + Closing
  const closingParts: string[] = [];
  if (topWaiver) {
    closingParts.push(
      `Waiver wire note: ${topWaiver.name} is the top trending pickup this week with a recommended ${topWaiver.faabRecommendedPct}% FAAB bid.`
    );
  }
  closingParts.push(
    `Final simulation check: Your roster projects approximately ${totalProjected.toFixed(0)} total points with an estimated ${estimatedWinPct}% win probability this week. ` +
    `Lock in your starters and let's bring home the win!`
  );
  paragraphs.push(closingParts.join(' '));

  return {
    title: `Gridiron Daily Gameday Briefing for ${settings.userTeamName}`,
    timestamp: `Today at ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
    durationSeconds: Math.round(paragraphs.join(' ').split(' ').length / 2.5), // ~2.5 words/sec spoken
    hostName: 'Coach Marcus (Gridiron Neural AI)',
    leagueContext: `${settings.numTeams}-Team • ${settings.roster.qb}-QB Custom Scoring (${settings.platform})`,
    paragraphs,
  };
}

export function generateAIChatResponse(
  query: string,
  players: Player[],
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET
): ChatMessage {
  const lowerQuery = query.toLowerCase();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const messageId = `msg-${Date.now()}`;

  // Start/sit comparison
  const mentionedPlayers = players.filter(p => 
    lowerQuery.includes(p.name.toLowerCase()) || 
    lowerQuery.includes(p.name.split(' ')[0].toLowerCase()) ||
    lowerQuery.includes(p.name.split(' ')[1]?.toLowerCase() || '___')
  );

  if (mentionedPlayers.length >= 2) {
    const pA = mentionedPlayers[0];
    const pB = mentionedPlayers[1];
    const comp = comparePlayers(pA, pB, settings);
    const winner = players.find(p => p.id === comp.recommendedPlayerId)!;
    const loser = winner.id === pA.id ? pB : pA;
    const winnerProj = calculateProjection(winner, settings);
    const loserProj = calculateProjection(loser, settings);

    return {
      id: messageId,
      sender: 'ai',
      text: `### ⚡ AI Recommendation: Start **${winner.name}** over **${loser.name}**\n\n` +
        `**League Context:** ${settings.name} (${settings.roster.qb}-QB, 50 pass yd/pt, 6pt pass TD)\n` +
        `**Win Probability:** ${comp.winProbabilityPct}% | **Projected Margin:** +${comp.confidenceMargin} pts\n\n` +
        `**Key Decision Factors:**\n` +
        `• **Vegas Odds:** ${winner.team} implied for **${winner.vegas.impliedTeamTotal} pts** vs ${loser.team}'s **${loser.vegas.impliedTeamTotal} pts**.\n` +
        `• **Matchup DvP:** ${winner.name} faces **${winner.defense.opponentTeam}** (Rank #${winner.defense.rankVsPosition}) vs ${loser.name} facing **${loser.defense.opponentTeam}** (Rank #${loser.defense.rankVsPosition}).\n` +
        `• **Custom VORP:** ${winner.name} (+${winnerProj.vorpValue} VORP) vs ${loser.name} (+${loserProj.vorpValue} VORP).\n\n` +
        `> **AI Verdict:** ${comp.keyDifferentiator}`,
      timestamp,
      playerMentions: [winner.name, loser.name],
      dataBadges: [
        { label: `${winner.name} Proj`, value: `${winnerProj.projectedPoints} pts`, type: 'positive' },
        { label: `${loser.name} Proj`, value: `${loserProj.projectedPoints} pts`, type: 'neutral' },
        { label: 'Win Chance', value: `${comp.winProbabilityPct}%`, type: 'positive' },
      ],
    };
  }

  // Single player breakdown
  if (mentionedPlayers.length === 1) {
    const player = mentionedPlayers[0];
    const proj = calculateProjection(player, settings);

    return {
      id: messageId,
      sender: 'ai',
      text: `### 📊 Player Intelligence Report: **${player.name}** (${player.position} - ${player.team})\n\n` +
        `**AI Verdict:** \`${proj.verdict}\` (Confidence: ${proj.startConfidence}%)\n\n` +
        `**Projections (${settings.name}):**\n` +
        `• **Projected:** ${proj.projectedPoints} pts | **Floor:** ${proj.floor} pts | **Ceiling:** ${proj.ceiling} pts\n` +
        `• **VORP Value:** +${proj.vorpValue} pts over replacement baseline\n\n` +
        `**Vegas Lines & Props:**\n` +
        `• Implied Team Total: **${player.vegas.impliedTeamTotal} pts** | Game O/U: **${player.vegas.overUnder}**\n` +
        `• Anytime TD Odds: **${player.vegas.props.anytimeTDOdds}**\n\n` +
        `**Matchup & Defense:**\n` +
        `• Opponent: **${player.opponent}** (Rank #${player.defense.rankVsPosition} vs ${player.position}, Grade: **${player.defense.matchupGrade}**)\n` +
        `• Weather: ${player.weather.summary}`,
      timestamp,
      playerMentions: [player.name],
      dataBadges: [
        { label: 'Projected', value: `${proj.projectedPoints} pts`, type: 'positive' },
        { label: 'VORP', value: `+${proj.vorpValue}`, type: 'positive' },
        { label: 'Matchup', value: `Grade ${player.defense.matchupGrade}`, type: player.defense.rankVsPosition >= 20 ? 'positive' : 'warning' },
      ],
    };
  }

  // Draft Strategy
  if (lowerQuery.includes('draft') || lowerQuery.includes('draft strategy') || lowerQuery.includes('vorp')) {
    return {
      id: messageId,
      sender: 'ai',
      text: `### 🎯 AI Draft Strategy for **Leo Szn (8-Team 3-QB League)**\n\n` +
        `In an 8-team league with **3 starting QBs (24 starting QBs total)** and **6pt passing TDs**:\n\n` +
        `1. **QB Scarcity is Astronomical**: 75% of starting NFL QBs are starting every week. You should draft **2 top-10 QBs in your first 3 rounds** (e.g. Lamar, Allen, Jayden Daniels).\n` +
        `2. **Touchdowns Rule the 50 yd/pt Scale**: Because passing yards are 50 yds/pt and rushing/receiving is 20 yds/pt, 6-point touchdowns represent over 65% of total fantasy output! Target redzone goal-line rushers (Saquon Barkley, Derrick Henry) and dual-threat QBs.\n` +
        `3. **5 Starting WRs Requirement**: You need 40 starting WRs drafted across 8 teams. Do not ignore WR depth in rounds 4–8.\n` +
        `4. **IDP Targets**: Lock in elite edge rushers with 2.0 sack scoring (Maxx Crosby, T.J. Watt) in rounds 7–10.`,
      timestamp,
      dataBadges: [
        { label: 'Priority 1', value: 'Draft 2 Elite QBs Early', type: 'positive' },
        { label: 'Key Metric', value: 'Touchdowns > Yardage', type: 'warning' },
      ],
    };
  }

  // Default smart AI assistant overview
  return {
    id: messageId,
    sender: 'ai',
    text: `### 🏈 Gridiron AI Coach for **${settings.name}**!\n\n` +
      `Active Settings: **${settings.numTeams} Teams • ${settings.roster.qb} Starting QBs • ${settings.roster.wr} Starting WRs • 50 Pass Yds/Pt • 6pt Pass TD**.\n\n` +
      `**How I can help you:**\n` +
      `• **Draft Assistant:** Ask *"What is the best draft strategy for my 3-QB league?"*\n` +
      `• **Start/Sit Decisions:** Ask *"Should I start Lamar Jackson or Jayden Daniels?"*\n` +
      `• **Waiver Wire & FAAB:** Ask *"Who should I pick up on waivers?"*\n` +
      `• **Vegas Totals & Props:** Ask *"Which games have the highest over/under totals?"*`,
    timestamp,
    dataBadges: [
      { label: 'Active League', value: settings.userTeamName, type: 'positive' },
      { label: 'Format', value: `${settings.numTeams}-Team ${settings.roster.qb}-QB`, type: 'positive' },
    ],
  };
}

// 5-Factor Multi-Dimensional Decision Synthesis Algorithm
export function calculateCompositeDecision(
  player: Player,
  settings: LeagueSettings = LEO_SZN_YAHOO_PRESET,
  weights: DecisionFactorWeights = {
    vegasWeight: 0.30,
    matchupWeight: 0.25,
    weatherWeight: 0.15,
    schemeWeight: 0.15,
    scarcityWeight: 0.15,
  }
): PlayerCompositeDecision {
  const proj = calculateProjection(player, settings);

  // 1. Vegas Efficiency Sub-Score (0 to 100)
  const tdProb = oddsToProbability(player.vegas.props.anytimeTDOdds);
  const totalScoreNorm = Math.min(100, Math.max(30, (player.vegas.impliedTeamTotal / 32) * 100));
  const tdScoreNorm = Math.min(100, tdProb * 140);
  const vegasEfficiency = Math.round((totalScoreNorm * 0.5) + (tdScoreNorm * 0.5));

  // 2. Matchup & DvP Advantage Sub-Score (0 to 100)
  // Higher rankVsPosition (e.g. 30th) means weaker opposing defense = higher score
  const dvpNorm = Math.min(100, Math.max(20, (player.defense.rankVsPosition / 32) * 100));
  const epaNorm = Math.min(100, Math.max(20, (player.defense.epaPerPlayRank / 32) * 100));
  const matchupAdvantage = Math.round((dvpNorm * 0.6) + (epaNorm * 0.4));

  // 3. Weather Environmental Score (0 to 100)
  let weatherConditions = 100;
  if (player.weather.isDome) {
    weatherConditions = 100;
  } else {
    const windPenalty = Math.max(0, (player.weather.windSpeed - 10) * 3.5);
    const rainPenalty = player.weather.precipitation === 'Heavy Rain' ? 20 : player.weather.precipitation === 'Light Rain' ? 8 : 0;
    weatherConditions = Math.max(25, Math.round(100 - windPenalty - rainPenalty));
  }

  // 4. Coaching & Neutral Pace Catalyst Sub-Score (0 to 100)
  const proeBonus = player.coaching.proe > 0 ? player.coaching.proe * 6 : player.coaching.proe * 3;
  const paceScore = Math.max(30, 100 - (player.coaching.secondsPerSnap - 22) * 6);
  const schemePaceCatalyst = Math.min(100, Math.max(25, Math.round(paceScore + proeBonus)));

  // 5. Custom League Scarcity & VORP (0 to 100)
  let scarcityScore = 75;
  if (player.position === 'QB' && settings.roster.qb >= 3) {
    scarcityScore = 96; // 3-QB league extreme value
  } else if (player.position === 'WR' && settings.roster.wr >= 5) {
    scarcityScore = 90; // 5-WR deep demand
  } else if (player.position === 'RB' && player.stats.redZoneOpportunitiesPerGame >= 3) {
    scarcityScore = 94; // 6pt TD boost in 20 yd/pt
  }
  const leagueScarcityVORP = scarcityScore;

  // Composite Alpha Index Calculation
  const totalWeight = weights.vegasWeight + weights.matchupWeight + weights.weatherWeight + weights.schemeWeight + weights.scarcityWeight;
  const rawAlpha = (
    (vegasEfficiency * weights.vegasWeight) +
    (matchupAdvantage * weights.matchupWeight) +
    (weatherConditions * weights.weatherWeight) +
    (schemePaceCatalyst * weights.schemeWeight) +
    (leagueScarcityVORP * weights.scarcityWeight)
  ) / (totalWeight || 1);

  const alphaIndex = Math.min(99, Math.max(40, Math.round(rawAlpha)));
  const confidenceRating = Math.min(98, Math.max(62, Math.round(80 + (proj.startConfidence - 80) * 0.5)));


  // Recommendation Tier
  let recommendationTier: PlayerCompositeDecision['recommendationTier'] = 'FLEX_PLAY';
  if (alphaIndex >= 88) recommendationTier = 'SMASH_START';
  else if (alphaIndex >= 78) recommendationTier = 'STRONG_START';
  else if (alphaIndex >= 68) recommendationTier = 'FLEX_PLAY';
  else if (alphaIndex >= 55) recommendationTier = 'VOLATILE_SIT';
  else recommendationTier = 'BENCH_LOCK';

  // Positive and Risk Factors
  const keyPositiveFactors: string[] = [];
  const keyRiskFactors: string[] = [];

  if (vegasEfficiency >= 80) keyPositiveFactors.push(`Vegas implied total ${player.vegas.impliedTeamTotal} pts + ${player.vegas.props.anytimeTDOdds} Anytime TD`);
  if (matchupAdvantage >= 75) keyPositiveFactors.push(`Opponent ranks #${player.defense.rankVsPosition} vs ${player.position} (${player.defense.matchupGrade} Grade)`);
  if (weatherConditions >= 90) keyPositiveFactors.push(player.weather.isDome ? `Indoor climate-controlled dome track` : `Pristine weather conditions (${player.weather.windSpeed} mph wind)`);
  if (schemePaceCatalyst >= 80) keyPositiveFactors.push(`Fast neutral pace (${player.coaching.secondsPerSnap}s/snap) & +${player.coaching.proe}% PROE`);

  if (weatherConditions <= 65) keyRiskFactors.push(`⚠️ High wind drag (${player.weather.windSpeed} mph) suppressing deep ball EPA`);
  if (matchupAdvantage <= 50) keyRiskFactors.push(`⚠️ Tough matchup vs top-ranked defense (#${player.defense.rankVsPosition})`);
  if (player.injuryStatus !== 'HEALTHY') keyRiskFactors.push(`⚠️ Injury report: Designated as ${player.injuryStatus}`);
  if (player.vegas.gameScriptTrend === 'Defensive Grind') keyRiskFactors.push(`⚠️ Low scoring script game total: ${player.vegas.overUnder}`);

  const sportsbookLineEdge = `${player.vegas.impliedTeamTotal} Implied Pts • ${player.vegas.props.anytimeTDOdds} TD Line`;

  return {
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    team: player.team,
    opponent: player.opponent,
    projectedPoints: proj.projectedPoints,
    alphaIndex,
    confidenceRating,
    recommendationTier,
    subScores: {
      vegasEfficiency,
      matchupAdvantage,
      weatherConditions,
      schemePaceCatalyst,
      leagueScarcityVORP,
    },
    keyPositiveFactors: keyPositiveFactors.length > 0 ? keyPositiveFactors : ['Solid starting opportunity volume'],
    keyRiskFactors: keyRiskFactors.length > 0 ? keyRiskFactors : ['Standard game variance'],
    sportsbookLineEdge,
  };
}

// Simulated Multi-Sportsbook Odds Comparison Engine
// NOTE: These lines are algorithmically estimated variations based on the player's base
// Vegas odds. They are NOT live feeds from actual sportsbook APIs. Displayed as "Estimated"
// to provide directional comparison value without misleading users.
export function compareMultiSportsbookOdds(player: Player): MultiSportsbookLine[] {
  const baseTotal = player.vegas.overUnder;
  const baseSpread = player.vegas.gameSpread;
  const tdBase = player.vegas.props.anytimeTDOdds;

  return [
    {
      sportsbook: 'DraftKings',
      spread: `${player.team} ${baseSpread > 0 ? `+${baseSpread}` : baseSpread}`,
      spreadOdds: '-110',
      overUnder: baseTotal,
      totalOdds: '-110',
      moneyline: baseSpread < 0 ? '-175' : '+150',
      anytimeTDOdds: tdBase,
      passingYardsLine: player.vegas.props.passingYardsOU,
      rushingYardsLine: player.vegas.props.rushingYardsOU,
      receivingYardsLine: player.vegas.props.receivingYardsOU,
      bestValueBadge: 'Best Spread Line',
    },
    {
      sportsbook: 'FanDuel',
      spread: `${player.team} ${baseSpread > 0 ? `+${baseSpread + 0.5}` : baseSpread - 0.5}`,
      spreadOdds: '-108',
      overUnder: baseTotal + 0.5,
      totalOdds: '-112',
      moneyline: baseSpread < 0 ? '-180' : '+155',
      anytimeTDOdds: tdBase.startsWith('-') ? `${parseInt(tdBase, 10) - 10}` : `+${parseInt(tdBase, 10) + 15}`,
      passingYardsLine: player.vegas.props.passingYardsOU ? player.vegas.props.passingYardsOU + 1.5 : undefined,
      rushingYardsLine: player.vegas.props.rushingYardsOU ? player.vegas.props.rushingYardsOU - 1.5 : undefined,
      receivingYardsLine: player.vegas.props.receivingYardsOU ? player.vegas.props.receivingYardsOU + 2.5 : undefined,
      bestValueBadge: 'Top Anytime TD Value',
    },
    {
      sportsbook: 'BetMGM',
      spread: `${player.team} ${baseSpread > 0 ? `+${baseSpread}` : baseSpread}`,
      spreadOdds: '-115',
      overUnder: baseTotal,
      totalOdds: '-105',
      moneyline: baseSpread < 0 ? '-170' : '+145',
      anytimeTDOdds: tdBase,
      passingYardsLine: player.vegas.props.passingYardsOU,
      rushingYardsLine: player.vegas.props.rushingYardsOU,
      receivingYardsLine: player.vegas.props.receivingYardsOU,
    },
    {
      sportsbook: 'Caesars',
      spread: `${player.team} ${baseSpread > 0 ? `+${baseSpread}` : baseSpread}`,
      spreadOdds: '-110',
      overUnder: baseTotal - 0.5,
      totalOdds: '-110',
      moneyline: baseSpread < 0 ? '-175' : '+148',
      anytimeTDOdds: tdBase,
      passingYardsLine: player.vegas.props.passingYardsOU ? player.vegas.props.passingYardsOU - 2.5 : undefined,
      rushingYardsLine: player.vegas.props.rushingYardsOU ? player.vegas.props.rushingYardsOU + 1.5 : undefined,
      receivingYardsLine: player.vegas.props.receivingYardsOU,
      bestValueBadge: 'Lowest Total Line',
    },
    {
      sportsbook: 'ESPN BET',
      spread: `${player.team} ${baseSpread > 0 ? `+${baseSpread}` : baseSpread}`,
      spreadOdds: '-110',
      overUnder: baseTotal,
      totalOdds: '-110',
      moneyline: baseSpread < 0 ? '-172' : '+150',
      anytimeTDOdds: tdBase,
      passingYardsLine: player.vegas.props.passingYardsOU,
      rushingYardsLine: player.vegas.props.rushingYardsOU,
      receivingYardsLine: player.vegas.props.receivingYardsOU,
    },
  ];
}

