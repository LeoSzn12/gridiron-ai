import React, { useState } from 'react';
import type { Player, LeagueSettings } from '../types';
import { evaluateTrade, calculateProjection } from '../services/aiEngine';
import { 
  Sparkles, 
  Plus, 
  X, 
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TradeAnalyzerProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

export const TradeAnalyzer: React.FC<TradeAnalyzerProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  const [sideAPlayerIds, setSideAPlayerIds] = useState<string[]>(['patrick-mahomes', 'brian-thomas-jr']);
  const [sideBPlayerIds, setSideBPlayerIds] = useState<string[]>(['saquon-barkley']);
  const [showAddA, setShowAddA] = useState(false);
  const [showAddB, setShowAddB] = useState(false);

  const sideAPlayers = sideAPlayerIds
    .map(id => players.find(p => p.id === id))
    .filter((p): p is Player => p !== undefined);

  const sideBPlayers = sideBPlayerIds
    .map(id => players.find(p => p.id === id))
    .filter((p): p is Player => p !== undefined);

  const tradeEval = evaluateTrade(sideAPlayers, sideBPlayers, settings);


  const handleAddPlayer = (side: 'A' | 'B', playerId: string) => {
    if (side === 'A') {
      if (!sideAPlayerIds.includes(playerId)) setSideAPlayerIds([...sideAPlayerIds, playerId]);
      setShowAddA(false);
    } else {
      if (!sideBPlayerIds.includes(playerId)) setSideBPlayerIds([...sideBPlayerIds, playerId]);
      setShowAddB(false);
    }
  };

  const handleRemovePlayer = (side: 'A' | 'B', playerId: string) => {
    if (side === 'A') {
      setSideAPlayerIds(sideAPlayerIds.filter(id => id !== playerId));
    } else {
      setSideBPlayerIds(sideBPlayerIds.filter(id => id !== playerId));
    }
  };

  const triggerTradeConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              TRADE EVALUATOR & ROS
            </span>
            <span className="text-xs text-slate-400">Multi-Asset Fairness & Surplus Value</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display mt-1">AI Fantasy Trade Calculator</h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-1">
            Evaluate 1-for-1, 2-for-1, and blockbuster trades with Rest-of-Season (ROS) index ratings, weekly starting output delta, and roster balance impact.
          </p>
        </div>

        <button
          onClick={triggerTradeConfetti}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Simulate Evaluation</span>
        </button>
      </div>

      {/* Evaluation Super-Card */}
      <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-6 shadow-2xl space-y-6">
        
        {/* Fairness Score Meter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">AI TRADE VERDICT</div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-xl text-sm font-black font-mono tracking-wide ${
                tradeEval.verdict === 'FAIR TRADE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                tradeEval.verdict === 'WIN FOR SIDE A' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                tradeEval.verdict === 'WIN FOR SIDE B' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {tradeEval.verdict}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Fairness Score: <strong className="text-white text-base">{tradeEval.fairnessScore}%</strong>
              </span>
            </div>
          </div>

          {/* Value Disparity */}
          <div className="text-right">
            <div className="text-xs font-mono text-slate-400">NET VALUE DELTA</div>
            <div className={`text-xl font-mono font-black ${tradeEval.netDiff >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
              {tradeEval.netDiff >= 0 ? `+${tradeEval.netDiff}` : tradeEval.netDiff} Index Pts
            </div>
          </div>
        </div>

        {/* Trade Sides Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Side A */}
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Side A (Team 1 Sends)</span>
                </h4>
                <div className="text-xs text-slate-400 font-mono">
                  Total Trade Index: <strong className="text-cyan-400 font-bold">{tradeEval.sideAValue} pts</strong>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowAddA(!showAddA)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  Add Player
                </button>

                {showAddA && (
                  <div className="absolute right-0 mt-2 w-64 max-h-60 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-30">
                    {players
                      .filter(p => !sideAPlayerIds.includes(p.id) && !sideBPlayerIds.includes(p.id))
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAddPlayer('A', p.id)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>{p.name} ({p.position})</span>
                          <span className="font-mono text-cyan-400">{p.tradeValue}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Side A Player List */}
            <div className="space-y-2.5">
              {sideAPlayers.map(p => {
                const proj = calculateProjection(p, settings);
                return (

                  <div key={p.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div 
                      onClick={() => onSelectPlayerDetail(p)} 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-xl object-cover border border-slate-700" />
                      <div>
                        <div className="font-bold text-white text-xs hover:text-cyan-400 transition-colors">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.position} • {p.team} | Proj: {proj.projectedPoints} pts</div>
                      </div>
                    </div>



                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-500 text-[9px]">VALUE</div>
                        <div className="font-bold text-cyan-400">{p.tradeValue}</div>
                      </div>
                      <button onClick={() => handleRemovePlayer('A', p.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {sideAPlayers.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No players selected on Side A. Click "Add Player" above.
                </div>
              )}
            </div>
          </div>

          {/* Side B */}
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <span>Side B (Team 2 Sends)</span>
                </h4>
                <div className="text-xs text-slate-400 font-mono">
                  Total Trade Index: <strong className="text-amber-400 font-bold">{tradeEval.sideBValue} pts</strong>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowAddB(!showAddB)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  Add Player
                </button>

                {showAddB && (
                  <div className="absolute right-0 mt-2 w-64 max-h-60 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-30">
                    {players
                      .filter(p => !sideAPlayerIds.includes(p.id) && !sideBPlayerIds.includes(p.id))
                      .map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAddPlayer('B', p.id)}
                          className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-800 text-xs text-slate-200 flex items-center justify-between cursor-pointer"
                        >
                          <span>{p.name} ({p.position})</span>
                          <span className="font-mono text-amber-400">{p.tradeValue}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Side B Player List */}
            <div className="space-y-2.5">
              {sideBPlayers.map(p => {
                const proj = calculateProjection(p, settings);
                return (

                  <div key={p.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div 
                      onClick={() => onSelectPlayerDetail(p)} 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={p.avatar} alt={p.name} className="w-9 h-9 rounded-xl object-cover border border-slate-700" />
                      <div>
                        <div className="font-bold text-white text-xs hover:text-amber-400 transition-colors">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.position} • {p.team} | Proj: {proj.projectedPoints} pts</div>
                      </div>
                    </div>


                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-500 text-[9px]">VALUE</div>
                        <div className="font-bold text-amber-400">{p.tradeValue}</div>
                      </div>
                      <button onClick={() => handleRemovePlayer('B', p.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {sideBPlayers.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No players selected on Side B. Click "Add Player" above.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Breakdown & Strategic Recommendations */}
        <div className="p-4 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Analytical Summary</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {tradeEval.breakdown}
          </p>

          <div className="pt-2 border-t border-slate-800/80">
            {tradeEval.recommendations.map((rec, rIdx) => (
              <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
