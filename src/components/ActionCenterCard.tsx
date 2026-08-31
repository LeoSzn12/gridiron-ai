import React, { useMemo } from 'react';
import type { Player, LeagueSettings, ActionCenterAlert } from '../types';
import { 
  Sparkles, 
  ArrowRight,
  Zap
} from 'lucide-react';

interface ActionCenterCardProps {
  players: Player[];
  settings: LeagueSettings;
  onOpenOptimizer: () => void;
  onOpenWeather: () => void;
  onOpenWaivers: () => void;
  onSelectPlayerDetail: (player: Player) => void;
  myRoster?: Player[];
}

export const ActionCenterCard: React.FC<ActionCenterCardProps> = ({
  players,
  settings,
  onOpenOptimizer,
  onOpenWeather,
  onOpenWaivers,
  onSelectPlayerDetail,
  myRoster = [],
}) => {
  // Dynamically compute high-priority gameday action items
  const alerts: ActionCenterAlert[] = useMemo(() => {
    const list: ActionCenterAlert[] = [];
    const myIds = new Set(myRoster.map(p => p.id));
    const targetPool = myRoster.length > 0 ? myRoster : players;

    // 1. Injury Alerts
    const injuredStarters = targetPool.filter(
      p => p.injuryStatus !== 'HEALTHY'
    );

    injuredStarters.forEach(p => {
      // Find healthy replacement in same position from roster or available pool
      const replacement = (myRoster.length > 0 ? myRoster : players).find(
        r => r.position === p.position && r.injuryStatus === 'HEALTHY' && r.id !== p.id
      );

      const isOwned = myIds.has(p.id);

      list.push({
        id: `inj-${p.id}`,
        type: 'INJURY',
        severity: p.injuryStatus === 'OUT' || p.injuryStatus === 'IR' ? 'URGENT' : 'HIGH',
        title: isOwned ? `🚨 Your Roster: ${p.name} is ${p.injuryStatus}` : `🚨 Injury Alert: ${p.name} (${p.injuryStatus})`,
        description: p.injuryNote || `${p.name} is designated as ${p.injuryStatus}. Consider swapping to ${replacement?.name || 'a healthy reserve'} for guaranteed touch volume.`,
        primaryActionLabel: replacement ? `Swap with ${replacement.name}` : 'Review Position',
        player: p,
        replacementPlayer: replacement,
        timestamp: 'Live Practice Report',
      });
    });

    // 2. High Wind / Weather Traps (prioritize user roster)
    const severeWeatherPlayers = (myRoster.length > 0 ? myRoster : players).filter(
      p => !p.weather.isDome && p.weather.windSpeed >= 12 && (p.position === 'QB' || p.position === 'WR' || p.position === 'K')
    );

    if (severeWeatherPlayers.length > 0) {
      const topWind = severeWeatherPlayers[0];
      list.push({
        id: `wx-${topWind.id}`,
        type: 'WEATHER',
        severity: 'HIGH',
        title: `🌪️ Weather Wind Warning: ${topWind.weather.stadiumName}`,
        description: `${topWind.name} faces ${topWind.weather.windSpeed} mph winds with gusts up to ${topWind.weather.windGust} mph. Passing & kicking ceiling reduced by ~18%.`,
        primaryActionLabel: 'View Doppler Radar',
        player: topWind,
        timestamp: 'Live Doppler Sync',
      });
    }

    // 3. Optimal Dome Kicker / Streamer
    const domeKickers = players.filter(p => p.position === 'K' && p.weather.isDome);
    if (domeKickers.length > 0) {
      const k = domeKickers[0];
      list.push({
        id: `k-${k.id}`,
        type: 'STREAMER',
        severity: 'MODERATE',
        title: `🎯 Optimal Dome Kicker Exploit: ${k.name} (${k.team})`,
        description: `Playing in controlled climate at ${k.weather.stadiumName} with high Vegas total (${k.vegas.impliedTeamTotal} team pts). Max FG upside.`,
        primaryActionLabel: 'Start Kicker',
        player: k,
        timestamp: 'Vegas + Stadium Sync',
      });
    }

    // 4. Trending Waiver Addition
    const trendingWaiver = players.find(p => p.isWaiverTarget && p.waiverTrend === 'SURGING') || players.find(p => p.isWaiverTarget);
    if (trendingWaiver) {
      list.push({
        id: `waiver-${trendingWaiver.id}`,
        type: 'TRENDING_WAIVER',
        severity: 'INFO',
        title: `📈 Sleeper Waiver Surge: ${trendingWaiver.name} (+45% Adds)`,
        description: `${trendingWaiver.name} is the #1 trending free agent in redraft leagues following backfield snap surge. Recommended bid: $${Math.round(100 * (trendingWaiver.faabRecommendedPct / 100))} FAAB.`,
        primaryActionLabel: 'Inspect FAAB Radar',
        player: trendingWaiver,
        timestamp: 'Sleeper 24h Wire',
      });
    }

    return list;
  }, [players, myRoster]);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1326] via-[#090e1d] to-[#040711] border border-slate-700/80 p-5 sm:p-6 shadow-2xl space-y-4">
      {/* Ambient background glow mesh */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-xl shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base sm:text-lg font-black text-white font-display tracking-tight">Sunday Morning Action Command Center</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
                {alerts.length} Action Items
              </span>
            </div>
            <p className="text-xs text-slate-300 font-sans">
              Real-time priority intelligence for <strong className="text-emerald-400">{settings.name}</strong>
            </p>
          </div>
        </div>

        {/* 1-Click Lineup Optimizer Quick Button */}
        <button
          onClick={onOpenOptimizer}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Solve Optimal Lineup</span>
        </button>
      </div>

      {/* Alert Cards Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {alerts.map((alert) => {
          const isUrgent = alert.severity === 'URGENT';
          const isHigh = alert.severity === 'HIGH';

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isUrgent
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/40 hover:border-rose-400'
                  : isHigh
                  ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-950/30 hover:border-amber-400'
                  : alert.type === 'TRENDING_WAIVER'
                  ? 'bg-purple-950/30 border-purple-500/40 shadow-lg shadow-purple-950/30 hover:border-purple-400'
                  : 'bg-cyan-950/30 border-cyan-500/40 shadow-lg shadow-cyan-950/30 hover:border-cyan-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className={`px-2 py-0.5 rounded-md font-bold ${
                    isUrgent ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' :
                    isHigh ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {alert.type}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">{alert.timestamp}</span>
                </div>

                <h4 className="text-xs sm:text-sm font-extrabold text-white font-display line-clamp-1">
                  {alert.title}
                </h4>

                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                  {alert.description}
                </p>
              </div>

              {/* Action Link */}
              <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                {alert.player && (
                  <button
                    onClick={() => onSelectPlayerDetail(alert.player!)}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer font-mono transition-colors"
                  >
                    View Intel
                  </button>
                )}

                <button
                  onClick={() => {
                    if (alert.type === 'WEATHER') onOpenWeather();
                    else if (alert.type === 'TRENDING_WAIVER') onOpenWaivers();
                    else onOpenOptimizer();
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors ml-auto group"
                >
                  <span>{alert.primaryActionLabel || 'Action'}</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
