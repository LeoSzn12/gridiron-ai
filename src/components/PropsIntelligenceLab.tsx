import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings, PlayerPosition } from '../types';
import { calculateProjection, oddsToProbability } from '../services/aiEngine';
import {
  Target,
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';

interface PropsLabProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

type PropType = 'passing_yards' | 'rushing_yards' | 'receiving_yards' | 'receptions' | 'anytime_td' | 'passing_tds';
type DFSPlatform = 'ALL' | 'PRIZEPICKS' | 'UNDERDOG';
type EdgeFilter = 'ALL' | 'OVER_EDGE' | 'UNDER_EDGE' | 'STRONG_EDGE';

interface PlayerPropEdge {
  player: Player;
  propType: PropType;
  propLabel: string;
  line: number;
  aiProjection: number;
  edge: number;          // positive = OVER lean, negative = UNDER lean
  edgePct: number;       // percentage edge
  confidence: number;    // 0-100
  direction: 'OVER' | 'UNDER';
  matchupGrade: string;
  weatherImpact: string;
}

function getPropLabel(propType: PropType): string {
  switch (propType) {
    case 'passing_yards': return 'Pass Yards';
    case 'rushing_yards': return 'Rush Yards';
    case 'receiving_yards': return 'Rec Yards';
    case 'receptions': return 'Receptions';
    case 'anytime_td': return 'Anytime TD';
    case 'passing_tds': return 'Pass TDs';
    default: return propType;
  }
}

function getWeatherImpact(player: Player): string {
  if (player.weather.isDome) return '🏟️ Dome — No Impact';
  if (player.weather.windSpeed >= 18) return `🌪️ ${player.weather.windSpeed}mph — Heavy Downgrade`;
  if (player.weather.windSpeed >= 12) return `💨 ${player.weather.windSpeed}mph — Moderate Downgrade`;
  if (player.weather.precipitation === 'Heavy Rain') return '🌧️ Heavy Rain — Pass Downgrade';
  if (player.weather.precipitation === 'Light Rain') return '🌦️ Light Rain — Minor Risk';
  if (player.weather.precipitation === 'Snow') return '❄️ Snow — Significant Downgrade';
  return '☀️ Clear — No Impact';
}

export const PropsIntelligenceLab: React.FC<PropsLabProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  const [posFilter, setPosFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [platform, setPlatform] = useState<DFSPlatform>('ALL');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>('ALL');
  const [sortBy, _setSortBy] = useState<'edge' | 'confidence' | 'line'>('edge');

  // Build all prop edges for all players
  const allPropEdges: PlayerPropEdge[] = useMemo(() => {
    const edges: PlayerPropEdge[] = [];

    players.forEach(player => {
      const proj = calculateProjection(player, settings);
      const weatherImpact = getWeatherImpact(player);
      const isDome = player.weather.isDome;
      const windPenalty = !isDome && player.weather.windSpeed >= 15 ? 0.88 : !isDome && player.weather.windSpeed >= 10 ? 0.95 : 1.0;

      // Passing Yards
      if (player.vegas.props.passingYardsOU && player.position === 'QB') {
        const line = player.vegas.props.passingYardsOU;
        // Estimate passing yards from projected fantasy points (reverse-engineer from scoring)
        const aiPassYards = (proj.projectedPoints * 0.55) * settings.offense.passYardsPerPoint * windPenalty;
        const edge = aiPassYards - line;
        const edgePct = (edge / line) * 100;
        const confidence = Math.min(92, Math.max(35, 60 + Math.abs(edgePct) * 2));

        edges.push({
          player,
          propType: 'passing_yards',
          propLabel: getPropLabel('passing_yards'),
          line,
          aiProjection: Math.round(aiPassYards * 10) / 10,
          edge: Math.round(edge * 10) / 10,
          edgePct: Math.round(edgePct * 10) / 10,
          confidence: Math.round(confidence),
          direction: edge >= 0 ? 'OVER' : 'UNDER',
          matchupGrade: player.defense.matchupGrade,
          weatherImpact,
        });
      }

      // Rushing Yards
      if (player.vegas.props.rushingYardsOU && (player.position === 'QB' || player.position === 'RB')) {
        const line = player.vegas.props.rushingYardsOU;
        const aiRushYards = player.position === 'RB'
          ? (proj.projectedPoints * 0.45) * settings.offense.rushYardsPerPoint
          : (proj.projectedPoints * 0.12) * settings.offense.rushYardsPerPoint;
        const edge = aiRushYards - line;
        const edgePct = (edge / line) * 100;
        const confidence = Math.min(90, Math.max(30, 55 + Math.abs(edgePct) * 2));

        edges.push({
          player,
          propType: 'rushing_yards',
          propLabel: getPropLabel('rushing_yards'),
          line,
          aiProjection: Math.round(aiRushYards * 10) / 10,
          edge: Math.round(edge * 10) / 10,
          edgePct: Math.round(edgePct * 10) / 10,
          confidence: Math.round(confidence),
          direction: edge >= 0 ? 'OVER' : 'UNDER',
          matchupGrade: player.defense.matchupGrade,
          weatherImpact,
        });
      }

      // Receiving Yards
      if (player.vegas.props.receivingYardsOU && (player.position === 'WR' || player.position === 'TE' || player.position === 'RB')) {
        const line = player.vegas.props.receivingYardsOU;
        const recShare = player.position === 'WR' ? 0.65 : player.position === 'TE' ? 0.55 : 0.2;
        const aiRecYards = (proj.projectedPoints * recShare) * settings.offense.recYardsPerPoint * windPenalty;
        const edge = aiRecYards - line;
        const edgePct = (edge / line) * 100;
        const confidence = Math.min(88, Math.max(30, 55 + Math.abs(edgePct) * 1.8));

        edges.push({
          player,
          propType: 'receiving_yards',
          propLabel: getPropLabel('receiving_yards'),
          line,
          aiProjection: Math.round(aiRecYards * 10) / 10,
          edge: Math.round(edge * 10) / 10,
          edgePct: Math.round(edgePct * 10) / 10,
          confidence: Math.round(confidence),
          direction: edge >= 0 ? 'OVER' : 'UNDER',
          matchupGrade: player.defense.matchupGrade,
          weatherImpact,
        });
      }

      // Receptions
      if (player.vegas.props.receptionsOU && (player.position === 'WR' || player.position === 'TE')) {
        const line = player.vegas.props.receptionsOU;
        // Estimate receptions from target share and completion rate
        const aiReceptions = player.position === 'WR'
          ? Math.max(2, (proj.projectedPoints * 0.12) * windPenalty)
          : Math.max(1.5, (proj.projectedPoints * 0.10) * windPenalty);
        const edge = aiReceptions - line;
        const edgePct = (edge / line) * 100;
        const confidence = Math.min(85, Math.max(30, 50 + Math.abs(edgePct) * 2));

        edges.push({
          player,
          propType: 'receptions',
          propLabel: getPropLabel('receptions'),
          line,
          aiProjection: Math.round(aiReceptions * 10) / 10,
          edge: Math.round(edge * 10) / 10,
          edgePct: Math.round(edgePct * 10) / 10,
          confidence: Math.round(confidence),
          direction: edge >= 0 ? 'OVER' : 'UNDER',
          matchupGrade: player.defense.matchupGrade,
          weatherImpact,
        });
      }

      // Anytime TD
      if (player.vegas.props.anytimeTDOdds && player.vegas.props.anytimeTDOdds !== 'N/A') {
        const impliedProb = oddsToProbability(player.vegas.props.anytimeTDOdds);
        // AI estimated TD probability from boom probability + RZ opportunity
        const vegasTotal = player.vegas.impliedTeamTotal;
        const posMultiplier = player.position === 'RB' ? 1.15 : player.position === 'WR' ? 0.95 : player.position === 'TE' ? 0.85 : player.position === 'QB' ? 1.05 : 0.5;
        const aiTDProb = Math.min(0.92, (proj.boomProbability / 100) * 0.6 + (vegasTotal / 100) * posMultiplier);
        const edge = aiTDProb - impliedProb;
        const edgePct = (edge / Math.max(impliedProb, 0.01)) * 100;
        const confidence = Math.min(88, Math.max(30, 55 + Math.abs(edgePct) * 1.5));

        edges.push({
          player,
          propType: 'anytime_td',
          propLabel: getPropLabel('anytime_td'),
          line: Math.round(impliedProb * 100),
          aiProjection: Math.round(aiTDProb * 100),
          edge: Math.round(edge * 100),
          edgePct: Math.round(edgePct * 10) / 10,
          confidence: Math.round(confidence),
          direction: edge >= 0 ? 'OVER' : 'UNDER',
          matchupGrade: player.defense.matchupGrade,
          weatherImpact,
        });
      }
    });

    return edges;
  }, [players, settings]);

  // Apply filters
  const filteredEdges = useMemo(() => {
    return allPropEdges
      .filter(e => {
        if (posFilter !== 'ALL' && e.player.position !== posFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          if (!e.player.name.toLowerCase().includes(q) && !e.player.team.toLowerCase().includes(q)) return false;
        }
        if (edgeFilter === 'OVER_EDGE' && e.direction !== 'OVER') return false;
        if (edgeFilter === 'UNDER_EDGE' && e.direction !== 'UNDER') return false;
        if (edgeFilter === 'STRONG_EDGE' && Math.abs(e.edgePct) < 8) return false;

        // Platform-specific: PrizePicks favors yardage props, Underdog favors all
        if (platform === 'PRIZEPICKS' && e.propType === 'passing_tds') return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'edge') return Math.abs(b.edgePct) - Math.abs(a.edgePct);
        if (sortBy === 'confidence') return b.confidence - a.confidence;
        return b.line - a.line;
      });
  }, [allPropEdges, posFilter, searchTerm, edgeFilter, platform, sortBy]);

  // Stats summary
  const overCount = filteredEdges.filter(e => e.direction === 'OVER').length;
  const underCount = filteredEdges.filter(e => e.direction === 'UNDER').length;
  const strongEdges = filteredEdges.filter(e => Math.abs(e.edgePct) >= 10).length;

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-violet-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              PLAYER PROPS INTELLIGENCE LAB
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              PrizePicks • Underdog • DFS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Props Edge Detector & DFS Board
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Compares AI projections vs sportsbook prop lines to detect exploitable OVER/UNDER edges.
            Optimized for <strong className="text-violet-400">PrizePicks</strong>, <strong className="text-amber-400">Underdog Fantasy</strong>, and player prop bets.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 shrink-0">
          <div className="text-center px-3">
            <div className="text-lg font-black text-emerald-400 font-mono">{overCount}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Over Edges</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="text-center px-3">
            <div className="text-lg font-black text-rose-400 font-mono">{underCount}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Under Edges</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="text-center px-3">
            <div className="text-lg font-black text-amber-400 font-mono">{strongEdges}</div>
            <div className="text-[10px] font-mono text-slate-400 uppercase">Strong (10%+)</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Platform Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-mono">
            {(['ALL', 'PRIZEPICKS', 'UNDERDOG'] as DFSPlatform[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                  platform === p
                    ? 'bg-violet-600 text-white font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'ALL' ? 'All Platforms' : p === 'PRIZEPICKS' ? 'PrizePicks' : 'Underdog'}
              </button>
            ))}
          </div>

          {/* Edge Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-mono">
            {([
              { id: 'ALL', label: 'All' },
              { id: 'OVER_EDGE', label: '⬆ Overs' },
              { id: 'UNDER_EDGE', label: '⬇ Unders' },
              { id: 'STRONG_EDGE', label: '🔥 Strong' },
            ] as const).map(f => (
              <button
                key={f.id}
                onClick={() => setEdgeFilter(f.id)}
                className={`px-2.5 py-1 rounded-xl cursor-pointer transition-all ${
                  edgeFilter === f.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Position Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto text-xs font-mono">
            {(['ALL', 'QB', 'RB', 'WR', 'TE'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setPosFilter(pos)}
                className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                  posFilter === pos ? 'bg-violet-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search player..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60"
            />
          </div>
        </div>
      </div>

      {/* Props Edge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredEdges.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Filter className="w-8 h-8 text-slate-600" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-display">No Props Match Your Filters</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Try adjusting your platform, position, or edge filters. Select "All" to see all available player props.
              </p>
            </div>
          </div>
        )}

        {filteredEdges.map((propEdge, idx) => {
          const isStrong = Math.abs(propEdge.edgePct) >= 10;
          const isOver = propEdge.direction === 'OVER';

          return (
            <div
              key={`${propEdge.player.id}-${propEdge.propType}-${idx}`}
              onClick={() => onSelectPlayerDetail(propEdge.player)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer space-y-4 hover:scale-[1.01] relative group shadow-xl ${
                isStrong
                  ? isOver
                    ? 'bg-gradient-to-br from-emerald-950/50 via-slate-900/90 to-slate-950 border-emerald-500/50 hover:border-emerald-400'
                    : 'bg-gradient-to-br from-rose-950/50 via-slate-900/90 to-slate-950 border-rose-500/50 hover:border-rose-400'
                  : 'glass-panel hover:border-slate-700'
              }`}
            >
              {/* Strong Edge Badge */}
              {isStrong && (
                <div className="absolute -top-2 -right-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black ${
                    isOver
                      ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                      : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                  }`}>
                    {isOver ? '🔥 STRONG OVER' : '🧊 STRONG UNDER'}
                  </span>
                </div>
              )}

              {/* Player Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={propEdge.player.avatar}
                    alt={propEdge.player.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                  />
                  <div>
                    <div className="text-sm font-extrabold text-white font-display">{propEdge.player.name}</div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{propEdge.player.position}</span>
                      <span>{propEdge.player.team} vs {propEdge.player.opponent}</span>
                    </div>
                  </div>
                </div>

                {/* Prop Type Badge */}
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900 border border-slate-700 text-violet-300 font-mono">
                  {propEdge.propLabel}
                </span>
              </div>

              {/* Prop Line vs AI Projection */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Prop Line</div>
                  <div className="text-base font-black text-white font-mono mt-1">
                    {propEdge.propType === 'anytime_td' ? `${propEdge.line}%` : propEdge.line}
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-500 uppercase">AI Proj</div>
                  <div className={`text-base font-black font-mono mt-1 ${isOver ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {propEdge.propType === 'anytime_td' ? `${propEdge.aiProjection}%` : propEdge.aiProjection}
                  </div>
                </div>

                <div className={`p-3 rounded-2xl border text-center ${
                  isOver
                    ? 'bg-emerald-950/40 border-emerald-500/40'
                    : 'bg-rose-950/40 border-rose-500/40'
                }`}>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Edge</div>
                  <div className={`text-base font-black font-mono mt-1 flex items-center justify-center gap-1 ${
                    isOver ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isOver ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {propEdge.edgePct > 0 ? '+' : ''}{propEdge.edgePct}%
                  </div>
                </div>
              </div>

              {/* Context Row */}
              <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    Matchup: <span className={`font-bold ${
                      propEdge.matchupGrade === 'A+' || propEdge.matchupGrade === 'A' ? 'text-emerald-400' :
                      propEdge.matchupGrade === 'B+' || propEdge.matchupGrade === 'B' ? 'text-blue-400' :
                      'text-amber-400'
                    }`}>{propEdge.matchupGrade}</span>
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">{propEdge.weatherImpact}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Conf:</span>
                  <div className="w-14 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        propEdge.confidence >= 75 ? 'bg-emerald-400' :
                        propEdge.confidence >= 55 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${propEdge.confidence}%` }}
                    ></div>
                  </div>
                  <span className={`font-bold ${
                    propEdge.confidence >= 75 ? 'text-emerald-400' :
                    propEdge.confidence >= 55 ? 'text-amber-400' : 'text-rose-400'
                  }`}>{propEdge.confidence}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer Footer */}
      <div className="text-center text-[10px] text-slate-500 font-mono py-2">
        ⚠️ Prop lines are from pre-game estimates. AI projections use composite factor analysis. Not gambling advice — use for informational purposes only.
      </div>
    </div>
  );
};
