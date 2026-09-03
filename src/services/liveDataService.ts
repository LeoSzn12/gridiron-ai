import type { Player, PlayerWeather } from '../types';
import { PLAYERS_DATABASE } from '../data/mockData';
import type { SleeperRawPlayer } from '../types';

// NFL team abbreviation normalization — ESPN uses different abbrs than Sleeper in some cases
const ESPN_TO_SLEEPER_TEAM: Record<string, string> = {
  'JAC': 'JAX', 'WSH': 'WAS', 'LAR': 'LA', 'LAC': 'LAC',
  'SFO': 'SF', 'GNB': 'GB', 'NWE': 'NE', 'NOR': 'NO',
  'KAN': 'KC', 'TAM': 'TB', 'SDG': 'LAC', 'STL': 'LA',
};
function normalizeTeam(abbr: string): string {
  return ESPN_TO_SLEEPER_TEAM[abbr] || abbr;
}


// NFL Stadium Geo Coordinates for Live Open-Meteo Weather
export const STADIUM_COORDINATES: Record<string, { lat: number; lon: number; name: string; isDome: boolean }> = {
  KC: { lat: 39.0489, lon: -94.4839, name: 'GEHA Field at Arrowhead', isDome: false },
  BAL: { lat: 39.2780, lon: -76.6227, name: 'M&T Bank Stadium', isDome: false },
  DAL: { lat: 32.7473, lon: -97.0945, name: 'AT&T Stadium (Dallas)', isDome: true },
  BUF: { lat: 42.7738, lon: -78.7870, name: 'Highmark Stadium', isDome: false },
  IND: { lat: 39.7601, lon: -86.1639, name: 'Lucas Oil Stadium', isDome: true },
  PHI: { lat: 39.9008, lon: -75.1675, name: 'Lincoln Financial Field', isDome: false },
  CIN: { lat: 39.0954, lon: -84.5160, name: 'Paycor Stadium', isDome: false },
  MIN: { lat: 44.9738, lon: -93.2575, name: 'U.S. Bank Stadium', isDome: true },
  JAX: { lat: 30.3239, lon: -81.6373, name: 'EverBank Stadium', isDome: false },
  ATL: { lat: 33.7554, lon: -84.4009, name: 'Mercedes-Benz Stadium', isDome: true },
  SF: { lat: 37.4033, lon: -121.9698, name: 'Levi\'s Stadium', isDome: false },
  MIA: { lat: 25.9580, lon: -80.2389, name: 'Hard Rock Stadium', isDome: false },
  WAS: { lat: 38.9076, lon: -76.8645, name: 'Northwest Stadium', isDome: false },
  PIT: { lat: 40.4468, lon: -80.0158, name: 'Acrisure Stadium', isDome: false },
  LV: { lat: 36.0909, lon: -115.1833, name: 'Allegiant Stadium', isDome: true },
  DET: { lat: 42.3400, lon: -83.0456, name: 'Ford Field', isDome: true },
  GB: { lat: 44.5013, lon: -88.0622, name: 'Lambeau Field', isDome: false },
  CHI: { lat: 41.8623, lon: -87.6167, name: 'Soldier Field', isDome: false },
  NYG: { lat: 40.8128, lon: -74.0742, name: 'MetLife Stadium', isDome: false },
  NYJ: { lat: 40.8128, lon: -74.0742, name: 'MetLife Stadium', isDome: false },
  NO: { lat: 29.9511, lon: -90.0812, name: 'Caesars Superdome', isDome: true },
  TB: { lat: 27.9759, lon: -82.5033, name: 'Raymond James Stadium', isDome: false },
  CAR: { lat: 35.2258, lon: -80.8528, name: 'Bank of America Stadium', isDome: false },
  CLE: { lat: 41.5061, lon: -81.6995, name: 'Huntington Bank Field', isDome: false },
  HOU: { lat: 29.6847, lon: -95.4107, name: 'NRG Stadium', isDome: true },
  DEN: { lat: 39.7439, lon: -105.0201, name: 'Empower Field at Mile High', isDome: false },
  LAC: { lat: 33.9535, lon: -118.3390, name: 'SoFi Stadium', isDome: true },
  LAR: { lat: 33.9535, lon: -118.3390, name: 'SoFi Stadium', isDome: true },
  ARI: { lat: 33.5276, lon: -112.2626, name: 'State Farm Stadium', isDome: true },
  SEA: { lat: 47.5952, lon: -122.3316, name: 'Lumen Field', isDome: false },
  TEN: { lat: 36.1665, lon: -86.7713, name: 'Nissan Stadium', isDome: false },
  NE: { lat: 42.0909, lon: -71.2643, name: 'Gillette Stadium', isDome: false },
};

export interface LiveNFLGameScore {
  id: string;
  name: string;
  shortName: string;
  gameTime: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL';
  homeTeam: {
    abbreviation: string;
    displayName: string;
    score: number;
    logo: string;
  };
  awayTeam: {
    abbreviation: string;
    displayName: string;
    score: number;
    logo: string;
  };
  odds?: {
    spread: string;
    overUnder: number;
    details: string;
  };
  weather?: {
    temperature: number;
    condition: string;
  };
}

export interface LiveDataSyncStatus {
  isLive: boolean;
  espnConnected: boolean;
  sleeperConnected: boolean;
  weatherConnected: boolean;
  lastSyncedTimestamp: string;
  nflWeek: number;
  nflSeason: string;
}

// 1. Fetch Real-time Live ESPN NFL Scoreboard
export async function fetchLiveESPNScoreboard(): Promise<LiveNFLGameScore[]> {
  try {
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    if (!response.ok) throw new Error('ESPN API response not ok');
    const data = await response.json();

    const events = data?.events || [];
    return events.map((ev: any) => {
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find((c: any) => c.homeAway === 'home');
      const away = comp?.competitors?.find((c: any) => c.homeAway === 'away');
      const odds = comp?.odds?.[0];

      const statusState = ev.status?.type?.state;
      const status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINAL' = 
        statusState === 'in' ? 'IN_PROGRESS' : statusState === 'post' ? 'FINAL' : 'SCHEDULED';

      return {
        id: ev.id,
        name: ev.name,
        shortName: ev.shortName,
        gameTime: ev.status?.type?.detail || ev.date,
        status,
        homeTeam: {
          abbreviation: home?.team?.abbreviation || 'HOME',
          displayName: home?.team?.displayName || 'Home Team',
          score: parseInt(home?.score || '0', 10),
          logo: home?.team?.logo || 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
        },
        awayTeam: {
          abbreviation: away?.team?.abbreviation || 'AWAY',
          displayName: away?.team?.displayName || 'Away Team',
          score: parseInt(away?.score || '0', 10),
          logo: away?.team?.logo || 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
        },
        odds: odds ? {
          spread: odds.details || `${odds.spread || ''}`,
          overUnder: odds.overUnder || 45.5,
          details: odds.details || '',
        } : undefined,
        weather: comp?.weather ? {
          temperature: comp.weather.temperature,
          condition: comp.weather.displayValue || 'Clear',
        } : undefined,
      };
    });
  } catch (err) {
    console.warn('Live ESPN fetch failed, using realistic fallback:', err);
    return [];
  }
}

// 2. Fetch Live Stadium Weather from Open-Meteo
export async function fetchLiveStadiumWeather(teamAbbr: string): Promise<Partial<PlayerWeather> | null> {
  const stadium = STADIUM_COORDINATES[teamAbbr];
  if (!stadium) return null;

  if (stadium.isDome) {
    return {
      temperature: 72,
      windSpeed: 0,
      windGust: 0,
      precipitation: 'None',
      isDome: true,
      riskLevel: 'LOW',
      summary: `Indoor climate-controlled dome at ${stadium.name}. Zero weather risk.`,
    };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${stadium.lat}&longitude=${stadium.lon}&current=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    const temp = Math.round(data?.current?.temperature_2m ?? 65);
    const wind = Math.round(data?.current?.wind_speed_10m ?? 8);
    const gust = Math.round(data?.current?.wind_gusts_10m ?? 12);
    const precipMm = data?.current?.precipitation ?? 0;
    const precip: 'None' | 'Light Rain' | 'Heavy Rain' | 'Snow' = 
      precipMm > 3 ? 'Heavy Rain' : precipMm > 0.1 ? 'Light Rain' : 'None';

    const riskLevel = wind >= 16 ? 'HIGH' : wind >= 12 ? 'MEDIUM' : 'LOW';

    return {
      temperature: temp,
      windSpeed: wind,
      windGust: gust,
      precipitation: precip,
      isDome: false,
      stadiumName: stadium.name,
      riskLevel,
      summary: `Live Open-Meteo: ${temp}°F, ${wind} mph wind (gusts ${gust} mph), ${precip === 'None' ? 'Clear' : precip}.`,
    };
  } catch (err) {
    console.warn('Open-Meteo weather fetch error:', err);
    return null;
  }
}

// 3. Fetch Sleeper Live NFL State
export async function fetchSleeperNFLState(): Promise<{ week: number; season: string; seasonType: string }> {
  try {
    const response = await fetch('https://api.sleeper.app/v1/state/nfl');
    if (!response.ok) throw new Error('Sleeper API response not ok');
    const data = await response.json();
    return {
      week: data.week || 1,
      season: data.season || '2024',
      seasonType: data.season_type || 'regular',
    };
  } catch (err) {
    console.warn('Sleeper state fetch failed, using fallback:', err);
    return { week: 10, season: '2024', seasonType: 'regular' };
  }
}

// 4. Update Database with Real Live Weather & NFL Odds
// Uses game-location stadium: home team's venue for accurate weather.
// Pre-fetches in batch by unique stadium (~16 venues) to prevent connection socket exhaustion.
export async function syncLivePlayerData(players: Player[] = PLAYERS_DATABASE): Promise<Player[]> {
  // Collect unique stadiums needed across active players
  const stadiumsNeeded = new Set<string>();
  for (const player of players) {
    const gameStadiumTeam = player.isHome ? player.team : player.opponent.replace(/^(vs |@ )/, '');
    const stadiumKey = gameStadiumTeam || player.team;
    if (stadiumKey && STADIUM_COORDINATES[stadiumKey]) {
      stadiumsNeeded.add(stadiumKey);
    }
  }

  // Pre-fetch weather once per unique venue in parallel
  const weatherCache = new Map<string, Partial<PlayerWeather> | null>();
  const venues = Array.from(stadiumsNeeded);
  await Promise.all(
    venues.map(async (stadiumKey) => {
      try {
        const weather = await fetchLiveStadiumWeather(stadiumKey);
        weatherCache.set(stadiumKey, weather);
      } catch (err) {
        console.warn(`[Weather] Failed to fetch weather for venue ${stadiumKey}:`, err);
        weatherCache.set(stadiumKey, null);
      }
    })
  );

  // Map onto all players synchronously with 0 network overhead
  const updatedPlayers = players.map((player) => {
    const gameStadiumTeam = player.isHome ? player.team : player.opponent.replace(/^(vs |@ )/, '');
    const stadiumKey = gameStadiumTeam || player.team;
    const weatherUpdate = weatherCache.get(stadiumKey);
    if (weatherUpdate) {
      return {
        ...player,
        weather: {
          ...player.weather,
          ...weatherUpdate,
        },
      };
    }
    return player;
  });

  return updatedPlayers;
}

export interface EndpointTelemetry {
  name: string;
  url: string;
  status: 'ONLINE' | 'OFFLINE' | 'TESTING';
  httpCode: number;
  latencyMs: number;
  payloadPreview: any;
  lastChecked: string;
}

// 5. Full Real-Time Endpoint Diagnostics Telemetry
export async function checkLiveEndpointsTelemetry(): Promise<EndpointTelemetry[]> {
  const results: EndpointTelemetry[] = [];

  // 1. ESPN Scoreboard API
  const espnStart = performance.now();
  try {
    const espnRes = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const espnLatency = Math.round(performance.now() - espnStart);
    const espnData = await espnRes.json();
    const eventSnippet = espnData?.events?.slice(0, 2).map((e: any) => ({
      game: e.name,
      status: e.status?.type?.detail || e.status?.type?.state,
      odds: e.competitions?.[0]?.odds?.[0]?.details || 'N/A',
    })) || [];

    results.push({
      name: 'ESPN Live Scoreboard & Odds API',
      url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
      status: espnRes.ok ? 'ONLINE' : 'OFFLINE',
      httpCode: espnRes.status,
      latencyMs: espnLatency,
      payloadPreview: {
        league: espnData?.leagues?.[0]?.name || 'NFL',
        seasonYear: espnData?.leagues?.[0]?.season?.year || 2024,
        activeGamesCount: espnData?.events?.length || 0,
        sampleEvents: eventSnippet,
      },
      lastChecked: new Date().toLocaleTimeString(),
    });
  } catch (err: any) {
    results.push({
      name: 'ESPN Live Scoreboard & Odds API',
      url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
      status: 'OFFLINE',
      httpCode: 500,
      latencyMs: Math.round(performance.now() - espnStart),
      payloadPreview: { error: err?.message || 'Network fetch failed' },
      lastChecked: new Date().toLocaleTimeString(),
    });
  }

  // 2. Sleeper NFL State API
  const sleeperStart = performance.now();
  try {
    const sleeperRes = await fetch('https://api.sleeper.app/v1/state/nfl');
    const sleeperLatency = Math.round(performance.now() - sleeperStart);
    const sleeperData = await sleeperRes.json();

    results.push({
      name: 'Sleeper NFL State API',
      url: 'https://api.sleeper.app/v1/state/nfl',
      status: sleeperRes.ok ? 'ONLINE' : 'OFFLINE',
      httpCode: sleeperRes.status,
      latencyMs: sleeperLatency,
      payloadPreview: sleeperData,
      lastChecked: new Date().toLocaleTimeString(),
    });
  } catch (err: any) {
    results.push({
      name: 'Sleeper NFL State API',
      url: 'https://api.sleeper.app/v1/state/nfl',
      status: 'OFFLINE',
      httpCode: 500,
      latencyMs: Math.round(performance.now() - sleeperStart),
      payloadPreview: { error: err?.message || 'Network fetch failed' },
      lastChecked: new Date().toLocaleTimeString(),
    });
  }

  // 3. Open-Meteo Doppler Weather API (Arrowhead Stadium)
  const weatherStart = performance.now();
  try {
    const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=39.0489&longitude=-94.4839&current=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation&temperature_unit=fahrenheit&wind_speed_unit=mph';
    const weatherRes = await fetch(weatherUrl);
    const weatherLatency = Math.round(performance.now() - weatherStart);
    const weatherData = await weatherRes.json();

    results.push({
      name: 'Open-Meteo Doppler Satellite Weather API',
      url: weatherUrl,
      status: weatherRes.ok ? 'ONLINE' : 'OFFLINE',
      httpCode: weatherRes.status,
      latencyMs: weatherLatency,
      payloadPreview: {
        stadium: 'Arrowhead Stadium (Kansas City)',
        gps: '39.0489° N, 94.4839° W',
        currentUnits: weatherData?.current_units,
        liveReadings: weatherData?.current,
      },
      lastChecked: new Date().toLocaleTimeString(),
    });
  } catch (err: any) {
    results.push({
      name: 'Open-Meteo Doppler Satellite Weather API',
      url: 'https://api.open-meteo.com/v1/forecast',
      status: 'OFFLINE',
      httpCode: 500,
      latencyMs: Math.round(performance.now() - weatherStart),
      payloadPreview: { error: err?.message || 'Network fetch failed' },
      lastChecked: new Date().toLocaleTimeString(),
    });
  }

  return results;
}


/**
 * 6. Enrich player list with real ESPN game odds (spread, O/U, implied totals)
 * Matches players to their game by team abbreviation and overlays real sportsbook lines.
 */
export async function enrichPlayersWithESPNOdds(players: Player[]): Promise<Player[]> {
  try {
    const games = await fetchLiveESPNScoreboard();
    if (!games || games.length === 0) return players;

    // Build a map: team abbr → game odds
    const teamOddsMap = new Map<string, {
      spread: number;
      overUnder: number;
      impliedHome: number;
      impliedAway: number;
      homeTeam: string;
      awayTeam: string;
      gameTime: string;
      status: string;
    }>();

    games.forEach(game => {
      const ou = game.odds?.overUnder || 46.5;
      // Spread: positive = home is underdog, negative = home is favorite
      const spreadRaw = parseFloat(game.odds?.spread || '0') || 0;
      // Implied totals using standard vig model
      const homeImplied = Number(((ou / 2) - (spreadRaw / 2)).toFixed(1));
      const awayImplied = Number(((ou / 2) + (spreadRaw / 2)).toFixed(1));

      const entry = {
        spread: spreadRaw,
        overUnder: ou,
        impliedHome: homeImplied,
        impliedAway: awayImplied,
        homeTeam: normalizeTeam(game.homeTeam.abbreviation),
        awayTeam: normalizeTeam(game.awayTeam.abbreviation),
        gameTime: game.gameTime,
        status: game.status,
      };

      teamOddsMap.set(normalizeTeam(game.homeTeam.abbreviation), entry);
      teamOddsMap.set(normalizeTeam(game.awayTeam.abbreviation), entry);
    });

    return players.map(player => {
      const gameData = teamOddsMap.get(player.team) || teamOddsMap.get(player.team.toUpperCase());
      if (!gameData) return player;

      const isHome = gameData.homeTeam === player.team || gameData.homeTeam === player.team.toUpperCase();
      const myImplied = isHome ? gameData.impliedHome : gameData.impliedAway;
      const oppImplied = isHome ? gameData.impliedAway : gameData.impliedHome;
      const oppTeam = isHome ? gameData.awayTeam : gameData.homeTeam;

      // Determine game script trend from implied totals
      let gameScriptTrend: Player['vegas']['gameScriptTrend'] = 'High-Scoring Shootout';
      if (gameData.overUnder < 43) gameScriptTrend = 'Defensive Grind';
      else if (myImplied < oppImplied - 6) gameScriptTrend = 'Trailing Negative Script';
      else if (myImplied > oppImplied + 6) gameScriptTrend = 'Blowout Alert (Favorable Script)';
      else if (gameData.overUnder > 48) gameScriptTrend = 'High-Scoring Shootout';

      return {
        ...player,
        opponent: oppTeam,
        isHome,
        gameTime: gameData.gameTime,
        vegas: {
          ...player.vegas,
          gameSpread: isHome ? gameData.spread : -gameData.spread,
          overUnder: gameData.overUnder,
          impliedTeamTotal: myImplied,
          opponentImpliedTotal: oppImplied,
          gameScriptTrend,
        },
      };
    });
  } catch (err) {
    console.warn('ESPN odds enrichment failed, keeping existing data:', err);
    return players;
  }
}


/**
 * 7. Build a complete live player database from Sleeper API.
 * Merges Sleeper's 3,000+ player records (real names, teams, injuries, CDN photos)
 * with weekly projections and the existing curated static pool as a fallback.
 * Returns all fantasy-relevant NFL players with live data.
 */
export async function buildLivePlayersDatabase(
  existingPool: Player[],
  season: string = '2025',
  week: number = 1
): Promise<Player[]> {
  try {
    const SLEEPER_BASE = 'https://api.sleeper.app/v1';

    // Fetch Sleeper player directory (cached 12h in localStorage)
    const CACHE_KEY = 'gridiron_sleeper_players_cache_v1';
    const CACHE_TTL = 1000 * 60 * 60 * 12;
    let sleeperPlayers: Record<string, SleeperRawPlayer> = {};

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL && parsed.data) {
          sleeperPlayers = parsed.data;
        }
      }
    } catch { /* ignore */ }

    if (Object.keys(sleeperPlayers).length === 0) {
      const res = await fetch(`${SLEEPER_BASE}/players/nfl`);
      if (res.ok) {
        sleeperPlayers = await res.json();
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: sleeperPlayers }));
        } catch { /* quota */ }
      }
    }

    // Fetch live weekly projections (cached 4h)
    let projectionsMap: Record<string, Record<string, number>> = {};
    const PROJ_CACHE_KEY = `gridiron_projections_cache_${season}_week_${week}`;
    const PROJ_TTL = 1000 * 60 * 60 * 4;
    try {
      const cached = localStorage.getItem(PROJ_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.timestamp && Date.now() - parsed.timestamp < PROJ_TTL && parsed.data) {
          projectionsMap = parsed.data;
        }
      }
    } catch { /* ignore */ }

    if (Object.keys(projectionsMap).length === 0) {
      try {
        const res = await fetch(`${SLEEPER_BASE}/projections/nfl/${season}/${week}?season_type=regular`);
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw)) {
            raw.forEach((item: any) => {
              if (item.player_id && item.stats) projectionsMap[item.player_id] = item.stats;
            });
          } else if (raw && typeof raw === 'object') {
            Object.entries(raw).forEach(([pid, val]: [string, any]) => {
              projectionsMap[pid] = val.stats || val;
            });
          }
          try {
            localStorage.setItem(PROJ_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: projectionsMap }));
          } catch { /* quota */ }
        }
      } catch (err) {
        console.warn('Sleeper projections fetch failed:', err);
      }
    }

    // Fantasy-relevant positions (including all IDP defensive positions)
    const FANTASY_POSITIONS = new Set([
      'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB',
      'DE', 'DT', 'NT', 'OLB', 'ILB', 'MLB', 'CB', 'SS', 'FS', 'S'
    ]);

    // Build index of existing static pool by id and name for merging
    const existingById = new Map<string, Player>();
    const existingByName = new Map<string, Player>();
    const existingByNameAndPos = new Map<string, Player>();
    existingPool.forEach(p => {
      existingById.set(p.id, p);
      const norm = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      existingByNameAndPos.set(`${norm}_${p.position}`, p);
      if (!existingByName.has(norm) || (p.tradeValue || 0) > (existingByName.get(norm)?.tradeValue || 0)) {
        existingByName.set(norm, p);
      }
    });

    const DOME_TEAMS = new Set(['DAL', 'DET', 'IND', 'LV', 'LA', 'LAR', 'LAC', 'MIN', 'NO', 'ARI', 'ATL', 'HOU']);

    function mapPos(pos: string): Player['position'] {
      const p = pos.toUpperCase();
      if (['QB','RB','WR','TE','K','DEF'].includes(p)) return p as Player['position'];
      if (['DL','DE','DT','NT'].includes(p)) return 'DL';
      if (['LB','ILB','OLB','MLB'].includes(p)) return 'LB';
      if (['DB','CB','S','FS','SS'].includes(p)) return 'DB';
      return 'WR';
    }

    function mapInjury(status?: string | null): Player['injuryStatus'] {
      if (!status) return 'HEALTHY';
      const s = status.toUpperCase();
      if (s === 'Q' || s === 'QUESTIONABLE') return 'QUESTIONABLE';
      if (s === 'D' || s === 'DOUBTFUL') return 'DOUBTFUL';
      if (s === 'O' || s === 'OUT') return 'OUT';
      if (s === 'IR' || s === 'INJURED_RESERVE') return 'IR';
      return 'HEALTHY';
    }

    const liveBuilt: Player[] = [];
    const seenIds = new Set<string>();

    Object.values(sleeperPlayers).forEach((raw) => {
      // Support team defenses where Sleeper only provides first_name / last_name or position DEF
      const rawFullName = raw.full_name || 
        (raw.first_name && raw.last_name ? `${raw.first_name} ${raw.last_name}` : 
        (raw.position === 'DEF' && raw.team ? `${raw.team} DEF` : ''));

      if (!raw.player_id || !rawFullName) return;
      if (!raw.team || raw.status === 'Inactive') return;

      const pos = raw.position || raw.fantasy_positions?.[0] || '';
      if (!FANTASY_POSITIONS.has(pos.toUpperCase())) return;
      if (seenIds.has(raw.player_id)) return;
      seenIds.add(raw.player_id);

      const team = raw.team || 'FA';
      const posTyped = mapPos(pos);
      const injuryStatus = mapInjury(raw.injury_status);

      // Real Sleeper CDN photo
      const avatar = `https://sleepercdn.com/content/nfl/players/thumb/${raw.player_id}.jpg`;

      // Check if we have enriched static data to merge
      const normName = rawFullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      let existing = existingById.get(raw.player_id);
      
      if (!existing) {
        // First try matching by exact name + mapped position (e.g. Justin Jefferson WR vs Justin Jefferson LB)
        const exactMatch = existingByNameAndPos.get(`${normName}_${posTyped}`);
        if (exactMatch) {
          existing = exactMatch;
        } else {
          // Fallback name match only if offense vs defense aligned
          const nameMatch = existingByName.get(normName);
          if (nameMatch) {
            const isOffense = ['QB', 'RB', 'WR', 'TE', 'K'].includes(posTyped);
            const existingIsOffense = ['QB', 'RB', 'WR', 'TE', 'K'].includes(nameMatch.position);
            if (isOffense === existingIsOffense) {
              existing = nameMatch;
            }
          }
        }
      }

      // Live projection stats
      const proj = projectionsMap[raw.player_id] || {};
      const passYdLine = proj.pass_yd ? Math.round(proj.pass_yd) : undefined;
      const passTDLine = proj.pass_td ? Number(proj.pass_td.toFixed(1)) : undefined;
      const rushYdLine = proj.rush_yd ? Math.round(proj.rush_yd) : undefined;
      const recYdLine = proj.rec_yd ? Math.round(proj.rec_yd) : undefined;
      const recLine = proj.rec ? Number(proj.rec.toFixed(1)) : undefined;

      const isDome = DOME_TEAMS.has(team);
      const stadium = STADIUM_COORDINATES[team];

      if (existing) {
        // Merge: keep all rich static data, PRESERVE curated ID for roster & duel mapping, overlay live fields
        liveBuilt.push({
          ...existing,
          id: existing.id, // Preserve curated ID
          sleeperId: raw.player_id,
          position: posTyped, // Use real live position
          team: team, // Use real live team
          injuryStatus,
          injuryNote: raw.injury_notes || existing.injuryNote,
          avatar, // real Sleeper photo
          vegas: {
            ...existing.vegas,
            props: {
              ...existing.vegas.props,
              ...(passYdLine !== undefined && { passingYardsOU: passYdLine }),
              ...(passTDLine !== undefined && { passingTDsOU: passTDLine }),
              ...(rushYdLine !== undefined && { rushingYardsOU: rushYdLine }),
              ...(recYdLine !== undefined && { receivingYardsOU: recYdLine }),
              ...(recLine !== undefined && { receptionsOU: recLine }),
            },
          },
        });
      } else {
        // Build a new player from Sleeper data
        const depthOrder = raw.depth_chart_order || 99;
        const isStarter = depthOrder <= 2;

        liveBuilt.push({
          id: raw.player_id,
          name: rawFullName || raw.player_id,
          team,
          position: posTyped,
          jerseyNumber: 0,
          opponent: 'TBD',
          isHome: true,
          gameTime: 'TBD',
          avatar,
          injuryStatus,
          injuryNote: raw.injury_notes || undefined,
          rosterPct: depthOrder === 1 ? 92 : depthOrder === 2 ? 55 : 20,
          faabRecommendedPct: depthOrder === 1 ? 20 : depthOrder === 2 ? 8 : 2,
          isWaiverTarget: depthOrder >= 2 && depthOrder <= 3,
          waiverTrend: 'RISING',
          tradeValue: posTyped === 'QB' ? 35 : posTyped === 'RB' ? 30 : posTyped === 'WR' ? 28 : 18,
          adp: depthOrder === 1 ? 80 : 180,
          tier: depthOrder <= 1 ? 2 : 4,
          stats: {
            snapSharePct: depthOrder === 1 ? 82 : 45,
            targetSharePct: (posTyped === 'WR' || posTyped === 'TE') ? 18 : 6,
            carrySharePct: posTyped === 'RB' ? 58 : 0,
            redZoneOpportunitiesPerGame: depthOrder === 1 ? 2.1 : 0.8,
            recentAveragePoints: 0,
            seasonTotalPoints: 0,
          },
          weather: {
            temperature: isDome ? 72 : 65,
            windSpeed: isDome ? 0 : 7,
            windGust: isDome ? 0 : 10,
            precipitation: 'None',
            isDome,
            stadiumName: stadium?.name || `${team} Stadium`,
            turfType: 'FieldTurf',
            riskLevel: 'LOW',
            summary: isDome ? `Indoor dome — zero weather impact.` : `Outdoor venue at ${stadium?.name || team}.`,
          },
          vegas: {
            gameSpread: -3,
            overUnder: 46.5,
            impliedTeamTotal: 24.5,
            opponentImpliedTotal: 22.0,
            gameScriptTrend: 'High-Scoring Shootout',
            props: {
              passingYardsOU: posTyped === 'QB' ? (passYdLine ?? 235) : undefined,
              passingTDsOU: posTyped === 'QB' ? (passTDLine ?? 1.7) : undefined,
              rushingYardsOU: posTyped === 'RB' ? (rushYdLine ?? 64) : posTyped === 'QB' ? (rushYdLine ?? 18) : undefined,
              receivingYardsOU: (posTyped === 'WR' || posTyped === 'TE') ? (recYdLine ?? 55) : posTyped === 'RB' ? (recYdLine ?? 16) : undefined,
              receptionsOU: (posTyped === 'WR' || posTyped === 'TE') ? (recLine ?? 4.5) : 2.5,
              anytimeTDOdds: isStarter ? (posTyped === 'QB' ? '+200' : posTyped === 'RB' ? '-110' : '+130') : '+400',
            },
          },
          defense: {
            opponentTeam: 'OPP',
            rankVsPosition: 16,
            epaPerPlayRank: 16,
            pressureRatePct: 28,
            passRushWinRateRank: 16,
            runDefenseRank: 16,
            coverageScheme: 'Balanced',
            slotVulnerability: 'Neutral',
            redZoneTDAllowedPct: 52,
            matchupGrade: 'B',
          },
          coaching: {
            headCoach: 'Head Coach',
            offensiveCoordinator: 'OC',
            paceRank: 16,
            secondsPerSnap: 25.5,
            proe: 1.2,
            neutralPassRate: 56,
            runScheme: 'Balanced Mixed',
            redZoneTendency: 'Balanced Mixed',
          },
          recentGames: [],
          aiAnalysisSummary: `${rawFullName || raw.full_name || raw.player_id} — live Sleeper data. ${injuryStatus !== 'HEALTHY' ? `⚠️ ${injuryStatus}` : 'Active.'}`,
        });
      }
    });

    // Ensure 100% of curated static pool players and defenses are preserved
    const builtIds = new Set(liveBuilt.map(p => p.id));
    existingPool.forEach(p => {
      if (!builtIds.has(p.id)) {
        liveBuilt.push(p);
      }
    });

    // Enrich with real ESPN game odds
    const withOdds = await enrichPlayersWithESPNOdds(liveBuilt);

    // Apply live Open-Meteo weather for outdoor stadiums
    const withWeather = await syncLivePlayerData(withOdds);

    console.info(`[Gridiron AI] Live DB built: ${withWeather.length} players from Sleeper + ESPN odds + Open-Meteo weather.`);
    return withWeather;
  } catch (err) {
    console.warn('[Gridiron AI] buildLivePlayersDatabase failed, using static pool:', err);
    return existingPool;
  }
}
