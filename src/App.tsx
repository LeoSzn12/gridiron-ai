import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Player, LeagueSettings } from './types';
import { PLAYERS_DATABASE, LEO_SZN_YAHOO_PRESET } from './data/mockData';
import { 
  syncLivePlayerData, 
  fetchLiveESPNScoreboard, 
  fetchSleeperNFLState,
  type LiveNFLGameScore 
} from './services/liveDataService';
import { 
  fetchSleeperNFLPlayers, 
  convertSleeperToGridironPlayer 
} from './services/sleeperService';
import { 
  fetchLiveWeeklyProjections, 
  enrichPlayersWithWeeklyProjections 
} from './services/projectionService';
import { 
  getSavedMyRosterIds, 
  saveMyRosterIds, 
  getSavedOpponentRosterIds, 
  saveOpponentRosterIds, 
  getSavedRosterMetadata, 
  saveRosterMetadata,
  type RosterMetadata
} from './services/rosterService';
import { Navbar } from './components/Navbar';
import { WeeklyDashboard } from './components/WeeklyDashboard';
import { ActionCenterCard } from './components/ActionCenterCard';
import { LineupOptimizerModal } from './components/LineupOptimizerModal';
import { StartSitTool } from './components/StartSitTool';
import { AIChatCoach } from './components/AIChatCoach';
import { VegasOddsHub } from './components/VegasOddsHub';
import { MatchupMatrix } from './components/MatchupMatrix';
import { WaiverWireRadar } from './components/WaiverWireRadar';
import { TradeAnalyzer } from './components/TradeAnalyzer';
import { PlayerModal } from './components/PlayerModal';
import { LeagueSettingsModal } from './components/LeagueSettingsModal';
import { DraftRoom } from './components/DraftRoom';
import { DecisionEngineWarRoom } from './components/DecisionEngineWarRoom';
import { MatchupSimulator } from './components/MatchupSimulator';
import { GamedayLiveGamecast } from './components/GamedayLiveGamecast';
import { AdvancedMetricsLab } from './components/AdvancedMetricsLab';
import { WeatherRadarHub } from './components/WeatherRadarHub';
import { AIAudioBriefing } from './components/AIAudioBriefing';
import { LiveDataHubModal } from './components/LiveDataHubModal';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { FloatingComparisonDock } from './components/FloatingComparisonDock';
import { PropsIntelligenceLab } from './components/PropsIntelligenceLab';
import { 
  Flame, 
  Wind, 
  DollarSign, 
  TrendingUp,
  Sparkles,
  BrainCircuit,
  Zap,
  Bot,
  LayoutGrid
} from 'lucide-react';

const SETTINGS_STORAGE_KEY = 'gridiron_league_settings_v1';
const PINNED_STORAGE_KEY = 'gridiron_pinned_players_v1';

export function App() {
  // Read initial tab from URL hash if available
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashTab = window.location.hash.replace('#', '').trim();
      if (hashTab) return hashTab;
    }
    return 'hq';
  });

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  }, []);

  // Listen to browser Back / Forward hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hashTab = window.location.hash.replace('#', '').trim();
      if (hashTab) {
        setActiveTabState(hashTab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Persisted League Settings
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return LEO_SZN_YAHOO_PRESET;
  });

  const [isLeagueSettingsOpen, setIsLeagueSettingsOpen] = useState<boolean>(false);
  const [isLiveDataHubOpen, setIsLiveDataHubOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isLineupOptimizerOpen, setIsLineupOptimizerOpen] = useState<boolean>(false);

  // Persisted Pinned Players
  const [pinnedPlayers, setPinnedPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  // User & Opponent Rosters State
  const [myRosterIds, setMyRosterIds] = useState<string[]>(getSavedMyRosterIds);
  const [opponentRosterIds, setOpponentRosterIds] = useState<string[]>(getSavedOpponentRosterIds);
  const [rosterMeta, setRosterMeta] = useState<RosterMetadata>(getSavedRosterMetadata);

  const [playersList, setPlayersList] = useState<Player[]>(PLAYERS_DATABASE);
  const [liveScores, setLiveScores] = useState<LiveNFLGameScore[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<Player | null>(null);

  // Save settings & pinned players on change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(leagueSettings));
    } catch {
      // ignore
    }
  }, [leagueSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedPlayers));
    } catch {
      // ignore
    }
  }, [pinnedPlayers]);

  useEffect(() => {
    saveMyRosterIds(myRosterIds);
  }, [myRosterIds]);

  useEffect(() => {
    saveOpponentRosterIds(opponentRosterIds);
  }, [opponentRosterIds]);

  useEffect(() => {
    saveRosterMetadata(rosterMeta);
  }, [rosterMeta]);

  // Global ⌘K Keyboard Shortcut Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-sync real-time weather, live ESPN NFL scoreboard, Sleeper players, and live weekly projections on mount
  useEffect(() => {
    let isMounted = true;
    
    // 1. Fetch live ESPN Scoreboard
    fetchLiveESPNScoreboard().then(scores => {
      if (isMounted && scores.length > 0) {
        setLiveScores(scores);
      }
    }).catch(err => {
      console.warn('Initial ESPN fetch notice:', err);
    });

    // 2. Fetch live Open-Meteo Doppler Stadium Weather
    syncLivePlayerData(PLAYERS_DATABASE).then(livePlayers => {
      if (isMounted) {
        setPlayersList(livePlayers);
      }
    }).catch(err => {
      console.warn('Initial live weather sync notice:', err);
    });

    // 3. Hydrate Sleeper full database & weekly projections
    Promise.all([
      fetchSleeperNFLState(),
      fetchSleeperNFLPlayers(),
    ]).then(async ([nflState, sleeperData]) => {
      if (!isMounted) return;

      const season = nflState.season || '2024';
      const week = nflState.week || 1;

      // Fetch weekly projections
      const projectionsMap = await fetchLiveWeeklyProjections(season, week);

      if (isMounted) {
        setPlayersList(prev => {
          // Enriched top key players from Sleeper directory
          const enriched = prev.map(p => {
            const raw = sleeperData[p.id] || Object.values(sleeperData).find(
              sp => sp.search_full_name === p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            return raw ? convertSleeperToGridironPlayer(raw, p) : p;
          });

          // Ingest weekly projection stats into custom scoring
          return enrichPlayersWithWeeklyProjections(enriched, projectionsMap, leagueSettings);
        });
      }
    }).catch(err => {
      console.warn('Live projections sync notice:', err);
    });

    return () => {
      isMounted = false;
    };
  }, [leagueSettings]);

  // Derived user roster & opponent roster
  const myRoster = useMemo(() => {
    const idSet = new Set(myRosterIds);
    const roster = playersList.filter(p => idSet.has(p.id));
    if (roster.length > 0) return roster;
    // Fallback to first 12 players if empty
    return playersList.slice(0, 12);
  }, [playersList, myRosterIds]);

  const opponentRoster = useMemo(() => {
    const idSet = new Set(opponentRosterIds);
    const roster = playersList.filter(p => idSet.has(p.id));
    if (roster.length > 0) return roster;
    return playersList.slice(12, 24);
  }, [playersList, opponentRosterIds]);

  // Compute highest over/under game dynamically from live ESPN API
  const topVegasTotal = useMemo(() => {
    if (!liveScores.length) return { matchup: 'TB @ CIN', total: 50.5 };
    const sorted = [...liveScores].sort((a, b) => (b.odds?.overUnder || 0) - (a.odds?.overUnder || 0));
    const highest = sorted[0];
    return {
      matchup: `${highest?.awayTeam.abbreviation} @ ${highest?.homeTeam.abbreviation}`,
      total: highest?.odds?.overUnder || 50.5,
    };
  }, [liveScores]);

  // Compute dynamic metric strip data from live player data
  const topTDProp = useMemo(() => {
    const candidates = playersList
      .filter(p => p.vegas.props.anytimeTDOdds && p.vegas.props.anytimeTDOdds !== 'N/A')
      .sort((a, b) => {
        const oddsA = parseInt(a.vegas.props.anytimeTDOdds.replace('+', ''), 10);
        const oddsB = parseInt(b.vegas.props.anytimeTDOdds.replace('+', ''), 10);
        return (isNaN(oddsA) ? 999 : oddsA) - (isNaN(oddsB) ? 999 : oddsB);
      });
    const best = candidates[0];
    return best
      ? { name: best.name, odds: best.vegas.props.anytimeTDOdds }
      : { name: 'Saquon Barkley', odds: '-165' };
  }, [playersList]);

  const topWaiverTarget = useMemo(() => {
    const waiverPlayers = playersList
      .filter(p => p.isWaiverTarget)
      .sort((a, b) => b.faabRecommendedPct - a.faabRecommendedPct);
    const best = waiverPlayers[0];
    return best
      ? { name: best.name, faab: `${best.faabRecommendedPct}% FAAB` }
      : { name: 'No Waiver Targets', faab: '—' };
  }, [playersList]);

  const topWeatherAlert = useMemo(() => {
    const outdoorWindy = playersList
      .filter(p => !p.weather.isDome && p.weather.windSpeed >= 8)
      .sort((a, b) => b.weather.windSpeed - a.weather.windSpeed);
    const worst = outdoorWindy[0];
    return worst
      ? { stadium: worst.weather.stadiumName, wind: `${worst.weather.windSpeed}mph Wind` }
      : { stadium: 'All Clear', wind: 'No Alerts' };
  }, [playersList]);

  // Pinned player management
  const handlePinPlayer = (player: Player) => {
    setPinnedPlayers(prev => {
      if (prev.some(p => p.id === player.id)) {
        return prev.filter(p => p.id !== player.id);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), player];
      }
      return [...prev, player];
    });
  };

  const handleRemovePinned = (playerId: string) => {
    setPinnedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleLaunchDuelFromDock = (playerA: Player, _playerB: Player) => {
    setActiveTab('war-room');
    setSelectedPlayerDetail(playerA);
  };

  const handleApplyOptimalLineup = (optimalStarters: Player[]) => {
    // Re-order playersList so optimal starters are at the top
    const starterIds = new Set(optimalStarters.map(p => p.id));
    const nonStarters = playersList.filter(p => !starterIds.has(p.id));
    setPlayersList([...optimalStarters, ...nonStarters]);
  };

  const handleUpdateRosters = (
    myIds: string[], 
    oppIds: string[], 
    userTeamName: string, 
    oppTeamName: string
  ) => {
    setMyRosterIds(myIds);
    setOpponentRosterIds(oppIds);
    setRosterMeta(prev => ({
      ...prev,
      userTeamName,
      opponentTeamName: oppTeamName,
    }));
  };

  // Filter players by search query if any
  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return playersList;
    const q = searchQuery.toLowerCase();
    return playersList.filter(
      p => p.name.toLowerCase().includes(q) || 
           p.team.toLowerCase().includes(q) || 
           p.opponent.toLowerCase().includes(q) ||
           p.position.toLowerCase() === q
    );
  }, [searchQuery, playersList]);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300 relative pb-16 md:pb-0">
      
      {/* Navigation Header with Live ESPN Week 1 Scoreboard */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        leagueSettings={leagueSettings}
        liveGames={liveScores}
        onOpenLeagueSettings={() => setIsLeagueSettingsOpen(true)}
        onOpenLiveDataHub={() => setIsLiveDataHubOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenOptimizer={() => setIsLineupOptimizerOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Quick Intelligence Metric Strip — All 4 cards computed from live data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Vegas Total - Gold Accent (Live ESPN) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border border-amber-500/40 shadow-lg shadow-amber-500/5 flex items-center gap-3.5 ring-1 ring-amber-500/20">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-amber-300/90 uppercase font-bold tracking-wider">Top Vegas Total</div>
              <div className="text-sm sm:text-base font-extrabold text-white font-display mt-0.5">{topVegasTotal.matchup} ({topVegasTotal.total} O/U)</div>
            </div>
          </div>

          {/* TD Prop - Crimson/Coral Accent (Dynamic from player data) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border border-rose-500/40 shadow-lg shadow-rose-500/5 flex items-center gap-3.5 ring-1 ring-rose-500/20">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Flame className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-rose-300/90 uppercase font-bold tracking-wider">Top TD Prop Line</div>
              <div className="text-sm sm:text-base font-extrabold text-white font-display mt-0.5">{topTDProp.name} ({topTDProp.odds})</div>
            </div>
          </div>

          {/* Waiver Target - Purple Accent (Dynamic from player data) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-purple-950/40 via-slate-900/90 to-slate-950 border border-purple-500/40 shadow-lg shadow-purple-500/5 flex items-center gap-3.5 ring-1 ring-purple-500/20">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-purple-300/90 uppercase font-bold tracking-wider">Top Waiver Target</div>
              <div className="text-sm sm:text-base font-extrabold text-white font-display mt-0.5">{topWaiverTarget.name} ({topWaiverTarget.faab})</div>
            </div>
          </div>

          {/* Weather Warning - Cyan Accent (Dynamic from live Open-Meteo) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950 border border-cyan-500/40 shadow-lg shadow-cyan-500/5 flex items-center gap-3.5 ring-1 ring-cyan-500/20">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-inner">
              <Wind className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-mono text-cyan-300/90 uppercase font-bold tracking-wider">Live Weather Alert</div>
              <div className="text-sm sm:text-base font-extrabold text-white font-display mt-0.5">{topWeatherAlert.stadium} ({topWeatherAlert.wind})</div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'hq' && (
          <WeeklyDashboard
            myRoster={myRoster}
            opponentRoster={opponentRoster}
            allPlayers={playersList}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
            onOpenOptimizer={() => setIsLineupOptimizerOpen(true)}
            onOpenWeather={() => setActiveTab('weather')}
            onOpenWaivers={() => setActiveTab('waivers')}
            onOpenAudioBriefing={() => setActiveTab('audio')}
            userTeamName={rosterMeta.userTeamName}
            opponentTeamName={rosterMeta.opponentTeamName}
          />
        )}

        {activeTab === 'war-room' && (
          <div className="space-y-6">
            <ActionCenterCard
              players={playersList}
              settings={leagueSettings}
              myRoster={myRoster}
              onOpenOptimizer={() => setIsLineupOptimizerOpen(true)}
              onOpenWeather={() => setActiveTab('weather')}
              onOpenWaivers={() => setActiveTab('waivers')}
              onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
            />
            <DecisionEngineWarRoom
              players={filteredPlayers}
              settings={leagueSettings}
              onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
              onPinPlayer={handlePinPlayer}
              pinnedPlayerIds={pinnedPlayers.map(p => p.id)}
              myRosterIds={myRosterIds}
            />
          </div>
        )}

        {activeTab === 'draft-room' && (
          <DraftRoom
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'start-sit' && (
          <StartSitTool
            players={filteredPlayers}
            settings={leagueSettings}
            myRoster={myRoster}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'sim' && (
          <MatchupSimulator
            players={filteredPlayers}
            settings={leagueSettings}
            myRoster={myRoster}
            opponentRoster={opponentRoster}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'gamecast' && (
          <GamedayLiveGamecast
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'metrics' && (
          <AdvancedMetricsLab
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherRadarHub
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'audio' && (
          <AIAudioBriefing
            players={myRoster.length > 0 ? myRoster : filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'ai-coach' && (
          <AIChatCoach
            players={filteredPlayers}
            settings={leagueSettings}
            myRoster={myRoster}
            opponentRoster={opponentRoster}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'vegas-hub' && (
          <VegasOddsHub
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'props-lab' && (
          <PropsIntelligenceLab
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'matchups' && (
          <MatchupMatrix />
        )}

        {activeTab === 'waivers' && (
          <WaiverWireRadar
            players={filteredPlayers}
            settings={leagueSettings}
            myRoster={myRoster}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'trades' && (
          <TradeAnalyzer
            players={filteredPlayers}
            settings={leagueSettings}
            myRoster={myRoster}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}
      </main>

      {/* Floating Comparison Drawer Dock */}
      <FloatingComparisonDock
        pinnedPlayers={pinnedPlayers}
        onRemovePinned={handleRemovePinned}
        onClearAll={() => setPinnedPlayers([])}
        onOpenDetailedDuel={handleLaunchDuelFromDock}
        settings={leagueSettings}
      />

      {/* Mathematical Optimal Lineup Solver Modal */}
      <LineupOptimizerModal
        isOpen={isLineupOptimizerOpen}
        onClose={() => setIsLineupOptimizerOpen(false)}
        players={playersList}
        settings={leagueSettings}
        onApplyLineup={handleApplyOptimalLineup}
        onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
      />

      {/* Global ⌘K Command Palette Omnibar Modal */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        players={playersList}
        settings={leagueSettings}
        onSelectTab={(tabId) => setActiveTab(tabId)}
        onSelectPlayer={(player) => setSelectedPlayerDetail(player)}
        onOpenLeagueSettings={() => setIsLeagueSettingsOpen(true)}
        onOpenLiveDataHub={() => setIsLiveDataHubOpen(true)}
      />

      {/* Deep-Dive Player Intelligence Modal */}
      <PlayerModal
        player={selectedPlayerDetail}
        onClose={() => setSelectedPlayerDetail(null)}
        settings={leagueSettings}
      />

      {/* Custom League Settings & Scoring Modal */}
      <LeagueSettingsModal
        isOpen={isLeagueSettingsOpen}
        onClose={() => setIsLeagueSettingsOpen(false)}
        settings={leagueSettings}
        onSaveSettings={(newSettings) => setLeagueSettings(newSettings)}
      />

      {/* Live Data & League Pipeline Hub Modal */}
      <LiveDataHubModal
        isOpen={isLiveDataHubOpen}
        onClose={() => setIsLiveDataHubOpen(false)}
        players={playersList}
        settings={leagueSettings}
        onUpdatePlayers={(updated) => setPlayersList(updated)}
        onUpdateLeagueSettings={(newSettings) => setLeagueSettings(newSettings)}
        onUpdateRosterIds={handleUpdateRosters}
      />

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#060913]/95 border-t border-slate-800/90 backdrop-blur-xl px-2 py-2 shadow-2xl">
        <div className="grid grid-cols-5 gap-1 text-center">
          <button
            onClick={() => setActiveTab('hq')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'hq' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 font-mono">HQ</span>
          </button>

          <button
            onClick={() => setActiveTab('war-room')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'war-room' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 font-mono">War Room</span>
          </button>

          <button
            onClick={() => setActiveTab('start-sit')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'start-sit' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 font-mono">Start/Sit</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-coach')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'ai-coach' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 font-mono">AI Coach</span>
          </button>

          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] mt-0.5 font-mono">Modules</span>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-display">GRIDIRON AI</span>
            <span className="text-slate-600">|</span>
            <span>Real-Time NFL Stats, Vegas Odds, Weather Radar & Scheme Synthesis</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>Active Team: <strong className="text-emerald-400">{rosterMeta.userTeamName}</strong> ({leagueSettings.name})</span>
            <span>•</span>
            <span className={`${liveScores.length > 0 ? 'text-emerald-400' : 'text-amber-400'} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveScores.length > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              {liveScores.length > 0
                ? `Live ESPN (${liveScores.length} Games) & Sleeper Data Connected`
                : 'Using Cached Data — Live APIs Pending'}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
