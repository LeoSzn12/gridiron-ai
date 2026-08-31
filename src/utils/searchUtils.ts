import type { Player } from '../types';

export interface SearchMatchResult {
  player: Player;
  score: number;
  matchReason?: string;
}

const NFL_TEAM_NAMES: Record<string, string[]> = {
  BAL: ['ravens', 'baltimore'],
  KC: ['chiefs', 'kansas city'],
  PHI: ['eagles', 'philadelphia', 'philly'],
  BUF: ['bills', 'buffalo'],
  SF: ['49ers', 'niners', 'san francisco'],
  MIN: ['vikings', 'minnesota'],
  DET: ['lions', 'detroit'],
  CIN: ['bengals', 'cincinnati'],
  WAS: ['commanders', 'washington'],
  DAL: ['cowboys', 'dallas'],
  HOU: ['texans', 'houston'],
  MIA: ['dolphins', 'miami'],
  TB: ['buccaneers', 'bucs', 'tampa bay'],
  GB: ['packers', 'green bay'],
  PIT: ['steelers', 'pittsburgh'],
  LAR: ['rams', 'los angeles rams'],
  LAC: ['chargers', 'los angeles chargers'],
  SEA: ['seahawks', 'seattle'],
  ARI: ['cardinals', 'arizona'],
  DEN: ['broncos', 'denver'],
  NYJ: ['jets', 'new york jets'],
  NYG: ['giants', 'new york giants'],
  CHI: ['bears', 'chicago'],
  IND: ['colts', 'indianapolis'],
  ATL: ['falcons', 'atlanta'],
  NO: ['saints', 'new orleans'],
  JAX: ['jaguars', 'jacksonville'],
  TEN: ['titans', 'tennessee'],
  LV: ['raiders', 'las vegas'],
  CLE: ['browns', 'cleveland'],
  CAR: ['panthers', 'carolina'],
  NE: ['patriots', 'pats', 'new england'],
};

/**
 * Calculates a match score between query and a player (0 = no match, 100 = perfect match)
 */
export function matchPlayerScore(player: Player, rawQuery: string): SearchMatchResult | null {
  const q = rawQuery.toLowerCase().trim();
  if (!q) return null;

  const name = player.name.toLowerCase();
  const [first, ...rest] = name.split(' ');
  const last = rest.join(' ');
  const team = player.team.toLowerCase();
  const pos = player.position.toLowerCase();
  const teamAliases = NFL_TEAM_NAMES[player.team] || [];

  // Exact full name match
  if (name === q) {
    return { player, score: 100, matchReason: 'Exact name' };
  }

  // Exact start of name or last name
  if (name.startsWith(q) || last.startsWith(q)) {
    return { player, score: 90, matchReason: 'Name match' };
  }

  // Substring match in full name
  if (name.includes(q)) {
    return { player, score: 80, matchReason: 'Name contains' };
  }

  // Initials match (e.g. "lj" for Lamar Jackson, "cmc" for Christian McCaffrey)
  const initials = `${first[0] || ''}${last[0] || ''}`.toLowerCase();
  if (initials === q) {
    return { player, score: 75, matchReason: 'Initials' };
  }

  // Team match (e.g. "Chiefs", "Ravens", "Eagles")
  if (team === q || teamAliases.some(alias => alias.includes(q) || q.includes(alias))) {
    return { player, score: 60, matchReason: `Team (${player.team})` };
  }

  // Position + Team query (e.g. "KC QB", "BAL RB", "PHI WR")
  if (q.includes(team) && q.includes(pos)) {
    return { player, score: 70, matchReason: `${player.position} for ${player.team}` };
  }

  // Exact Position match
  if (pos === q) {
    return { player, score: 50, matchReason: `${player.position} pool` };
  }

  // Fuzzy partial match (Levenshtein-like token overlap)
  const tokens = q.split(/\s+/);
  const matchesToken = tokens.every(token => 
    name.includes(token) || 
    team.includes(token) || 
    pos === token || 
    teamAliases.some(a => a.includes(token))
  );

  if (matchesToken) {
    return { player, score: 65, matchReason: 'Keywords match' };
  }

  return null;
}

/**
 * Searches and ranks players with smart fuzzy relevance scoring
 */
export function searchPlayers(players: Player[], query: string, limit: number = 8): Player[] {
  if (!query.trim()) return [];

  const results: SearchMatchResult[] = [];
  for (const player of players) {
    const match = matchPlayerScore(player, query);
    if (match) results.push(match);
  }

  results.sort((a, b) => b.score - a.score || b.player.tradeValue - a.player.tradeValue);
  return results.slice(0, limit).map(r => r.player);
}
