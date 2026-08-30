import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings, LineupSolverMode } from '../types';
import { solveOptimalLineup } from '../services/lineupOptimizer';
import { 
  Sparkles, 
  Flame, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  X, 
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LineupOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  settings: LeagueSettings;
  onApplyLineup: (optimalStarters: Player[]) => void;
  onSelectPlayerDetail: (player: Player) => void;
}

export const LineupOptimizerModal: React.FC<LineupOptimizerModalProps> = ({
  isOpen,
  onClose,
  players,
  settings,
  onApplyLineup,
  onSelectPlayerDetail,
}) => {
  const [solverMode, setSolverMode] = useState<LineupSolverMode>('BALANCED_ALPHA');
  const [isApplied, setIsApplied] = useState(false);

  // Baseline current starters (first N players per position)
  const currentStarters = useMemo(() => {
    return players.slice(0, 15);
  }, [players]);

  const optimalResult = useMemo(() => {
    return solveOptimalLineup(players, currentStarters, settings, solverMode);
  }, [players, currentStarters, settings, solverMode]);

  if (!isOpen) return null;

  const handleApply = () => {
    setIsApplied(true);
    confetti({
      particleCount: 75,
      spread: 70,
      origin: { y: 0.6 },
    });
    onApplyLineup(optimalResult.starters);
    setTimeout(() => {
      setIsApplied(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#070b17] border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg font-display">Mathematical Lineup Solver</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Linear Programming Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Calibrated for {settings.name} ({settings.roster.qb}-QB / {settings.roster.wr}-WR / 50 yd/pt / 6pt TD)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Solver Mode Selector & Summary KPIs */}
        <div className="p-5 sm:p-6 bg-slate-900/40 border-b border-slate-800/80 space-y-5">
          
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                mode: 'SAFE_FLOOR' as LineupSolverMode,
                label: '🛡️ Safe Floor Mode',
                desc: 'Maximizes guaranteed touches, penalizes weather risk. Ideal when you are a projected favorite.',
                color: 'cyan',
              },
              {
                mode: 'BALANCED_ALPHA' as LineupSolverMode,
                label: '⚖️ Balanced Alpha Mode',
                desc: 'Optimizes composite 5-factor index (Vegas, DvP, Weather, PROE, VORP). Best overall default.',
                color: 'emerald',
              },
              {
                mode: 'MAX_BOOM_CEILING' as LineupSolverMode,
                label: '🔥 Max Boom & Stacks',
                desc: 'Unlocks 90th-percentile ceiling + QB-WR correlation stacks. Ideal for high-stakes underdog matchups.',
                color: 'amber',
              },
            ].map(tab => (
              <button
                key={tab.mode}
                onClick={() => setSolverMode(tab.mode)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                  solverMode === tab.mode
                    ? 'bg-slate-950 border-emerald-500 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs sm:text-sm text-white font-display flex items-center justify-between">
                  <span>{tab.label}</span>
                  {solverMode === tab.mode && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">{tab.desc}</div>
              </button>
            ))}
          </div>

          {/* Metric KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Total Projected</div>
              <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
                {optimalResult.totalProjectedPoints} <span className="text-xs font-normal text-slate-500">pts</span>
              </div>
              {optimalResult.projectedPointGainVsCurrent > 0 && (
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                  +{optimalResult.projectedPointGainVsCurrent} pts vs baseline
                </div>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase">10th-% Floor</div>
              <div className="text-xl font-extrabold text-cyan-400 font-mono mt-0.5">
                {optimalResult.totalFloor} <span className="text-xs font-normal text-slate-500">pts</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase">90th-% Ceiling</div>
              <div className="text-xl font-extrabold text-amber-400 font-mono mt-0.5">
                {optimalResult.totalCeiling} <span className="text-xs font-normal text-slate-500">pts</span>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-center">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Team Alpha Index</div>
              <div className="text-xl font-extrabold text-purple-400 font-mono mt-0.5">
                {optimalResult.totalAlphaIndex}<span className="text-xs font-normal text-slate-500">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Body with Swaps & Roster List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* Recommended Swaps Section */}
          {optimalResult.swaps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <Zap className="w-4 h-4" />
                <span>AI Recommended Start/Sit Swaps ({optimalResult.swaps.length})</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {optimalResult.swaps.map((swap, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                        {swap.position}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        +{swap.projectedPointDiff} pts Gain
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {/* Bench Current */}
                      <div className="flex-1 p-2 rounded-xl bg-rose-950/30 border border-rose-800/40 text-center">
                        <div className="text-[10px] text-rose-400 font-mono uppercase">BENCH</div>
                        <div className="font-bold text-slate-200 truncate">{swap.currentStarter.name}</div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />

                      {/* Start Optimal */}
                      <div className="flex-1 p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-center">
                        <div className="text-[10px] text-emerald-400 font-mono uppercase">START</div>
                        <div className="font-bold text-white truncate">{swap.recommendedStarter.name}</div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-snug">
                      {swap.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Correlation Stacks Detected */}
          {optimalResult.correlationStacks.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-300 uppercase">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Correlation Stacks Active ({optimalResult.correlationStacks.length})</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                {optimalResult.correlationStacks.map((stk, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="font-bold text-white">{stk.qb} 🔗 {stk.target}</span>
                    <span className="text-slate-500">—</span>
                    <span className="text-[11px] text-slate-400">{stk.rationale}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optimal Starting Lineup Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Optimal Starting Lineup ({optimalResult.starters.length} Starters)</span>
              </h4>
              <span className="text-xs text-slate-400 font-mono">
                Click any player for intelligence profile
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {optimalResult.starters.map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSelectPlayerDetail(player)}
                  className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-800 group-hover:border-emerald-500 transition-colors shrink-0"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                          {player.position}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{player.name}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {player.team} vs {player.opponent} • Grade {player.defense.matchupGrade}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-extrabold text-emerald-400">
                      {player.stats.recentAveragePoints.toFixed(1)} pts
                    </div>
                    <div className="text-[9px] font-mono text-slate-500">
                      Floor: {Math.max(1, player.stats.recentAveragePoints * 0.7).toFixed(1)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer with Apply Button */}
        <div className="p-5 sm:p-6 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 font-mono text-center sm:text-left">
            <span>Optimal Lineup Solver calculated for {settings.userTeamName}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-800 transition-colors cursor-pointer flex-1 sm:flex-none text-center"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={isApplied}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-none"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApplied ? 'Applied to Lineup!' : 'Apply Optimal Lineup'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
