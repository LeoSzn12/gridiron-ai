import type { LeagueProfile, LeagueSettings } from '../types';
import { LEO_SZN_YAHOO_PRESET, PLAYERS_DATABASE } from '../data/mockData';

const PROFILES_STORAGE_KEY = 'gridiron_league_profiles_v1';
const ACTIVE_PROFILE_ID_KEY = 'gridiron_active_profile_id_v1';

// Default standard 12-team PPR preset
export const STANDARD_12_PPR_PRESET: LeagueSettings = {
  id: 'standard-12-ppr-yahoo',
  name: 'Standard 12-Team PPR (Yahoo)',
  platform: 'Yahoo',
  numTeams: 12,
  userTeamName: 'Gridiron Dominator',
  roster: {
    qb: 1,
    rb: 2,
    wr: 3,
    te: 1,
    k: 1,
    def: 1,
    db: 0,
    dl: 0,
    lb: 0,
    bench: 6,
    ir: 2,
  },
  offense: {
    passYardsPerPoint: 25,
    passTouchdown: 4,
    interception: -2,
    pickSixThrown: -2,
    rushYardsPerPoint: 10,
    rushTouchdown: 6,
    recYardsPerPoint: 10,
    recTouchdown: 6,
    receptionsPPR: 1.0,
    fumblesLost: -2,
    twoPointConversions: 2,
    offensiveFumbleReturnTD: 6,
  },
  kicker: {
    fg0_19: 3,
    fg20_29: 3,
    fg30_39: 3,
    fg40_49: 4,
    fg50Plus: 5,
    fg60Plus: 5,
    patMade: 1,
    patMissed: -1,
  },
  defTeam: {
    sack: 1,
    interception: 2,
    fumbleRecovery: 2,
    touchdown: 6,
    safety: 2,
    blockKick: 2,
    kickPuntReturnTD: 6,
    ptsAllowed0: 10,
    ptsAllowed1_6: 7,
    ptsAllowed7_13: 4,
    ptsAllowed14_20: 1,
    ptsAllowed21_27: 0,
    ptsAllowed28_34: -1,
    ptsAllowed35Plus: -4,
    extraPointReturned: 2,
  },
  idp: {
    soloTackle: 1.5,
    assistedTackle: 0.75,
    sack: 2,
    interception: 3,
    fumbleForce: 2,
    fumbleRecovery: 2,
    defensiveTouchdown: 6,
    safety: 2,
    blockKick: 2,
    passDefended: 1.5,
    tackleForLoss: 1.5,
  },
};

// Default Superflex Dynasty preset
export const SUPERFLEX_DYNASTY_PRESET: LeagueSettings = {
  id: 'dynasty-superflex-half-ppr',
  name: 'Dynasty Superflex Half-PPR',
  platform: 'Sleeper',
  numTeams: 10,
  userTeamName: 'Dynasty Empire',
  roster: {
    qb: 2,
    rb: 2,
    wr: 3,
    te: 1,
    k: 0,
    def: 1,
    db: 1,
    dl: 1,
    lb: 1,
    bench: 10,
    ir: 3,
  },
  offense: {
    passYardsPerPoint: 25,
    passTouchdown: 4,
    interception: -2,
    pickSixThrown: -2,
    rushYardsPerPoint: 10,
    rushTouchdown: 6,
    recYardsPerPoint: 10,
    recTouchdown: 6,
    receptionsPPR: 0.5,
    fumblesLost: -2,
    twoPointConversions: 2,
    offensiveFumbleReturnTD: 6,
  },
  kicker: {
    fg0_19: 3,
    fg20_29: 3,
    fg30_39: 3,
    fg40_49: 4,
    fg50Plus: 5,
    fg60Plus: 5,
    patMade: 1,
    patMissed: -1,
  },
  defTeam: {
    sack: 1,
    interception: 2,
    fumbleRecovery: 2,
    touchdown: 6,
    safety: 2,
    blockKick: 2,
    kickPuntReturnTD: 6,
    ptsAllowed0: 10,
    ptsAllowed1_6: 7,
    ptsAllowed7_13: 4,
    ptsAllowed14_20: 1,
    ptsAllowed21_27: 0,
    ptsAllowed28_34: -1,
    ptsAllowed35Plus: -4,
    extraPointReturned: 2,
  },
  idp: {
    soloTackle: 2.0,
    assistedTackle: 1.0,
    sack: 3.0,
    interception: 4.0,
    fumbleForce: 3.0,
    fumbleRecovery: 2.0,
    defensiveTouchdown: 6,
    safety: 2,
    blockKick: 2,
    passDefended: 2.0,
    tackleForLoss: 2.0,
  },
};

export const INITIAL_LEAGUE_PROFILES: LeagueProfile[] = [
  {
    id: 'profile-leo-szn-yahoo',
    name: 'Leo Szn 8-Team 3-QB (Yahoo)',
    platform: 'yahoo',
    settings: LEO_SZN_YAHOO_PRESET,
    myRosterIds: [
      'lamar-jackson',
      'jayden-daniels',
      'patrick-mahomes',
      'saquon-barkley',
      'derrick-henry',
      'justin-jefferson',
      'ja-marr-chase',
      'brian-thomas-jr',
      'malik-nabers',
      'george-pickens',
      'brock-bowers',
      'bal-def',
      'maxx-crosby',
      'fred-warner',
      'kyle-hamilton'
    ],
    opponentRosterIds: [
      'josh-allen',
      'jalen-hurts',
      'cj-stroud',
      'bijan-robinson',
      'jahmyr-gibbs',
      'ceedee-lamb',
      'amon-ra-st-brown',
      'garrett-wilson',
      'nico-collins',
      'marvin-harrison-jr',
      'trey-mcbride',
      'sf-def',
      'tj-watt',
      'roquan-smith',
      'antoine-winfield'
    ],
    userTeamName: 'Leo Szn (You)',
    opponentTeamName: 'Championship Rival',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'profile-standard-12-ppr',
    name: 'Main League 12-Team PPR (Yahoo)',
    platform: 'yahoo',
    settings: STANDARD_12_PPR_PRESET,
    myRosterIds: [
      'josh-allen',
      'saquon-barkley',
      'jahmyr-gibbs',
      'justin-jefferson',
      'ja-marr-chase',
      'george-kittle',
      'brian-thomas-jr',
      'bal-def',
      'cameron-dicker'
    ],
    opponentRosterIds: [
      'lamar-jackson',
      'derrick-henry',
      'bijan-robinson',
      'ceedee-lamb',
      'amon-ra-st-brown',
      'brock-bowers',
      'malik-nabers',
      'sf-def',
      'harrison-butker'
    ],
    userTeamName: 'Gridiron Dominator',
    opponentTeamName: 'League Rival',
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'profile-dynasty-superflex',
    name: 'Dynasty Superflex Half-PPR',
    platform: 'sleeper',
    settings: SUPERFLEX_DYNASTY_PRESET,
    myRosterIds: [
      'jayden-daniels',
      'cj-stroud',
      'bijan-robinson',
      'bucky-irving',
      'malik-nabers',
      'brian-thomas-jr',
      'marvin-harrison-jr',
      'brock-bowers',
      'maxx-crosby'
    ],
    opponentRosterIds: [
      'patrick-mahomes',
      'caleb-williams',
      'jahmyr-gibbs',
      'de-von-achane',
      'garrett-wilson',
      'rome-odunze',
      'george-pickens',
      'sam-laporta',
      'tj-watt'
    ],
    userTeamName: 'Dynasty Empire',
    opponentTeamName: 'Defending Champ',
    lastSyncedAt: new Date().toISOString(),
  },
];

/**
 * Get all saved league profiles with fallback to default profiles
 */
export function getAllLeagueProfiles(): LeagueProfile[] {
  try {
    const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read league profiles from storage:', err);
  }
  return INITIAL_LEAGUE_PROFILES;
}

/**
 * Save all league profiles to LocalStorage
 */
export function saveLeagueProfiles(profiles: LeagueProfile[]): void {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Could not save league profiles to storage:', err);
  }
}

/**
 * Get the active league profile ID
 */
export function getActiveLeagueProfileId(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
    if (saved) return saved;
  } catch {
    // ignore
  }
  return 'profile-leo-szn-yahoo';
}

/**
 * Set the active league profile ID
 */
export function setActiveLeagueProfileId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Get currently active profile object
 */
export function getActiveLeagueProfile(): LeagueProfile {
  const profiles = getAllLeagueProfiles();
  const activeId = getActiveLeagueProfileId();
  const found = profiles.find(p => p.id === activeId);
  return found || profiles[0] || INITIAL_LEAGUE_PROFILES[0];
}

/**
 * Update a specific profile
 */
export function updateLeagueProfile(updated: LeagueProfile): LeagueProfile[] {
  const profiles = getAllLeagueProfiles();
  const index = profiles.findIndex(p => p.id === updated.id);
  let newProfiles: LeagueProfile[];
  if (index >= 0) {
    newProfiles = [...profiles];
    newProfiles[index] = updated;
  } else {
    newProfiles = [...profiles, updated];
  }
  saveLeagueProfiles(newProfiles);
  return newProfiles;
}

/**
 * Create a new custom league profile
 */
export function createNewLeagueProfile(
  name: string,
  platform: 'yahoo' | 'sleeper' | 'espn' | 'custom' = 'yahoo',
  settings?: LeagueSettings
): LeagueProfile {
  const profiles = getAllLeagueProfiles();
  const id = `profile-${Date.now()}`;
  const baseSettings = settings || LEO_SZN_YAHOO_PRESET;
  
  const newProfile: LeagueProfile = {
    id,
    name,
    platform,
    settings: {
      ...baseSettings,
      id,
      name,
    },
    myRosterIds: PLAYERS_DATABASE.slice(0, 12).map(p => p.id),
    opponentRosterIds: PLAYERS_DATABASE.slice(12, 24).map(p => p.id),
    userTeamName: 'My Team',
    opponentTeamName: 'Opponent Team',
    lastSyncedAt: new Date().toISOString(),
  };

  const newProfiles = [...profiles, newProfile];
  saveLeagueProfiles(newProfiles);
  setActiveLeagueProfileId(id);
  return newProfile;
}

/**
 * Delete a league profile
 */
export function deleteLeagueProfile(id: string): LeagueProfile[] {
  const profiles = getAllLeagueProfiles();
  if (profiles.length <= 1) {
    return profiles; // Cannot delete last remaining profile
  }
  const filtered = profiles.filter(p => p.id !== id);
  saveLeagueProfiles(filtered);
  
  // If active profile was deleted, switch to the first remaining
  if (getActiveLeagueProfileId() === id) {
    setActiveLeagueProfileId(filtered[0].id);
  }
  return filtered;
}
