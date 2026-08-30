import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings, PlayerPosition } from '../types';
import { evaluateTrade, calculateProjection } from '../services/aiEngine';
import { 
  Sparkles, 
  Plus, 
  X, 
  CheckCircle2, 
  Search, 
  ArrowLeftRight, 
  Gauge, 
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TradeAnalyzerProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

interface DraftPickAsset {
  id: string;
  label: string;
  year: number;
  round: number;
  value: number;
}

const FUTURE_DRAFT_PICKS: DraftPickAsset[] = [
  { id: 'pick-2025-rd1', label: '2025 Round 1 Pick (Early/Mid)', year: 2025, round: 1, value: 75 },
  { id: 'pick-2025-rd2', label: '2025 Round 2 Pick', year: 2025, round: 2, value: 45 },
  { id: 'pick-2025-rd3', label: '2025 Round 3 Pick', year: 2025, round: 3, value: 25 },
  { id: 'pick-2026-rd1', label: '2026 Round 1 Pick', year: 2026, round: 1, value: 65 },
];

export const TradeAnalyzer: React.FC<TradeAnalyzerProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  // Trade Setup
  const [tradeMode, setTradeMode] = useState<'2-team' | '3-team'>('2-team');
  const [sideAPlayerIds, setSideAPlayerIds] = useState<string[]>(['patrick-mahomes', 'brian-thomas-jr']);
  const [sideBPlayerIds, setSideBPlayerIds] = useState<string[]>(['saquon-barkley']);
  const [sideCPlayerIds, setSideCPlayerIds] = useState<string[]>(['brock-bowers']);

  const [sideAPicks, setSideAPicks] = useState<DraftPickAsset[]>([]);
  const [sideBPicks, setSideBPicks] = useState<DraftPickAsset[]>([]);

  // Search & Filter state for adding players
  const [activeModalSide, setActiveModalSide] = useState<'A' | 'B' | 'C' | null>(null);
  const [playerSearchQuery, setPlayerSearchQuery] = useState('');
  const [playerPosFilter, setPlayerPosFilter] = useState<PlayerPosition | 'ALL'>('ALL');

  // Hydrate players
  const sideAPlayers = useMemo(() => sideAPlayerIds.map(id => players.find(p => p.id === id)).filter((p): p is Player => p !== undefined), [sideAPlayerIds, players]);
  const sideBPlayers = useMemo(() => sideBPlayerIds.map(id => players.find(p => p.id === id)).filter((p): p is Player => p !== undefined), [sideBPlayerIds, players]);
  const sideCPlayers = useMemo(() => sideCPlayerIds.map(id => players.find(p => p.id === id)).filter((p): p is Player => p !== undefined), [sideCPlayerIds, players]);

  // Evaluate Trade
  const tradeEval = useMemo(() => {
    return evaluateTrade(sideAPlayers, sideBPlayers, settings);
  }, [sideAPlayers, sideBPlayers, settings]);

  // Compute Total Values including Draft Picks
  const totalValueA = useMemo(() => {
    const playersVal = sideAPlayers.reduce((sum, p) => sum + (p.tradeValue || 0), 0);
    const picksVal = sideAPicks.reduce((sum, pk) => sum + pk.value, 0);
    return playersVal + picksVal;
  }, [sideAPlayers, sideAPicks]);

  const totalValueB = useMemo(() => {
    const playersVal = sideBPlayers.reduce((sum, p) => sum + (p.tradeValue || 0), 0);
    const picksVal = sideBPicks.reduce((sum, pk) => sum + pk.value, 0);
    return playersVal + picksVal;
  }, [sideBPlayers, sideBPicks]);

  const totalValueC = useMemo(() => {
    return sideCPlayers.reduce((sum, p) => sum + (p.tradeValue || 0), 0);
  }, [sideCPlayers]);

  // Projected Weekly Points per side
  const sideAWeeklyPts = useMemo(() => sideAPlayers.reduce((sum, p) => sum + calculateProjection(p, settings).projectedPoints, 0), [sideAPlayers, settings]);
  const sideBWeeklyPts = useMemo(() => sideBPlayers.reduce((sum, p) => sum + calculateProjection(p, settings).projectedPoints, 0), [sideBPlayers, settings]);

  // Available Players for selection modal
  const availableForSelection = useMemo(() => {
    const selectedIds = [...sideAPlayerIds, ...sideBPlayerIds, ...sideCPlayerIds];
    return players.filter(p => {
      if (selectedIds.includes(p.id)) return false;
      if (playerPosFilter !== 'ALL' && p.position !== playerPosFilter) return false;
      if (playerSearchQuery.trim()) {
        const q = playerSearchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) || p.position.toLowerCase() === q;
      }
      return true;
    }).sort((a, b) => (b.tradeValue || 0) - (a.tradeValue || 0));
  }, [players, sideAPlayerIds, sideBPlayerIds, sideCPlayerIds, playerSearchQuery, playerPosFilter]);

  const handleAddPlayer = (side: 'A' | 'B' | 'C', playerId: string) => {
    if (side === 'A') setSideAPlayerIds(prev => [...prev, playerId]);
    else if (side === 'B') setSideBPlayerIds(prev => [...prev, playerId]);
    else setSideCPlayerIds(prev => [...prev, playerId]);
    setActiveModalSide(null);
    setPlayerSearchQuery('');
  };

  const handleRemovePlayer = (side: 'A' | 'B' | 'C', playerId: string) => {
    if (side === 'A') setSideAPlayerIds(prev => prev.filter(id => id !== playerId));
    else if (side === 'B') setSideBPlayerIds(prev => prev.filter(id => id !== playerId));
    else setSideCPlayerIds(prev => prev.filter(id => id !== playerId));
  };

  const handleAddPick = (side: 'A' | 'B', pick: DraftPickAsset) => {
    if (side === 'A') {
      if (!sideAPicks.some(pk => pk.id === pick.id)) setSideAPicks(prev => [...prev, pick]);
    } else {
      if (!sideBPicks.some(pk => pk.id === pick.id)) setSideBPicks(prev => [...prev, pick]);
    }
  };

  const handleRemovePick = (side: 'A' | 'B', pickId: string) => {
    if (side === 'A') setSideAPicks(prev => prev.filter(pk => pk.id !== pickId));
    else setSideBPicks(prev => prev.filter(pk => pk.id !== pickId));
  };

  const triggerTradeConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#38BDF8', '#10B981', '#F59E0B'],
    });
  };

  const tradePresets = [
    { label: '🔥 Mahomes + Brian Thomas ⇄ Saquon', a: ['patrick-mahomes', 'brian-thomas-jr'], b: ['saquon-barkley'] },
    { label: '⚖️ Lamar Jackson ⇄ CeeDee Lamb', a: ['lamar-jackson'], b: ['ceedee-lamb'] },
    { label: '⚡ Josh Allen + Brock Bowers ⇄ Bijan + Kittle', a: ['josh-allen', 'brock-bowers'], b: ['bijan-robinson', 'george-kittle'] },
    { label: '🛡️ T.J. Watt + Jayden Daniels ⇄ Maxx Crosby + Jaylen Daniels', a: ['tj-watt', 'jayden-daniels'], b: ['maxx-crosby', 'jayden-daniels'] },
  ];

  return (
    <div className="space-y-6">
      
      {/* Super Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5" />
              NFL FANTASY TRADE MACHINE & SIMULATOR
            </span>
            <span className="text-xs text-slate-400 font-mono">Calibrated to {settings.name}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Multi-Team Trade Evaluator & ROS Calculator
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulate multi-asset and multi-party blockbuster trades with Rest-of-Season (ROS) surplus values, future draft pick compensation, and custom 3-QB positional scarcity impact.
          </p>
        </div>

        {/* Trade Mode Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setTradeMode('2-team')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tradeMode === '2-team'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2-Team Trade
          </button>
          <button
            onClick={() => setTradeMode('3-team')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tradeMode === '3-team'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3-Team Blockbuster
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
        <span className="text-slate-400 font-mono font-bold uppercase text-[10px] shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Trade Scenarios:
        </span>
        {tradePresets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setSideAPlayerIds(preset.a);
              setSideBPlayerIds(preset.b);
              setSideAPicks([]);
              setSideBPicks([]);
            }}
            className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 border border-slate-700 whitespace-nowrap transition-all cursor-pointer"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Evaluation Super-Card */}
      <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-6 shadow-2xl space-y-6">
        
        {/* Fairness Score Meter & Value Delta */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4 text-emerald-400" />
              <span>AI TRADE ARBITRATION VERDICT</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-xl text-sm font-black font-mono tracking-wide ${
                tradeEval.verdict === 'FAIR TRADE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                tradeEval.verdict === 'WIN FOR SIDE A' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                tradeEval.verdict === 'WIN FOR SIDE B' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {tradeEval.verdict}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                Fairness Index: <strong className="text-white text-base">{tradeEval.fairnessScore}%</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs font-mono text-slate-400">NET VALUE DELTA</div>
              <div className={`text-xl font-mono font-black ${totalValueA - totalValueB >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                {totalValueA - totalValueB >= 0 ? `+${(totalValueA - totalValueB).toFixed(1)}` : (totalValueA - totalValueB).toFixed(1)} Index Pts
              </div>
            </div>

            <button
              onClick={triggerTradeConfetti}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lock In</span>
            </button>
          </div>
        </div>

        {/* Trade Sides Side-by-Side Grid */}
        <div className={`grid grid-cols-1 ${tradeMode === '3-team' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
          
          {/* Side A */}
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-cyan-500/30 space-y-4 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span>Side A (Team 1)</span>
                </h4>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Total Value: <strong className="text-cyan-400 font-bold">{totalValueA.toFixed(1)} pts</strong> | Weekly Proj: <strong className="text-white">{sideAWeeklyPts.toFixed(1)} pts</strong>
                </div>
              </div>

              <button
                onClick={() => setActiveModalSide('A')}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1 border border-cyan-500/40 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Asset
              </button>
            </div>

            {/* Players & Picks List */}
            <div className="space-y-2.5">
              {sideAPlayers.map(p => {
                const proj = calculateProjection(p, settings);
                return (
                  <div key={p.id} className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div 
                      onClick={() => onSelectPlayerDetail(p)} 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                      <div>
                        <div className="font-bold text-white text-xs hover:text-cyan-400 transition-colors">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.position} • {p.team} | Proj: {proj.projectedPoints} pts</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-500 text-[9px]">ROS VAL</div>
                        <div className="font-bold text-cyan-400">{p.tradeValue}</div>
                      </div>
                      <button onClick={() => handleRemovePlayer('A', p.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {sideAPicks.map(pk => (
                <div key={pk.id} className="bg-indigo-950/40 p-3 rounded-2xl border border-indigo-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-indigo-200">{pk.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-indigo-300 font-bold">{pk.value} pts</span>
                    <button onClick={() => handleRemovePick('A', pk.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {sideAPlayers.length === 0 && sideAPicks.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No assets selected on Side A. Click "Add Asset" above.
                </div>
              )}
            </div>
          </div>

          {/* Side B */}
          <div className="bg-slate-900/60 rounded-3xl p-5 border border-amber-500/30 space-y-4 shadow-lg shadow-amber-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span>Side B (Team 2)</span>
                </h4>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Total Value: <strong className="text-amber-400 font-bold">{totalValueB.toFixed(1)} pts</strong> | Weekly Proj: <strong className="text-white">{sideBWeeklyPts.toFixed(1)} pts</strong>
                </div>
              </div>

              <button
                onClick={() => setActiveModalSide('B')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1 border border-amber-500/40 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Asset
              </button>
            </div>

            {/* Players & Picks List */}
            <div className="space-y-2.5">
              {sideBPlayers.map(p => {
                const proj = calculateProjection(p, settings);
                return (
                  <div key={p.id} className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div 
                      onClick={() => onSelectPlayerDetail(p)} 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                      <div>
                        <div className="font-bold text-white text-xs hover:text-amber-400 transition-colors">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.position} • {p.team} | Proj: {proj.projectedPoints} pts</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-500 text-[9px]">ROS VAL</div>
                        <div className="font-bold text-amber-400">{p.tradeValue}</div>
                      </div>
                      <button onClick={() => handleRemovePlayer('B', p.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {sideBPicks.map(pk => (
                <div key={pk.id} className="bg-amber-950/40 p-3 rounded-2xl border border-amber-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-amber-200">{pk.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-amber-300 font-bold">{pk.value} pts</span>
                    <button onClick={() => handleRemovePick('B', pk.id)} className="text-slate-500 hover:text-rose-400 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {sideBPlayers.length === 0 && sideBPicks.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No assets selected on Side B. Click "Add Asset" above.
                </div>
              )}
            </div>
          </div>

          {/* Side C (If 3-Team Mode) */}
          {tradeMode === '3-team' && (
            <div className="bg-slate-900/60 rounded-3xl p-5 border border-purple-500/30 space-y-4 shadow-lg shadow-purple-950/20">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    <span>Side C (Team 3)</span>
                  </h4>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    Total Value: <strong className="text-purple-400 font-bold">{totalValueC.toFixed(1)} pts</strong>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModalSide('C')}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1 border border-purple-500/40 cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Asset
                </button>
              </div>

              {/* Side C Player List */}
              <div className="space-y-2.5">
                {sideCPlayers.map(p => (
                  <div key={p.id} className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div 
                      onClick={() => onSelectPlayerDetail(p)} 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-700" />
                      <div>
                        <div className="font-bold text-white text-xs hover:text-purple-400 transition-colors">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{p.position} • {p.team}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <div className="text-slate-500 text-[9px]">ROS VAL</div>
                        <div className="font-bold text-purple-400">{p.tradeValue}</div>
                      </div>
                      <button onClick={() => handleRemovePlayer('C', p.id)} className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Analytical Summary & Roster Impact */}
        <div className="p-5 bg-slate-900/50 rounded-3xl border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Trade Arbitration & Roster Impact</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {tradeEval.breakdown}
          </p>

          <div className="pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-2">
            {tradeEval.recommendations.map((rec, rIdx) => (
              <div key={rIdx} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Selection Modal (Player & Future Picks) */}
      {activeModalSide && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div>
                <h3 className="font-extrabold text-white text-base font-display">Add Asset to Side {activeModalSide}</h3>
                <p className="text-xs text-slate-400">Select any player or future draft pick from your league pool.</p>
              </div>
              <button
                onClick={() => {
                  setActiveModalSide(null);
                  setPlayerSearchQuery('');
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search & Filters */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/80">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={playerSearchQuery}
                  onChange={(e) => setPlayerSearchQuery(e.target.value)}
                  placeholder="Search 220+ players by name, team, position..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>

              {/* Position Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {(['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => setPlayerPosFilter(pos)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      playerPosFilter === pos
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            {/* Players List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-[11px] font-mono uppercase text-slate-500 font-bold mb-2">Available NFL Players ({availableForSelection.length})</div>
              {availableForSelection.slice(0, 40).map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAddPlayer(activeModalSide, p.id)}
                  className="w-full p-2.5 rounded-2xl bg-slate-950/60 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-xl object-cover border border-slate-700" />
                    <div>
                      <div className="font-bold text-white text-xs">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400">{p.position} • {p.team} | Proj {p.stats.recentAveragePoints} pts</div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs">
                    <span className="text-slate-500 text-[10px] mr-1">Trade Index:</span>
                    <strong className="text-indigo-400">{p.tradeValue}</strong>
                  </div>
                </button>
              ))}

              {/* Draft Picks Section */}
              {activeModalSide !== 'C' && (
                <>
                  <div className="text-[11px] font-mono uppercase text-slate-500 font-bold mt-4 mb-2">Future Draft Picks</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FUTURE_DRAFT_PICKS.map(pk => (
                      <button
                        key={pk.id}
                        onClick={() => {
                          handleAddPick(activeModalSide, pk);
                          setActiveModalSide(null);
                        }}
                        className="p-2.5 rounded-2xl bg-slate-950/60 hover:bg-amber-600/20 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between text-xs transition-all cursor-pointer text-left"
                      >
                        <span className="font-bold text-white">{pk.label}</span>
                        <span className="font-mono text-amber-400 font-bold">{pk.value} pts</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
