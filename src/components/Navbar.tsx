import React from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Bot, 
  ShieldCheck, 
  ArrowLeftRight, 
  Search, 
  Zap, 
  DollarSign, 
  CloudSun, 
  Trophy, 
  Sliders, 
  BarChart3, 
  Tv, 
  Activity, 
  Mic, 
  Radio, 
  BrainCircuit 
} from 'lucide-react';
import type { LeagueSettings } from '../types';
import type { LiveNFLGameScore } from '../services/liveDataService';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  leagueSettings: LeagueSettings;
  liveGames?: LiveNFLGameScore[];
  onOpenLeagueSettings: () => void;
  onOpenLiveDataHub: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  leagueSettings,
  liveGames = [],
  onOpenLeagueSettings,
  onOpenLiveDataHub,
  searchQuery,
  setSearchQuery,
}) => {
  const tabs = [
    { id: 'war-room', label: 'Decision War Room', icon: BrainCircuit, badge: '5-Factor AI' },
    { id: 'draft-room', label: 'AI Draft Room', icon: Trophy, badge: '3-QB VORP' },
    { id: 'start-sit', label: 'Start / Sit AI', icon: Zap, badge: 'Smart' },
    { id: 'sim', label: 'Monte Carlo Matchup', icon: BarChart3, badge: '10,000 Sims' },
    { id: 'gamecast', label: 'Gameday Gamecast', icon: Tv, badge: 'Live NFL' },
    { id: 'metrics', label: 'Advanced Metrics Lab', icon: Activity, badge: 'PROE & Scheme' },
    { id: 'weather', label: 'Weather Radar', icon: CloudSun, badge: 'Doppler' },
    { id: 'audio', label: 'AI Audio Briefing', icon: Mic, badge: 'Voice' },
    { id: 'ai-coach', label: 'AI Coach Copilot', icon: Bot, badge: '24/7' },
    { id: 'vegas-hub', label: 'Vegas Odds & Props', icon: DollarSign, badge: 'Vegas' },
    { id: 'matchups', label: 'Matchup & DvP Matrix', icon: ShieldCheck, badge: 'EPA' },
    { id: 'waivers', label: 'Waiver & FAAB Radar', icon: TrendingUp, badge: 'Surging' },
    { id: 'trades', label: 'Trade Analyzer', icon: ArrowLeftRight, badge: 'ROS' },
  ];

  // Games for ticker (duplicated for continuous smooth marquee)
  const tickerGames = liveGames.length > 0 ? liveGames.concat(liveGames) : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-xl">
      {/* Live ESPN Vegas & Weather Ticker Bar */}
      <div className="w-full bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-indigo-950/40 border-b border-slate-800/40 py-1.5 px-4 overflow-hidden text-xs">
        <div className="flex items-center gap-3">
          <div 
            onClick={onOpenLiveDataHub}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-semibold shrink-0 cursor-pointer hover:bg-emerald-500/30 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            LIVE NFL DATA (ESPN WEEK 1 SLATE): CONNECTED
          </div>

          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee gap-8 items-center text-slate-300">
              {tickerGames.length > 0 ? (
                tickerGames.map((game, idx) => (
                  <div key={`${game.id}-${idx}`} className="inline-flex items-center gap-3 text-xs">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <img src={game.awayTeam.logo} alt="" className="w-3.5 h-3.5 object-contain inline" />
                      <span>{game.awayTeam.abbreviation}</span>
                      <span className="text-slate-500">@</span>
                      <img src={game.homeTeam.logo} alt="" className="w-3.5 h-3.5 object-contain inline" />
                      <span>{game.homeTeam.abbreviation}</span>
                    </span>

                    {game.odds?.spread && (
                      <span className="font-mono text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/30 font-bold">
                        {game.odds.spread}
                      </span>
                    )}

                    {game.odds?.overUnder && (
                      <span className="font-mono text-indigo-300 font-medium">
                        O/U {game.odds.overUnder}
                      </span>
                    )}

                    <span className="text-slate-400 font-mono text-[11px]">
                      {game.gameTime}
                    </span>

                    <span className="text-slate-700">|</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 font-mono">
                  Loading Live ESPN NFL Week 1 Scoreboard...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('war-room')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
                <div className="w-full h-full bg-[#070B14] rounded-[10px] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-display tracking-tight text-white">GRIDIRON <span className="text-gradient-emerald">AI</span></span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">v2.4 Pro</span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">Real-Time NFL Stats, Vegas Odds & Scheme Intelligence</p>
              </div>
            </div>

            {/* Top Action Triggers */}
            <div className="flex items-center gap-2">
              {/* Live Feeds Button */}
              <div 
                onClick={onOpenLiveDataHub}
                className="hidden sm:flex items-center gap-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-2xl cursor-pointer transition-all shadow-md text-xs font-mono font-bold"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live Feeds ({liveGames.length} NFL Games)</span>
              </div>

              {/* Custom League Badge & Settings Trigger */}
              <div 
                onClick={onOpenLeagueSettings}
                className="flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 px-3 py-1.5 rounded-2xl cursor-pointer transition-all shadow-md"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <div className="text-left">
                  <div className="text-[10px] font-mono text-slate-400 uppercase leading-none">Active League:</div>
                  <div className="text-xs font-bold text-emerald-300 font-display flex items-center gap-1">
                    <span>{leagueSettings.name}</span>
                    <Sliders className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search players, teams, matchups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-900/90 border border-slate-800/90 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/60 overflow-x-auto pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
