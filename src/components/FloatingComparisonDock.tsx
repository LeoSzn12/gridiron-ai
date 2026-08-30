import React from 'react';
import type { Player, LeagueSettings } from '../types';
import { calculateCompositeDecision } from '../services/aiEngine';
import { 
  ArrowLeftRight, 
  X 
} from 'lucide-react';
import confetti from 'canvas-confetti';


interface FloatingComparisonDockProps {
  pinnedPlayers: Player[];
  onRemovePinned: (playerId: string) => void;
  onClearAll: () => void;
  onOpenDetailedDuel: (playerA: Player, playerB: Player) => void;
  settings: LeagueSettings;
}

export const FloatingComparisonDock: React.FC<FloatingComparisonDockProps> = ({
  pinnedPlayers,
  onRemovePinned,
  onClearAll,
  onOpenDetailedDuel,
  settings,
}) => {
  if (pinnedPlayers.length === 0) return null;

  const handleLaunchDuel = () => {
    if (pinnedPlayers.length >= 2) {
      onOpenDetailedDuel(pinnedPlayers[0]!, pinnedPlayers[1]!);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-in slide-in-from-bottom-6 duration-200">
      <div className="rounded-3xl bg-[#090e1c]/95 border border-emerald-500/40 p-3 sm:p-4 shadow-2xl backdrop-blur-2xl shadow-emerald-500/20 flex items-center justify-between gap-4 ring-1 ring-emerald-500/30">
        
        {/* Pinned Players Row */}
        <div className="flex items-center gap-2.5 overflow-x-auto py-1">
          <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold px-2 hidden sm:block">
            COMPARE PINNED:
          </div>

          {pinnedPlayers.map((player) => {
            const decision = calculateCompositeDecision(player, settings);
            return (
              <div 
                key={player.id}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs text-white shrink-0 shadow-sm"
              >
                <img src={player.avatar} alt={player.name} className="w-7 h-7 rounded-xl object-cover" />
                <div>
                  <div className="font-bold text-[11px] leading-tight truncate max-w-[100px]">{player.name}</div>
                  <div className="text-[9px] font-mono text-emerald-400">Alpha: {decision.alphaIndex}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePinned(player.id);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {pinnedPlayers.length < 3 && (
            <div className="border-2 border-dashed border-slate-800 rounded-2xl px-3 py-2 text-[10px] font-mono text-slate-500 whitespace-nowrap">
              + Pin another player
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onClearAll}
            className="text-[10px] font-mono text-slate-400 hover:text-white px-2 py-1 cursor-pointer"
          >
            Clear
          </button>

          <button
            onClick={handleLaunchDuel}
            disabled={pinnedPlayers.length < 2}
            className={`px-4 py-2 rounded-2xl text-xs font-bold font-display flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
              pinnedPlayers.length >= 2
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/25 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Launch Duel Arbiter</span>
          </button>
        </div>

      </div>
    </div>
  );
};
