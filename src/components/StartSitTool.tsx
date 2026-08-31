import React, { useState, useMemo } from 'react';
import type { 
  Player, 
  LeagueSettings, 
  PlayerPosition 
} from '../types';
import { calculateProjection, comparePlayers } from '../services/aiEngine';
import { 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Wind, 
  DollarSign, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight,
  Flame,
  Plus,
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface StartSitToolProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
  myRoster?: Player[];
}

export const StartSitTool: React.FC<StartSitToolProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
  myRoster = [],
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(['lamar-jackson', 'jayden-daniels']);
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const selectedPlayers = useMemo(() => {
    return selectedPlayerIds
      .map(id => players.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined);
  }, [selectedPlayerIds, players]);

  // Calculations
  const projections = useMemo(() => {
    return selectedPlayers.map(p => ({
      player: p,
      proj: calculateProjection(p, settings),
    }));
  }, [selectedPlayers, settings]);

  const comparisonResult = useMemo(() => {
    if (selectedPlayers.length >= 2) {
      return comparePlayers(selectedPlayers[0], selectedPlayers[1], settings);
    }
    return null;
  }, [selectedPlayers, settings]);


  const handleAddPlayer = (id: string) => {
    if (!selectedPlayerIds.includes(id) && selectedPlayerIds.length < 4) {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
    }
    setShowAddDropdown(false);
  };

  const handleRemovePlayer = (id: string) => {
    if (selectedPlayerIds.length > 1) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#6366F1', '#F59E0B'],
    });
  };

  const recommendedWinner = useMemo(() => {
    if (!comparisonResult) return null;
    return selectedPlayers.find(p => p.id === comparisonResult.recommendedPlayerId) || selectedPlayers[0];
  }, [comparisonResult, selectedPlayers]);

  const presets = useMemo(() => {
    const list = [];
    if (myRoster.length >= 2) {
      list.push({
        label: `⭐ My Team: ${myRoster[0].name.split(' ')[1] || myRoster[0].name} vs ${myRoster[1].name.split(' ')[1] || myRoster[1].name}`,
        ids: [myRoster[0].id, myRoster[1].id],
      });
    }
    return [
      ...list,
      { label: 'QB: Lamar vs Jayden', ids: ['lamar-jackson', 'jayden-daniels'] },
      { label: 'QB: Mahomes vs Josh Allen', ids: ['patrick-mahomes', 'josh-allen'] },
      { label: 'RB: Saquon vs Bijan', ids: ['saquon-barkley', 'bijan-robinson'] },
      { label: 'WR: Jefferson vs Chase', ids: ['justin-jefferson', 'ja-marr-chase'] },
      { label: 'TE: Bowers vs Brian Thomas', ids: ['brock-bowers', 'brian-thomas-jr'] },
      { label: 'IDP: Crosby vs T.J. Watt', ids: ['maxx-crosby', 'tj-watt'] },
      { label: 'IDP: Warner vs Hamilton', ids: ['fred-warner', 'kyle-hamilton'] },
    ];
  }, [myRoster]);

  return (
    <div className="space-y-6">
      
      {/* Quick Presets & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Quick Duels:
          </span>
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPlayerIds(preset.ids)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 border border-slate-700/60 text-slate-300 transition-all whitespace-nowrap cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Position Filter */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-end sm:self-auto overflow-x-auto">
          {(['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'DEF'] as const).map(pos => (
            <button
              key={pos}
              onClick={() => setPositionFilter(pos)}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                positionFilter === pos
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>


      {/* AI Decision Super-Banner (When 2+ players compared) */}
      {comparisonResult && recommendedWinner && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/70 via-slate-900/90 to-slate-950 border border-emerald-500/40 p-6 shadow-2xl shadow-emerald-950/40">
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            
            {/* Verdict Left */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-black uppercase tracking-widest bg-emerald-500 text-slate-950 rounded-full shadow-lg shadow-emerald-500/30 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  AI RECOMMENDATION
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  Win Probability: <strong className="text-white text-sm">{comparisonResult.winProbabilityPct}%</strong>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Margin: <strong className="text-emerald-300">+{comparisonResult.confidenceMargin} pts</strong>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight flex items-center gap-3">
                <span>Start <span className="text-gradient-emerald">{recommendedWinner.name}</span></span>
                <span className="text-sm font-normal text-slate-400">({recommendedWinner.position} • {recommendedWinner.team})</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                {comparisonResult.keyDifferentiator}
              </p>
            </div>

            {/* Win Probability Gauge & Action */}
            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-800">
              <div className="text-right">
                <div className="text-xs text-slate-400 uppercase font-mono tracking-wider">Algorithmic Edge</div>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {comparisonResult.winProbabilityPct}% vs {100 - comparisonResult.winProbabilityPct}%
                </div>
                <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
                    style={{ width: `${comparisonResult.winProbabilityPct}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={triggerConfetti}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                Lock In Start
              </button>
            </div>
          </div>

          {/* Bulleted Rationale Cards */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3">
            {comparisonResult.reasoning.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Player Comparison Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Active Comparison ({selectedPlayers.length} / 4 Players)</span>
          </h3>

          {selectedPlayerIds.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setShowAddDropdown(!showAddDropdown)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add Player to Compare
              </button>

              {showAddDropdown && (
                <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-30">
                  <div className="text-[11px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider">Select Player</div>
                  {players
                    .filter(p => !selectedPlayerIds.includes(p.id))
                    .filter(p => positionFilter === 'ALL' || p.position === positionFilter)
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAddPlayer(p.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 flex items-center justify-between text-xs text-slate-200 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 font-mono w-6">{p.position}</span>
                          <span>{p.name}</span>
                          <span className="text-slate-500">({p.team})</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{p.opponent}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2 to 4 Player Columns */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedPlayers.length >= 3 ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-2'} gap-5`}>
          {projections.map(({ player, proj }) => {
            const isWinner = recommendedWinner?.id === player.id;
            return (
              <div
                key={player.id}
                className={`relative rounded-3xl transition-all duration-300 overflow-hidden flex flex-col ${
                  isWinner 
                    ? 'glass-panel-glow-emerald border-emerald-500/50 ring-1 ring-emerald-500/30' 
                    : 'glass-panel hover:border-slate-700'
                }`}
              >
                {/* Top Badge & Remove */}
                <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                      {player.position}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{player.team} • #{player.jerseyNumber}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isWinner && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        AI Pick
                      </span>
                    )}
                    {selectedPlayers.length > 1 && (
                      <button
                        onClick={() => handleRemovePlayer(player.id)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Player Profile Header */}
                <div className="p-5 space-y-4 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-md"
                        />
                        {player.injuryStatus !== 'HEALTHY' && (
                          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white border border-slate-900">
                            {player.injuryStatus.substring(0, 1)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 
                          onClick={() => onSelectPlayerDetail(player)}
                          className="text-lg font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          {player.name}
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        </h4>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <span>vs <strong className="text-slate-200">{player.opponent}</strong> ({player.isHome ? 'Home' : 'Away'})</span>
                          <span>•</span>
                          <span className="text-slate-400">{player.gameTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Big Projection Display */}
                  <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">AI Projected ({settings.name})</div>
                      <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                        {proj.projectedPoints} <span className="text-xs text-slate-400 font-sans font-normal">pts</span>
                      </div>

                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold font-mono uppercase tracking-wider ${
                        proj.verdict === 'SMASH START' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        proj.verdict === 'STRONG START' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                        proj.verdict === 'FLEX CONSIDERATION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {proj.verdict}
                      </span>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">
                        Confidence: <strong className="text-white">{proj.startConfidence}%</strong>
                      </div>
                    </div>
                  </div>

                  {/* Floor / Ceiling & Boom/Bust Meters */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      <div className="text-slate-400 text-[10px] uppercase font-mono">Floor • Ceiling</div>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        <span className="text-slate-400">{proj.floor}</span>
                        <span className="text-slate-600 mx-1.5">—</span>
                        <span className="text-indigo-400">{proj.ceiling} pts</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                      <div className="text-slate-400 text-[10px] uppercase font-mono flex items-center justify-between">
                        <span>Boom (20+)</span>
                        <Flame className="w-3 h-3 text-amber-400" />
                      </div>
                      <div className="font-mono font-bold text-amber-400 mt-0.5">
                        {proj.boomProbability}% <span className="text-slate-500 text-[10px]">chance</span>
                      </div>
                    </div>
                  </div>

                  {/* Factor Radar Bars */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/70">
                    <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                      <span>Intelligence Breakdown</span>
                      <span className="text-emerald-400 font-mono text-[10px]">Weighted Score</span>
                    </div>

                    {/* Vegas Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-indigo-400" />
                          Vegas Implied Total ({player.vegas.impliedTeamTotal} pts)
                        </span>
                        <span className="font-mono text-indigo-300">{proj.factorBreakdown.vegasScore}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${proj.factorBreakdown.vegasScore}%` }}></div>
                      </div>
                    </div>

                    {/* Defense DvP Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          Defense Matchup (#{player.defense.rankVsPosition} vs {player.position})
                        </span>
                        <span className="font-mono text-emerald-400">{proj.factorBreakdown.defenseScore}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${proj.factorBreakdown.defenseScore}%` }}></div>
                      </div>
                    </div>

                    {/* Weather Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Wind className="w-3 h-3 text-cyan-400" />
                          Weather ({player.weather.isDome ? 'Dome' : `${player.weather.windSpeed}mph wind`})
                        </span>
                        <span className="font-mono text-cyan-300">{proj.factorBreakdown.weatherScore}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${proj.factorBreakdown.weatherScore}%` }}></div>
                      </div>
                    </div>

                    {/* Scheme & Pace Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Gauge className="w-3 h-3 text-amber-400" />
                          Pace & Scheme (#{player.coaching.paceRank} pace)
                        </span>
                        <span className="font-mono text-amber-300">{proj.factorBreakdown.schemeScore}/100</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${proj.factorBreakdown.schemeScore}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Vegas Props Quick Snippet */}
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 text-xs space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Vegas Props & Odds</span>
                      <span className="text-slate-300">Spread: {player.vegas.gameSpread > 0 ? `+${player.vegas.gameSpread}` : player.vegas.gameSpread}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Anytime TD Odds:</span>
                      <span className="font-mono font-bold text-emerald-400">{player.vegas.props.anytimeTDOdds}</span>
                    </div>
                    {player.vegas.props.rushingYardsOU && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Rush Yards Line:</span>
                        <span className="font-mono text-slate-200">{player.vegas.props.rushingYardsOU} O/U</span>
                      </div>
                    )}
                    {player.vegas.props.receivingYardsOU && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Rec Yards Line:</span>
                        <span className="font-mono text-slate-200">{player.vegas.props.receivingYardsOU} O/U</span>
                      </div>
                    )}
                  </div>

                  {/* Key Edges & Risks */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Key Matchup Edge
                    </div>
                    <p className="text-xs text-slate-300 bg-emerald-950/20 border border-emerald-800/30 p-2.5 rounded-xl">
                      {proj.keyEdges[0]}
                    </p>

                    {proj.risks.length > 0 && (
                      <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1 pt-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Risk Factors
                      </div>
                    )}
                    {proj.risks.length > 0 && (
                      <p className="text-xs text-slate-300 bg-rose-950/20 border border-rose-800/30 p-2.5 rounded-xl">
                        {proj.risks[0]}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
                  <button
                    onClick={() => onSelectPlayerDetail(player)}
                    className="w-full py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Complete Intelligence Card</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
