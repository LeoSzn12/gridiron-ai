import React from 'react';
import type { Player, LeagueSettings } from '../types';
import { calculateProjection, oddsToProbability } from '../services/aiEngine';
import { 
  X, 
  Sparkles, 
  DollarSign, 
  ShieldCheck, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle, 
  CloudSun, 
  Activity 
} from 'lucide-react';

interface PlayerModalProps {
  player: Player | null;
  onClose: () => void;
  settings: LeagueSettings;
  selectedWeek?: number;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  onClose,
  settings,
  selectedWeek = 1,
}) => {
  if (!player) return null;

  const proj = calculateProjection(player, settings);
  const tdProb = Math.round(oddsToProbability(player.vegas.props.anytimeTDOdds) * 100);


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel-elevated border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Player Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pb-6 border-b border-slate-800">
          <div className="relative">
            <img
              src={player.avatar}
              alt={player.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-xl"
            />
            {player.injuryStatus !== 'HEALTHY' && (
              <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-xs font-black bg-rose-600 text-white border border-slate-950">
                {player.injuryStatus}
              </span>
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/30">
                {player.position}
              </span>
              <span className="text-xs font-semibold text-slate-400">{player.team} • #{player.jerseyNumber}</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-300">{player.gameTime}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display flex items-center gap-3">
              <span>{player.name}</span>
            </h2>

            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span>Week {selectedWeek} Matchup: <strong className="text-emerald-400">vs {player.opponent}</strong> ({player.isHome ? 'Home' : 'Away'})</span>
              <span>•</span>
              <span>Rostered: <strong className="text-white">{player.rosterPct}%</strong></span>
            </div>
          </div>

          {/* AI Verdict Badge */}
          <div className="text-right bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400">WEEK {selectedWeek} AI PROJECTION ({settings.name})</div>
            <div className="text-3xl font-black font-mono text-emerald-400">{proj.projectedPoints} <span className="text-xs text-slate-400 font-sans font-normal">pts</span></div>

            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono uppercase mt-1 ${
              proj.verdict === 'SMASH START' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              proj.verdict === 'STRONG START' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
              proj.verdict === 'FLEX CONSIDERATION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-slate-800 text-slate-400'
            }`}>
              {proj.verdict}
            </span>
          </div>
        </div>

        {/* 4 Factor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* 1. Vegas Betting Intelligence */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-indigo-400">
              <span className="flex items-center gap-1.5 font-bold">
                <DollarSign className="w-4 h-4" />
                VEGAS ODDS
              </span>
              <span>{proj.factorBreakdown.vegasScore}/100</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Team Total:</span> <strong className="text-indigo-300 font-mono">{player.vegas.impliedTeamTotal} pts</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">Game O/U:</span> <span className="text-slate-200 font-mono">{player.vegas.overUnder}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Spread:</span> <span className="text-slate-200 font-mono">{player.vegas.gameSpread > 0 ? `+${player.vegas.gameSpread}` : player.vegas.gameSpread}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Anytime TD:</span> <strong className="text-emerald-400 font-mono">{player.vegas.props.anytimeTDOdds} ({tdProb}%)</strong></div>
            </div>
          </div>

          {/* 2. Defensive DvP & EPA */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
              <span className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4" />
                DEFENSE DvP
              </span>
              <span>{proj.factorBreakdown.defenseScore}/100</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Rank vs {player.position}:</span> <strong className="text-emerald-300 font-mono">#{player.defense.rankVsPosition} ({player.defense.matchupGrade})</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">Def EPA Rank:</span> <span className="text-slate-200 font-mono">#{player.defense.epaPerPlayRank}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Pressure Rate:</span> <span className="text-slate-200 font-mono">{player.defense.pressureRatePct}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Redzone TD %:</span> <span className="text-slate-200 font-mono">{player.defense.redZoneTDAllowedPct}%</span></div>
            </div>
          </div>

          {/* 3. Weather & Stadium Radar */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
              <span className="flex items-center gap-1.5 font-bold">
                <CloudSun className="w-4 h-4" />
                WEATHER RADAR
              </span>
              <span>{proj.factorBreakdown.weatherScore}/100</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Stadium:</span> <span className="text-slate-200 truncate">{player.weather.isDome ? '🏟️ Dome' : '🌤️ Outdoor'}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Wind:</span> <span className="text-slate-200 font-mono">{player.weather.windSpeed} mph (G: {player.weather.windGust})</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Temp:</span> <span className="text-slate-200 font-mono">{player.weather.temperature}°F</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Precipitation:</span> <span className="text-slate-200">{player.weather.precipitation}</span></div>
            </div>
          </div>

          {/* 4. Coaching Scheme & Pace */}
          <div className="bg-slate-900/70 rounded-2xl p-4 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span className="flex items-center gap-1.5 font-bold">
                <Gauge className="w-4 h-4" />
                SCHEME & PACE
              </span>
              <span>{proj.factorBreakdown.schemeScore}/100</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Pace Rank:</span> <strong className="text-amber-300 font-mono">#{player.coaching.paceRank} ({player.coaching.secondsPerSnap}s)</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">PROE:</span> <span className="text-slate-200 font-mono">{player.coaching.proe > 0 ? `+${player.coaching.proe}%` : `${player.coaching.proe}%`}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Neutral Pass:</span> <span className="text-slate-200 font-mono">{player.coaching.neutralPassRate}%</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Playcaller:</span> <span className="text-slate-200 truncate">{player.coaching.headCoach}</span></div>
            </div>
          </div>
        </div>

        {/* Recent Performance Game Log */}
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Recent Game Log & Usage</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Week</th>
                  <th className="p-3">Opponent</th>
                  <th className="p-3">Snap %</th>
                  <th className="p-3">Stats Summary</th>
                  <th className="p-3 text-right">Fantasy Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                {player.recentGames.map((g, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-3 text-slate-400">W{g.week}</td>
                    <td className="p-3 font-bold text-white">vs {g.opponent}</td>
                    <td className="p-3 text-emerald-400">{g.snapPct}%</td>
                    <td className="p-3 text-slate-300 font-sans text-xs">{g.statsSummary}</td>
                    <td className="p-3 text-right font-black text-emerald-400">{g.points} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Synthesis Summary */}
        <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 space-y-2">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>AI Analytical Intelligence Verdict</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {proj.aiRecommendation}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-800/30 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Primary Advantage
              </div>
              <p className="text-slate-300 text-xs">{proj.keyEdges[0]}</p>
            </div>
            {proj.risks.length > 0 && (
              <div className="space-y-1">
                <div className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Primary Risk
                </div>
                <p className="text-slate-300 text-xs">{proj.risks[0]}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
