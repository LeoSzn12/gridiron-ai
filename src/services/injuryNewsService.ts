/**
 * Live Injury & News Feed Service
 * Pulls from Sleeper transactions + news endpoints
 * Alerts when players on the user's roster have news
 */

export interface PlayerNewsItem {
  id: string;
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  headline: string;
  analysis: string;
  injuryStatus: string; // 'OUT' | 'QUESTIONABLE' | 'DOUBTFUL' | 'IR' | 'HEALTHY'
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  publishedAt: string;
  isOnMyRoster: boolean;
}

const NEWS_CACHE_KEY = 'gridiron_news_cache_v1';
const NEWS_CACHE_TTL = 1000 * 60 * 15; // 15 min cache

/**
 * Fetch live player news from Sleeper's unofficial news endpoint
 */
async function fetchSleeperNews(): Promise<any[]> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=50');
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

/**
 * Fetch injury updates from Sleeper player directory (filtered to recently updated)
 */
async function fetchInjuryUpdates(): Promise<Record<string, any>> {
  try {
    const cached = localStorage.getItem('gridiron_sleeper_players_cache_v1');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.data) return parsed.data;
    }
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!res.ok) return {};
    return await res.json();
  } catch { return {}; }
}

/**
 * Fetch and process the live news/injury feed
 * @param myRosterIds - Player IDs on user's roster to flag as high-priority
 */
export async function fetchLiveNewsAndInjuries(
  myRosterIds: string[] = []
): Promise<PlayerNewsItem[]> {
  // Check cache
  try {
    const cached = localStorage.getItem(NEWS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.timestamp && Date.now() - parsed.timestamp < NEWS_CACHE_TTL) {
        // Re-flag based on current roster
        const mySet = new Set(myRosterIds);
        return parsed.data.map((item: PlayerNewsItem) => ({
          ...item,
          isOnMyRoster: mySet.has(item.playerId),
        }));
      }
    }
  } catch { /* ignore */ }

  const [trendingData, playersData] = await Promise.all([
    fetchSleeperNews(),
    fetchInjuryUpdates(),
  ]);

  const mySet = new Set(myRosterIds);
  const items: PlayerNewsItem[] = [];
  const seen = new Set<string>();

  // Process injured players from Sleeper directory
  const injuryStatuses = ['Out', 'Doubtful', 'Questionable', 'Injured Reserve'];
  Object.values(playersData).forEach((raw: any) => {
    if (!raw?.player_id || !raw?.full_name) return;
    if (!raw?.team || raw?.status === 'Inactive') return;
    if (!injuryStatuses.some(s => raw?.injury_status === s || raw?.status === s)) return;
    if (seen.has(raw.player_id)) return;
    seen.add(raw.player_id);

    const statusMap: Record<string, string> = {
      'Out': 'OUT', 'Doubtful': 'DOUBTFUL',
      'Questionable': 'QUESTIONABLE', 'Injured Reserve': 'IR',
    };
    const injuryStatus = statusMap[raw.injury_status || raw.status] || 'QUESTIONABLE';
    const impact: PlayerNewsItem['impact'] =
      injuryStatus === 'OUT' || injuryStatus === 'IR' ? 'HIGH' :
      injuryStatus === 'DOUBTFUL' ? 'HIGH' : 'MEDIUM';

    items.push({
      id: `injury-${raw.player_id}`,
      playerId: raw.player_id,
      playerName: raw.full_name,
      team: raw.team || 'FA',
      position: raw.position || raw.fantasy_positions?.[0] || 'N/A',
      headline: raw.injury_notes
        ? `${raw.full_name} — ${raw.injury_notes}`
        : `${raw.full_name} listed as ${injuryStatus} (${raw.injury_body_part || 'undisclosed'})`,
      analysis: raw.news?.analysis || `Monitor practice reports. Check for updates ${injuryStatus === 'OUT' ? 'before locking lineup' : 'Wednesday–Friday'}.`,
      injuryStatus,
      impact,
      source: 'Sleeper / NFL',
      publishedAt: raw.last_modified || new Date().toISOString(),
      isOnMyRoster: mySet.has(raw.player_id),
    });
  });

  // Add trending adds (waiver targets)
  if (Array.isArray(trendingData)) {
    trendingData.slice(0, 15).forEach((item: any) => {
      const pid = item?.player_id?.toString();
      if (!pid || seen.has(pid)) return;
      seen.add(pid);
      const raw = playersData[pid];
      if (!raw?.full_name) return;
      items.push({
        id: `trending-${pid}`,
        playerId: pid,
        playerName: raw.full_name,
        team: raw.team || 'FA',
        position: raw.position || 'N/A',
        headline: `🔥 ${raw.full_name} trending on waivers (+${item.count || '?'} adds in 24h)`,
        analysis: `High waiver priority. Check injury news of the player they are replacing.`,
        injuryStatus: raw.injury_status ? (raw.injury_status.toUpperCase()) : 'HEALTHY',
        impact: 'MEDIUM',
        source: 'Sleeper Trending',
        publishedAt: new Date().toISOString(),
        isOnMyRoster: mySet.has(pid),
      });
    });
  }

  // Sort: roster alerts first, then HIGH impact, then MEDIUM
  items.sort((a, b) => {
    if (a.isOnMyRoster && !b.isOnMyRoster) return -1;
    if (!a.isOnMyRoster && b.isOnMyRoster) return 1;
    const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: items }));
  } catch { /* quota */ }

  return items;
}

/**
 * Get count of HIGH impact alerts for players on my roster (for badge display)
 */
export function getMyRosterAlertCount(news: PlayerNewsItem[], myRosterIds: string[]): number {
  const mySet = new Set(myRosterIds);
  return news.filter(n => mySet.has(n.playerId) && (n.impact === 'HIGH' || n.injuryStatus === 'OUT' || n.injuryStatus === 'DOUBTFUL')).length;
}
