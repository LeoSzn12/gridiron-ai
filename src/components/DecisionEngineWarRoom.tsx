import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings, DecisionFactorWeights, PlayerCompositeDecision } from '../types';
import { calculateCompositeDecision, compareMultiSportsbookOdds, calculateProjection } from '../services/aiEngine';
import { 
  BrainCircuit, 
  Sliders, 
  CheckCircle2, 
  RotateCcw, 
  DollarSign, 
  Wind, 
  ShieldCheck, 
  Flame, 
  Award,
  Pin,
  PinOff 
} from 'lucide-react';

import confetti from 'canvas-confetti';

import { EmptyState } from './ui';

interface DecisionEngineWarRoomProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
  onPinPlayer?: (player: Player) => void;
  pinnedPlayerIds?: string[];
  myRosterIds?: string[];
}

import { PlayerFilterBar, type PlayerFilterState } from './PlayerFilterBar';

export const DecisionEngineWarRoom: React.FC<DecisionEngineWarRoomProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
  onPinPlayer,
  pinnedPlayerIds = [],
  myRosterIds = [],
}) => {
  // Weights State
  const [weights, setWeights] = useState<DecisionFactorWeights>({
    vegasWeight: 0.30,
    matchupWeight: 0.25,
    weatherWeight: 0.15,
    schemeWeight: 0.15,
    scarcityWeight: 0.15,
  });

  const [selectedPlayerAId, setSelectedPlayerAId] = useState<string>(players[0]?.id || 'lamar-jackson');
  const [selectedPlayerBId, setSelectedPlayerBId] = useState<string>(players[1]?.id || 'jayden-daniels');
  const [activeTab, setActiveTab] = useState<'decision-matrix' | 'duel-arbitration' | 'sportsbook-compare'>('decision-matrix');
  
  const [filterState, setFilterState] = useState<PlayerFilterState>({
    searchQuery: '',
    position: 'ALL',
    team: 'ALL',
    category: 'ALL',
    sortBy: 'ALPHA',
    sortAscending: false,
  });

  // Compute decisions for all players
  const playerDecisions: PlayerCompositeDecision[] = useMemo(() => {
    return players
      .map(p => calculateCompositeDecision(p, settings, weights))
      .filter(d => {
        const originalPlayer = players.find(p => p.id === d.playerId);
        if (!originalPlayer) return false;

        // Search text
        if (filterState.searchQuery.trim()) {
          const q = filterState.searchQuery.toLowerCase().trim();
          const matchName = d.playerName.toLowerCase().includes(q);
          const matchTeam = d.team.toLowerCase().includes(q);
          const matchPos = d.position.toLowerCase() === q;
          if (!matchName && !matchTeam && !matchPos) return false;
        }

        // Team filter
        if (filterState.team !== 'ALL' && d.team !== filterState.team) {
          return false;
        }

        // Position filter
        if (filterState.position !== 'ALL') {
          if (filterState.position === 'IDP') {
            if (!['DL', 'LB', 'DB'].includes(d.position)) return false;
          } else if (d.position !== filterState.position) {
            return false;
          }
        }

        // Category filter
        if (filterState.category === 'MY_ROSTER' && !myRosterIds.includes(d.playerId)) return false;
        if (filterState.category === 'SMASH' && d.alphaIndex < 85) return false;
        if (filterState.category === 'SIT' && d.alphaIndex >= 68) return false;
        if (filterState.category === 'INJURED' && originalPlayer.injuryStatus === 'HEALTHY') return false;
        if (filterState.category === 'DOME' && !originalPlayer.weather.isDome) return false;
        if (filterState.category === 'WAIVER' && !originalPlayer.isWaiverTarget) return false;

        return true;
      })
      .sort((a, b) => {
        const pA = players.find(p => p.id === a.playerId)!;
        const pB = players.find(p => p.id === b.playerId)!;

        let diff = 0;
        switch (filterState.sortBy) {
          case 'ALPHA':
            diff = b.alphaIndex - a.alphaIndex;
            break;
          case 'PROJECTION':
            diff = b.projectedPoints - a.projectedPoints;
            break;
          case 'VORP': {
            const prA = calculateProjection(pA, settings);
            const prB = calculateProjection(pB, settings);
            diff = prB.vorpValue - prA.vorpValue;
            break;
          }
          case 'VEGAS':
            diff = (pB.vegas?.impliedTeamTotal || 0) - (pA.vegas?.impliedTeamTotal || 0);
            break;
          case 'TRADE_VALUE':
            diff = (pB.tradeValue || 0) - (pA.tradeValue || 0);
            break;
          case 'CEILING': {
            const prA = calculateProjection(pA, settings);
            const prB = calculateProjection(pB, settings);
            diff = prB.ceiling - prA.ceiling;
            break;
          }
          case 'FLOOR': {
            const prA = calculateProjection(pA, settings);
            const prB = calculateProjection(pB, settings);
            diff = prB.floor - prA.floor;
            break;
          }
        }
        return filterState.sortAscending ? -diff : diff;
      });
  }, [players, settings, weights, filterState, myRosterIds]);


  // Selected duel players
  const playerA = players.find(p => p.id === selectedPlayerAId) || players[0];
  const playerB = players.find(p => p.id === selectedPlayerBId) || players[1];

  const decisionA = useMemo(() => calculateCompositeDecision(playerA, settings, weights), [playerA, settings, weights]);
  const decisionB = useMemo(() => calculateCompositeDecision(playerB, settings, weights), [playerB, settings, weights]);

  const sportsbooksForPlayerA = useMemo(() => compareMultiSportsbookOdds(playerA), [playerA]);

  const handleResetWeights = () => {
    setWeights({
      vegasWeight: 0.30,
      matchupWeight: 0.25,
      weatherWeight: 0.15,
      schemeWeight: 0.15,
      scarcityWeight: 0.15,
    });
  };

  const handleRunDuel = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Super Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" />
              INTELLIGENT DECISION SYNTHESIS WAR ROOM
            </span>
            <span className="text-xs text-slate-400 font-mono">5-Factor Unified AI Engine</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Composite AI Decision Matrix & Start/Sit Arbiter
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Synthesizes Vegas betting lines, defensive DvP, stadium Doppler weather, offensive PROE pace, and custom 3-QB VORP scarcity into an absolute <strong>Alpha Index (0–100)</strong>.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'decision-matrix', label: 'Alpha Index Board' },
            { id: 'duel-arbitration', label: 'AI Duel Arbiter' },
            { id: 'sportsbook-compare', label: 'Sportsbook Lines' },
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

      {/* Dynamic Weight Tuning Sliders Card */}
      <div className="p-5 rounded-3xl glass-panel border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-white font-display">Multi-Factor Weight Calibration</span>
            <span className="text-xs text-slate-400 font-mono">(Tune the AI's Decision Priorities)</span>
          </div>

          <button
            onClick={handleResetWeights}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Weights</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Vegas Weight */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> Vegas Odds
              </span>
              <span className="font-mono text-white font-bold">{Math.round(weights.vegasWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weights.vegasWeight}
              onChange={(e) => setWeights({ ...weights, vegasWeight: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400">Implied total, spread & TD lines</div>
          </div>

          {/* Matchup Weight */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-indigo-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Matchup DvP
              </span>
              <span className="font-mono text-white font-bold">{Math.round(weights.matchupWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weights.matchupWeight}
              onChange={(e) => setWeights({ ...weights, matchupWeight: parseFloat(e.target.value) })}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400">EPA/play & defense vs position</div>
          </div>

          {/* Weather Weight */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <Wind className="w-3.5 h-3.5" /> Stadium Weather
              </span>
              <span className="font-mono text-white font-bold">{Math.round(weights.weatherWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={weights.weatherWeight}
              onChange={(e) => setWeights({ ...weights, weatherWeight: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400">Wind drag, rain & dome track</div>
          </div>

          {/* Scheme Weight */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Scheme & Pace
              </span>
              <span className="font-mono text-white font-bold">{Math.round(weights.schemeWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={weights.schemeWeight}
              onChange={(e) => setWeights({ ...weights, schemeWeight: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400">PROE pass rate & seconds/snap</div>
          </div>

          {/* League Scarcity Weight */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-400 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> 3-QB Scarcity
              </span>
              <span className="font-mono text-white font-bold">{Math.round(weights.scarcityWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.05"
              value={weights.scarcityWeight}
              onChange={(e) => setWeights({ ...weights, scarcityWeight: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-400">Leo Szn 50 yd/pt & VORP value</div>
          </div>

        </div>
      </div>

      {/* 1. Alpha Index Decision Board */}
      {activeTab === 'decision-matrix' && (
        <div className="space-y-4">
          <PlayerFilterBar
            filters={filterState}
            onFilterChange={setFilterState}
            totalPlayersCount={players.length}
            filteredCount={playerDecisions.length}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playerDecisions.length === 0 && (
              <div className="col-span-full">
                <EmptyState
                  title="No Players Match Your Filters"
                  description="Try adjusting your position, team, or category filters to see players in the Alpha Index board."
                  onResetFilters={() => setFilterState({ searchQuery: '', position: 'ALL', team: 'ALL', category: 'ALL', sortBy: 'ALPHA', sortAscending: false })}
                />
              </div>
            )}
            {playerDecisions.map((dec) => {
              const originalPlayer = players.find(p => p.id === dec.playerId);
              const isPinned = pinnedPlayerIds.includes(dec.playerId);

              return (
                <div
                  key={dec.playerId}
                  onClick={() => originalPlayer && onSelectPlayerDetail(originalPlayer)}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-4 hover:scale-[1.01] relative group shadow-xl ${
                    dec.recommendationTier === 'SMASH_START'
                      ? 'bg-gradient-to-br from-amber-950/30 via-slate-900/95 to-slate-950 border-amber-500/50 ring-1 ring-amber-500/30 shadow-amber-500/10'
                      : dec.recommendationTier === 'STRONG_START'
                      ? 'bg-gradient-to-br from-purple-950/30 via-slate-900/95 to-slate-950 border-purple-500/50 ring-1 ring-purple-500/30 shadow-purple-500/10'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {originalPlayer?.avatar && (
                        <img src={originalPlayer.avatar} alt={dec.playerName} className="w-12 h-12 rounded-2xl object-cover border border-slate-700 shadow-md" />
                      )}
                      <div>
                        <div className="font-extrabold text-white text-base sm:text-lg font-display tracking-tight">{dec.playerName}</div>
                        <div className="text-xs font-mono text-slate-300 font-semibold mt-0.5">{dec.position} • {dec.team} vs {dec.opponent}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Pin Button */}
                      {onPinPlayer && originalPlayer && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPinPlayer(originalPlayer);
                          }}
                          className={`p-2 rounded-xl border transition-all cursor-pointer ${
                            isPinned
                              ? 'bg-amber-500/30 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                          }`}
                          title={isPinned ? 'Unpin Player' : 'Pin to Compare'}
                        >
                          {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Alpha Rating Badge */}
                      <div className="text-right">
                        <div className="text-3xl font-black font-mono text-amber-400 leading-none">{dec.alphaIndex}</div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mt-0.5">ALPHA SCORE</div>
                      </div>
                    </div>
                  </div>

                  {/* Tier Pill & Projected Points */}
                  <div className="flex items-center justify-between text-xs py-1 border-y border-slate-800/80">
                    <span className={`px-3 py-1 rounded-xl font-mono font-extrabold text-xs ${
                      dec.recommendationTier === 'SMASH_START' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' :
                      dec.recommendationTier === 'STRONG_START' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' :
                      dec.recommendationTier === 'VOLATILE_SIT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {dec.recommendationTier.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-slate-200 text-xs sm:text-sm">
                      Proj: <strong className="text-emerald-400 text-sm sm:text-base font-black">{dec.projectedPoints} pts</strong>
                    </span>
                  </div>

                  {/* 5 Sub-Score Progress Bars */}
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-amber-300 font-semibold">💵 Vegas Line Efficiency</span>
                      <span className="text-amber-400 font-bold">{dec.subScores.vegasEfficiency}/100</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full" style={{ width: `${dec.subScores.vegasEfficiency}%` }}></div>
                    </div>

                    <div className="flex justify-between text-slate-300">
                      <span className="text-purple-300 font-semibold">🛡️ Matchup & DvP Advantage</span>
                      <span className="text-purple-400 font-bold">{dec.subScores.matchupAdvantage}/100</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full" style={{ width: `${dec.subScores.matchupAdvantage}%` }}></div>
                    </div>

                    <div className="flex justify-between text-slate-300">
                      <span className="text-cyan-300 font-semibold">🌪️ Weather & Venue Factor</span>
                      <span className="text-cyan-400 font-bold">{dec.subScores.weatherConditions}/100</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 rounded-full" style={{ width: `${dec.subScores.weatherConditions}%` }}></div>
                    </div>
                  </div>

                  {/* Key Tactical Driver */}
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold text-sm">✓</span>
                    <span className="leading-relaxed">{dec.keyPositiveFactors[0]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* 2. AI Duel Arbiter Tab */}
      {activeTab === 'duel-arbitration' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
            
            {/* Player Selection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase">Option A Player:</label>
                <select
                  value={selectedPlayerAId}
                  onChange={(e) => setSelectedPlayerAId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-bold text-white cursor-pointer focus:outline-none focus:border-emerald-500"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.position} - {p.team})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 uppercase">Option B Player:</label>
                <select
                  value={selectedPlayerBId}
                  onChange={(e) => setSelectedPlayerBId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs font-bold text-white cursor-pointer focus:outline-none focus:border-indigo-500"
                >
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.position} - {p.team})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duel Arbitration Super-Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Card A */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                decisionA.alphaIndex >= decisionB.alphaIndex
                  ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={playerA.avatar} alt={playerA.name} className="w-12 h-12 rounded-2xl object-cover" />
                    <div>
                      <div className="text-base font-extrabold text-white">{playerA.name}</div>
                      <div className="text-xs font-mono text-slate-400">{playerA.position} • {playerA.team} vs {playerA.opponent}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black font-mono text-emerald-400">{decisionA.alphaIndex}</div>
                    <div className="text-[10px] font-mono text-slate-400">ALPHA INDEX</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">PROJECTED PTS</div>
                    <div className="text-emerald-400 font-bold text-base">{decisionA.projectedPoints}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">CONFIDENCE</div>
                    <div className="text-white font-bold text-base">{decisionA.confidenceRating}%</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  {decisionA.keyPositiveFactors.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card B */}
              <div className={`p-6 rounded-3xl border space-y-4 ${
                decisionB.alphaIndex > decisionA.alphaIndex
                  ? 'bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={playerB.avatar} alt={playerB.name} className="w-12 h-12 rounded-2xl object-cover" />
                    <div>
                      <div className="text-base font-extrabold text-white">{playerB.name}</div>
                      <div className="text-xs font-mono text-slate-400">{playerB.position} • {playerB.team} vs {playerB.opponent}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black font-mono text-indigo-400">{decisionB.alphaIndex}</div>
                    <div className="text-[10px] font-mono text-slate-400">ALPHA INDEX</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">PROJECTED PTS</div>
                    <div className="text-indigo-400 font-bold text-base">{decisionB.projectedPoints}</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="text-[10px] text-slate-400">CONFIDENCE</div>
                    <div className="text-white font-bold text-base">{decisionB.confidenceRating}%</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  {decisionB.keyPositiveFactors.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Final AI Verdict Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">GRIDIRON AI OFFICIAL ARBITRATION VERDICT</div>
                <div className="text-sm font-bold text-white">
                  {decisionA.alphaIndex >= decisionB.alphaIndex 
                    ? `Start ${playerA.name} over ${playerB.name} (+${(decisionA.alphaIndex - decisionB.alphaIndex).toFixed(1)} Alpha Edge)`
                    : `Start ${playerB.name} over ${playerA.name} (+${(decisionB.alphaIndex - decisionA.alphaIndex).toFixed(1)} Alpha Edge)`}
                </div>
              </div>

              <button
                onClick={handleRunDuel}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md hover:brightness-110 cursor-pointer"
              >
                Confirm Start
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3. Sportsbook Compare Tab */}
      {activeTab === 'sportsbook-compare' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Estimated Sportsbook Line Comparison for {playerA.name}</span>
                </h3>
                <p className="text-xs text-slate-400">Estimated lines derived from base Vegas odds — not live sportsbook feeds. Use for directional comparison only.</p>
              </div>

              <select
                value={selectedPlayerAId}
                onChange={(e) => setSelectedPlayerAId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.team})</option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Sportsbook</th>
                    <th className="p-3.5">Spread</th>
                    <th className="p-3.5">Over / Under</th>
                    <th className="p-3.5">Moneyline</th>
                    <th className="p-3.5">Anytime TD Odds</th>
                    <th className="p-3.5 text-right">Value Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {sportsbooksForPlayerA.map((book) => (
                    <tr key={book.sportsbook} className="hover:bg-slate-800/40 transition-colors font-mono">
                      <td className="p-3.5 font-bold text-white font-sans">{book.sportsbook}</td>
                      <td className="p-3.5 text-emerald-400 font-bold">{book.spread} ({book.spreadOdds})</td>
                      <td className="p-3.5 text-indigo-300">O/U {book.overUnder} ({book.totalOdds})</td>
                      <td className="p-3.5 text-slate-300">{book.moneyline}</td>
                      <td className="p-3.5 text-amber-400 font-bold">{book.anytimeTDOdds}</td>
                      <td className="p-3.5 text-right font-sans">
                        {book.bestValueBadge ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {book.bestValueBadge}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Consensus</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
