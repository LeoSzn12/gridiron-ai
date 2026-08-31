import React from 'react';
import type { PlayerPosition } from '../types';
import { 
  Search, 
  X, 
  ArrowUpDown,
  Filter
} from 'lucide-react';

export type PlayerCategoryFilter = 'ALL' | 'MY_ROSTER' | 'SMASH' | 'SIT' | 'INJURED' | 'DOME' | 'WAIVER';

export type PlayerSortOption = 
  | 'ALPHA' 
  | 'PROJECTION' 
  | 'VORP' 
  | 'VEGAS' 
  | 'TRADE_VALUE' 
  | 'CEILING' 
  | 'FLOOR';

export interface PlayerFilterState {
  searchQuery: string;
  position: PlayerPosition | 'ALL' | 'IDP';
  team: string; // 'ALL' or team abbreviation (e.g. 'BAL')
  category: PlayerCategoryFilter;
  sortBy: PlayerSortOption;
  sortAscending: boolean;
}

interface PlayerFilterBarProps {
  filters: PlayerFilterState;
  onFilterChange: (filters: PlayerFilterState) => void;
  totalPlayersCount: number;
  filteredCount: number;
}

const ALL_NFL_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE',
  'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC',
  'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG',
  'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'
];

export const PlayerFilterBar: React.FC<PlayerFilterBarProps> = ({
  filters,
  onFilterChange,
  totalPlayersCount: _totalPlayersCount,
  filteredCount,
}) => {
  const isFiltered = 
    filters.searchQuery.trim() !== '' || 
    filters.position !== 'ALL' || 
    filters.team !== 'ALL' || 
    filters.category !== 'ALL';

  const handleResetFilters = () => {
    onFilterChange({
      searchQuery: '',
      position: 'ALL',
      team: 'ALL',
      category: 'ALL',
      sortBy: 'ALPHA',
      sortAscending: false,
    });
  };

  return (
    <div className="space-y-3 bg-[#0a0f24]/90 p-4 sm:p-5 rounded-3xl border border-slate-800 shadow-xl">
      
      {/* Top Row: Search Input, Team Filter, Sort Dropdown & Reset */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Box */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Filter by name, team (e.g. 'Lamar', 'Chiefs', 'Saquon')..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all font-sans"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Controls: Team Dropdown, Category Dropdown, Sort Dropdown */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Team Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-2 rounded-2xl border border-slate-700/80 text-xs">
            <span className="text-slate-400 font-mono font-bold text-[10px] uppercase">Team:</span>
            <select
              value={filters.team}
              onChange={(e) => onFilterChange({ ...filters, team: e.target.value })}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Teams (32)</option>
              {ALL_NFL_TEAMS.map(team => (
                <option key={team} value={team} className="bg-slate-900 text-white">{team}</option>
              ))}
            </select>
          </div>

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-2 rounded-2xl border border-slate-700/80 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ ...filters, category: e.target.value as PlayerCategoryFilter })}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Statuses</option>
              <option value="MY_ROSTER" className="bg-slate-900 text-emerald-300 font-bold">⭐ My Roster Only</option>
              <option value="SMASH" className="bg-slate-900 text-amber-300">🔥 Smash Starts (85+ Alpha)</option>
              <option value="SIT" className="bg-slate-900 text-rose-300">⚠️ Volatile Sits</option>
              <option value="INJURED" className="bg-slate-900 text-rose-400">🏥 Injured / Questionable</option>
              <option value="DOME" className="bg-slate-900 text-cyan-300">🏟️ Indoor Dome Games</option>
              <option value="WAIVER" className="bg-slate-900 text-purple-300">📈 Waiver Targets</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-2 rounded-2xl border border-slate-700/80 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as PlayerSortOption })}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALPHA" className="bg-slate-900 text-white">Sort: Alpha Score</option>
              <option value="PROJECTION" className="bg-slate-900 text-white">Sort: Projected Points</option>
              <option value="VORP" className="bg-slate-900 text-white">Sort: 3-QB VORP</option>
              <option value="VEGAS" className="bg-slate-900 text-white">Sort: Vegas Implied Total</option>
              <option value="TRADE_VALUE" className="bg-slate-900 text-white">Sort: Trade Value</option>
              <option value="CEILING" className="bg-slate-900 text-white">Sort: 90th% Ceiling</option>
              <option value="FLOOR" className="bg-slate-900 text-white">Sort: Safe Floor</option>
            </select>
          </div>

          {/* Reset Filters Pill */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 rounded-2xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Reset all active filters"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Position Pills & Player Count Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        
        {/* Position Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'IDP', 'DL', 'LB', 'DB'] as const).map(pos => (
            <button
              key={pos}
              onClick={() => onFilterChange({ ...filters, position: pos })}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filters.position === pos
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {pos === 'ALL' ? 'All Positions' : pos === 'QB' ? 'QB (3-QB)' : pos === 'WR' ? 'WR (5-WR)' : pos}
            </button>
          ))}
        </div>

        {/* Filter Count Badge */}
        <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
          Showing <strong className="text-emerald-400">{filteredCount}</strong> players
        </div>
      </div>
    </div>
  );
};
