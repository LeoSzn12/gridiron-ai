import type { 
  Player, 
  PlayerPosition, 
  SleeperRawPlayer, 
  SleeperUserLeague, 
  SleeperRoster, 
  SleeperTrendingPlayer, 
  LeagueSettings,
  InjuryStatus
} from '../types';
import { PLAYERS_DATABASE } from '../data/mockData';

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';
const PLAYERS_CACHE_KEY = 'gridiron_sleeper_players_cache_v1';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 Hours

// In-memory player database cache
let inMemoryPlayersCache: Record<string, SleeperRawPlayer> | null = null;

/**
 * 1. Fetch entire NFL player directory from Sleeper (with localStorage cache)
 */
export async function fetchSleeperNFLPlayers(): Promise<Record<string, SleeperRawPlayer>> {
  if (inMemoryPlayersCache && Object.keys(inMemoryPlayersCache).length > 0) {
    return inMemoryPlayersCache;
  }

  // Check LocalStorage cache
  try {
    const cached = localStorage.getItem(PLAYERS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
        inMemoryPlayersCache = parsed.data;
        return parsed.data;
      }
    }
  } catch (err) {
    console.warn('Could not read Sleeper player cache from storage:', err);
  }

  try {
    const res = await fetch(`${SLEEPER_BASE_URL}/players/nfl`);
    if (!res.ok) throw new Error(`Sleeper API responded with status ${res.status}`);
    const data: Record<string, SleeperRawPlayer> = await res.json();
    
    inMemoryPlayersCache = data;

    // Cache in localStorage asynchronously (safely catching quota limits)
    try {
      localStorage.setItem(PLAYERS_CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data,
      }));
    } catch {
      // Ignore quota exceeded error for large payloads
    }

    return data;
  } catch (err) {
    console.warn('Failed to fetch live Sleeper NFL player database, using enhanced fallback:', err);
    return {};
  }
}

/**
 * 2. Convert a Sleeper raw player into our rich Gridiron AI Player interface
 */
export function convertSleeperToGridironPlayer(
  raw: SleeperRawPlayer, 
  existingMatch?: Player
): Player {
  if (existingMatch) {
    return {
      ...existingMatch,
      injuryStatus: mapSleeperInjury(raw.injury_status),
      injuryNote: raw.injury_notes || existingMatch.injuryNote,
      avatar: `https://sleepercdn.com/content/nfl/players/thumb/${raw.player_id}.jpg`,
    };
  }

  const pos = mapPosition(raw.position || raw.fantasy_positions?.[0] || 'WR');
  const team = raw.team || 'FA';
  const name = raw.full_name || `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || 'Unknown Player';

  return {
    id: raw.player_id,
    name,
    team,
    position: pos,
    jerseyNumber: 0,
    opponent: 'TBD',
    isHome: true,
    gameTime: 'Sun 1:00 PM EST',
    avatar: `https://sleepercdn.com/content/nfl/players/thumb/${raw.player_id}.jpg`,
    injuryStatus: mapSleeperInjury(raw.injury_status),
    injuryNote: raw.injury_notes || undefined,
    rosterPct: raw.depth_chart_order === 1 ? 85 : 45,
    faabRecommendedPct: raw.depth_chart_order === 1 ? 25 : 8,
    isWaiverTarget: (raw.depth_chart_order || 99) <= 2,
    waiverTrend: 'RISING',
    tradeValue: pos === 'QB' ? 38 : pos === 'RB' ? 34 : pos === 'WR' ? 30 : 15,
    adp: 95,
    tier: (raw.depth_chart_order || 3) <= 1 ? 2 : 4,
    stats: {
      snapSharePct: raw.depth_chart_order === 1 ? 78 : 38,
      targetSharePct: pos === 'WR' || pos === 'TE' ? 18 : 8,
      carrySharePct: pos === 'RB' ? 55 : 0,
      redZoneOpportunitiesPerGame: 1.8,
      recentAveragePoints: 12.4,
      seasonTotalPoints: 135.0,
      brokenTackleRate: 14,
      yardsPerRouteRun: 1.85,
    },
    weather: {
      temperature: 70,
      windSpeed: 6,
      windGust: 9,
      precipitation: 'None',
      isDome: ['DAL', 'DET', 'IND', 'LV', 'LAR', 'LAC', 'MIN', 'NO', 'ARI', 'ATL', 'HOU'].includes(team),
      stadiumName: `${team} Stadium`,
      turfType: 'FieldTurf',
      riskLevel: 'LOW',
      summary: `Standard conditions at ${team} venue.`,
    },
    vegas: {
      gameSpread: -2.5,
      overUnder: 46.5,
      impliedTeamTotal: 24.5,
      opponentImpliedTotal: 22.0,
      gameScriptTrend: 'High-Scoring Shootout',
      props: {
        passingYardsOU: pos === 'QB' ? 240.5 : undefined,
        passingTDsOU: pos === 'QB' ? 1.7 : undefined,
        rushingYardsOU: pos === 'RB' ? 64.5 : pos === 'QB' ? 18.5 : undefined,
        receivingYardsOU: pos === 'WR' || pos === 'TE' ? 58.5 : undefined,
        receptionsOU: pos === 'WR' || pos === 'TE' ? 4.5 : 2.5,
        anytimeTDOdds: pos === 'RB' ? '-110' : pos === 'WR' ? '+130' : '+220',
      },
    },
    defense: {
      opponentTeam: 'OPP',
      rankVsPosition: 16,
      epaPerPlayRank: 16,
      pressureRatePct: 28.0,
      passRushWinRateRank: 16,
      runDefenseRank: 16,
      coverageScheme: 'Balanced',
      slotVulnerability: 'Neutral',
      redZoneTDAllowedPct: 52.0,
      matchupGrade: 'B',
    },
    coaching: {
      headCoach: 'Head Coach',
      offensiveCoordinator: 'OC',
      paceRank: 14,
      secondsPerSnap: 25.5,
      proe: 1.2,
      neutralPassRate: 56,
      runScheme: 'Zone Running (Wide/Inside)',
      redZoneTendency: 'Balanced Mixed',
    },
    recentGames: [
      { week: 1, opponent: 'OPP', points: 14.2, statsSummary: 'Active starter role', snapPct: 75 },
    ],
    aiAnalysisSummary: `Sleeper profile for ${name}. Projected high-utility volume target.`,
  };
}

function mapSleeperInjury(status?: string | null): InjuryStatus {
  if (!status) return 'HEALTHY';
  const s = status.toUpperCase();
  if (s === 'QUESTIONABLE' || s === 'Q') return 'QUESTIONABLE';
  if (s === 'DOUBTFUL' || s === 'D') return 'DOUBTFUL';
  if (s === 'OUT' || s === 'O') return 'OUT';
  if (s === 'IR' || s === 'INJURED_RESERVE') return 'IR';
  return 'HEALTHY';
}

function mapPosition(pos: string): PlayerPosition {
  const p = pos.toUpperCase();
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p)) return p as PlayerPosition;
  if (p === 'DL' || p === 'DE' || p === 'DT') return 'DL';
  if (p === 'LB' || p === 'ILB' || p === 'OLB') return 'LB';
  if (p === 'DB' || p === 'CB' || p === 'S' || p === 'FS' || p === 'SS') return 'DB';
  return 'WR';
}

/**
 * 3. Fetch Live 24-Hour Trending Waiver Additions from Sleeper
 */
export async function fetchSleeperTrending(
  type: 'add' | 'drop' = 'add', 
  allPlayersList: Player[] = PLAYERS_DATABASE
): Promise<SleeperTrendingPlayer[]> {
  try {
    const res = await fetch(`${SLEEPER_BASE_URL}/players/nfl/trending/${type}?lookback_hours=24&limit=25`);
    if (!res.ok) throw new Error('Trending API fetch failed');
    const data: Array<{ player_id: string; count: number }> = await res.json();

    return data.map(item => {
      const matched = allPlayersList.find(p => p.id === item.player_id || p.name.toLowerCase().includes(item.player_id.toLowerCase()));
      return {
        player_id: item.player_id,
        count: item.count,
        trendType: type === 'add' ? 'ADD' : 'DROP',
        player: matched,
      };
    });
  } catch (err) {
    console.warn('Failed to fetch Sleeper trending wire:', err);
    return [];
  }
}

/**
 * 4. Fetch User Leagues from Sleeper by Username
 */
export async function fetchSleeperUserLeagues(username: string, season: string = '2024'): Promise<{
  userId: string;
  leagues: SleeperUserLeague[];
}> {
  const userRes = await fetch(`${SLEEPER_BASE_URL}/user/${encodeURIComponent(username)}`);
  if (!userRes.ok) throw new Error(`User "${username}" not found on Sleeper.`);
  const userData = await userRes.json();
  const userId = userData.user_id;

  const leaguesRes = await fetch(`${SLEEPER_BASE_URL}/user/${userId}/leagues/nfl/${season}`);
  if (!leaguesRes.ok) throw new Error('Could not fetch leagues for user.');
  const leaguesData: SleeperUserLeague[] = await leaguesRes.json();

  return {
    userId,
    leagues: leaguesData,
  };
}

/**
 * 5. Fetch Rosters & Users for a Sleeper League
 */
export async function fetchSleeperLeagueRosters(
  leagueId: string, 
  allPlayersMap: Record<string, SleeperRawPlayer>
): Promise<{
  rosters: SleeperRoster[];
  hydratedPlayers: Player[];
}> {
  const [rostersRes, usersRes] = await Promise.all([
    fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/rosters`),
    fetch(`${SLEEPER_BASE_URL}/league/${leagueId}/users`),
  ]);

  if (!rostersRes.ok) throw new Error('Failed to fetch league rosters.');
  const rawRosters: any[] = await rostersRes.json();
  const rawUsers: any[] = usersRes.ok ? await usersRes.json() : [];

  const userMap = new Map<string, any>();
  rawUsers.forEach(u => userMap.set(u.user_id, u));

  const allPlayerIds = new Set<string>();

  const rosters: SleeperRoster[] = rawRosters.map(r => {
    const user = userMap.get(r.owner_id);
    (r.players || []).forEach((pid: string) => allPlayerIds.add(pid));
    return {
      roster_id: r.roster_id,
      owner_id: r.owner_id,
      league_id: leagueId,
      players: r.players || [],
      starters: r.starters || [],
      reserve: r.reserve || [],
      settings: r.settings || { wins: 0, losses: 0, fpts: 0 },
      owner_display_name: user?.display_name || `Team ${r.roster_id}`,
      team_name: user?.metadata?.team_name || user?.display_name || `Team ${r.roster_id}`,
      avatar: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : undefined,
    };
  });

  const hydratedPlayers: Player[] = [];
  allPlayerIds.forEach(pid => {
    const existing = PLAYERS_DATABASE.find(p => p.id === pid);
    const raw = allPlayersMap[pid];
    if (raw) {
      hydratedPlayers.push(convertSleeperToGridironPlayer(raw, existing));
    } else if (existing) {
      hydratedPlayers.push(existing);
    }
  });

  return {
    rosters,
    hydratedPlayers,
  };
}

/**
 * 6. Convert Sleeper League to Gridiron LeagueSettings
 */
export function convertSleeperLeagueToSettings(
  sleeperLeague: SleeperUserLeague,
  userTeamName: string = 'My Team'
): LeagueSettings {
  const positions = sleeperLeague.roster_positions || ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DEF'];
  const scoring = sleeperLeague.scoring_settings || {};

  const qbCount = positions.filter(p => p === 'QB').length || 1;
  const rbCount = positions.filter(p => p === 'RB').length || 2;
  const wrCount = positions.filter(p => p === 'WR').length || 2;
  const teCount = positions.filter(p => p === 'TE').length || 1;
  const kCount = positions.filter(p => p === 'K').length || 1;
  const defCount = positions.filter(p => p === 'DEF').length || 1;
  const dbCount = positions.filter(p => p === 'DB' || p === 'CB' || p === 'S').length || 0;
  const dlCount = positions.filter(p => p === 'DL' || p === 'DE' || p === 'DT').length || 0;
  const lbCount = positions.filter(p => p === 'LB' || p === 'ILB' || p === 'OLB').length || 0;
  const benchCount = positions.filter(p => p === 'BN').length || 6;

  return {
    id: `sleeper-${sleeperLeague.league_id}`,
    name: sleeperLeague.name,
    platform: 'Sleeper',
    numTeams: sleeperLeague.total_rosters || 10,
    userTeamName,
    roster: {
      qb: qbCount,
      rb: rbCount,
      wr: wrCount,
      te: teCount,
      k: kCount,
      def: defCount,
      db: dbCount,
      dl: dlCount,
      lb: lbCount,
      bench: benchCount,
      ir: 2,
    },
    offense: {
      passYardsPerPoint: scoring.pass_yd ? Math.round(1 / scoring.pass_yd) : 25,
      passTouchdown: scoring.pass_td ?? 4,
      interception: scoring.pass_int ?? -1,
      pickSixThrown: scoring.pass_int_td ?? -2,
      rushYardsPerPoint: scoring.rush_yd ? Math.round(1 / scoring.rush_yd) : 10,
      rushTouchdown: scoring.rush_td ?? 6,
      recYardsPerPoint: scoring.rec_yd ? Math.round(1 / scoring.rec_yd) : 10,
      recTouchdown: scoring.rec_td ?? 6,
      receptionsPPR: scoring.rec ?? 1.0,
      fumblesLost: scoring.fum_lost ?? -2,
      twoPointConversions: scoring.pass_2pt ?? 2,
      offensiveFumbleReturnTD: 6,
    },
    kicker: {
      fg0_19: scoring.fgm_0_19 ?? 3,
      fg20_29: scoring.fgm_20_29 ?? 3,
      fg30_39: scoring.fgm_30_39 ?? 3,
      fg40_49: scoring.fgm_40_49 ?? 4,
      fg50Plus: scoring.fgm_50p ?? 5,
      fg60Plus: scoring.fgm_60p ?? 6,
      patMade: scoring.xpm ?? 1,
      patMissed: scoring.xpmiss ?? -1,
    },
    defTeam: {
      sack: scoring.sack ?? 1,
      interception: scoring.int ?? 2,
      fumbleRecovery: scoring.fum_rec ?? 2,
      touchdown: scoring.def_td ?? 6,
      safety: scoring.safe ?? 2,
      blockKick: scoring.blk_kick ?? 2,
      kickPuntReturnTD: scoring.kr_td ?? 6,
      ptsAllowed0: scoring.pts_allow_0 ?? 10,
      ptsAllowed1_6: scoring.pts_allow_1_6 ?? 7,
      ptsAllowed7_13: scoring.pts_allow_7_13 ?? 4,
      ptsAllowed14_20: scoring.pts_allow_14_20 ?? 1,
      ptsAllowed21_27: scoring.pts_allow_21_27 ?? 0,
      ptsAllowed28_34: scoring.pts_allow_28_34 ?? -1,
      ptsAllowed35Plus: scoring.pts_allow_35p ?? -4,
      extraPointReturned: 2,
    },
    idp: {
      sack: scoring.idp_sack ?? 2,
      interception: scoring.idp_int ?? 3,
      fumbleForce: scoring.idp_ff ?? 2,
      fumbleRecovery: scoring.idp_fum_rec ?? 2,
      defensiveTouchdown: scoring.idp_def_td ?? 6,
      safety: scoring.idp_safe ?? 2,
      blockKick: scoring.idp_blk_kick ?? 2,
      soloTackle: scoring.idp_tkl_solo ?? 1.5,
      assistedTackle: scoring.idp_tkl_ast ?? 0.75,
      passDefended: scoring.idp_pass_def ?? 1.5,
      tackleForLoss: scoring.idp_tkl_loss ?? 1.5,
    },
  };
}
