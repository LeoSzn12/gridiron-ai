import type { Player, YahooFastImportResult, YahooUserLeague } from '../types';

const YAHOO_AUTH_STORAGE_KEY = 'gridiron_yahoo_auth_v1';
const YAHOO_BASE_API = 'https://fantasysports.yahooapis.com/fantasy/v2';

export interface YahooAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  isConnected: boolean;
  selectedLeagueKey?: string;
  selectedTeamKey?: string;
}

/**
 * Get saved Yahoo OAuth configuration
 */
export function getYahooAuthConfig(): YahooAuthConfig {
  try {
    const saved = localStorage.getItem(YAHOO_AUTH_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {
    clientId: '',
    clientSecret: '',
    redirectUri: 'https://localhost:5173/',
    isConnected: false,
  };
}

/**
 * Save Yahoo OAuth configuration
 */
export function saveYahooAuthConfig(config: YahooAuthConfig): void {
  try {
    localStorage.setItem(YAHOO_AUTH_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Could not save Yahoo auth config:', err);
  }
}

/**
 * Generate Yahoo OAuth Authorization URL
 */
export function getYahooAuthorizationUrl(clientId: string, redirectUri: string, scope?: string): string {
  const cleanClientId = clientId.trim();
  const cleanRedirectUri = redirectUri.trim();
  let url = `https://api.login.yahoo.com/oauth2/request_auth?client_id=${encodeURIComponent(
    cleanClientId
  )}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&response_type=code`;
  
  if (scope && scope.trim()) {
    url += `&scope=${encodeURIComponent(scope.trim())}`;
  }
  return url;
}

/**
 * Exchange Authorization Code for Access Token (via Netlify server-side proxy to avoid CORS)
 */
export async function exchangeYahooAuthCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  // Proxy through Netlify function — Yahoo blocks browser-direct token exchange with CORS
  const res = await fetch('/api/yahoo-oauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'authorization_code',
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      code: code.trim(),
      redirectUri: redirectUri.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Yahoo token exchange failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh Yahoo Access Token (via Netlify proxy)
 */
export async function refreshYahooToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const res = await fetch('/api/yahoo-oauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'refresh_token',
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      refreshToken: refreshToken.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || `Yahoo token refresh failed (${res.status})`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}


/**
 * Fetch Current User's NFL Leagues from Yahoo Fantasy API
 */
export async function fetchYahooUserLeagues(accessToken: string): Promise<YahooUserLeague[]> {
  const url = `${YAHOO_BASE_API}/users;use_login=1/games;game_keys=nfl/leagues?format=json`;

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Leagues API Error (${res.status})`);
    }

    const data = await res.json();
    const leagues: YahooUserLeague[] = [];

    // Parse Yahoo's nested JSON structure
    const userObj = data?.fantasy_content?.users?.[0]?.user;
    const gamesObj = userObj?.[1]?.games;
    const game = gamesObj?.[0]?.game;
    const leaguesObj = game?.[1]?.leagues;

    if (Array.isArray(leaguesObj)) {
      leaguesObj.forEach((l: any) => {
        const item = l?.league?.[0];
        if (item) {
          leagues.push({
            league_key: item.league_key,
            league_id: item.league_id,
            name: item.name,
            num_teams: item.num_teams || 10,
            scoring_type: item.scoring_type || 'head',
            season: item.season || '2024',
            url: item.url,
          });
        }
      });
    }

    return leagues;
  } catch (err) {
    console.warn('Failed to fetch Yahoo leagues directly via REST:', err);
    return [];
  }
}

/**
 * Fetch the user's team roster for a specific league from Yahoo Fantasy API.
 * Returns player names + positions that can be matched to our live player DB.
 */
export async function fetchYahooTeamRoster(
  accessToken: string,
  _leagueKey: string,
  teamKey: string
): Promise<{ playerName: string; position: string; status: string; teamAbbr: string }[]> {
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/roster?format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Yahoo roster fetch failed (${res.status})`);
    const data = await res.json();
    const players: { playerName: string; position: string; status: string; teamAbbr: string }[] = [];
    const rosterPlayers = data?.fantasy_content?.team?.[1]?.roster?.['0']?.players;
    if (!rosterPlayers) return players;
    Object.values(rosterPlayers).forEach((item: any) => {
      if (!item?.player) return;
      const pInfo = item.player[0];
      const nameObj = pInfo?.find?.((x: any) => x?.name);
      const posObj = pInfo?.find?.((x: any) => x?.display_position);
      const teamObj = pInfo?.find?.((x: any) => x?.editorial_team_abbr);
      const statusObj = pInfo?.find?.((x: any) => x?.status !== undefined);
      players.push({
        playerName: nameObj?.name?.full || '',
        position: posObj?.display_position || '',
        status: statusObj?.status || 'Active',
        teamAbbr: teamObj?.editorial_team_abbr || '',
      });
    });
    return players.filter(p => p.playerName);
  } catch (err) {
    console.warn('Yahoo roster fetch failed:', err);
    return [];
  }
}

/**
 * Fetch the current week's matchup for the user's team.
 * Returns both the user's team info and their opponent's team info.
 */
export async function fetchYahooCurrentMatchup(
  accessToken: string,
  teamKey: string,
  week?: number
): Promise<{
  myTeamName: string;
  myTeamKey: string;
  opponentTeamName: string;
  opponentTeamKey: string;
  weekNum: number;
  myProjectedScore: number;
  opponentProjectedScore: number;
} | null> {
  const weekParam = week ? `;week=${week}` : '';
  const url = `https://fantasysports.yahooapis.com/fantasy/v2/team/${teamKey}/matchups${weekParam}?format=json`;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const matchups = data?.fantasy_content?.team?.[1]?.matchups;
    if (!matchups) return null;
    // Find current/latest matchup
    const matchupKeys = Object.keys(matchups).filter(k => k !== 'count');
    const latestKey = matchupKeys[matchupKeys.length - 1];
    const matchup = matchups[latestKey]?.matchup;
    if (!matchup) return null;
    const weekNum = matchup?.week || week || 1;
    const teams = matchup?.['0']?.teams;
    if (!teams) return null;
    const team0 = teams?.['0']?.team;
    const team1 = teams?.['1']?.team;
    const myTeamName = team0?.[0]?.find((x: any) => x?.name)?.name || 'My Team';
    const myTeamKey = team0?.[0]?.find((x: any) => x?.team_key)?.team_key || teamKey;
    const myProjectedScore = parseFloat(team0?.[1]?.team_projected_points?.projected_points || '0');
    const opponentTeamName = team1?.[0]?.find((x: any) => x?.name)?.name || 'Opponent';
    const opponentTeamKey = team1?.[0]?.find((x: any) => x?.team_key)?.team_key || '';
    const opponentProjectedScore = parseFloat(team1?.[1]?.team_projected_points?.projected_points || '0');
    return { myTeamName, myTeamKey, opponentTeamName, opponentTeamKey, weekNum, myProjectedScore, opponentProjectedScore };
  } catch (err) {
    console.warn('Yahoo matchup fetch failed:', err);
    return null;
  }
}

/**
 * Auto-sync: given a saved Yahoo auth + connected league, fetch roster and matchup
 * and return player IDs matched against our live Sleeper player database.
 */
export async function autoSyncYahooRoster(
  accessToken: string,
  teamKey: string,
  leagueKey: string,
  allPlayers: Player[]
): Promise<{
  myRosterIds: string[];
  opponentRosterIds: string[];
  myTeamName: string;
  opponentTeamName: string;
  weekNum: number;
  myProjectedScore: number;
  opponentProjectedScore: number;
}> {
  // Build name index for matching
  function normName(n: string) { return n.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  const nameIndex = new Map<string, string>(); // normalized name -> player.id
  allPlayers.forEach(p => {
    nameIndex.set(normName(p.name), p.id);
    // Also index first initial + last name (e.g. jallen)
    const tokens = p.name.split(' ');
    if (tokens.length >= 2) nameIndex.set(`${tokens[0][0].toLowerCase()}${tokens[tokens.length-1].toLowerCase()}`, p.id);
  });
  function matchToId(name: string): string | null {
    const norm = normName(name);
    if (nameIndex.has(norm)) return nameIndex.get(norm)!;
    // Fuzzy: find player whose normalized name includes the key
    for (const [key, id] of nameIndex) {
      if (key.includes(norm) || norm.includes(key)) {
        if (key.length > 4 && norm.length > 4) return id;
      }
    }
    return null;
  }

  const [myRosterRaw, matchupData] = await Promise.all([
    fetchYahooTeamRoster(accessToken, leagueKey, teamKey),
    fetchYahooCurrentMatchup(accessToken, teamKey),
  ]);

  const myRosterIds = myRosterRaw
    .map(p => matchToId(p.playerName))
    .filter((id): id is string => id !== null);

  let opponentRosterIds: string[] = [];
  if (matchupData?.opponentTeamKey) {
    const oppRaw = await fetchYahooTeamRoster(accessToken, leagueKey, matchupData.opponentTeamKey);
    opponentRosterIds = oppRaw
      .map(p => matchToId(p.playerName))
      .filter((id): id is string => id !== null);
  }

  return {
    myRosterIds,
    opponentRosterIds,
    myTeamName: matchupData?.myTeamName || 'My Team',
    opponentTeamName: matchupData?.opponentTeamName || 'Opponent',
    weekNum: matchupData?.weekNum || 1,
    myProjectedScore: matchupData?.myProjectedScore || 0,
    opponentProjectedScore: matchupData?.opponentProjectedScore || 0,
  };
}

/**
 * -------------------------------------------------------------
 * FAST-PASTE & TEXT ROSTER PARSER ENGINE
 * Allows users to paste any copied text, table, or CSV from Yahoo
 * and maps all names to Gridiron AI's 220+ player database instantly.
 * -------------------------------------------------------------
 */

// Helper to normalize names for resilient matching
function normalizePlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(jr|sr|ii|iii|iv|v)$/, '')
    .trim();
}

/**
 * Parse any raw copied text from Yahoo (My Team, Matchup, or Free Agents page)
 */
export function parseYahooRosterText(
  rawText: string,
  allPlayers: Player[]
): YahooFastImportResult {
  if (!rawText.trim()) {
    return {
      matchedPlayers: [],
      unmatchedNames: [],
      totalParsed: 0,
      sourceText: rawText,
    };
  }

  // Pre-index existing players by normalized name, alias, and ID
  const playerIndex = new Map<string, Player>();
  allPlayers.forEach(p => {
    playerIndex.set(p.id.toLowerCase(), p);
    playerIndex.set(normalizePlayerName(p.name), p);
    // Add variations (e.g. Josh Allen -> joshallen)
    const tokens = p.name.toLowerCase().split(' ');
    if (tokens.length >= 2) {
      playerIndex.set(`${tokens[0][0]}${tokens[tokens.length - 1]}`, p); // jallen
    }
  });

  // Team Defense alias mappings
  const defMappings: Record<string, string> = {
    'bal': 'bal-def',
    'baltimore': 'bal-def',
    'ravens': 'bal-def',
    'sf': 'sf-def',
    'sanfrancisco': 'sf-def',
    '49ers': 'sf-def',
    'niners': 'sf-def',
    'kc': 'kc-def',
    'kansascity': 'kc-def',
    'chiefs': 'kc-def',
    'pit': 'pit-def',
    'pittsburgh': 'pit-def',
    'steelers': 'pit-def',
    'buf': 'buf-def',
    'buffalo': 'buf-def',
    'bills': 'buf-def',
    'det': 'det-def',
    'detroit': 'det-def',
    'lions': 'det-def',
    'dal': 'dal-def',
    'dallas': 'dal-def',
    'cowboys': 'dal-def',
    'cle': 'cle-def',
    'cleveland': 'cle-def',
    'browns': 'cle-def',
    'hou': 'hou-def',
    'houston': 'hou-def',
    'texans': 'hou-def',
    'phi': 'phi-def',
    'philadelphia': 'phi-def',
    'eagles': 'phi-def',
    'nyj': 'nyj-def',
    'jets': 'nyj-def',
    'min': 'min-def',
    'minnesota': 'min-def',
    'vikings': 'min-def',
  };

  const matchedSet = new Set<string>();
  const matchedPlayers: Player[] = [];
  const unmatchedNames: string[] = [];

  // Split lines
  const lines = rawText.split(/[\r\n]+/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.length < 2) continue;

    // Filter out common header noise in Yahoo tables
    if (/^(pos|player|opp|status|pts|proj|avg|roster|action|bench|ir|total|starters|lineup|move|edit|stats)$/i.test(line)) {
      continue;
    }

    // Try extracting player candidate
    // Format 1: "Lamar Jackson Bal - QB" or "Saquon Barkley Phi - RB"
    // Format 2: "Justin Jefferson (Min - WR)"
    // Format 3: "1. Lamar Jackson (QB)"
    // Format 4: "Baltimore Ravens DEF"
    
    // Clean Yahoo metadata noise
    let cleanCandidate = line
      .replace(/^[0-9]+[.\-)]\s*/, '') // Remove numbers e.g. "1. "
      .replace(/\s+(vs|@)\s+[A-Za-z]+.*$/i, '') // Remove opponent matchup info e.g. "@ KC Sun 1:00"
      .replace(/\s+(Sun|Mon|Thu|Sat)\s+[0-9]+:[0-9]+.*$/i, '') // Remove game times
      .replace(/[[({][A-Za-z0-9\s\-_/]+[)\]}]/g, ' ') // Remove parenthesis details
      .replace(/-(?:\s*[A-Z]{1,3}\s*-\s*[A-Z]{1,3})/, ' ') // Remove "- Bal - QB"
      .replace(/\b(QB|RB|WR|TE|K|DEF|D\/ST|DL|LB|DB|IDP|BN|IR|W\/R\/T|Q\/W\/R\/T|FLEX)\b/gi, ' ') // Remove pos
      .replace(/\b(BAL|BUF|KC|PHI|SF|DET|HOU|MIN|GB|DAL|CIN|TB|MIA|WAS|LAC|DEN|LV|NYJ|CLE|CHI|IND|JAX|ARI|SEA|ATL|NO|LAR|CAR|TEN|NE|NYG|PIT|FA)\b/gi, ' ') // Remove team abbr
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanCandidate || cleanCandidate.length < 3) continue;

    const norm = normalizePlayerName(cleanCandidate);

    // Check defense mapping
    if (defMappings[norm]) {
      const defPlayer = allPlayers.find(p => p.id === defMappings[norm]);
      if (defPlayer && !matchedSet.has(defPlayer.id)) {
        matchedSet.add(defPlayer.id);
        matchedPlayers.push(defPlayer);
        continue;
      }
    }

    // Direct match
    if (playerIndex.has(norm)) {
      const found = playerIndex.get(norm)!;
      if (!matchedSet.has(found.id)) {
        matchedSet.add(found.id);
        matchedPlayers.push(found);
        continue;
      }
    }

    // Partial / Fuzzy match across all players
    const match = allPlayers.find(p => {
      const pNorm = normalizePlayerName(p.name);
      if (pNorm === norm) return true;
      if (pNorm.includes(norm) || norm.includes(pNorm)) return true;
      
      // First & Last Name check
      const candidateTokens = cleanCandidate.toLowerCase().split(' ').filter(t => t.length > 1);
      const playerTokens = p.name.toLowerCase().split(' ').filter(t => t.length > 1);
      if (candidateTokens.length >= 2 && playerTokens.length >= 2) {
        const firstMatch = playerTokens[0].startsWith(candidateTokens[0]) || candidateTokens[0].startsWith(playerTokens[0]);
        const lastMatch = playerTokens[playerTokens.length - 1] === candidateTokens[candidateTokens.length - 1];
        if (firstMatch && lastMatch) return true;
      }

      return false;
    });

    if (match && !matchedSet.has(match.id)) {
      matchedSet.add(match.id);
      matchedPlayers.push(match);
    } else if (cleanCandidate.split(' ').length >= 2 && !/^(yahoo|fantasy|points|schedule|matchup|roster|settings|projected)$/i.test(cleanCandidate)) {
      unmatchedNames.push(cleanCandidate);
    }
  }

  return {
    matchedPlayers,
    unmatchedNames: Array.from(new Set(unmatchedNames)),
    totalParsed: matchedPlayers.length + unmatchedNames.length,
    sourceText: rawText,
  };
}
