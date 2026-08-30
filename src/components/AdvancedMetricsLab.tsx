import React, { useState } from 'react';
import type { Player, LeagueSettings } from '../types';
import { 
  Activity, 
  Zap, 
  ShieldCheck, 
  Flame 
} from 'lucide-react';

interface AdvancedMetricsLabProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}


const COACHING_SCHEME_DATA = [
  { team: 'BAL', coach: 'Todd Monken', pace: '26.2s (#12)', proe: -1.2, passRate: 52, runScheme: 'RPO Spread Option', redZone: 'Dual-Threat QB Keepers', tier: 'Elite' },
  { team: 'BUF', coach: 'Joe Brady', pace: '25.1s (#9)', proe: +1.1, passRate: 54, runScheme: 'Gap/Power Duo', redZone: 'Dual-Threat QB Keepers', tier: 'Elite' },
  { team: 'WAS', coach: 'Kliff Kingsbury', pace: '23.1s (#3)', proe: +2.8, passRate: 58, runScheme: 'RPO Spread Option', redZone: 'Dual-Threat QB Keepers', tier: 'Elite' },
  { team: 'KC', coach: 'Andy Reid', pace: '27.4s (#16)', proe: +4.2, passRate: 63, runScheme: 'Zone Running', redZone: 'Pass First', tier: 'High Volume' },
  { team: 'PHI', coach: 'Kellen Moore', pace: '24.8s (#7)', proe: -3.5, passRate: 48, runScheme: 'Zone Running', redZone: 'Goal-Line Heavy Run', tier: 'Elite Rush' },
  { team: 'CIN', coach: 'Dan Pitcher', pace: '24.1s (#5)', proe: +6.5, passRate: 66, runScheme: 'Zone Running', redZone: 'Pass First', tier: 'High Volume' },
  { team: 'MIN', coach: 'Kevin O\'Connell', pace: '26.5s (#14)', proe: +3.8, passRate: 60, runScheme: 'Zone Running', redZone: 'Pass First', tier: 'High Volume' },
  { team: 'DAL', coach: 'Brian Schottenheimer', pace: '24.2s (#6)', proe: +4.0, passRate: 64, runScheme: 'Zone Running', redZone: 'Pass First', tier: 'High Volume' },
];

const DEFENSIVE_COVERAGE_SCHEMES = [
  {
    scheme: 'Cover 3 / Quarters Zone Heavy',
    teams: 'Bengals, Colts, Cowboys, Panthers, Dolphins',
    vulnerableTo: 'Slot WRs, Tight Ends in the seam, and Checkdown RBs',
    lockdownVs: 'Deep Boundary Outside Fly Routes',
    fantasyStrategy: 'Start Brock Bowers & Tyrone Tracy with confidence.',
  },
  {
    scheme: 'Man Blitz Heavy (Cover 1 / Cover 0)',
    teams: 'Broncos, Giants, Saints, Jaguars',
    vulnerableTo: 'Alpha X WRs with 1-on-1 separation & Scrambling QBs',
    lockdownVs: 'Static pocket passers with slow release',
    fantasyStrategy: 'Smash start Justin Jefferson & Jayden Daniels.',
  },
  {
    scheme: 'Two-High Shell (Cover 4 / Split-Field)',
    teams: 'Ravens, Vikings, Chiefs, Chargers',
    vulnerableTo: 'Heavy Gap/Power Inside Running & Screen Passes',
    lockdownVs: 'Over-the-top 40+ yard deep passing shots',
    fantasyStrategy: 'Prioritize Derrick Henry & Saquon Barkley touches.',
  },
];

export const AdvancedMetricsLab: React.FC<AdvancedMetricsLabProps> = ({
  players,
  settings: _settings,
  onSelectPlayerDetail,
}) => {

  const [activeTab, setActiveTab] = useState<'schemes' | 'redzone' | 'idp-passrush'>('schemes');

  return (
    <div className="space-y-6">
      
      {/* Super Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              ADVANCED METRICS & COACHING LAB
            </span>
            <span className="text-xs text-slate-400 font-mono">PFF & Next Gen Stats Synthesis</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Offensive PROE, Neutral Pace & Scheme Matchups
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Uncover tactical hidden advantages by decoding offensive play-calling tendencies, defensive coverage vulnerabilities, and red zone target distribution.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'schemes', label: 'Coaching & PROE' },
            { id: 'redzone', label: 'Red Zone Volume' },
            { id: 'idp-passrush', label: 'IDP Pressure Radar' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Coaching & PROE Tab */}
      {activeTab === 'schemes' && (
        <div className="space-y-6">
          
          {/* Coaching Scheme Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-800 glass-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-4">Team / Playcaller</th>
                  <th className="p-4">Neutral Pace</th>
                  <th className="p-4">PROE (%)</th>
                  <th className="p-4">Pass Rate</th>
                  <th className="p-4">Run Concept</th>
                  <th className="p-4">Red Zone Priority</th>
                  <th className="p-4 text-right">Fantasy Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {COACHING_SCHEME_DATA.map((scheme) => (
                  <tr key={scheme.team} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-emerald-400">{scheme.team}</span>
                      <span>{scheme.coach}</span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{scheme.pace}</td>
                    <td className="p-4 font-mono font-bold">
                      <span className={scheme.proe >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {scheme.proe >= 0 ? `+${scheme.proe}%` : `${scheme.proe}%`}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-slate-300">{scheme.passRate}%</td>
                    <td className="p-4 text-slate-300">{scheme.runScheme}</td>
                    <td className="p-4 text-slate-300">{scheme.redZone}</td>
                    <td className="p-4 text-right font-mono">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {scheme.tier}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Defensive Coverage Scheme Matrix */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>NFL Defensive Coverage Scheme Vulnerabilities</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEFENSIVE_COVERAGE_SCHEMES.map((cov, idx) => (
                <div key={idx} className="p-5 rounded-3xl glass-panel border border-slate-800 space-y-3">
                  <div className="text-xs font-mono font-bold text-emerald-400 uppercase">{cov.scheme}</div>
                  <div className="text-xs text-slate-400"><strong className="text-slate-300">Teams Using:</strong> {cov.teams}</div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="text-emerald-300 flex items-start gap-1">
                      <span className="font-bold">✓ Target:</span>
                      <span>{cov.vulnerableTo}</span>
                    </div>
                    <div className="text-rose-300 flex items-start gap-1">
                      <span className="font-bold">✗ Avoid:</span>
                      <span>{cov.lockdownVs}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300">
                    💡 {cov.fantasyStrategy}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 2. Red Zone Volume Tab */}
      {activeTab === 'redzone' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Red Zone Touchdown Share Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400">In 6-point TD leagues, Red Zone volume represents over 68% of fantasy scoring.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  onClick={() => onSelectPlayerDetail(player)}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/40 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-white text-xs">{player.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{player.position} • {player.team}</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {player.stats.redZoneOpportunitiesPerGame} RZ / gm
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Red Zone Conversion</span>
                      <span className="text-emerald-400 font-bold">{player.vegas.props.anytimeTDOdds} Anytime TD</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full" 
                        style={{ width: `${Math.min(100, (player.stats.redZoneOpportunitiesPerGame / 6) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. IDP Pressure Radar */}
      {activeTab === 'idp-passrush' && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>IDP Pass Rush & Defensive Playmaker Radar</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players.filter(p => p.position === 'DL' || p.position === 'LB' || p.position === 'DB').map((idp) => (
                <div key={idp.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img src={idp.avatar} alt={idp.name} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <div className="font-bold text-white text-sm">{idp.name}</div>
                        <div className="text-xs font-mono text-slate-400">{idp.position} • {idp.team} vs {idp.opponent}</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Grade: {idp.defense.matchupGrade}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400">SACKS/GM</div>
                      <div className="text-emerald-400 font-bold">{idp.stats.sacksPerGame || 'N/A'}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400">TACKLES/GM</div>
                      <div className="text-cyan-400 font-bold">{idp.stats.tacklesPerGame || 'N/A'}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="text-[10px] text-slate-400">SNAP SHARE</div>
                      <div className="text-amber-400 font-bold">{idp.stats.snapSharePct}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
