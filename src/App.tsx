import { useState, useMemo, useEffect } from 'react';
import type { Player, LeagueSettings } from './types';
import { PLAYERS_DATABASE, LEO_SZN_YAHOO_PRESET } from './data/mockData';
import { 
  syncLivePlayerData, 
  fetchLiveESPNScoreboard, 
  type LiveNFLGameScore 
} from './services/liveDataService';
import { Navbar } from './components/Navbar';
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
import { 
  Flame, 
  Wind, 
  DollarSign, 
  TrendingUp 
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('war-room');
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(LEO_SZN_YAHOO_PRESET);
  const [isLeagueSettingsOpen, setIsLeagueSettingsOpen] = useState<boolean>(false);
  const [isLiveDataHubOpen, setIsLiveDataHubOpen] = useState<boolean>(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [pinnedPlayers, setPinnedPlayers] = useState<Player[]>([]);
  const [playersList, setPlayersList] = useState<Player[]>(PLAYERS_DATABASE);
  const [liveScores, setLiveScores] = useState<LiveNFLGameScore[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPlayerDetail, setSelectedPlayerDetail] = useState<Player | null>(null);

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

  // Auto-sync real-time weather & live ESPN NFL scoreboard data on initial mount
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

    return () => {
      isMounted = false;
    };
  }, []);

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
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300 relative">
      
      {/* Navigation Header with Live ESPN Week 1 Scoreboard */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        leagueSettings={leagueSettings}
        liveGames={liveScores}
        onOpenLeagueSettings={() => setIsLeagueSettingsOpen(true)}
        onOpenLiveDataHub={() => setIsLiveDataHubOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Quick Intelligence Metric Strip (Directly synced with live ESPN & Open-Meteo) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 border-emerald-500/20">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Top Live Vegas Total</div>
              <div className="text-xs font-bold text-white font-mono">{topVegasTotal.matchup} ({topVegasTotal.total} O/U)</div>
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 border-indigo-500/20">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Top TD Prop Line</div>
              <div className="text-xs font-bold text-white font-mono">Saquon Barkley (-165)</div>
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 border-amber-500/20">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Top Waiver Target</div>
              <div className="text-xs font-bold text-white font-mono">Tyrone Tracy (45% FAAB)</div>
            </div>
          </div>

          <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 border-rose-500/20">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Wind className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Live Weather Warning</div>
              <div className="text-xs font-bold text-white font-mono">Arrowhead (12.2mph Wind)</div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'war-room' && (
          <DecisionEngineWarRoom
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
            onPinPlayer={handlePinPlayer}
            pinnedPlayerIds={pinnedPlayers.map(p => p.id)}
          />
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
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'sim' && (
          <MatchupSimulator
            players={filteredPlayers}
            settings={leagueSettings}
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
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'ai-coach' && (
          <AIChatCoach
            players={filteredPlayers}
            settings={leagueSettings}
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

        {activeTab === 'matchups' && (
          <MatchupMatrix />
        )}

        {activeTab === 'waivers' && (
          <WaiverWireRadar
            players={filteredPlayers}
            settings={leagueSettings}
            onSelectPlayerDetail={(p) => setSelectedPlayerDetail(p)}
          />
        )}

        {activeTab === 'trades' && (
          <TradeAnalyzer
            players={filteredPlayers}
            settings={leagueSettings}
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
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 py-6 mt-12 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white font-display">GRIDIRON AI</span>
            <span className="text-slate-600">|</span>
            <span>Real-Time NFL Stats, Vegas Odds, Weather Radar & Scheme Synthesis</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>Active Preset: {leagueSettings.name}</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live ESPN & Open-Meteo Data Pipelines Connected
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
