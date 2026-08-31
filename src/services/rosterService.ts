import type { SleeperRoster } from '../types';

const MY_ROSTER_STORAGE_KEY = 'gridiron_my_roster_ids_v1';
const OPPONENT_ROSTER_STORAGE_KEY = 'gridiron_opponent_roster_ids_v1';
const ROSTER_METADATA_STORAGE_KEY = 'gridiron_roster_meta_v1';

export interface RosterMetadata {
  userTeamName: string;
  opponentTeamName: string;
  leagueId: string;
  season: string;
  week: number;
}

// Default 8-Team 3-QB Leo Szn Roster Preset
export const DEFAULT_LEO_SZN_ROSTER_IDS = [
  'lamar-jackson',
  'jayden-daniels',
  'jared-goff',
  'saquon-barkley',
  'derrick-henry',
  'kyren-williams',
  'ceedee-lamb',
  'justin-jefferson',
  'malik-nabers',
  'nico-collins',
  'brian-thomas-jr',
  'brock-bowers',
  'trey-mcbride',
  'brandon-aubrey',
  'bal-def',
  'maxx-crosby',
  'roquan-smith',
  'antoine-winfield-jr',
  'tyrone-tracy',
  'adonai-mitchell',
];

export const DEFAULT_OPPONENT_ROSTER_IDS = [
  'josh-allen',
  'patrick-mahomes',
  'baker-mayfield',
  'bijan-robinson',
  'jahmyr-gibbs',
  'breece-hall',
  'ja-marr-chase',
  'amon-ra-st-brown',
  'aj-brown',
  'marvin-harrison-jr',
  'garrett-wilson',
  'george-kittle',
  'sam-laporta',
  'harrison-butker',
  'sf-def',
  'tj-watt',
  'fred-warner',
  'kyle-hamilton',
  'chuba-hubbard',
  'jaxon-smith-njigba',
];

/**
 * 1. Get saved My Roster Player IDs from storage
 */
export function getSavedMyRosterIds(): string[] {
  try {
    const saved = localStorage.getItem(MY_ROSTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_LEO_SZN_ROSTER_IDS;
}

/**
 * 2. Save My Roster Player IDs to storage
 */
export function saveMyRosterIds(ids: string[]): void {
  try {
    localStorage.setItem(MY_ROSTER_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * 3. Get saved Opponent Roster Player IDs from storage
 */
export function getSavedOpponentRosterIds(): string[] {
  try {
    const saved = localStorage.getItem(OPPONENT_ROSTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_OPPONENT_ROSTER_IDS;
}

/**
 * 4. Save Opponent Roster Player IDs to storage
 */
export function saveOpponentRosterIds(ids: string[]): void {
  try {
    localStorage.setItem(OPPONENT_ROSTER_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/**
 * 5. Get saved Roster Metadata
 */
export function getSavedRosterMetadata(): RosterMetadata {
  try {
    const saved = localStorage.getItem(ROSTER_METADATA_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {
    userTeamName: 'Leo Szn',
    opponentTeamName: 'Mahomes Magic',
    leagueId: 'leo-szn-yahoo',
    season: '2024',
    week: 1,
  };
}

/**
 * 6. Save Roster Metadata
 */
export function saveRosterMetadata(meta: RosterMetadata): void {
  try {
    localStorage.setItem(ROSTER_METADATA_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

/**
 * 7. Synchronize rosters from Sleeper API data
 */
export function syncRostersFromSleeper(
  rosters: SleeperRoster[],
  currentUserId?: string,
  currentUsername?: string
): {
  myRosterIds: string[];
  opponentRosterIds: string[];
  userTeamName: string;
  opponentTeamName: string;
} {
  if (!rosters || rosters.length === 0) {
    return {
      myRosterIds: DEFAULT_LEO_SZN_ROSTER_IDS,
      opponentRosterIds: DEFAULT_OPPONENT_ROSTER_IDS,
      userTeamName: 'Leo Szn',
      opponentTeamName: 'Opponent Team',
    };
  }

  // Find user's roster
  let userRoster = rosters.find(r => 
    (currentUserId && r.owner_id === currentUserId) ||
    (currentUsername && r.owner_display_name?.toLowerCase() === currentUsername.toLowerCase()) ||
    (currentUsername && r.team_name?.toLowerCase().includes(currentUsername.toLowerCase()))
  );

  // If not matched, pick first roster
  if (!userRoster) {
    userRoster = rosters[0];
  }

  // Pick opponent roster (e.g. 2nd roster or adjacent)
  const opponentRoster = rosters.find(r => r.roster_id !== userRoster.roster_id) || rosters[1] || rosters[0];

  const myRosterIds = userRoster.players || [];
  const opponentRosterIds = opponentRoster?.players || [];
  const userTeamName = userRoster.team_name || userRoster.owner_display_name || 'My Team';
  const opponentTeamName = opponentRoster?.team_name || opponentRoster?.owner_display_name || 'Opponent Team';

  saveMyRosterIds(myRosterIds);
  saveOpponentRosterIds(opponentRosterIds);
  saveRosterMetadata({
    userTeamName,
    opponentTeamName,
    leagueId: userRoster.league_id,
    season: '2024',
    week: 1,
  });

  return {
    myRosterIds,
    opponentRosterIds,
    userTeamName,
    opponentTeamName,
  };
}
