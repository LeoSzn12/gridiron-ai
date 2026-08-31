import type { Player, PlayerWeather } from '../types';
import { PLAYERS_DATABASE } from '../data/mockData';


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
export async function syncLivePlayerData(players: Player[] = PLAYERS_DATABASE): Promise<Player[]> {
  // Cache weather by stadium to avoid duplicate API calls for same venue
  const weatherCache = new Map<string, Partial<PlayerWeather> | null>();

  const updatedPlayers = await Promise.all(
    players.map(async (player) => {
      // Determine the game-location stadium team abbreviation:
      // - Home games: use the player's own team
      // - Away games: use the opponent's team (that's where the game is played)
      const gameStadiumTeam = player.isHome ? player.team : player.opponent.replace(/^(vs |@ )/, '');
      const stadiumKey = gameStadiumTeam || player.team;

      if (!weatherCache.has(stadiumKey)) {
        weatherCache.set(stadiumKey, await fetchLiveStadiumWeather(stadiumKey));
      }

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
    })
  );
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

