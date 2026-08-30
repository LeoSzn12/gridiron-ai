import React, { useState, useEffect, useCallback } from 'react';
import type { Player, LeagueSettings, SleeperUserLeague, SleeperTrendingPlayer } from '../types';
import { 
  fetchLiveESPNScoreboard, 
  fetchSleeperNFLState, 
  syncLivePlayerData,
  checkLiveEndpointsTelemetry,
  type LiveNFLGameScore,
  type EndpointTelemetry 
} from '../services/liveDataService';
import { 
  fetchSleeperUserLeagues, 
  fetchSleeperLeagueRosters, 
  fetchSleeperNFLPlayers,
  fetchSleeperTrending,
  convertSleeperLeagueToSettings
} from '../services/sleeperService';
import { 
  X, 
  Radio, 
  RotateCcw, 
  CheckCircle2, 
  Zap, 
  Code, 
  ExternalLink,
  Search,
  TrendingUp,
  Trophy
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LiveDataHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  settings: LeagueSettings;
  onUpdatePlayers: (updatedPlayers: Player[]) => void;
  onUpdateLeagueSettings?: (settings: LeagueSettings) => void;
}

export const LiveDataHubModal: React.FC<LiveDataHubModalProps> = ({
  isOpen,
  onClose,
  players,
  settings,
  onUpdatePlayers,
  onUpdateLeagueSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'sleeper' | 'espn' | 'telemetry'>('sleeper');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [liveScores, setLiveScores] = useState<LiveNFLGameScore[]>([]);
  const [nflState, setNflState] = useState<{ week: number; season: string }>({ week: 10, season: '2024' });
  const [telemetry, setTelemetry] = useState<EndpointTelemetry[]>([]);
  const [activeJsonTab, setActiveJsonTab] = useState<string | null>(null);

  // Sleeper Sync State
  const [sleeperUsername, setSleeperUsername] = useState<string>('');
  const [userLeagues, setUserLeagues] = useState<SleeperUserLeague[]>([]);
  const [trendingPlayers, setTrendingPlayers] = useState<SleeperTrendingPlayer[]>([]);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Define loadLiveData with useCallback before useEffect to avoid hoisting/initialization errors
  const loadLiveData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [scores, state, telemetryData, trending] = await Promise.all([
        fetchLiveESPNScoreboard(),
        fetchSleeperNFLState(),
        checkLiveEndpointsTelemetry(),
        fetchSleeperTrending('add', players),
      ]);
      setLiveScores(scores);
      setNflState({ week: state.week, season: state.season });
      setTelemetry(telemetryData);
      setTrendingPlayers(trending);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Failed to load live data:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [players]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadLiveData();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, loadLiveData]);

  const handleSyncAllFeeds = async () => {
    setIsSyncing(true);
    try {
      const updated = await syncLivePlayerData(players);
      onUpdatePlayers(updated);
      await loadLiveData();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFetchSleeperLeagues = async () => {
    if (!sleeperUsername.trim()) return;
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const result = await fetchSleeperUserLeagues(sleeperUsername.trim(), nflState.season);
      setUserLeagues(result.leagues);
      if (result.leagues.length === 0) {
        setSyncStatusMsg(`Found user ${sleeperUsername}, but no active NFL leagues in season ${nflState.season}.`);
      } else {
        setSyncStatusMsg(`Found ${result.leagues.length} leagues for ${sleeperUsername}! Select one below to import.`);
      }
    } catch (err: any) {
      setSyncStatusMsg(`Error: ${err.message || 'Could not fetch user from Sleeper.'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportSleeperLeague = async (league: SleeperUserLeague) => {
    setIsSyncing(true);
    try {
      const allSleeperPlayers = await fetchSleeperNFLPlayers();
      const { hydratedPlayers } = await fetchSleeperLeagueRosters(league.league_id, allSleeperPlayers);
      
      // Update league settings
      const newSettings = convertSleeperLeagueToSettings(league, sleeperUsername || 'My Team');
      if (onUpdateLeagueSettings) {
        onUpdateLeagueSettings(newSettings);
      }

      // If hydrated players found, update players list
      if (hydratedPlayers.length > 0) {
        onUpdatePlayers(hydratedPlayers);
      }

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setSyncStatusMsg(`✅ Successfully imported "${league.name}"! Loaded ${hydratedPlayers.length} rostered players and active scoring.`);
    } catch (err: any) {
      setSyncStatusMsg(`Import failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl glass-panel-elevated border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              LIVE DATA PIPELINE HUB
            </span>
            <span className="text-xs text-slate-400 font-mono">NFL Season {nflState.season} • Week {nflState.week}</span>
          </div>

          <h2 className="text-2xl font-bold text-white font-display mt-1">Live NFL Data & League Sync Diagnostics</h2>
          <p className="text-xs text-slate-300">
            Direct real-time HTTP integration with Sleeper's 3,000+ player API, ESPN Live Scoreboards, and Open-Meteo Doppler Satellite Weather.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'sleeper', label: '🏈 Sleeper 1-Click Sync & Trending' },
            { id: 'espn', label: '📺 ESPN Live NFL Scoreboard' },
            { id: 'telemetry', label: '⚡ API Latency & JSON' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: Sleeper Sync & Trending Wire */}
        {activeTab === 'sleeper' && (
          <div className="space-y-5">
            {/* Sleeper Username Search */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-purple-300 font-display flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  <span>Sleeper 1-Click Zero-Auth League Import</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                  Active: {settings.name}
                </span>
              </div>

              <p className="text-xs text-slate-300">
                Enter your Sleeper username to automatically import your real league rosters, starters, scoring rules, and bench players:
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={sleeperUsername}
                    onChange={(e) => setSleeperUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFetchSleeperLeagues()}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                    placeholder="Enter Sleeper username (e.g. LeoSzn, fantasyking)..."
                  />
                </div>
                <button
                  onClick={handleFetchSleeperLeagues}
                  disabled={isSyncing || !sleeperUsername.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Fetch Leagues</span>
                </button>
              </div>

              {syncStatusMsg && (
                <div className="p-3 rounded-xl bg-slate-950/90 border border-purple-500/40 text-xs text-purple-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{syncStatusMsg}</span>
                </div>
              )}

              {/* User Leagues List */}
              {userLeagues.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">Select League to Import:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {userLeagues.map((lg) => (
                      <div
                        key={lg.league_id}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500 flex items-center justify-between transition-all"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{lg.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {lg.total_rosters} Teams • {lg.season} Season
                          </div>
                        </div>
                        <button
                          onClick={() => handleImportSleeperLeague(lg)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 cursor-pointer shadow-sm"
                        >
                          Import
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sleeper 24-Hour Trending Wire */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 uppercase flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Sleeper 24-Hour Trending Waiver Adds ({trendingPlayers.length} Players):
                </span>
                <span className="text-slate-500">Live Wire</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {trendingPlayers.map((tp, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <img
                        src={`https://sleepercdn.com/content/nfl/players/thumb/${tp.player_id}.jpg`}
                        alt=""
                        className="w-7 h-7 rounded-lg object-cover bg-slate-900 border border-slate-800"
                        onError={(e) => {
                          (e.target as any).src = 'https://sleepercdn.com/images/v2/icons/player_default.webp';
                        }}
                      />
                      <div className="truncate">
                        <div className="font-bold text-white truncate">
                          {tp.player?.name || `Player #${tp.player_id}`}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {tp.player?.position || 'NFL'} • {tp.player?.team || 'FA'}
                        </div>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      +{tp.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Live ESPN Games Feed */}
        {activeTab === 'espn' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 uppercase">Live NFL Games ({liveScores.length} Ingested):</span>
              <span className="text-slate-500">Last Synced: {lastSyncTime}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {liveScores.length > 0 ? (
                liveScores.map((game) => (
                  <div key={game.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <img src={game.awayTeam.logo} alt={game.awayTeam.abbreviation} className="w-4 h-4 object-contain" />
                        <span>{game.awayTeam.abbreviation} ({game.awayTeam.score})</span>
                        <span className="text-slate-500">@</span>
                        <img src={game.homeTeam.logo} alt={game.homeTeam.abbreviation} className="w-4 h-4 object-contain" />
                        <span>{game.homeTeam.abbreviation} ({game.homeTeam.score})</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {game.odds?.spread ? `${game.odds.spread} • O/U ${game.odds.overUnder}` : game.gameTime}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      game.status === 'IN_PROGRESS' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {game.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-4 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-slate-800">
                  Connecting to live ESPN scoreboard...
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Telemetry & JSON */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {telemetry.map((t, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate">{t.name.split(' ')[0]} API</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {t.httpCode} OK
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between font-mono">
                    <span className="text-xs text-slate-400">Response Latency:</span>
                    <span className="text-emerald-300 font-bold text-sm">{t.latencyMs}ms</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] font-mono">
                    <button
                      onClick={() => setActiveJsonTab(activeJsonTab === t.name ? null : t.name)}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3 h-3" />
                      <span>{activeJsonTab === t.name ? 'Hide JSON' : 'Inspect JSON'}</span>
                    </button>

                    <a
                      href={t.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white flex items-center gap-0.5"
                    >
                      <span>Verify</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {activeJsonTab && (
              <div className="p-4 rounded-2xl bg-[#070b14] border border-indigo-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-indigo-300 font-bold flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" />
                    Raw Live JSON Payload from {activeJsonTab}
                  </span>
                  <button
                    onClick={() => setActiveJsonTab(null)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <pre className="p-3 bg-slate-950 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-44 border border-slate-800">
                  {JSON.stringify(
                    telemetry.find(t => t.name === activeJsonTab)?.payloadPreview,
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={loadLiveData}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Re-Test Live APIs</span>
          </button>

          <button
            onClick={handleSyncAllFeeds}
            disabled={isSyncing}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Zap className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? 'Syncing Live Feeds...' : 'Sync All Live Feeds Now'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
