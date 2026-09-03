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


function yahooProxyUrl(targetUrl: string): string {
  return `/api/yahoo-proxy?endpoint=${encodeURIComponent(targetUrl)}`;
}

/**
 * Fetch Current User's NFL Leagues from Yahoo Fantasy API
 */
export async function fetchYahooUserLeagues(accessToken: string): Promise<YahooUserLeague[]> {
  const url = `${YAHOO_BASE_API}/users;use_login=1/games;game_keys=nfl/leagues?format=json`;

  try {
    const res = await fetch(yahooProxyUrl(url), {
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
    console.warn('Failed to fetch Yahoo leagues via proxy:', err);
    return [];
  }
}

/**
 * Fetch Current User's Teams from Yahoo Fantasy API
 */
export async function fetchYahooUserTeams(
  accessToken: string
): Promise<{ teamKey: string; name: string; leagueKey: string; logoUrl?: string }[]> {
  const url = `${YAHOO_BASE_API}/users;use_login=1/games;game_keys=nfl/teams?format=json`;
  try {
    const res = await fetch(yahooProxyUrl(url), {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`Yahoo user teams fetch failed (${res.status})`);
    const data = await res.json();
    const teams: { teamKey: string; name: string; leagueKey: string; logoUrl?: string }[] = [];
    const userObj = data?.fantasy_content?.users?.[0]?.user;
    const gamesObj = userObj?.[1]?.games;
    const game = gamesObj?.[0]?.game;
    const teamsObj = game?.[1]?.teams;

    if (Array.isArray(teamsObj)) {
      teamsObj.forEach((t: any) => {
        const teamInfo = t?.team?.[0];
        if (Array.isArray(teamInfo)) {
          const keyItem = teamInfo.find((x: any) => x?.team_key);
          const nameItem = teamInfo.find((x: any) => x?.name);
          const logoItem = teamInfo.find((x: any) => x?.team_logos);
          if (keyItem?.team_key && nameItem?.name) {
            const leagueKey = keyItem.team_key.split('.t.')[0];
            teams.push({
              teamKey: keyItem.team_key,
              name: nameItem.name,
              leagueKey,
              logoUrl: logoItem?.team_logos?.[0]?.team_logo?.url,
            });
          }
        }
      });
    }
    return teams;
  } catch (err) {
    console.warn('Failed to fetch Yahoo user teams:', err);
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
    const res = await fetch(yahooProxyUrl(url), {
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
    const res = await fetch(yahooProxyUrl(url), {
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
function normalizePlayerName(name?: string): string {
  if (!name) return '';
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
  if (!rawText || !rawText.trim()) {
    return {
      matchedPlayers: [],
      unmatchedNames: [],
      totalParsed: 0,
      sourceText: rawText || '',
    };
  }

  // Pre-index existing players by normalized name, alias, and ID (supporting multiple candidates per name)
  const playerIndex = new Map<string, Player[]>();
  const addIndex = (key: string, player: Player) => {
    if (!key) return;
    const arr = playerIndex.get(key) || [];
    arr.push(player);
    playerIndex.set(key, arr);
  };

  (allPlayers || []).forEach(p => {
    if (!p || !p.name) return;
    if (p.id) addIndex(p.id.toLowerCase(), p);
    addIndex(normalizePlayerName(p.name), p);
    if (p.sleeperId) addIndex(p.sleeperId.toLowerCase(), p);
    const tokens = p.name.toLowerCase().split(' ').filter(t => t.length > 1);
    if (tokens.length >= 2) {
      addIndex(`${tokens[0][0]}${tokens[tokens.length - 1]}`, p); // jallen
    }
  });

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

    // Extract clues from raw line for position and team
    const posMatch = line.match(/\b(QB|RB|WR|TE|K|DEF|D\/ST|DL|DE|DT|LB|DB|CB|S|FS|SS|OLB|ILB)\b/i);
    const rawPosHint = posMatch ? posMatch[1].toUpperCase() : undefined;
    const isDefHint = rawPosHint === 'DEF' || rawPosHint === 'D/ST' || /\b(DEF|D\/ST|Defense)\b/i.test(line);

    const teamMatch = line.match(/\b(BAL|BUF|KC|PHI|SF|DET|HOU|MIN|GB|DAL|CIN|TB|MIA|WAS|LAC|DEN|LV|NYJ|CLE|CHI|IND|JAX|ARI|SEA|ATL|NO|LAR|CAR|TEN|NE|NYG|PIT)\b/i);
    const teamHint = teamMatch ? teamMatch[1].toUpperCase() : undefined;

    // Clean Yahoo metadata noise
    let cleanCandidate = line
      .replace(/^[0-9]+[.\-)]\s*/, '') // Remove numbers e.g. "1. "
      .replace(/\s+(vs|@)\s+[A-Za-z]+.*$/i, '') // Remove opponent matchup info
      .replace(/\s+(Sun|Mon|Thu|Sat)\s+[0-9]+:[0-9]+.*$/i, '') // Remove game times
      .replace(/[[({][A-Za-z0-9\s\-_/]+[)\]}]/g, ' ') // Remove parenthesis details
      .replace(/-(?:\s*[A-Z]{1,3}\s*-\s*[A-Z]{1,3})/, ' ') // Remove "- Bal - QB"
      .replace(/\b(QB|RB|WR|TE|K|DEF|D\/ST|DL|LB|DB|IDP|BN|IR|W\/R\/T|Q\/W\/R\/T|FLEX)\b/gi, ' ') // Remove pos
      .replace(/\b(BAL|BUF|KC|PHI|SF|DET|HOU|MIN|GB|DAL|CIN|TB|MIA|WAS|LAC|DEN|LV|NYJ|CLE|CHI|IND|JAX|ARI|SEA|ATL|NO|LAR|CAR|TEN|NE|NYG|PIT|FA)\b/gi, ' ') // Remove team abbr
      .replace(/\s+/g, ' ')
      .replace(/^[-\s,.:]+|[-\s,.:]+$/g, '') // Strip leading/trailing punctuation including trailing hyphen
      .trim();

    if (!cleanCandidate || cleanCandidate.length < 2) continue;

    const norm = normalizePlayerName(cleanCandidate);

    // 1. Check Team Defense
    if (isDefHint || norm.includes('def') || /^(baltimore|sanfrancisco|kansascity|buffalo|denver|pittsburgh|chicago|detroit|philadelphia|houston|dallas|cleveland)/.test(norm)) {
      const defPlayer = allPlayers.find(p => {
        if (!p || p.position !== 'DEF' || !p.name) return false;
        const normP = normalizePlayerName(p.name);
        if (!normP) return false;
        if (teamHint && p.team === teamHint) return true;
        if (normP === norm) return true;
        if (normP.length >= 3 && norm.length >= 3 && (normP.includes(norm) || norm.includes(normP))) return true;
        if (p.id && norm.length >= 3 && p.id.toLowerCase().includes(norm)) return true;
        return false;
      });
      if (defPlayer && !matchedSet.has(defPlayer.id)) {
        matchedSet.add(defPlayer.id);
        matchedPlayers.push(defPlayer);
        continue;
      }
    }

    // 2. Direct / Indexed Match with Disambiguation
    const candidates = playerIndex.get(norm);
    if (candidates && candidates.length > 0) {
      // Pick best candidate using posHint, teamHint, and offensive priority
      let best = candidates.find(c => {
        if (!c) return false;
        if (rawPosHint && (c.position === rawPosHint || (['DL','DE','DT'].includes(rawPosHint) && c.position === 'DL'))) return true;
        if (teamHint && c.team === teamHint) return true;
        return false;
      });

      if (!best) {
        // Disambiguate namesakes (e.g. WR Justin Jefferson vs LB Justin Jefferson)
        best = [...candidates].sort((a, b) => {
          const aOff = ['QB', 'RB', 'WR', 'TE'].includes(a.position) ? 100 : 0;
          const bOff = ['QB', 'RB', 'WR', 'TE'].includes(b.position) ? 100 : 0;
          return (bOff + (b.tradeValue || 0)) - (aOff + (a.tradeValue || 0));
        })[0];
      }

      if (best && !matchedSet.has(best.id)) {
        matchedSet.add(best.id);
        matchedPlayers.push(best);
        continue;
      }
    }

    // 3. Partial / Fuzzy match across all players
    const match = allPlayers.find(p => {
      if (!p || !p.name) return false;
      const pNorm = normalizePlayerName(p.name);
      if (pNorm === norm) return true;
      if (pNorm.includes(norm) || norm.includes(pNorm)) return true;
      
      // First & Last Name check
      const candidateTokens = cleanCandidate.toLowerCase().split(' ').filter(t => t.length > 1);
      const playerTokens = (p.name || '').toLowerCase().split(' ').filter(t => t.length > 1);
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
    matchedPlayers: matchedPlayers.filter(p => p && p.id && p.name),
    unmatchedNames: Array.from(new Set(unmatchedNames)),
    totalParsed: matchedPlayers.length + unmatchedNames.length,
    sourceText: rawText,
  };
}
