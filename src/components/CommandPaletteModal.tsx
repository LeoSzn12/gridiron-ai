import React, { useState, useEffect, useRef } from 'react';
import type { Player, LeagueSettings } from '../types';
import { 
  Search, 
  Sparkles, 
  BrainCircuit, 
  Trophy, 
  Zap, 
  BarChart3, 
  Tv, 
  Activity, 
  CloudSun, 
  Mic, 
  Bot, 
  DollarSign, 
  TrendingUp, 
  ArrowLeftRight, 
  Radio, 
  Sliders, 
  ArrowRight,
  User
} from 'lucide-react';
import { searchPlayers } from '../utils/searchUtils';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  settings: LeagueSettings;
  onSelectTab: (tabId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenLeagueSettings: () => void;
  onOpenLiveDataHub: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  players,
  settings: _settings,
  onSelectTab,
  onSelectPlayer,
  onOpenLeagueSettings,
  onOpenLiveDataHub,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick navigation tools
  const tools = [
    { id: 'war-room', label: 'Decision War Room (5-Factor AI)', icon: BrainCircuit, category: 'AI Tools' },
    { id: 'draft-room', label: 'AI Draft Room (3-QB VORP)', icon: Trophy, category: 'AI Tools' },
    { id: 'start-sit', label: 'Start / Sit AI Studio', icon: Zap, category: 'AI Tools' },
    { id: 'sim', label: 'Monte Carlo Matchup Simulator (10,000 Sims)', icon: BarChart3, category: 'Simulation' },
    { id: 'gamecast', label: 'NFL Sunday Gameday Gamecast', icon: Tv, category: 'Live Feeds' },
    { id: 'metrics', label: 'Advanced Coaching & PROE Lab', icon: Activity, category: 'Analytics' },
    { id: 'weather', label: 'Stadium Doppler Weather Radar', icon: CloudSun, category: 'Weather' },
    { id: 'audio', label: 'AI Audio Morning Briefing Show', icon: Mic, category: 'Audio' },
    { id: 'ai-coach', label: 'AI Coach Copilot 24/7', icon: Bot, category: 'AI Tools' },
    { id: 'vegas-hub', label: 'Vegas Betting Odds & Line Arbitrage', icon: DollarSign, category: 'Vegas' },
    { id: 'waivers', label: 'Waiver Wire & FAAB Optimization', icon: TrendingUp, category: 'Roster' },
    { id: 'trades', label: 'Multi-Player Trade Analyzer', icon: ArrowLeftRight, category: 'Roster' },
  ];

  // Actions
  const actions = [
    { id: 'action-live-data', label: 'Inspect Live Data Feeds & Telemetry (ESPN & Open-Meteo)', icon: Radio, action: onOpenLiveDataHub },
    { id: 'action-settings', label: 'Configure Custom League Scoring & 3-QB Roster Settings', icon: Sliders, action: onOpenLeagueSettings },
  ];

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter items
  const q = query.toLowerCase().trim();

  const filteredPlayers = query.trim() 
    ? searchPlayers(players, query, 6)
    : players.slice(0, 5);

  const filteredTools = tools.filter(t => 
    t.label.toLowerCase().includes(q) || 
    t.category.toLowerCase().includes(q)
  );

  const filteredActions = actions.filter(a => 
    a.label.toLowerCase().includes(q)
  );

  const totalResultsCount = filteredPlayers.length + filteredTools.length + filteredActions.length;

  const executeSelectedItem = React.useCallback(() => {
    if (selectedIndex < filteredPlayers.length) {
      const player = filteredPlayers[selectedIndex];
      if (player) {
        onSelectPlayer(player);
        onClose();
      }
    } else if (selectedIndex < filteredPlayers.length + filteredTools.length) {
      const tool = filteredTools[selectedIndex - filteredPlayers.length];
      if (tool) {
        onSelectTab(tool.id);
        onClose();
      }
    } else {
      const action = filteredActions[selectedIndex - filteredPlayers.length - filteredTools.length];
      if (action) {
        action.action();
        onClose();
      }
    }
  }, [selectedIndex, filteredPlayers, filteredTools, filteredActions, onSelectPlayer, onSelectTab, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (totalResultsCount || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalResultsCount) % (totalResultsCount || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeSelectedItem();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, totalResultsCount, executeSelectedItem, onClose]);

  if (!isOpen) return null;

  let itemCounter = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-2xl rounded-3xl bg-[#0b0f1d] border border-slate-700/80 shadow-2xl overflow-hidden shadow-emerald-500/10 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/90 gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, search player, tool, or press ⌘K..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
          />
          <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
            ESC
          </span>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          
          {/* Players Section */}
          {filteredPlayers.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <User className="w-3 h-3 text-emerald-400" />
                <span>Players ({filteredPlayers.length})</span>
              </div>
              {filteredPlayers.map((player) => {
                const currentIndex = itemCounter++;
                const isSelected = selectedIndex === currentIndex;
                return (
                  <button
                    key={player.id}
                    onClick={() => {
                      onSelectPlayer(player);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected ? 'bg-emerald-500/20 text-white border border-emerald-500/40 shadow-sm' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-xl object-cover" />
                      <div>
                        <div className="text-xs font-bold text-white">{player.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{player.position} • {player.team} vs {player.opponent}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-emerald-400">
                        {player.vegas.props.anytimeTDOdds} TD
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tools & Modules Section */}
          {filteredTools.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Intelligence Modules & Tools</span>
              </div>
              {filteredTools.map((tool) => {
                const Icon = tool.icon;
                const currentIndex = itemCounter++;
                const isSelected = selectedIndex === currentIndex;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      onSelectTab(tool.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected ? 'bg-indigo-500/20 text-white border border-indigo-500/40 shadow-sm' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${isSelected ? 'bg-indigo-500 text-slate-950 border-indigo-400' : 'bg-slate-900 text-indigo-400 border-slate-800'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{tool.label}</div>
                        <div className="text-[10px] font-mono text-slate-400">{tool.category}</div>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                );
              })}
            </div>
          )}

          {/* Quick Actions Section */}
          {filteredActions.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-purple-400" />
                <span>Actions & Pipelines</span>
              </div>
              {filteredActions.map((action) => {
                const Icon = action.icon;
                const currentIndex = itemCounter++;
                const isSelected = selectedIndex === currentIndex;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected ? 'bg-purple-500/20 text-white border border-purple-500/40 shadow-sm' : 'text-slate-300 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${isSelected ? 'bg-purple-500 text-slate-950 border-purple-400' : 'bg-slate-900 text-purple-400 border-slate-800'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-white">{action.label}</div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                );
              })}
            </div>
          )}

          {totalResultsCount === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 space-y-1">
              <div>No results found for "{query}"</div>
              <div className="text-[10px] text-slate-500">Try searching for "Lamar", "War Room", "Monte Carlo", "Weather", or "Vegas"</div>
            </div>
          )}

        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">↑</kbd> <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">↓</kbd> to Navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">↵</kbd> to Select</span>
          </div>
          <span>Gridiron Omnibar v2.4</span>
        </div>

      </div>
    </div>
  );
};
