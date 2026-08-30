import React, { useState } from 'react';
import type { Player, LeagueSettings, PlayerPosition } from '../types';
import { calculateProjection } from '../services/aiEngine';
import { 
  Flame, 
  UserMinus, 
  ChevronRight
} from 'lucide-react';

interface WaiverWireRadarProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

export const WaiverWireRadar: React.FC<WaiverWireRadarProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  const [faabBudget, setFaabBudget] = useState(100);
  const [strategy, setStrategy] = useState<'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE'>('AGGRESSIVE');
  const [selectedPos, setSelectedPos] = useState<PlayerPosition | 'ALL'>('ALL');

  const waiverCandidates = players
    .filter(p => p.isWaiverTarget || p.rosterPct < 90)
    .filter(p => selectedPos === 'ALL' || p.position === selectedPos);

  const getFaabDollarBid = (recPct: number) => {
    const strategyMultiplier = strategy === 'AGGRESSIVE' ? 1.15 : strategy === 'BALANCED' ? 1.0 : 0.85;
    return Math.max(1, Math.round((faabBudget * (recPct / 100)) * strategyMultiplier));
  };

  const dropCandidates = [
    { name: 'Alexander Mattison', team: 'LV', pos: 'RB', reason: 'Lost starting backfield role to Zamir White & Ameer Abdullah. Snap share down to 24%.' },
    { name: 'Gabe Davis', team: 'JAX', pos: 'WR', reason: 'Target share eclipsed by Brian Thomas Jr. and Christian Kirk. Under 4 targets/gm.' },
    { name: 'Deshaun Watson', team: 'CLE', pos: 'QB', reason: 'Out for season (Achilles tendon tear). Clear IR/Drop candidate in redraft.' },
  ];

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              WAIVER WIRE RADAR
            </span>
            <span className="text-xs text-slate-400">{settings.name}</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display mt-1">Free Agent & Waiver Priority Engine</h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Discover breakout gems before they explode. Algorithms calculate recommended FAAB % bids based on snap share spikes, red zone volume, and upcoming schedule ease.
          </p>
        </div>

        {/* FAAB Budget Calculator Settings */}
        <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-800 space-y-2 w-full sm:w-auto">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 font-mono">YOUR REMAINING FAAB:</span>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold font-mono">$</span>
              <input
                type="number"
                min="0"
                max="500"
                value={faabBudget}
                onChange={(e) => setFaabBudget(Number(e.target.value))}
                className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            {(['AGGRESSIVE', 'BALANCED', 'CONSERVATIVE'] as const).map(strat => (
              <button
                key={strat}
                onClick={() => setStrategy(strat)}
                className={`px-2 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                  strategy === strat ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-slate-900'
                }`}
              >
                {strat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Position Filter */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          {(['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'DEF'] as const).map(pos => (
            <button
              key={pos}
              onClick={() => setSelectedPos(pos)}
              className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                selectedPos === pos ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>


        <div className="text-xs text-slate-400 font-mono">
          Showing <strong className="text-emerald-400">{waiverCandidates.length}</strong> high-value targets
        </div>
      </div>

      {/* Waiver Targets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {waiverCandidates.map((player) => {
          const proj = calculateProjection(player, settings);
          const dollarBid = getFaabDollarBid(player.faabRecommendedPct);


          return (
            <div
              key={player.id}
              className="glass-panel hover:border-slate-700 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all"
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs">
                      {player.position}
                    </span>
                    <span className="text-xs text-slate-400">{player.team}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1 ${
                    player.waiverTrend === 'SURGING' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    player.waiverTrend === 'RISING' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    <Flame className="w-3 h-3" />
                    {player.waiverTrend || 'RISING'}
                  </span>
                </div>

                {/* Player Name & Photo */}
                <div className="flex items-center gap-3">
                  <img
                    src={player.avatar}
                    alt={player.name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-700"
                  />
                  <div>
                    <h4 
                      onClick={() => onSelectPlayerDetail(player)}
                      className="font-bold text-white text-base hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                      {player.name}
                    </h4>
                    <div className="text-xs text-slate-400 font-mono">
                      Rostered: <strong className="text-slate-200">{player.rosterPct}%</strong>
                    </div>
                  </div>
                </div>

                {/* FAAB Bid Recommendation Box */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">FAAB BID (Recommended):</span>
                    <span className="text-emerald-400 font-black text-sm">
                      ${dollarBid} <span className="text-slate-400 text-xs font-normal">({player.faabRecommendedPct}% budget)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" 
                      style={{ width: `${player.faabRecommendedPct}%` }}
                    ></div>
                  </div>
                </div>

                {/* Projection & Matchup */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-mono">THIS WEEK PROJ</div>
                    <div className="font-mono font-bold text-emerald-400 mt-0.5">{proj.projectedPoints} pts</div>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                    <div className="text-[10px] text-slate-500 font-mono">MATCHUP</div>
                    <div className="font-mono font-bold text-slate-200 mt-0.5">vs {player.opponent} (#{player.defense.rankVsPosition})</div>
                  </div>
                </div>

                {/* Snap Share Trend */}
                <div className="space-y-1 text-xs">
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Recent 3-Week Snap Trajectory</div>
                  <div className="flex items-center gap-2">
                    {player.recentGames.map((g, gIdx) => (
                      <div key={gIdx} className="flex-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-center font-mono text-[11px]">
                        <div className="text-slate-500 text-[9px]">W{g.week}</div>
                        <div className="text-slate-200 font-bold">{g.snapPct}%</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Reasoning */}
                <p className="text-xs text-slate-300 bg-emerald-950/20 border border-emerald-800/30 p-2.5 rounded-xl leading-relaxed">
                  {player.aiAnalysisSummary}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onSelectPlayerDetail(player)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>Full Waiver Breakdown</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* AI Drop Candidates / Roster Churn Advice */}
      <div className="space-y-3 pt-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <UserMinus className="w-4 h-4 text-rose-400" />
          <span>Recommended Drop Candidates to Fund Waivers</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dropCandidates.map((cand, idx) => (
            <div key={idx} className="glass-panel p-4 rounded-2xl border-rose-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm">{cand.name}</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 font-bold">
                  SAFE DROP
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400">{cand.pos} • {cand.team}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{cand.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
