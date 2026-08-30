import React, { useState } from 'react';
import { NFL_TEAMS_MATCHUP_DATA } from '../data/mockData';
import { ShieldAlert, TrendingUp, Search, Sparkles, ArrowUpDown } from 'lucide-react';


export const MatchupMatrix: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'team' | 'qbRank' | 'rbRank' | 'wrRank' | 'teRank' | 'epaRank' | 'pressureRate'>('epaRank');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const sortedTeams = [...NFL_TEAMS_MATCHUP_DATA]
    .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.team.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const getRankBadgeClass = (rank: number) => {
    if (rank >= 25) return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'; // soft defense = green
    if (rank >= 13) return 'bg-slate-800 text-slate-300 border border-slate-700'; // neutral
    return 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'; // lockdown defense = red
  };

  const getEpaBadgeClass = (epaRank: number) => {
    if (epaRank <= 8) return 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'; // top EPA defense = tough
    if (epaRank <= 22) return 'bg-slate-800 text-slate-300 border border-slate-700';
    return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'; // bad EPA defense = green for fantasy
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
              DEFENSE & DvP INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400">EPA & Positional Matchup Rankings (1 = Toughest, 32 = Easiest)</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display mt-1">NFL 32-Team Defensive Matchup Matrix</h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Analyze defense vs position (DvP) vulnerabilities, expected points added (EPA) per play, and pass rush pressure rates to find ideal start matchups.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search defense..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/80"
          />
        </div>
      </div>

      {/* Top Exploit Matchup Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-panel-glow-emerald border-emerald-500/40 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>SMASH RB TARGET</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="font-bold text-white text-sm">Carolina Panthers (#32 vs RB)</div>
          <p className="text-xs text-slate-300">Allowing 164.2 rush yds/gm & 5.3 YPC. Tyrone Tracy & opposing lead backs receive A+ grade.</p>
        </div>

        <div className="p-4 rounded-2xl glass-panel-glow-emerald border-emerald-500/40 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>SMASH WR TARGET</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="font-bold text-white text-sm">Baltimore Ravens (#32 vs WR)</div>
          <p className="text-xs text-slate-300">#1 run defense forces opponents into 40+ passes, funneling monster volume to opposing WRs.</p>
        </div>

        <div className="p-4 rounded-2xl glass-panel-glow-amber border-amber-500/40 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span>SMASH TE TARGET</span>
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="font-bold text-white text-sm">Cincinnati Bengals (#31 vs TE)</div>
          <p className="text-xs text-slate-300">Allow the most touchdowns and red zone targets to tight ends in the entire NFL.</p>
        </div>

        <div className="p-4 rounded-2xl glass-panel-elevated border-rose-500/40 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400 flex items-center justify-between">
            <span>TOUGHEST PASS DEFENSE</span>
            <ShieldAlert className="w-3.5 h-3.5" />
          </div>
          <div className="font-bold text-white text-sm">Denver Broncos (#3 EPA / #3 WR)</div>
          <p className="text-xs text-slate-300">Patrick Surtain II shadow coverage + 39.5% pressure rate severely dampens opposing QB/WR ceiling.</p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 glass-panel">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('team')}>
                <span className="flex items-center gap-1">Team <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('qbRank')}>
                <span className="flex items-center gap-1">vs QB Rank <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('rbRank')}>
                <span className="flex items-center gap-1">vs RB Rank <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('wrRank')}>
                <span className="flex items-center gap-1">vs WR Rank <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('teRank')}>
                <span className="flex items-center gap-1">vs TE Rank <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('epaRank')}>
                <span className="flex items-center gap-1">Def EPA Rank <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSort('pressureRate')}>
                <span className="flex items-center gap-1">Pressure % <ArrowUpDown className="w-3 h-3" /></span>
              </th>
              <th className="p-3.5 text-right">Defense Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {sortedTeams.map((team) => (
              <tr key={team.team} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3.5 font-bold text-white flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs font-black text-emerald-400">
                    {team.team}
                  </span>
                  <div>
                    <span>{team.name}</span>
                  </div>
                </td>

                <td className="p-3.5 font-mono">
                  <span className={`px-2.5 py-1 rounded-lg text-xs ${getRankBadgeClass(team.qbRank)}`}>
                    #{team.qbRank}
                  </span>
                </td>

                <td className="p-3.5 font-mono">
                  <span className={`px-2.5 py-1 rounded-lg text-xs ${getRankBadgeClass(team.rbRank)}`}>
                    #{team.rbRank}
                  </span>
                </td>

                <td className="p-3.5 font-mono">
                  <span className={`px-2.5 py-1 rounded-lg text-xs ${getRankBadgeClass(team.wrRank)}`}>
                    #{team.wrRank}
                  </span>
                </td>

                <td className="p-3.5 font-mono">
                  <span className={`px-2.5 py-1 rounded-lg text-xs ${getRankBadgeClass(team.teRank)}`}>
                    #{team.teRank}
                  </span>
                </td>

                <td className="p-3.5 font-mono">
                  <span className={`px-2.5 py-1 rounded-lg text-xs ${getEpaBadgeClass(team.epaRank)}`}>
                    #{team.epaRank} EPA
                  </span>
                </td>

                <td className="p-3.5 font-mono font-bold text-slate-300">
                  {team.pressureRate}%
                </td>

                <td className="p-3.5 text-right font-mono font-bold">
                  <span className={`px-2.5 py-0.5 rounded-lg ${
                    team.defRating.startsWith('A') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                    team.defRating.startsWith('B') ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' :
                    team.defRating.startsWith('C') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                    'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {team.defRating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
