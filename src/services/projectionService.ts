import type { Player, LeagueSettings } from '../types';

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';
const PROJECTIONS_CACHE_KEY_PREFIX = 'gridiron_projections_cache_';
const CACHE_TTL_MS = 1000 * 60 * 60 * 4; // 4 Hours

export interface RawWeeklyStatLine {
  pass_yd?: number;
  pass_td?: number;
  pass_int?: number;
  pass_2pt?: number;
  rush_yd?: number;
  rush_td?: number;
  rush_2pt?: number;
  rec_yd?: number;
  rec_td?: number;
  rec?: number;
  rec_2pt?: number;
  fum_lost?: number;
  // Kicking
  fgm_0_19?: number;
  fgm_20_29?: number;
  fgm_30_39?: number;
  fgm_40_49?: number;
  fgm_50p?: number;
  xpm?: number;
  xpmiss?: number;
  // Defense / Special Teams
  sack?: number;
  int?: number;
  fum_rec?: number;
  def_td?: number;
  safe?: number;
  blk_kick?: number;
  pts_allow_0?: number;
  pts_allow_1_6?: number;
  pts_allow_7_13?: number;
  pts_allow_14_20?: number;
  pts_allow_21_27?: number;
  pts_allow_28_34?: number;
  pts_allow_35p?: number;
  // IDP
  idp_tkl_solo?: number;
  idp_tkl_ast?: number;
  idp_sack?: number;
  idp_int?: number;
  idp_ff?: number;
  idp_fum_rec?: number;
  idp_pass_def?: number;
  idp_tkl_loss?: number;
  [key: string]: number | undefined;
}

export interface PlayerWeeklyProjection {
  playerId: string;
  stats: RawWeeklyStatLine;
  projectedPointsCustom: number;
  projectedPointsPPR: number;
  projectedPointsHalfPPR: number;
  projectedPointsStandard: number;
}

// In-memory cache for weekly projections
const inMemoryWeeklyProjections = new Map<string, Record<string, RawWeeklyStatLine>>();

/**
 * 1. Fetch live weekly projections from Sleeper for a given season and week
 */
export async function fetchLiveWeeklyProjections(
  season: string = '2024',
  week: number = 1
): Promise<Record<string, RawWeeklyStatLine>> {
  const cacheKey = `${season}_week_${week}`;

  if (inMemoryWeeklyProjections.has(cacheKey)) {
    return inMemoryWeeklyProjections.get(cacheKey)!;
  }

  // Check LocalStorage cache
  const storageKey = `${PROJECTIONS_CACHE_KEY_PREFIX}${cacheKey}`;
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
        inMemoryWeeklyProjections.set(cacheKey, parsed.data);
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn('Could not read projections cache from storage:', err);
  }

  try {
    const url = `${SLEEPER_BASE_URL}/projections/nfl/${season}/${week}?season_type=regular`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sleeper projections endpoint returned status ${res.status}`);

    const rawData = await res.json();
    const projectionsMap: Record<string, RawWeeklyStatLine> = {};

    if (Array.isArray(rawData)) {
      rawData.forEach((item: any) => {
        if (item.player_id && item.stats) {
          projectionsMap[item.player_id] = item.stats;
        }
      });
    } else if (rawData && typeof rawData === 'object') {
      Object.entries(rawData).forEach(([pid, val]: [string, any]) => {
        projectionsMap[pid] = val.stats || val;
      });
    }

    inMemoryWeeklyProjections.set(cacheKey, projectionsMap);

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: Date.now(),
        data: projectionsMap,
      }));
    } catch {
      // Ignore quota limits
    }

    return projectionsMap;
  } catch (err) {
    console.warn(`Failed to fetch live Sleeper projections for ${season} Week ${week}:`, err);
    return {};
  }
}

/**
 * 2. Calculate dynamic fantasy points for any raw stat line based on custom LeagueSettings
 */
export function calculateCustomScoringPoints(
  stats: RawWeeklyStatLine,
  settings: LeagueSettings,
  position: string = 'WR'
): number {
  let pts = 0;

  // Passing
  if (stats.pass_yd) {
    pts += stats.pass_yd / (settings.offense.passYardsPerPoint || 25);
  }
  if (stats.pass_td) {
    pts += stats.pass_td * (settings.offense.passTouchdown ?? 4);
  }
  if (stats.pass_int) {
    pts += stats.pass_int * (settings.offense.interception ?? -2);
  }
  if (stats.pass_2pt) {
    pts += stats.pass_2pt * (settings.offense.twoPointConversions ?? 2);
  }

  // Rushing
  if (stats.rush_yd) {
    pts += stats.rush_yd / (settings.offense.rushYardsPerPoint || 10);
  }
  if (stats.rush_td) {
    pts += stats.rush_td * (settings.offense.rushTouchdown ?? 6);
  }
  if (stats.rush_2pt) {
    pts += stats.rush_2pt * (settings.offense.twoPointConversions ?? 2);
  }

  // Receiving
  if (stats.rec_yd) {
    pts += stats.rec_yd / (settings.offense.recYardsPerPoint || 10);
  }
  if (stats.rec_td) {
    pts += stats.rec_td * (settings.offense.recTouchdown ?? 6);
  }
  if (stats.rec) {
    pts += stats.rec * (settings.offense.receptionsPPR ?? 1.0);
  }
  if (stats.rec_2pt) {
    pts += stats.rec_2pt * (settings.offense.twoPointConversions ?? 2);
  }

  // Fumbles
  if (stats.fum_lost) {
    pts += stats.fum_lost * (settings.offense.fumblesLost ?? -2);
  }

  // Kicking
  if (position === 'K') {
    if (stats.fgm_0_19) pts += stats.fgm_0_19 * (settings.kicker.fg0_19 ?? 3);
    if (stats.fgm_20_29) pts += stats.fgm_20_29 * (settings.kicker.fg20_29 ?? 3);
    if (stats.fgm_30_39) pts += stats.fgm_30_39 * (settings.kicker.fg30_39 ?? 3);
    if (stats.fgm_40_49) pts += stats.fgm_40_49 * (settings.kicker.fg40_49 ?? 4);
    if (stats.fgm_50p) pts += stats.fgm_50p * (settings.kicker.fg50Plus ?? 5);
    if (stats.xpm) pts += stats.xpm * (settings.kicker.patMade ?? 1);
    if (stats.xpmiss) pts += stats.xpmiss * (settings.kicker.patMissed ?? -1);
  }

  // Defense / Special Teams
  if (position === 'DEF') {
    if (stats.sack) pts += stats.sack * (settings.defTeam.sack ?? 1);
    if (stats.int) pts += stats.int * (settings.defTeam.interception ?? 2);
    if (stats.fum_rec) pts += stats.fum_rec * (settings.defTeam.fumbleRecovery ?? 2);
    if (stats.def_td) pts += stats.def_td * (settings.defTeam.touchdown ?? 6);
    if (stats.safe) pts += stats.safe * (settings.defTeam.safety ?? 2);
    if (stats.blk_kick) pts += stats.blk_kick * (settings.defTeam.blockKick ?? 2);
    if (stats.pts_allow_0) pts += stats.pts_allow_0 * (settings.defTeam.ptsAllowed0 ?? 10);
    if (stats.pts_allow_1_6) pts += stats.pts_allow_1_6 * (settings.defTeam.ptsAllowed1_6 ?? 7);
    if (stats.pts_allow_7_13) pts += stats.pts_allow_7_13 * (settings.defTeam.ptsAllowed7_13 ?? 4);
    if (stats.pts_allow_14_20) pts += stats.pts_allow_14_20 * (settings.defTeam.ptsAllowed14_20 ?? 1);
  }

  // IDP
  if (['DL', 'LB', 'DB'].includes(position)) {
    if (stats.idp_tkl_solo) pts += stats.idp_tkl_solo * (settings.idp.soloTackle ?? 1.5);
    if (stats.idp_tkl_ast) pts += stats.idp_tkl_ast * (settings.idp.assistedTackle ?? 0.75);
    if (stats.idp_sack) pts += stats.idp_sack * (settings.idp.sack ?? 2);
    if (stats.idp_int) pts += stats.idp_int * (settings.idp.interception ?? 3);
    if (stats.idp_ff) pts += stats.idp_ff * (settings.idp.fumbleForce ?? 2);
    if (stats.idp_fum_rec) pts += stats.idp_fum_rec * (settings.idp.fumbleRecovery ?? 2);
    if (stats.idp_pass_def) pts += stats.idp_pass_def * (settings.idp.passDefended ?? 1.5);
    if (stats.idp_tkl_loss) pts += stats.idp_tkl_loss * (settings.idp.tackleForLoss ?? 1.5);
  }

  return Number(Math.max(0, pts).toFixed(1));
}

/**
 * 3. Ingest live weekly projections into the player list
 */
export function enrichPlayersWithWeeklyProjections(
  players: Player[],
  projectionsMap: Record<string, RawWeeklyStatLine>,
  settings: LeagueSettings
): Player[] {
  if (!projectionsMap || Object.keys(projectionsMap).length === 0) {
    return players;
  }

  return players.map(player => {
    const rawProj = projectionsMap[player.id];
    if (!rawProj) return player;

    // Calculate dynamic points
    const customPoints = calculateCustomScoringPoints(rawProj, settings, player.position);

    // Update vegas props with live projection stats if available
    const updatedProps = { ...player.vegas.props };
    if (player.position === 'QB') {
      if (rawProj.pass_yd) updatedProps.passingYardsOU = Math.round(rawProj.pass_yd);
      if (rawProj.pass_td) updatedProps.passingTDsOU = Number(rawProj.pass_td.toFixed(1));
      if (rawProj.rush_yd) updatedProps.rushingYardsOU = Math.round(rawProj.rush_yd);
    } else if (player.position === 'RB') {
      if (rawProj.rush_yd) updatedProps.rushingYardsOU = Math.round(rawProj.rush_yd);
      if (rawProj.rec_yd) updatedProps.receivingYardsOU = Math.round(rawProj.rec_yd);
      if (rawProj.rec) updatedProps.receptionsOU = Number(rawProj.rec.toFixed(1));
    } else if (player.position === 'WR' || player.position === 'TE') {
      if (rawProj.rec_yd) updatedProps.receivingYardsOU = Math.round(rawProj.rec_yd);
      if (rawProj.rec) updatedProps.receptionsOU = Number(rawProj.rec.toFixed(1));
    }

    return {
      ...player,
      stats: {
        ...player.stats,
        recentAveragePoints: customPoints > 0 ? customPoints : player.stats.recentAveragePoints,
      },
      vegas: {
        ...player.vegas,
        props: updatedProps,
      },
    };
  });
}
