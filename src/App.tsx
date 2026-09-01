import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Player, LeagueSettings, LeagueProfile } from './types';
import { PLAYERS_DATABASE } from './data/mockData';
import { 
  buildLivePlayersDatabase,
  fetchLiveESPNScoreboard, 
  fetchSleeperNFLState,
  type LiveNFLGameScore 
} from './services/liveDataService';
import { 
  saveMyRosterIds, 
  saveOpponentRosterIds, 
  saveRosterMetadata,
  type RosterMetadata
} from './services/rosterService';
import { getYahooAuthConfig, autoSyncYahooRoster } from './services/yahooFantasyService';
import { fetchLiveNewsAndInjuries, getMyRosterAlertCount, type PlayerNewsItem } from './services/injuryNewsService';
import { 
  getAllLeagueProfiles, 
  getActiveLeagueProfile, 
  setActiveLeagueProfileId, 
  updateLeagueProfile 
} from './services/leagueProfileService';
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
import { YahooConnectModal } from './components/YahooConnectModal';
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
  
  // Multi-League Profiles State
  const [allProfiles, setAllProfiles] = useState<LeagueProfile[]>(getAllLeagueProfiles);
  const [activeProfile, setActiveProfile] = useState<LeagueProfile>(getActiveLeagueProfile);

  // Active League Settings & Rosters derived from Active Profile
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(activeProfile.settings);
  const [myRosterIds, setMyRosterIds] = useState<string[]>(activeProfile.myRosterIds);
  const [opponentRosterIds, setOpponentRosterIds] = useState<string[]>(activeProfile.opponentRosterIds);
  const [rosterMeta, setRosterMeta] = useState<RosterMetadata>({
    userTeamName: activeProfile.userTeamName,
    opponentTeamName: activeProfile.opponentTeamName,
    leagueId: activeProfile.id,
    season: '2024',
    week: 1,
  });

  const [isLeagueSettingsOpen, setIsLeagueSettingsOpen] = useState<boolean>(false);
  const [isLiveDataHubOpen, setIsLiveDataHubOpen] = useState<boolean>(false);
  const [isYahooConnectOpen, setIsYahooConnectOpen] = useState<boolean>(false);
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

  const [playersList, setPlayersList] = useState<Player[]>(PLAYERS_DATABASE);
  const [liveScores, setLiveScores] = useState<LiveNFLGameScore[]>([]);
  const [newsItems, setNewsItems] = useState<PlayerNewsItem[]>([]);
  const [rosterAlertCount, setRosterAlertCount] = useState(0);
  const [isYahooSyncing, setIsYahooSyncing] = useState(false);
  const [yahooSyncStatus, setYahooSyncStatus] = useState<'idle' | 'synced' | 'error'>('idle');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<Player | null>(null);

  // Persist current settings & rosters to active profile in storage
  useEffect(() => {
    const updated: LeagueProfile = {
      ...activeProfile,
      settings: leagueSettings,
      myRosterIds,
      opponentRosterIds,
      userTeamName: rosterMeta.userTeamName,
      opponentTeamName: rosterMeta.opponentTeamName,
      lastSyncedAt: new Date().toISOString(),
    };
    updateLeagueProfile(updated);
    saveMyRosterIds(myRosterIds);
    saveOpponentRosterIds(opponentRosterIds);
    saveRosterMetadata(rosterMeta);
  }, [leagueSettings, myRosterIds, opponentRosterIds, rosterMeta, activeProfile]);

  // Handle switching active league profile
  const handleSelectProfile = (profileId: string) => {
    const profiles = getAllLeagueProfiles();
    setAllProfiles(profiles);
    const found = profiles.find(p => p.id === profileId);
    if (!found) return;
    setActiveLeagueProfileId(profileId);
    setActiveProfile(found);
    setLeagueSettings(found.settings);
    setMyRosterIds(found.myRosterIds);
    setOpponentRosterIds(found.opponentRosterIds);
    setRosterMeta(prev => ({
      ...prev,
      userTeamName: found.userTeamName,
      opponentTeamName: found.opponentTeamName,
      leagueId: found.id,
    }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedPlayers));
    } catch {
      // ignore
    }
  }, [pinnedPlayers]);

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

  // Track whether we're loading live data for the first time
  const [isLiveDataLoading, setIsLiveDataLoading] = useState(true);

  // Auto-sync: build the full live player database on startup
  useEffect(() => {
    let isMounted = true;

    const initLiveData = async () => {
      setIsLiveDataLoading(true);

      // 1. Fetch ESPN scoreboard for live scores display (fast, runs in parallel)
      fetchLiveESPNScoreboard().then(scores => {
        if (isMounted && scores.length > 0) setLiveScores(scores);
      }).catch(() => {});

      // 2. Get live NFL season/week from Sleeper
      const nflState = await fetchSleeperNFLState().catch(() => ({ week: 1, season: '2025', seasonType: 'regular' }));
      const season = nflState.season || '2025';
      const week = nflState.week || 1;

      if (isMounted) {
        setRosterMeta(prev => ({ ...prev, season, week }));
      }

      // 3. Build full live player DB: Sleeper 3000+ players + ESPN odds + Open-Meteo weather
      const livePlayers = await buildLivePlayersDatabase(PLAYERS_DATABASE, season, week);

      if (isMounted) {
        setPlayersList(livePlayers);
        setIsLiveDataLoading(false);
      }
    };

    initLiveData().catch(err => {
      console.warn('Live data init failed, using static pool:', err);
      if (isMounted) {
        setIsLiveDataLoading(false);
      }
    });


    // Refresh ESPN scoreboard every 15 minutes (lightweight)
    const scoreRefresh = setInterval(() => {
      if (isMounted) {
        fetchLiveESPNScoreboard().then(scores => {
          if (isMounted && scores.length > 0) setLiveScores(scores);
        }).catch(() => {});
      }
    }, 15 * 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(scoreRefresh);
    };
  }, []); // runs once on mount — leagueSettings dependency removed to avoid re-fetching 3000 players on every settings change

  // Auto-sync Yahoo roster if connected
  useEffect(() => {
    const yahooAuth = getYahooAuthConfig();
    if (!yahooAuth.isConnected || !yahooAuth.accessToken || !yahooAuth.selectedTeamKey || !yahooAuth.selectedLeagueKey) return;
    let isMounted = true;
    const syncRoster = async () => {
      setIsYahooSyncing(true);
      try {
        const result = await autoSyncYahooRoster(
          yahooAuth.accessToken!,
          yahooAuth.selectedTeamKey!,
          yahooAuth.selectedLeagueKey!,
          playersList
        );
        if (!isMounted) return;
        if (result.myRosterIds.length > 0) {
          setMyRosterIds(result.myRosterIds);
          setOpponentRosterIds(result.opponentRosterIds);
          setRosterMeta(prev => ({
            ...prev,
            userTeamName: result.myTeamName,
            opponentTeamName: result.opponentTeamName,
            week: result.weekNum,
          }));
          setYahooSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Yahoo auto-sync failed:', err);
        if (isMounted) setYahooSyncStatus('error');
      } finally {
        if (isMounted) setIsYahooSyncing(false);
      }
    };
    // Only sync once playersList is loaded from Sleeper (>300 players means live data ready)
    if (playersList.length > 300) syncRoster();
    return () => { isMounted = false; };
  }, [playersList.length]); // re-run when live player DB is ready

  // Fetch live injury/news feed
  useEffect(() => {
    let isMounted = true;
    const loadNews = async () => {
      const news = await fetchLiveNewsAndInjuries(myRosterIds);
      if (!isMounted) return;
      setNewsItems(news);
      setRosterAlertCount(getMyRosterAlertCount(news, myRosterIds));
    };
    loadNews();
    // Refresh every 15 minutes
    const interval = setInterval(loadNews, 15 * 60 * 1000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [myRosterIds]);


  // Derived user roster & opponent roster
  const myRoster = useMemo(() => {
    const idSet = new Set(myRosterIds);
    const roster = playersList.filter(p => idSet.has(p.id));
    if (roster.length > 0) return roster;
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

  // Yahoo Fast Import Callbacks
  const handleImportYahooMyRoster = (playerIds: string[], teamName?: string) => {
    setMyRosterIds(playerIds);
    if (teamName) {
      setRosterMeta(prev => ({ ...prev, userTeamName: teamName }));
    }
  };

  const handleImportYahooOpponentRoster = (playerIds: string[], teamName?: string) => {
    setOpponentRosterIds(playerIds);
    if (teamName) {
      setRosterMeta(prev => ({ ...prev, opponentTeamName: teamName }));
    }
  };

  const handleImportYahooWaivers = (playerIds: string[]) => {
    const waiverSet = new Set(playerIds);
    setPlayersList(prev => prev.map(p => {
      if (waiverSet.has(p.id)) {
        return {
          ...p,
          isWaiverTarget: true,
          faabRecommendedPct: Math.max(p.faabRecommendedPct, 15),
        };
      }
      return p;
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
      
      {/* Live Data Loading Banner */}
      {isLiveDataLoading && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-emerald-950/95 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-center gap-3 text-xs font-mono backdrop-blur-sm">
          <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-emerald-300">Loading live NFL player data from Sleeper API + ESPN odds + Open-Meteo weather...</span>
        </div>
      )}

      {/* Navigation Header with Live ESPN Week 1 Scoreboard */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        leagueSettings={leagueSettings}
        liveGames={liveScores}
        onOpenLeagueSettings={() => setIsLeagueSettingsOpen(true)}
        onOpenLiveDataHub={() => setIsLiveDataHubOpen(true)}
        onOpenYahooConnect={() => setIsYahooConnectOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenOptimizer={() => setIsLineupOptimizerOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        allProfiles={allProfiles}
        activeProfile={activeProfile}
        onSelectProfile={handleSelectProfile}
      />

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 ${isLiveDataLoading ? 'mt-8' : ''}`}>
        
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
            liveGames={liveScores}
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

      {/* Yahoo Fantasy Connect & Fast-Paste Importer Modal */}
      <YahooConnectModal
        isOpen={isYahooConnectOpen}
        onClose={() => setIsYahooConnectOpen(false)}
        allPlayers={playersList}
        settings={leagueSettings}
        onImportMyRoster={handleImportYahooMyRoster}
        onImportOpponentRoster={handleImportYahooOpponentRoster}
        onImportWaiverTargets={handleImportYahooWaivers}
        newsItems={newsItems}
        rosterAlertCount={rosterAlertCount}
        isYahooSyncing={isYahooSyncing}
        yahooSyncStatus={yahooSyncStatus}
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
            <span>Active League: <strong className="text-purple-400">{activeProfile.name}</strong></span>
            <span>•</span>
            <span>Active Team: <strong className="text-emerald-400">{rosterMeta.userTeamName}</strong></span>
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
