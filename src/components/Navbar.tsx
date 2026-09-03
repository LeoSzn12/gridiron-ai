import React, { useState, useMemo } from 'react';
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
  BrainCircuit,
  LayoutGrid,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Target
} from 'lucide-react';
import type { LeagueSettings } from '../types';
import type { LiveNFLGameScore } from '../services/liveDataService';

export interface NavTool {
  id: string;
  label: string;
  desc: string;
  icon: any;
  badge: string;
}

export interface NavCategory {
  id: string;
  label: string;
  accentColor: string;
  tools: NavTool[];
}

// 4 High-Level Navigation Categories
const NAVIGATION_CATEGORIES: NavCategory[] = [
  {
    id: 'ai-decisions',
    label: '🏟️ Lineup & Decisions',
    accentColor: 'emerald',
    tools: [
      { id: 'hq', label: 'Sunday Morning HQ', desc: 'Personalized Gameday Command Center & Win Probability', icon: Sparkles, badge: 'My Team HQ' },
      { id: 'war-room', label: 'Decision War Room', desc: '5-Factor Composite Alpha Index & Arbiter', icon: BrainCircuit, badge: '5-Factor AI' },
      { id: 'start-sit', label: 'Start / Sit AI Studio', desc: 'Head-to-Head Player Duel Evaluator', icon: Zap, badge: 'Smart' },
      { id: 'sim', label: 'Monte Carlo Matchup', desc: '10,000 Simulation Win Probability Engine', icon: BarChart3, badge: '10,000 Sims' },
      { id: 'ai-coach', label: 'AI Coach Copilot', desc: '24/7 Strategic Fantasy Assistant', icon: Bot, badge: '24/7' },
    ]
  },
  {
    id: 'draft-roster',
    label: '📋 Roster & Market',
    accentColor: 'purple',
    tools: [
      { id: 'draft-room', label: 'AI Draft Room', desc: '3-QB & 5-WR Positional Scarcity Board', icon: Trophy, badge: '3-QB VORP' },
      { id: 'waivers', label: 'Waiver & FAAB Radar', desc: 'Surging Breakouts & Budget Allocator', icon: TrendingUp, badge: 'Surging' },
      { id: 'trades', label: 'Trade Analyzer', desc: 'Multi-Player Value & ROS Fairness Index', icon: ArrowLeftRight, badge: 'ROS Edge' },
    ]
  },
  {
    id: 'gameday-live',
    label: '⚡ Live Gameday',
    accentColor: 'crimson',
    tools: [
      { id: 'gamecast', label: 'Gameday Gamecast', desc: 'Live NFL Drive & Field Tracker', icon: Tv, badge: 'Live NFL' },
      { id: 'weather', label: 'Weather Doppler Radar', desc: 'Stadium Wind Vectors & Kicking Limits', icon: CloudSun, badge: 'Doppler' },
      { id: 'audio', label: 'AI Audio Morning Briefing', desc: 'Voice-Synthesized Gameday Radio Show', icon: Mic, badge: 'Voice Podcast' },
    ]
  },
  {
    id: 'odds-metrics',
    label: '📊 Odds & Scheme Lab',
    accentColor: 'gold',
    tools: [
      { id: 'props-lab', label: 'Props Edge Detector (DFS)', desc: 'PrizePicks & Underdog OVER/UNDER Edge Finder', icon: Target, badge: 'DFS Props' },
      { id: 'vegas-hub', label: 'Vegas Odds & Props Hub', desc: 'Sportsbook Lines, Spreads & Over/Unders', icon: DollarSign, badge: 'Vegas' },
      { id: 'matchups', label: 'Matchup & DvP Matrix', desc: '32-Team Defensive EPA & Vulnerabilities', icon: ShieldCheck, badge: 'EPA' },
      { id: 'metrics', label: 'Advanced Coaching Lab', desc: 'PROE, Neutral Pace & Receiver Schemes', icon: Activity, badge: 'PFF & Scheme' },
    ]
  }
];

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  leagueSettings: LeagueSettings;
  liveGames?: LiveNFLGameScore[];
  onOpenLeagueSettings: () => void;
  onOpenLiveDataHub: () => void;
  onOpenYahooConnect?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenOptimizer?: () => void;
  searchQuery: string;
  setSearchQuery?: (query: string) => void;
  allProfiles?: import('../types').LeagueProfile[];
  activeProfile?: import('../types').LeagueProfile;
  onSelectProfile?: (profileId: string) => void;
  selectedWeek?: number;
  onSelectWeek?: (week: number) => void;
  season?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  leagueSettings,
  liveGames = [],
  onOpenLeagueSettings,
  onOpenLiveDataHub,
  onOpenYahooConnect,
  onOpenCommandPalette,
  onOpenOptimizer,
  searchQuery,
  allProfiles = [],
  activeProfile,
  onSelectProfile,
  selectedWeek = 1,
  onSelectWeek,
  season = '2025',
}) => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isWeekDropdownOpen, setIsWeekDropdownOpen] = useState(false);

  const activeCategory = useMemo(() => {
    return NAVIGATION_CATEGORIES.find(cat => cat.tools.some(t => t.id === activeTab)) || NAVIGATION_CATEGORIES[0];
  }, [activeTab]);

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string | null>(null);
  const currentCategoryTab = selectedCategoryTab ?? activeCategory.id;

  const activeCategoryTools = useMemo(() => {
    const cat = NAVIGATION_CATEGORIES.find(c => c.id === currentCategoryTab);
    return cat ? cat.tools : activeCategory.tools;
  }, [currentCategoryTab, activeCategory]);

  // Continuous loop of live ticker games
  const tickerGames = liveGames.length > 0 ? liveGames.concat(liveGames) : [];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-[#070b17]/95 backdrop-blur-2xl shadow-xl">
      
      {/* 1. Slower, Bigger Relaxed Live NFL Marquee Ticker */}
      <div className="w-full bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-purple-950/30 border-b border-slate-800/80 py-2 px-4 overflow-hidden text-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenLiveDataHub}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs shrink-0 cursor-pointer hover:bg-emerald-500/30 border border-emerald-500/40 transition-all shadow-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>LIVE DATA: SLEEPER (3,000+ PLAYERS) & ESPN CONNECTED</span>
          </button>

          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee gap-10 items-center text-slate-200">
              {tickerGames.length > 0 ? (
                tickerGames.map((game, idx) => (
                  <div key={`${game.id}-${idx}`} className="inline-flex items-center gap-3 text-sm">
                    <span className="font-bold text-white flex items-center gap-1.5 font-display">
                      <img src={game.awayTeam.logo} alt="" className="w-4 h-4 object-contain inline" />
                      <span>{game.awayTeam.abbreviation}</span>
                      <span className="text-slate-400 font-normal">@</span>
                      <img src={game.homeTeam.logo} alt="" className="w-4 h-4 object-contain inline" />
                      <span>{game.homeTeam.abbreviation}</span>
                    </span>

                    {game.odds?.spread && (
                      <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800/40 font-bold text-xs">
                        {game.odds.spread}
                      </span>
                    )}

                    {game.odds?.overUnder && (
                      <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/40 font-medium text-xs">
                        O/U {game.odds.overUnder}
                      </span>
                    )}

                    <span className="text-slate-300 font-mono text-xs">
                      {game.gameTime}
                    </span>

                    <span className="text-slate-700 font-mono">|</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400 font-mono">
                  Connecting to Live ESPN NFL Week 1 Scoreboard & Sleeper Data Feeds...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => setActiveTab('war-room')}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-purple-600 p-0.5 shadow-xl shadow-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#070b17] rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-black font-display tracking-tight text-white">GRIDIRON <span className="text-gradient-gold">AI</span></span>
                  <span className="px-2 py-0.5 text-xs font-bold font-mono uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg">v2.5 Pro</span>
                </div>
                <p className="text-xs text-slate-300 hidden sm:block font-medium">Real-Time NFL Stats, Vegas Odds & Scheme Synthesis</p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5">
              {onOpenOptimizer && (
                <button
                  onClick={onOpenOptimizer}
                  className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/50 text-emerald-300 px-3.5 py-2 rounded-2xl cursor-pointer transition-all shadow-md text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Optimal Lineup Solver</span>
                </button>
              )}

              <button
                onClick={onOpenLiveDataHub}
                className="hidden sm:flex items-center gap-2 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 px-3.5 py-2 rounded-2xl cursor-pointer transition-all shadow-md text-xs font-mono font-bold"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Live Feeds ({liveGames.length})</span>
              </button>

              {/* Yahoo Connect Fast Button */}
              {onOpenYahooConnect && (
                <button
                  onClick={onOpenYahooConnect}
                  className="hidden xl:flex items-center gap-1.5 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-500/50 text-purple-300 px-3 py-2 rounded-2xl cursor-pointer transition-all shadow-md text-xs font-mono font-bold"
                  title="Import or connect your Yahoo Fantasy team"
                >
                  <span className="text-purple-400 font-display font-black">Y!</span>
                  <span>Yahoo Sync</span>
                </button>
              )}

              {/* NFL Week Stepper & Dropdown Selector */}
              <div className="relative flex items-center bg-slate-900 border border-slate-700 hover:border-emerald-500/60 rounded-2xl p-0.5 shadow-md transition-all">
                <button
                  onClick={() => onSelectWeek && onSelectWeek(Math.max(1, selectedWeek - 1))}
                  disabled={selectedWeek <= 1}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Previous Week"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsWeekDropdownOpen(!isWeekDropdownOpen)}
                    className="px-2 py-1 flex items-center gap-1.5 cursor-pointer text-left hover:bg-slate-800/60 rounded-xl transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <div>
                      <div className="text-[9px] font-mono text-slate-400 uppercase leading-none font-bold">
                        {season}
                      </div>
                      <div className="text-xs font-mono font-black text-emerald-300 flex items-center gap-1">
                        <span>WK {selectedWeek}</span>
                        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isWeekDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </button>

                  {/* Week Dropdown Menu */}
                  {isWeekDropdownOpen && (
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 top-12 z-50 w-52 rounded-2xl bg-slate-950 border border-emerald-500/30 shadow-2xl p-2.5 space-y-1.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase text-slate-400 border-b border-slate-800 flex items-center justify-between">
                        <span>Select NFL Week</span>
                        <span className="text-emerald-400 font-bold">18 Weeks</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1 pt-1 max-h-48 overflow-y-auto">
                        {Array.from({ length: 18 }).map((_, idx) => {
                          const w = idx + 1;
                          const isCurrent = selectedWeek === w;
                          return (
                            <button
                              key={w}
                              onClick={() => {
                                if (onSelectWeek) onSelectWeek(w);
                                setIsWeekDropdownOpen(false);
                              }}
                              className={`py-1.5 px-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                                isCurrent 
                                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                                  : 'hover:bg-slate-900 text-slate-300 hover:text-white'
                              }`}
                            >
                              W{w}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onSelectWeek && onSelectWeek(Math.min(18, selectedWeek + 1))}
                  disabled={selectedWeek >= 18}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Next Week"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* League Profile Selector Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 px-3.5 py-2 rounded-2xl cursor-pointer transition-all shadow-md text-left"
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${
                    activeProfile?.platform === 'yahoo' ? 'bg-purple-400' :
                    activeProfile?.platform === 'sleeper' ? 'bg-cyan-400' : 'bg-emerald-400'
                  }`}></div>
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase leading-none font-bold flex items-center gap-1">
                      <span>League Profile:</span>
                      <span className="text-purple-400 font-mono text-[9px] uppercase">
                        [{activeProfile?.platform || 'Custom'}]
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-white font-display flex items-center gap-1.5 mt-0.5">
                      <span className="max-w-[140px] truncate">{activeProfile?.name || leagueSettings.name}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </button>

                {/* Profile Switcher Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div 
                    className="absolute right-0 top-12 z-50 w-72 rounded-2xl bg-slate-950 border border-purple-500/30 shadow-2xl p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-400 border-b border-slate-800 flex items-center justify-between">
                      <span>Switch Active League</span>
                      <span className="text-purple-400">{allProfiles.length} Saved</span>
                    </div>

                    <div className="space-y-1 max-h-56 overflow-y-auto pt-1">
                      {allProfiles.map((prof) => {
                        const isCurrent = (activeProfile?.id || '') === prof.id;
                        return (
                          <button
                            key={prof.id}
                            onClick={() => {
                              if (onSelectProfile) onSelectProfile(prof.id);
                              setIsProfileDropdownOpen(false);
                            }}
                            className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-purple-500/20 border border-purple-500/40 text-white'
                                : 'hover:bg-slate-900 border border-transparent text-slate-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                <span className={`text-[10px] font-mono px-1 rounded ${
                                  prof.platform === 'yahoo' ? 'bg-purple-900/60 text-purple-300' :
                                  prof.platform === 'sleeper' ? 'bg-cyan-900/60 text-cyan-300' : 'bg-emerald-900/60 text-emerald-300'
                                }`}>
                                  {prof.platform.toUpperCase()}
                                </span>
                                <span className="truncate">{prof.name}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                {prof.settings.numTeams} Teams • {prof.userTeamName}
                              </div>
                            </div>
                            {isCurrent && (
                              <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-2"></div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1">
                      {onOpenYahooConnect && (
                        <button
                          onClick={() => {
                            onOpenYahooConnect();
                            setIsProfileDropdownOpen(false);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold text-purple-300 hover:bg-purple-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span className="text-purple-400 font-display font-black text-xs">Y!</span>
                          <span>Import / Sync Yahoo Team</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onOpenLeagueSettings();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-bold text-slate-300 hover:bg-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-400" />
                        <span>Customize Scoring Rules & Roster Slots</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ⌘K Global Spotlight Omnibar Search */}
          <div 
            onClick={onOpenCommandPalette}
            className="relative w-full md:w-80 cursor-pointer group"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
            <input
              type="text"
              readOnly
              placeholder="Search player, tool, or press ⌘K..."
              value={searchQuery}
              className="w-full pl-10 pr-16 py-2.5 text-sm bg-slate-900/90 border border-slate-700/80 group-hover:border-amber-500/60 rounded-2xl text-slate-100 placeholder-slate-400 cursor-pointer focus:outline-none transition-all shadow-md font-sans"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              ⌘K
            </span>
          </div>
        </div>

        {/* 3. Easy-To-Use Categorized Command Navigation Bar */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Category Switcher Tabs + Mega Menu */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
            {NAVIGATION_CATEGORIES.map(cat => {
              const isCatActive = currentCategoryTab === cat.id;
              const hasActiveTab = cat.tools.some(t => t.id === activeTab);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryTab(cat.id);
                    if (!hasActiveTab && cat.tools.length > 0) {
                      setActiveTab(cat.tools[0].id);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isCatActive
                      ? 'bg-slate-800/90 text-white border border-slate-600 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  }`}
                >
                  <span>{cat.label}</span>
                  {hasActiveTab && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  )}
                </button>
              );
            })}

            {/* "All 15 Tools" Mega Menu Button */}
            <div className="relative">
              <button
                onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-bold cursor-pointer transition-all shrink-0 ml-1"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>All 15</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isMegaMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Mega Menu Dropdown */}
              {isMegaMenuOpen && (
                <div 
                  className="absolute left-0 top-10 z-50 w-[90vw] max-w-3xl rounded-3xl bg-[#0a0f22] border border-slate-700 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base font-display">Gridiron Intelligence Terminal Modules</h3>
                      <p className="text-xs text-slate-400">Select any of the 15 specialized modules grouped by workflow.</p>
                    </div>
                    <button 
                      onClick={() => setIsMegaMenuOpen(false)}
                      className="p-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-slate-800 text-xs cursor-pointer"
                    >
                      ✕ Close
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {NAVIGATION_CATEGORIES.map(category => (
                      <div key={category.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                        <div className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center justify-between">
                          <span>{category.label}</span>
                        </div>

                        <div className="space-y-1.5">
                          {category.tools.map(tool => {
                            const Icon = tool.icon;
                            const isSelected = activeTab === tool.id;
                            return (
                              <button
                                key={tool.id}
                                onClick={() => {
                                  setActiveTab(tool.id);
                                  setIsMegaMenuOpen(false);
                                }}
                                className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-emerald-500/20 text-white border border-emerald-500/40 shadow-sm' 
                                    : 'text-slate-300 hover:bg-slate-900 border border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-900 text-slate-400 border-slate-800'}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-white">{tool.label}</div>
                                    <div className="text-[10px] text-slate-400">{tool.desc}</div>
                                  </div>
                                </div>

                                <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                                  {tool.badge}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub-Navigation: All Tools within Active Category */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 lg:justify-end no-scrollbar scroll-smooth">
            {activeCategoryTools.map(tool => {
              const Icon = tool.icon;
              const isActive = activeTab === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-purple-500/25 text-white border border-amber-500/50 shadow-md shadow-amber-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/90 border border-slate-800/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{tool.label}</span>
                  {tool.badge && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                      isActive ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </header>
  );
};

export default Navbar;
