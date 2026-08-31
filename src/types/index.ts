export type ScoringFormat = 'PPR' | 'HALF_PPR' | 'STANDARD';
export type PassingTDOption = 4 | 6;
export type InjuryStatus = 'HEALTHY' | 'QUESTIONABLE' | 'DOUBTFUL' | 'OUT' | 'IR';
export type WeatherRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type MatchupDifficulty = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F';
export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'DL' | 'LB' | 'DB' | 'K' | 'DEF';

export interface PlayerStats {
  snapSharePct: number;
  targetSharePct?: number;
  carrySharePct?: number;
  redZoneOpportunitiesPerGame: number;
  recentAveragePoints: number;
  seasonTotalPoints: number;
  targetsPerGame?: number;
  carriesPerGame?: number;
  airYardsSharePct?: number;
  brokenTackleRate?: number;
  yardsPerRouteRun?: number;
  sacksPerGame?: number;
  tacklesPerGame?: number;
  interceptionsPerGame?: number;
  fumbleForcesPerGame?: number;
}

export interface PlayerVegasOdds {
  gameSpread: number;
  overUnder: number;
  impliedTeamTotal: number;
  opponentImpliedTotal: number;
  gameScriptTrend: 'Blowout Alert (Favorable Script)' | 'High-Scoring Shootout' | 'Defensive Grind' | 'Trailing Negative Script';
  props: {
    passingYardsOU?: number;
    passingTDsOU?: number;
    rushingYardsOU?: number;
    rushingAttemptsOU?: number;
    receivingYardsOU?: number;
    receptionsOU?: number;
    sacksOU?: number;
    tacklesOU?: number;
    anytimeTDOdds: string;
    twoPlusTDOdds?: string;
  };
}

export interface PlayerWeather {
  temperature: number;
  windSpeed: number;
  windGust: number;
  precipitation: 'None' | 'Light Rain' | 'Heavy Rain' | 'Snow';
  isDome: boolean;
  stadiumName: string;
  turfType: 'Grass' | 'FieldTurf' | 'Matrix Turf' | 'A-Turf';
  riskLevel: WeatherRiskLevel;
  summary: string;
}

export interface PlayerDefenseMatchup {
  opponentTeam: string;
  rankVsPosition: number;
  epaPerPlayRank: number;
  pressureRatePct: number;
  passRushWinRateRank: number;
  runDefenseRank: number;
  coverageScheme: 'Man Blitz Heavy' | 'Zone Heavy (Cover 3/Quarters)' | 'Two-High Shell Cover 4' | 'Split-Field Cover 2' | 'Balanced';
  slotVulnerability: 'Vulnerable' | 'Neutral' | 'Lockdown';
  redZoneTDAllowedPct: number;
  matchupGrade: MatchupDifficulty;
}

export interface PlayerCoachingContext {
  headCoach: string;
  offensiveCoordinator: string;
  paceRank: number;
  secondsPerSnap: number;
  proe: number;
  neutralPassRate: number;
  runScheme: 'Zone Running (Wide/Inside)' | 'Gap/Power Duo' | 'RPO Spread Option' | 'Balanced Mixed';
  redZoneTendency: 'Pass First' | 'Goal-Line Heavy Run' | 'Dual-Threat QB Keepers' | 'Target Tight Ends' | 'Balanced Mixed';
}

export interface PlayerGameLog {
  week: number;
  opponent: string;
  points: number;
  statsSummary: string;
  snapPct: number;
}

export interface Player {
  id: string;
  name: string;
  team: string;
  position: PlayerPosition;
  jerseyNumber: number;
  opponent: string;
  isHome: boolean;
  gameTime: string;
  avatar: string;
  injuryStatus: InjuryStatus;
  injuryNote?: string;
  rosterPct: number;
  faabRecommendedPct: number;
  isWaiverTarget?: boolean;
  waiverTrend?: 'SURGING' | 'RISING' | 'STEADY';
  tradeValue: number;
  adp: number;
  tier: number;
  stats: PlayerStats;
  weather: PlayerWeather;
  vegas: PlayerVegasOdds;
  defense: PlayerDefenseMatchup;
  coaching: PlayerCoachingContext;
  recentGames: PlayerGameLog[];
  aiAnalysisSummary: string;
}

export interface AIProjection {
  projectedPoints: number;
  floor: number;
  ceiling: number;
  boomProbability: number;
  bustProbability: number;
  startConfidence: number;
  tier: number;
  rankingInPosition: number;
  vorpValue: number;
  factorBreakdown: {
    vegasScore: number;
    weatherScore: number;
    defenseScore: number;
    schemeScore: number;
    volumeScore: number;
    compositeScore: number;
  };
  verdict: 'SMASH START' | 'STRONG START' | 'FLEX CONSIDERATION' | 'BENCH / SIT' | 'AVOID';
  verdictColor: 'emerald' | 'cyan' | 'amber' | 'rose' | 'slate';
  keyEdges: string[];
  risks: string[];
  aiRecommendation: string;
  vegasImpliedFantasyPoints: number;
}

export interface StartSitComparisonResult {
  recommendedPlayerId: string;
  confidenceMargin: number;
  winProbabilityPct: number;
  reasoning: string[];
  keyDifferentiator: string;
}

export interface TradeEvaluation {
  sideAValue: number;
  sideBValue: number;
  netDiff: number;
  fairnessScore: number;
  verdict: 'WIN FOR SIDE A' | 'WIN FOR SIDE B' | 'FAIR TRADE' | 'HIGH RISK / UNBALANCED';
  verdictTone: 'emerald' | 'amber' | 'rose' | 'cyan';
  breakdown: string;
  recommendations: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  dataBadges?: Array<{
    label: string;
    value: string;
    type?: 'positive' | 'warning' | 'negative' | 'neutral';
  }>;
  playerMentions?: string[];
}

// Custom League Scoring & Roster Models
export interface RosterSettings {
  qb: number;
  rb: number;
  wr: number;
  te: number;
  k: number;
  def: number;
  db: number;
  dl: number;
  lb: number;
  bench: number;
  ir: number;
}

export interface OffenseScoringSettings {
  passYardsPerPoint: number;
  passTouchdown: number;
  interception: number;
  pickSixThrown: number;
  rushYardsPerPoint: number;
  rushTouchdown: number;
  recYardsPerPoint: number;
  recTouchdown: number;
  receptionsPPR: number;
  fumblesLost: number;
  twoPointConversions: number;
  offensiveFumbleReturnTD: number;
}

export interface KickerScoringSettings {
  fg0_19: number;
  fg20_29: number;
  fg30_39: number;
  fg40_49: number;
  fg50Plus: number;
  fg60Plus: number;
  patMade: number;
  patMissed: number;
}

export interface DefTeamScoringSettings {
  sack: number;
  interception: number;
  fumbleRecovery: number;
  touchdown: number;
  safety: number;
  blockKick: number;
  kickPuntReturnTD: number;
  ptsAllowed0: number;
  ptsAllowed1_6: number;
  ptsAllowed7_13: number;
  ptsAllowed14_20: number;
  ptsAllowed21_27: number;
  ptsAllowed28_34: number;
  ptsAllowed35Plus: number;
  extraPointReturned: number;
}

export interface IdpScoringSettings {
  sack: number;
  interception: number;
  fumbleForce: number;
  fumbleRecovery: number;
  defensiveTouchdown: number;
  safety: number;
  blockKick: number;
  soloTackle: number;
  assistedTackle: number;
  passDefended: number;
  tackleForLoss: number;
}

export interface LeagueSettings {
  id: string;
  name: string;
  platform: 'Yahoo' | 'Sleeper' | 'ESPN' | 'Custom';
  numTeams: number;
  userTeamName: string;
  roster: RosterSettings;
  offense: OffenseScoringSettings;
  kicker: KickerScoringSettings;
  defTeam: DefTeamScoringSettings;
  idp: IdpScoringSettings;
}

// Live Draft Models
export interface DraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  player: Player;
  isUser: boolean;
  aiGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+';
  aiAnalysis: string;
}

export interface DraftTeam {
  id: string;
  name: string;
  isUser: boolean;
  avatar: string;
  roster: Player[];
}

export interface DraftState {
  currentRound: number;
  currentPick: number;
  isFinished: boolean;
  picks: DraftPick[];
  teams: DraftTeam[];
}

// Monte Carlo Simulation Models
export interface MonteCarloSimulationResult {
  simulationsRun: number;
  userTeamName: string;
  opponentTeamName: string;
  userWinProbabilityPct: number;
  userMedianScore: number;
  opponentMedianScore: number;
  userScore10thPercentile: number;
  userScore90thPercentile: number;
  opponentScore10thPercentile: number;
  opponentScore90thPercentile: number;
  scoreDifferenceSpread: number;
  userBoomProbabilityPct: number;
  userBustProbabilityPct: number;
  distributionBuckets: Array<{
    scoreRange: string;
    userCount: number;
    opponentCount: number;
  }>;
  keyWinDrivers: string[];
  keyRiskFactors: string[];
}

// Live NFL Gamecast & Drive Simulator Models
export interface SimulatedPlay {
  id: string;
  quarter: number;
  clock: string;
  down: number;
  yardsToGo: number;
  yardline: number; // 0 to 100
  possessionTeam: string;
  description: string;
  isRedZone: boolean;
  isTouchdown: boolean;
  isTurnover: boolean;
  isSack: boolean;
  fantasyImpact: {
    playerName: string;
    pointsAdded: number;
    actionType: string;
  };
}

export interface LiveDriveState {
  driveNumber: number;
  teamWithBall: string;
  currentQuarter: number;
  currentClock: string;
  downAndDistance: string;
  yardline: number;
  isRedZone: boolean;
  plays: SimulatedPlay[];
  userLiveScore: number;
  opponentLiveScore: number;
}

// Audio Briefing Model
export interface AudioBriefingScript {
  title: string;
  timestamp: string;
  durationSeconds: number;
  hostName: string;
  leagueContext: string;
  paragraphs: string[];
}

// Multi-Factor Decision Synthesis Engine Types
export interface DecisionFactorWeights {
  vegasWeight: number;      // e.g. 0.30
  matchupWeight: number;    // e.g. 0.25
  weatherWeight: number;    // e.g. 0.15
  schemeWeight: number;     // e.g. 0.15
  scarcityWeight: number;   // e.g. 0.15
}

export interface PlayerCompositeDecision {
  playerId: string;
  playerName: string;
  position: PlayerPosition;
  team: string;
  opponent: string;
  projectedPoints: number;
  alphaIndex: number; // 0 - 100 overall composite score
  confidenceRating: number; // 0 - 100%
  recommendationTier: 'SMASH_START' | 'STRONG_START' | 'FLEX_PLAY' | 'VOLATILE_SIT' | 'BENCH_LOCK';
  subScores: {
    vegasEfficiency: number;    // 0 - 100
    matchupAdvantage: number;   // 0 - 100
    weatherConditions: number;  // 0 - 100
    schemePaceCatalyst: number; // 0 - 100
    leagueScarcityVORP: number; // 0 - 100
  };
  keyPositiveFactors: string[];
  keyRiskFactors: string[];
  sportsbookLineEdge: string;
}

// Multi-Sportsbook Comparison Model
export interface MultiSportsbookLine {
  sportsbook: 'DraftKings' | 'FanDuel' | 'BetMGM' | 'Caesars' | 'ESPN BET';
  spread: string;
  spreadOdds: string;
  overUnder: number;
  totalOdds: string;
  moneyline: string;
  anytimeTDOdds: string;
  passingYardsLine?: number;
  rushingYardsLine?: number;
  receivingYardsLine?: number;
  bestValueBadge?: string;
}

// Sleeper Live API Models
export interface SleeperRawPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  team: string | null;
  position: string;
  fantasy_positions?: string[];
  injury_status?: string | null;
  injury_notes?: string | null;
  depth_chart_order?: number | null;
  years_exp?: number;
  age?: number;
  search_full_name?: string;
  status?: string;
}

export interface SleeperUserLeague {
  league_id: string;
  name: string;
  season: string;
  total_rosters: number;
  status: string;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  avatar?: string;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string;
  league_id: string;
  players: string[];
  starters: string[];
  reserve?: string[];
  settings: {
    wins: number;
    losses: number;
    fpts: number;
    fpts_against?: number;
  };
  owner_display_name?: string;
  team_name?: string;
  avatar?: string;
}

export interface SleeperTrendingPlayer {
  player_id: string;
  count: number;
  player?: Player;
  trendType: 'ADD' | 'DROP';
}

// Lineup Optimizer Models
export type LineupSolverMode = 'SAFE_FLOOR' | 'BALANCED_ALPHA' | 'MAX_BOOM_CEILING';

export interface LineupSwapRecommendation {
  position: string;
  currentStarter: Player;
  recommendedStarter: Player;
  projectedPointDiff: number;
  alphaIndexDiff: number;
  rationale: string;
  stackBenefit?: string;
}

export interface OptimalLineupResult {
  mode: LineupSolverMode;
  starters: Player[];
  bench: Player[];
  totalProjectedPoints: number;
  totalFloor: number;
  totalCeiling: number;
  totalAlphaIndex: number;
  projectedPointGainVsCurrent: number;
  swaps: LineupSwapRecommendation[];
  correlationStacks: Array<{
    qb: string;
    target: string;
    correlationGrade: 'ELITE' | 'HIGH' | 'MODERATE';
    rationale: string;
  }>;
}

// Multi-League Profile Model
export type FantasyPlatform = 'yahoo' | 'sleeper' | 'espn' | 'custom';

export interface LeagueProfile {
  id: string;
  name: string;
  platform: FantasyPlatform;
  settings: LeagueSettings;
  myRosterIds: string[];
  opponentRosterIds: string[];
  userTeamName: string;
  opponentTeamName: string;
  externalLeagueId?: string;
  externalTeamId?: string;
  lastSyncedAt?: string;
}

// Yahoo Fantasy Integration Models
export interface YahooUserLeague {
  league_key: string;
  league_id: string;
  name: string;
  num_teams: number;
  scoring_type: string;
  season: string;
  url?: string;
  user_team?: {
    team_key: string;
    team_id: string;
    name: string;
    team_logos?: Array<{ size: string; url: string }>;
  };
}

export interface YahooRosterPlayer {
  player_key: string;
  player_id: string;
  name: {
    full: string;
    first: string;
    last: string;
  };
  editorial_team_abbr: string;
  display_position: string;
  selected_position?: {
    position: string;
  };
  status?: string;
  status_details?: string;
}

export interface YahooFastImportResult {
  matchedPlayers: Player[];
  unmatchedNames: string[];
  totalParsed: number;
  sourceText: string;
}

export interface ActionCenterAlert {
  id: string;
  type: 'INJURY' | 'WEATHER' | 'TRENDING_WAIVER' | 'OPTIMAL_SWAP' | 'STREAMER';
  severity: 'URGENT' | 'HIGH' | 'MODERATE' | 'INFO';
  title: string;
  description: string;
  primaryActionLabel?: string;
  player?: Player;
  replacementPlayer?: Player;
  timestamp: string;
}




