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
