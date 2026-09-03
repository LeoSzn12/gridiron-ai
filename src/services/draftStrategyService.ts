import type { Player, LeagueSettings, PlayerPosition, DraftPick, DraftTeam } from '../types';
import { calculateProjection, calculatePositionBaselines } from './aiEngine';

export interface LeagueDraftStrategy {
  leagueName: string;
  formatType: '3-QB Super Scarcity' | '2-QB / Superflex' | 'Standard 1-QB' | 'Deep-WR Heavy' | 'IDP Balanced';
  qbScarcityRating: 'EXTREME' | 'HIGH' | 'MODERATE' | 'STANDARD';
  qbStartersTotal: number;
  nflStarterSupplyPct: number;
  scoringInsights: string[];
  strategicRules: string[];
  roundByRoundGamePlan: Array<{
    rounds: string;
    phase: string;
    targetPositions: PlayerPosition[];
    priorityRationale: string;
    keyTargets: string[];
  }>;
  positionalScarcity: Record<PlayerPosition, {
    totalStartersNeeded: number;
    scarcityTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    recommendedStartersTarget: number;
    cliffRound: number;
    advice: string;
  }>;
}

export interface PickRecommendation {
  type: 'BEST_VALUE' | 'POSITION_NEED' | 'HIGH_UPSIDE';
  title: string;
  badge: string;
  player: Player;
  projectedPoints: number;
  vorpValue: number;
  rationale: string;
}

export interface DraftRecommendationsResult {
  recommendations: PickRecommendation[];
  tierCliffWarning: string | null;
  turnPreview: {
    nextPickNumber: number;
    picksAway: number;
    projectedRemaining: Player[];
    turnAdvice: string;
  } | null;
}

export interface DraftGradeReport {
  overallGrade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C';
  projectedWeeklyPoints: number;
  projectedSeasonFinish: number;
  strengths: string[];
  weaknesses: string[];
  positionGrades: Record<string, { grade: string; points: number }>;
  bestValuePick: { player: Player; round: number; pick: number } | null;
  stealOfTheDraft: { player: Player; round: number; pick: number } | null;
  verdictSummary: string;
}

/**
 * Generates an in-depth, mathematically grounded draft strategy calibrated to any LeagueSettings
 */
export function analyzeLeagueDraftStrategy(
  settings: LeagueSettings,
  draftSlot: number,
  _allPlayers?: Player[]
): LeagueDraftStrategy {
  const numTeams = settings.numTeams || 8;
  const qbReq = settings.roster.qb || 1;
  const rbReq = settings.roster.rb || 2;
  const wrReq = settings.roster.wr || 3;
  const teReq = settings.roster.te || 1;
  const dlReq = settings.roster.dl || 0;
  const lbReq = settings.roster.lb || 0;
  const dbReq = settings.roster.db || 0;

  const qbStartersTotal = numTeams * qbReq;
  const nflStarterSupplyPct = Math.round((qbStartersTotal / 32) * 100);

  // Determine Format Archetype
  let formatType: LeagueDraftStrategy['formatType'] = 'Standard 1-QB';
  let qbScarcityRating: LeagueDraftStrategy['qbScarcityRating'] = 'STANDARD';

  if (qbReq >= 3) {
    formatType = '3-QB Super Scarcity';
    qbScarcityRating = 'EXTREME';
  } else if (qbReq === 2) {
    formatType = '2-QB / Superflex';
    qbScarcityRating = 'HIGH';
  } else if (wrReq >= 5) {
    formatType = 'Deep-WR Heavy';
    qbScarcityRating = 'MODERATE';
  } else if (dlReq + lbReq + dbReq >= 3) {
    formatType = 'IDP Balanced';
    qbScarcityRating = 'MODERATE';
  }

  // Scoring Insights based on rules
  const scoringInsights: string[] = [];
  if (qbReq >= 3) {
    scoringInsights.push(
      `🚨 EXTREME QB SCARCITY: ${qbStartersTotal} starting QBs needed across ${numTeams} teams (${nflStarterSupplyPct}% of all 32 NFL starters). Unmatched VORP leverage.`
    );
  } else if (qbReq === 2) {
    scoringInsights.push(
      `⚡ SUPERFLEX / 2-QB DEMAND: ${qbStartersTotal} starting QBs required. Quarterbacks have a 1.35x VORP multiplier over standard formats.`
    );
  }

  if (settings.offense.receptionsPPR === 0) {
    scoringInsights.push(
      `🎯 NON-PPR (0.0 PPR): Touchdowns (6 pts) and goal-line volume are king. Downgrade pure satellite reception backs; upgrade workhorses (Henry, Barkley).`
    );
  } else if (settings.offense.receptionsPPR === 1.0) {
    scoringInsights.push(
      `📈 FULL PPR (1.0 pt/rec): High-target slot receivers and receiving running backs (McCaffrey, Gibbs) gain a +5.0 to +8.0 PPG ceiling boost.`
    );
  }

  if (settings.offense.passYardsPerPoint >= 40 && settings.offense.rushYardsPerPoint <= 20) {
    scoringInsights.push(
      `🏃 DUAL-THREAT QB CHEAT CODE: Rushing yards (20 yd/pt) are worth 2.5x more than passing yards (50 yd/pt). Rushing QBs (Lamar, Allen, Daniels, Hurts) break the game.`
    );
  }

  if (settings.offense.passTouchdown === 6) {
    scoringInsights.push(
      `🔥 6-PT PASSING TDS: Elite pocket passers with 35+ TD ceilings (Mahomes, Burrow) gain significant ground on rushing QBs.`
    );
  }

  if (wrReq >= 5) {
    scoringInsights.push(
      `🏟️ 5 STARTING WRS: ${numTeams * wrReq} WRs start every week. Depth is critical; you cannot afford empty WR4/WR5 production.`
    );
  }

  // Strategic Rules
  const strategicRules: string[] = [];
  if (qbReq >= 3) {
    strategicRules.push(`Target 2 Elite QBs in your first 3 rounds to lock in high-floor QB scoring.`);
    strategicRules.push(`Draft a 3rd starting QB by Round 6 before the 24-starter supply cliff is completely exhausted.`);
    strategicRules.push(`Draft an insurance 4th QB on bench for bye weeks; free agents will be backups with 0 points.`);
  } else {
    strategicRules.push(`Anchor with Tier 1 RB/WR in Round 1.`);
    strategicRules.push(`Capitalize on QB value in Rounds 4-6 if dual-threat rushing QBs drop.`);
  }

  strategicRules.push(`Never draft Kicker or Team Defense before the final 2 rounds.`);
  strategicRules.push(`In IDP slots, prioritize high-tackle Middle Linebackers (Warner, Roquan) and elite edge sack artists (Crosby, Watt).`);

  const positionalScarcity: LeagueDraftStrategy['positionalScarcity'] = {
    QB: {
      totalStartersNeeded: qbStartersTotal,
      scarcityTier: qbReq >= 3 ? 'CRITICAL' : qbReq === 2 ? 'HIGH' : 'MEDIUM',
      recommendedStartersTarget: qbReq + 1,
      cliffRound: qbReq >= 3 ? 5 : qbReq === 2 ? 6 : 9,
      advice: qbReq >= 3 
        ? `Draft 2 QBs in first 3 rounds. Cliff hits hard at QB #${qbStartersTotal}.`
        : `Anchor early if dual-threat falls, otherwise wait for mid-round value.`,
    },
    RB: {
      totalStartersNeeded: numTeams * rbReq,
      scarcityTier: rbReq >= 3 ? 'HIGH' : 'MEDIUM',
      recommendedStartersTarget: rbReq + 2,
      cliffRound: 4,
      advice: `Secure at least 1 Tier-1 bellcow (Henry, Barkley, Bijan) early.`,
    },
    WR: {
      totalStartersNeeded: numTeams * wrReq,
      scarcityTier: wrReq >= 5 ? 'HIGH' : 'MEDIUM',
      recommendedStartersTarget: wrReq + 2,
      cliffRound: 7,
      advice: `Deep volume needed. Build a solid core of alpha targets (Jefferson, Chase, Nabers).`,
    },
    TE: {
      totalStartersNeeded: numTeams * teReq,
      scarcityTier: teReq >= 2 ? 'HIGH' : 'MEDIUM',
      recommendedStartersTarget: teReq + 1,
      cliffRound: 5,
      advice: `Target top tier (Bowers, Kelce, McBride) or wait until late rounds.`,
    },
    K: {
      totalStartersNeeded: numTeams * (settings.roster.k || 0),
      scarcityTier: 'LOW',
      recommendedStartersTarget: settings.roster.k || 1,
      cliffRound: 24,
      advice: `Draft in final 2 rounds only. Target dome kickers (Fairbairn, Tucker).`,
    },
    DEF: {
      totalStartersNeeded: numTeams * (settings.roster.def || 0),
      scarcityTier: 'LOW',
      recommendedStartersTarget: settings.roster.def || 1,
      cliffRound: 23,
      advice: `Streamable position. Target top pressure defenses (Ravens, 49ers) late.`,
    },
    DL: {
      totalStartersNeeded: numTeams * dlReq,
      scarcityTier: dlReq >= 2 ? 'MEDIUM' : 'LOW',
      recommendedStartersTarget: dlReq + 1,
      cliffRound: 14,
      advice: `Target elite sack artists (Maxx Crosby, Myles Garrett) in mid-to-late rounds.`,
    },
    LB: {
      totalStartersNeeded: numTeams * lbReq,
      scarcityTier: lbReq >= 2 ? 'HIGH' : 'MEDIUM',
      recommendedStartersTarget: lbReq + 1,
      cliffRound: 12,
      advice: `High-tackle volume linebackers (Fred Warner, Roquan Smith) have solid weekly floors.`,
    },
    DB: {
      totalStartersNeeded: numTeams * dbReq,
      scarcityTier: dbReq >= 2 ? 'MEDIUM' : 'LOW',
      recommendedStartersTarget: dbReq + 1,
      cliffRound: 16,
      advice: `In-the-box safeties (Kyle Hamilton) provide tackle + sack upside.`,
    },
  };

  const isEarlySlot = draftSlot <= 2;

  const roundByRoundGamePlan: LeagueDraftStrategy['roundByRoundGamePlan'] = [
    {
      rounds: 'Rounds 1 - 2',
      phase: 'Foundational Anchor',
      targetPositions: qbReq >= 3 ? (isEarlySlot ? ['QB', 'RB'] : ['QB', 'QB']) : ['RB', 'WR'],
      priorityRationale: qbReq >= 3 
        ? `With ${qbStartersTotal} starting QBs required, grab your franchise QB1 and an elite RB/QB2 at the turn.`
        : `Secure your highest-VORP anchor asset before the primary tier drop.`,
      keyTargets: qbReq >= 3 ? ['Lamar Jackson', 'Josh Allen', 'Patrick Mahomes', 'Saquon Barkley', 'Derrick Henry'] : ['Justin Jefferson', 'Saquon Barkley', 'Ja\'Marr Chase', 'CeeDee Lamb'],
    },
    {
      rounds: 'Rounds 3 - 5',
      phase: 'Core Starting Engine',
      targetPositions: qbReq >= 3 ? ['QB', 'WR', 'RB'] : ['WR', 'RB', 'TE'],
      priorityRationale: qbReq >= 3 
        ? `Crucial phase: lock in QB2/QB3 before Round 5 when NFL starter pool dries up, while stacking WR1/RB2.`
        : `Fill out your primary starting skill positions with high target-share receivers and workhorse backs.`,
      keyTargets: ['Jayden Daniels', 'Brock Bowers', 'Malik Nabers', 'Brian Thomas Jr.', 'Kyren Williams'],
    },
    {
      rounds: 'Rounds 6 - 9',
      phase: 'Starting Lineup Depth & Scarcity Wrap',
      targetPositions: ['WR', 'RB', 'TE'],
      priorityRationale: `Finalize remaining WR and Flex spots. Target high-volume WR2/WR3s in high-total Vegas passing attacks.`,
      keyTargets: ['George Pickens', 'Deebo Samuel', 'Zay Flowers', 'James Conner', 'David Montgomery'],
    },
    {
      rounds: 'Rounds 10 - 16',
      phase: 'IDP Anchors & Upside Stashes',
      targetPositions: ['LB', 'DL', 'WR', 'RB'],
      priorityRationale: `Start grabbing your IDP anchors (tackle monster LBs, high-pressure DLs) and breakout handcuff RBs.`,
      keyTargets: ['Maxx Crosby', 'Fred Warner', 'Myles Garrett', 'Roquan Smith', 'Tyrone Tracy Jr.'],
    },
    {
      rounds: 'Rounds 17+',
      phase: 'Late Sleepers, DEF & Kickers',
      targetPositions: ['DB', 'DEF', 'K', 'QB'],
      priorityRationale: `Stream defense & kicker in final rounds. Add insurance QB4 for bye weeks in 3-QB formats.`,
      keyTargets: ['Baltimore Ravens DEF', 'Ka\'imi Fairbairn', 'Kyle Hamilton', 'Geno Smith'],
    },
  ];

  return {
    leagueName: settings.name,
    formatType,
    qbScarcityRating,
    qbStartersTotal,
    nflStarterSupplyPct,
    scoringInsights,
    strategicRules,
    roundByRoundGamePlan,
    positionalScarcity,
  };
}

/**
 * Generates pick-by-pick AI draft recommendations tailored to current draft board and user roster
 */
export function generateDraftRecommendations(
  availablePlayers: Player[],
  userRoster: Player[],
  settings: LeagueSettings,
  currentRound: number,
  currentPickIndex: number,
  userDraftSlot: number
): DraftRecommendationsResult {
  const baselines = calculatePositionBaselines(availablePlayers, settings);
  const numTeams = settings.numTeams || 8;

  // Track positions currently drafted by user
  const userCounts: Record<PlayerPosition, number> = {
    QB: userRoster.filter(p => p.position === 'QB').length,
    RB: userRoster.filter(p => p.position === 'RB').length,
    WR: userRoster.filter(p => p.position === 'WR').length,
    TE: userRoster.filter(p => p.position === 'TE').length,
    K: userRoster.filter(p => p.position === 'K').length,
    DEF: userRoster.filter(p => p.position === 'DEF').length,
    DL: userRoster.filter(p => p.position === 'DL').length,
    LB: userRoster.filter(p => p.position === 'LB').length,
    DB: userRoster.filter(p => p.position === 'DB').length,
  };

  // 1. BEST VALUE (Highest Adjusted VORP)
  const scoredAvailable = availablePlayers.map(p => {
    const proj = calculateProjection(p, settings, baselines);
    let priorityMultiplier = 1.0;

    // League scarcity adjustments
    if (p.position === 'QB' && settings.roster.qb >= 3) {
      priorityMultiplier = userCounts.QB < 3 ? 1.4 : userCounts.QB === 3 ? 1.1 : 0.8;
    } else if (p.position === 'RB' && settings.roster.rb >= 3) {
      priorityMultiplier = userCounts.RB < 3 ? 1.2 : 1.0;
    } else if (p.position === 'WR' && settings.roster.wr >= 5) {
      priorityMultiplier = userCounts.WR < 5 ? 1.25 : 1.0;
    } else if (p.position === 'K' || p.position === 'DEF') {
      priorityMultiplier = currentRound < 15 ? 0.1 : 0.6;
    }

    return {
      player: p,
      proj,
      adjustedScore: proj.vorpValue * priorityMultiplier + proj.projectedPoints * 0.2,
    };
  }).sort((a, b) => b.adjustedScore - a.adjustedScore);

  const bestVal = scoredAvailable[0];

  // 2. POSITIONAL NEED (Fills an empty starting slot before tier drops)
  const neededPositions: PlayerPosition[] = [];
  if (userCounts.QB < (settings.roster.qb || 1)) neededPositions.push('QB');
  if (userCounts.RB < (settings.roster.rb || 2)) neededPositions.push('RB');
  if (userCounts.WR < (settings.roster.wr || 3)) neededPositions.push('WR');
  if (userCounts.TE < (settings.roster.te || 1)) neededPositions.push('TE');
  if (currentRound >= 10) {
    if (userCounts.LB < (settings.roster.lb || 0)) neededPositions.push('LB');
    if (userCounts.DL < (settings.roster.dl || 0)) neededPositions.push('DL');
    if (userCounts.DB < (settings.roster.db || 0)) neededPositions.push('DB');
  }

  const needCandidate = scoredAvailable.find(s => 
    s.player.id !== bestVal?.player.id && neededPositions.includes(s.player.position)
  ) || scoredAvailable[1];

  // 3. HIGH UPSIDE (Ceiling / Vegas Implied)
  const upsideCandidate = scoredAvailable
    .filter(s => s.player.id !== bestVal?.player.id && s.player.id !== needCandidate?.player.id)
    .sort((a, b) => b.proj.ceiling - a.proj.ceiling)[0] || scoredAvailable[2];

  const recommendations: PickRecommendation[] = [];

  if (bestVal) {
    recommendations.push({
      type: 'BEST_VALUE',
      title: 'Top Value / Highest VORP',
      badge: `+${bestVal.proj.vorpValue} VORP`,
      player: bestVal.player,
      projectedPoints: bestVal.proj.projectedPoints,
      vorpValue: bestVal.proj.vorpValue,
      rationale: `${bestVal.player.name} offers the single largest marginal scoring edge (+${bestVal.proj.vorpValue} VORP) over remaining replacement baseline in ${settings.name}.`,
    });
  }

  if (needCandidate) {
    const emptyCount = (settings.roster[needCandidate.player.position.toLowerCase() as keyof typeof settings.roster] || 0) - userCounts[needCandidate.player.position];
    const isStarter = emptyCount > 0;
    recommendations.push({
      type: 'POSITION_NEED',
      title: isStarter ? `Roster Construction (${needCandidate.player.position})` : `Bench Reserve (${needCandidate.player.position})`,
      badge: isStarter ? `${emptyCount} Slot${emptyCount > 1 ? 's' : ''} Needed` : 'Bench Depth',
      player: needCandidate.player,
      projectedPoints: needCandidate.proj.projectedPoints,
      vorpValue: needCandidate.proj.vorpValue,
      rationale: isStarter
        ? `Fills critical starting ${needCandidate.player.position} requirement. Snagging ${needCandidate.player.name} now secures positional integrity before a tier drop.`
        : `Primary starters are locked! Stashing ${needCandidate.player.name} provides valuable bench depth, bye-week coverage, and high-floor insurance.`,
    });
  }

  if (upsideCandidate) {
    recommendations.push({
      type: 'HIGH_UPSIDE',
      title: 'Maximum Ceiling League-Winner',
      badge: `${upsideCandidate.proj.ceiling} Ceiling Pts`,
      player: upsideCandidate.player,
      projectedPoints: upsideCandidate.proj.projectedPoints,
      vorpValue: upsideCandidate.proj.vorpValue,
      rationale: `Boom-bust league-winning ceiling (${upsideCandidate.proj.ceiling} pts) backed by high implied game script and red-zone opportunity share.`,
    });
  }

  // Tier Cliff Detection
  let tierCliffWarning: string | null = null;
  const remainingTier1QBs = availablePlayers.filter(p => p.position === 'QB' && p.tier <= 1);
  const remainingTier1RBs = availablePlayers.filter(p => p.position === 'RB' && p.tier <= 1);

  if (settings.roster.qb >= 3 && remainingTier1QBs.length > 0 && remainingTier1QBs.length <= 2) {
    tierCliffWarning = `⚠️ QB TIER CLIFF WARNING: Only ${remainingTier1QBs.length} Tier-1 QB${remainingTier1QBs.length > 1 ? 's' : ''} left (${remainingTier1QBs.map(p => p.name).join(', ')}). A severe 6+ PPG drop-off occurs after this tier!`;
  } else if (remainingTier1RBs.length === 1) {
    tierCliffWarning = `⚠️ RB TIER CLIFF: ${remainingTier1RBs[0].name} is the final Tier-1 workhorse RB remaining on the board!`;
  }

  // Turn Preview Calculation
  let turnPreview: DraftRecommendationsResult['turnPreview'] = null;
  
  // Calculate next pick for user
  let nextUserPick = -1;
  for (let pIdx = currentPickIndex + 1; pIdx < currentPickIndex + numTeams * 2; pIdx++) {
    const rIdx = Math.floor(pIdx / numTeams);
    const roundIsOdd = rIdx % 2 === 0;
    const teamAtPick = roundIsOdd ? (pIdx % numTeams) : (numTeams - 1 - (pIdx % numTeams));
    if (teamAtPick === userDraftSlot) {
      nextUserPick = pIdx + 1; // 1-based
      break;
    }
  }

  if (nextUserPick > 0) {
    const picksAway = nextUserPick - (currentPickIndex + 1);
    const projectedLeftovers = scoredAvailable.slice(picksAway, picksAway + 4).map(s => s.player);
    
    let turnAdvice = `You pick next at #${nextUserPick} (${picksAway} picks away).`;
    if (picksAway <= 2) {
      turnAdvice += ` You are on the turn! You can execute a back-to-back 2-player stack or address QB and WR together.`;
    } else {
      turnAdvice += ` Expect high-tier players to be selected before your turn; lock in your top priority now.`;
    }

    turnPreview = {
      nextPickNumber: nextUserPick,
      picksAway,
      projectedRemaining: projectedLeftovers,
      turnAdvice,
    };
  }

  return {
    recommendations,
    tierCliffWarning,
    turnPreview,
  };
}

/**
 * Simulates intelligent, needs-aware opponent drafting
 */
export function simulateOpponentPick(
  availablePlayers: Player[],
  opponentTeam: DraftTeam,
  settings: LeagueSettings,
  currentRound: number
): Player {
  const baselines = calculatePositionBaselines(availablePlayers, settings);
  const roster = opponentTeam.roster || [];

  const counts: Record<PlayerPosition, number> = {
    QB: roster.filter(p => p.position === 'QB').length,
    RB: roster.filter(p => p.position === 'RB').length,
    WR: roster.filter(p => p.position === 'WR').length,
    TE: roster.filter(p => p.position === 'TE').length,
    K: roster.filter(p => p.position === 'K').length,
    DEF: roster.filter(p => p.position === 'DEF').length,
    DL: roster.filter(p => p.position === 'DL').length,
    LB: roster.filter(p => p.position === 'LB').length,
    DB: roster.filter(p => p.position === 'DB').length,
  };

  const qbLimit = (settings.roster.qb || 1) + (currentRound > 12 ? 1 : 0);
  const rbLimit = (settings.roster.rb || 2) + 3;
  const wrLimit = (settings.roster.wr || 3) + 3;
  const teLimit = (settings.roster.te || 1) + 1;

  // Score available players with needs weighting and slight ADP variance
  const candidates = availablePlayers.slice(0, 15).map((player, idx) => {
    const proj = calculateProjection(player, settings, baselines);
    let needMultiplier = 1.0;

    if (player.position === 'QB') {
      if (counts.QB < (settings.roster.qb || 1)) needMultiplier = 1.5;
      else if (counts.QB >= qbLimit) needMultiplier = 0.2;
    } else if (player.position === 'RB') {
      if (counts.RB < (settings.roster.rb || 2)) needMultiplier = 1.3;
      else if (counts.RB >= rbLimit) needMultiplier = 0.5;
    } else if (player.position === 'WR') {
      if (counts.WR < (settings.roster.wr || 3)) needMultiplier = 1.35;
      else if (counts.WR >= wrLimit) needMultiplier = 0.5;
    } else if (player.position === 'TE') {
      if (counts.TE < (settings.roster.te || 1)) needMultiplier = 1.25;
      else if (counts.TE >= teLimit) needMultiplier = 0.3;
    } else if (player.position === 'K' || player.position === 'DEF') {
      // Don't draft K or DEF early
      needMultiplier = currentRound < 14 ? 0.05 : counts[player.position] === 0 ? 1.0 : 0.1;
    } else if (player.position === 'LB' || player.position === 'DL' || player.position === 'DB') {
      needMultiplier = currentRound < 8 ? 0.2 : counts[player.position] < 2 ? 1.1 : 0.6;
    }

    // Realistic ADP noise: add a slight random fluctuation
    const noise = 1.0 + (Math.random() * 0.2 - 0.1);
    const score = (proj.vorpValue + proj.projectedPoints * 0.15) * needMultiplier * noise - idx * 0.3;

    return { player, score };
  });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.player || availablePlayers[0];
}

/**
 * Evaluates the completed drafted roster and produces an in-depth draft grade recap
 */
export function evaluateDraftedRoster(
  userRoster: Player[],
  draftPicks: DraftPick[],
  settings: LeagueSettings,
  allPlayers: Player[]
): DraftGradeReport {
  const baselines = calculatePositionBaselines(allPlayers, settings);
  const totalWeekly = userRoster.reduce((sum, p) => {
    const proj = calculateProjection(p, settings, baselines);
    return sum + proj.projectedPoints;
  }, 0);

  // Position ratings
  const qbPlayers = userRoster.filter(p => p.position === 'QB');
  const rbPlayers = userRoster.filter(p => p.position === 'RB');
  const wrPlayers = userRoster.filter(p => p.position === 'WR');
  const tePlayers = userRoster.filter(p => p.position === 'TE');
  const idpPlayers = userRoster.filter(p => ['DL', 'LB', 'DB'].includes(p.position));

  const qbPts = qbPlayers.reduce((s, p) => s + calculateProjection(p, settings, baselines).projectedPoints, 0);
  const rbPts = rbPlayers.reduce((s, p) => s + calculateProjection(p, settings, baselines).projectedPoints, 0);
  const wrPts = wrPlayers.reduce((s, p) => s + calculateProjection(p, settings, baselines).projectedPoints, 0);
  const tePts = tePlayers.reduce((s, p) => s + calculateProjection(p, settings, baselines).projectedPoints, 0);
  const idpPts = idpPlayers.reduce((s, p) => s + calculateProjection(p, settings, baselines).projectedPoints, 0);

  const positionGrades: Record<string, { grade: string; points: number }> = {
    'Quarterbacks': {
      grade: qbPts > (settings.roster.qb * 18) ? 'A+' : qbPts > (settings.roster.qb * 15) ? 'A' : 'B+',
      points: qbPts,
    },
    'Running Backs': {
      grade: rbPts > (settings.roster.rb * 14) ? 'A' : rbPts > (settings.roster.rb * 10) ? 'B+' : 'B',
      points: rbPts,
    },
    'Wide Receivers': {
      grade: wrPts > (settings.roster.wr * 12) ? 'A+' : wrPts > (settings.roster.wr * 9) ? 'A' : 'B+',
      points: wrPts,
    },
    'Tight Ends': {
      grade: tePts > 12 ? 'A+' : tePts > 7 ? 'B+' : 'C+',
      points: tePts,
    },
    'IDP & Defense': {
      grade: idpPts > 10 ? 'A' : 'B+',
      points: idpPts,
    },
  };

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (qbPlayers.length >= (settings.roster.qb || 1) && qbPts > 40) {
    strengths.push(`Dominant QB Room: Secured ${qbPlayers.length} high-ceiling starting QBs for ${qbPts.toFixed(1)} projected points.`);
  } else if (qbPlayers.length < (settings.roster.qb || 1)) {
    weaknesses.push(`Unfilled QB Starter: Lacking sufficient starting quarterbacks to maximize weekly floor.`);
  }

  if (wrPlayers.length >= (settings.roster.wr || 3) && wrPts > 35) {
    strengths.push(`Deep WR Corps: Multi-tier receiver depth provides high target-share stability.`);
  }

  if (rbPlayers.length >= (settings.roster.rb || 2)) {
    strengths.push(`Balanced RB Backfield: Reliable goal-line rush volume and touchdown equity.`);
  }

  // Value picks
  const userPicks = draftPicks.filter(p => p.isUser);
  const bestValuePick = userPicks.length > 0 ? {
    player: userPicks[0].player,
    round: userPicks[0].round,
    pick: userPicks[0].pickNumber,
  } : null;

  const stealOfTheDraft = userPicks.length > 3 ? {
    player: userPicks[userPicks.length - 2].player,
    round: userPicks[userPicks.length - 2].round,
    pick: userPicks[userPicks.length - 2].pickNumber,
  } : bestValuePick;

  const overallGrade: DraftGradeReport['overallGrade'] = 
    totalWeekly > 115 ? 'A+' :
    totalWeekly > 100 ? 'A' :
    totalWeekly > 90 ? 'A-' :
    totalWeekly > 80 ? 'B+' : 'B';

  const projectedSeasonFinish = overallGrade.startsWith('A') ? 1 : 2;

  const verdictSummary = `Outstanding draft execution. Your team is projected to score ${totalWeekly.toFixed(1)} weekly median points with high conviction starting depth calibrated to ${settings.name}.`;

  return {
    overallGrade,
    projectedWeeklyPoints: totalWeekly,
    projectedSeasonFinish,
    strengths,
    weaknesses,
    positionGrades,
    bestValuePick,
    stealOfTheDraft,
    verdictSummary,
  };
}
