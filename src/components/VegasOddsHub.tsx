import React, { useState } from 'react';
import type { Player, LeagueSettings, PlayerPosition } from '../types';
import { VEGAS_GAMES_SCHEDULE } from '../data/mockData';
import { calculateProjection, oddsToProbability } from '../services/aiEngine';
import { 
  Flame, 
  Target, 
  Search, 
  ChevronRight
} from 'lucide-react';

interface VegasOddsHubProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

export const VegasOddsHub: React.FC<VegasOddsHubProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  const [propFilter, setPropFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');


  const filteredPlayers = players
    .filter(p => propFilter === 'ALL' || p.position === propFilter)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.team.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              VEGAS INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400">Sportsbook Implied Probabilities</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display mt-1">Vegas Odds, Implied Totals & Player Props</h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Vegas lines provide the sharpest baseline for game script, red zone opportunity volume, and individual player touchdown probability.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-xs font-mono">
          <div className="text-right">
            <div className="text-slate-500 text-[10px]">HIGHEST TOTAL</div>
            <div className="font-bold text-emerald-400">BAL vs CIN (52.5)</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div>
            <div className="text-slate-500 text-[10px]">TOP TD PROP</div>
            <div className="font-bold text-indigo-400">S. Barkley (-165)</div>
          </div>
        </div>
      </div>

      {/* Vegas Game Boards */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Vegas Game Spreads & Implied Totals</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VEGAS_GAMES_SCHEDULE.map((game) => (
            <div
              key={game.id}
              className="glass-panel p-4 rounded-2xl space-y-3 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white font-display">{game.matchup}</span>
                <span className="text-[11px] font-mono text-slate-400">{game.dayTime}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">SPREAD</div>
                  <div className="font-mono font-bold text-emerald-400 mt-0.5">{game.spread}</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">TOTAL O/U</div>
                  <div className="font-mono font-bold text-indigo-400 mt-0.5">{game.total}</div>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-500 font-mono">IMPLIED PTS</div>
                  <div className="font-mono font-bold text-amber-400 mt-0.5">{game.balImplied} - {game.cinImplied}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Pace Forecast:</span>
                  <span className="text-slate-200 font-medium">{game.paceForecast}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Weather:</span>
                  <span className="text-slate-300">{game.weatherSummary}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player Props Explorer Board */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Player Props & Touchdown Probabilities</span>
          </h3>

          {/* Filters & Search */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filter player..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
              {(['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'DEF'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPropFilter(pos)}
                  className={`px-2 py-0.5 text-xs font-bold rounded-lg cursor-pointer ${
                    propFilter === pos ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Props Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 glass-panel">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Player</th>
                <th className="p-3.5">Position</th>
                <th className="p-3.5">Opponent</th>
                <th className="p-3.5">Team Implied</th>
                <th className="p-3.5">Yardage Line</th>
                <th className="p-3.5">Anytime TD Odds</th>
                <th className="p-3.5">TD Implied Prob</th>
                <th className="p-3.5">AI Proj ({settings.name})</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredPlayers.map((player) => {
                const proj = calculateProjection(player, settings);
                const tdProb = Math.round(oddsToProbability(player.vegas.props.anytimeTDOdds) * 100);

                
                return (
                  <tr 
                    key={player.id} 
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => onSelectPlayerDetail(player)}
                  >
                    <td className="p-3.5 font-bold text-white flex items-center gap-2.5">
                      <img src={player.avatar} alt={player.name} className="w-7 h-7 rounded-lg object-cover border border-slate-700" />
                      <div>
                        <span>{player.name}</span>
                        <div className="text-[10px] text-slate-400 font-normal font-mono">{player.team}</div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {player.position}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      vs {player.opponent}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-indigo-400">
                      {player.vegas.impliedTeamTotal} pts
                    </td>
                    <td className="p-3.5 font-mono text-slate-200">
                      {player.position === 'QB' && `${player.vegas.props.passingYardsOU} Pass / ${player.vegas.props.rushingYardsOU} Rush`}
                      {player.position === 'RB' && `${player.vegas.props.rushingYardsOU} Rush / ${player.vegas.props.receivingYardsOU} Rec`}
                      {(player.position === 'WR' || player.position === 'TE') && `${player.vegas.props.receivingYardsOU} Rec Yds`}
                      {(player.position === 'K' || player.position === 'DEF') && 'Team Unit'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">
                      {player.vegas.props.anytimeTDOdds}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-200">{tdProb}%</span>
                        <div className="w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${tdProb}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-black text-emerald-400">
                      {proj.projectedPoints} pts
                    </td>
                    <td className="p-3.5 text-right text-slate-400">
                      <ChevronRight className="w-4 h-4 inline-block hover:text-white" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
