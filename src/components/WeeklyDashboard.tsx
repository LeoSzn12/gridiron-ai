import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings } from '../types';
import { calculateProjection } from '../services/aiEngine';
import { solveOptimalLineup } from '../services/lineupOptimizer';
import { analyzeUserRoster, analyzeMatchupPreview } from '../services/weeklyInsightsEngine';
import { 
  GlassPanel, 
  PositionBadge, 
  PlayerAvatar 
} from './ui';
import { 
  Sparkles, 
  Zap, 
  AlertTriangle, 
  Wind, 
  Flame, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  Radio,
  Sliders
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface WeeklyDashboardProps {
  myRoster: Player[];
  opponentRoster: Player[];
  allPlayers: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
  onOpenOptimizer: () => void;
  onOpenWeather: () => void;
  onOpenWaivers: () => void;
  onOpenAudioBriefing: () => void;
  userTeamName?: string;
  opponentTeamName?: string;
}

export const WeeklyDashboard: React.FC<WeeklyDashboardProps> = ({
  myRoster,
  opponentRoster,
  allPlayers,
  settings,
  onSelectPlayerDetail,
  onOpenOptimizer,
  onOpenWeather,
  onOpenWaivers,
  onOpenAudioBriefing,
  userTeamName = 'Leo Szn',
  opponentTeamName = 'Opponent Team',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'lineup' | 'matchup' | 'insights'>('lineup');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);

  // Compute roster report and matchup preview
  const rosterReport = useMemo(() => {
    return analyzeUserRoster(myRoster, settings);
  }, [myRoster, settings]);

  const matchupAnalysis = useMemo(() => {
    return analyzeMatchupPreview(myRoster, opponentRoster, settings);
  }, [myRoster, opponentRoster, settings]);

  // Optimal starters from Linear Solver
  const optimalResult = useMemo(() => {
    const availablePool = myRoster.length > 0 ? myRoster : allPlayers.slice(0, 25);
    return solveOptimalLineup(availablePool, availablePool, settings, 'BALANCED_ALPHA');
  }, [myRoster, allPlayers, settings]);

  const starters = optimalResult.starters;
  const starterIds = new Set(starters.map(s => s.id));
  const bench = myRoster.filter(p => !starterIds.has(p.id));

  // Filter injured starters
  const injuredStarters = useMemo(() => {
    return starters.filter(p => p.injuryStatus !== 'HEALTHY');
  }, [starters]);

  // Weather alerts for user roster games
  const userWeatherAlerts = useMemo(() => {
    return myRoster.filter(p => !p.weather.isDome && p.weather.windSpeed >= 12);
  }, [myRoster]);

  // High Vegas shootout players on my roster
  const highShootoutPlayers = useMemo(() => {
    return starters.filter(p => p.vegas.overUnder >= 48.5 || p.vegas.impliedTeamTotal >= 25);
  }, [starters]);

  const handle1ClickOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { y: 0.6 },
      });
    }, 350);
  };

  return (
    <div className="space-y-6">
      
      {/* Super Header Banner: Matchup HQ & Live Win Probability */}
      <GlassPanel accent="emerald" elevated className="p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                SUNDAY MORNING HQ • GAMEDAY COMMAND CENTER
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
                {settings.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Grade: {rosterReport.overallGrade}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              {userTeamName} <span className="text-slate-500 text-2xl font-light">vs</span> {opponentTeamName}
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {matchupAnalysis.tacticalVerdict}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handle1ClickOptimize}
              disabled={isOptimizing}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Solving LP Model...' : 'Lock Optimal Lineup'}</span>
            </button>

            <button
              onClick={onOpenOptimizer}
              className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md hover:text-white"
              title="Open Linear Programming Optimizer Solver"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>LP Solver</span>
            </button>

            <button
              onClick={onOpenAudioBriefing}
              className="px-4 py-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/30 text-purple-300 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md hover:text-white"
            >
              <Radio className="w-4 h-4 text-purple-400" />
              <span>AI Audio Podcast</span>
            </button>
          </div>
        </div>

        {/* Win Probability & Point Spread Bar */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-400 text-sm sm:text-base font-display">{userTeamName}</span>
              <span className="text-slate-400 font-bold font-mono">({matchupAnalysis.userTotalPoints} Proj Pts)</span>
            </div>

            <div className="px-3 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-white font-black text-xs sm:text-sm">
              <span className="text-emerald-400">{matchupAnalysis.winProbabilityPct}%</span> Win Probability
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold font-mono">({matchupAnalysis.opponentTotalPoints} Proj Pts)</span>
              <span className="font-bold text-rose-400 text-sm sm:text-base font-display">{opponentTeamName}</span>
            </div>
          </div>

          <div className="h-3 rounded-full bg-slate-950 overflow-hidden flex p-0.5 border border-slate-800 shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 shadow-sm"
              style={{ width: `${matchupAnalysis.winProbabilityPct}%` }}
            />
            <div 
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-700 transition-all duration-700 shadow-sm"
              style={{ width: `${100 - matchupAnalysis.winProbabilityPct}%` }}
            />
          </div>
        </div>
      </GlassPanel>

      {/* Sub-Tab Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'lineup', label: '⚡ Optimal Starting Lineup', count: starters.length },
          { id: 'matchup', label: '⚔️ Positional Matchup Breakdown', count: matchupAnalysis.keyPositionalAdvantages.length },
          { id: 'insights', label: '🧠 Tactical Insights & Health', count: rosterReport.vulnerabilities.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`
              px-4 py-2 rounded-2xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer
              ${activeSubTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'}
            `}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 2-Column Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Starters & Roster Matrix (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {activeSubTab === 'lineup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h3 className="text-base font-bold text-white font-display">Locked Starting Lineup ({starters.length})</h3>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Total: {optimalResult.totalProjectedPoints} Pts
                </span>
              </div>

              {/* Starters List */}
              <div className="space-y-2.5">
                {starters.map(player => {
                  const proj = calculateProjection(player, settings);
                  const isInjured = player.injuryStatus !== 'HEALTHY';
                  const isWindy = !player.weather.isDome && player.weather.windSpeed >= 12;

                  return (
                    <GlassPanel
                      key={player.id}
                      accent={isInjured ? 'rose' : isWindy ? 'cyan' : 'slate'}
                      hoverable
                      onClick={() => onSelectPlayerDetail(player)}
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar
                          avatarUrl={player.avatar}
                          name={player.name}
                          position={player.position}
                          team={player.team}
                          isMyTeam={true}
                          size="md"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <PositionBadge position={player.position} size="xs" />
                            <span className="text-sm font-extrabold text-white truncate hover:text-emerald-300">
                              {player.name}
                            </span>
                            {isInjured && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                {player.injuryStatus}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span>{player.opponent}</span>
                            <span>•</span>
                            <span>{player.gameTime}</span>
                            <span>•</span>
                            <span className="text-amber-400/90">{player.vegas.impliedTeamTotal} Implied Pts</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Projections & Alpha */}
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="text-base sm:text-lg font-black text-white font-mono">
                            {proj.projectedPoints} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {proj.floor} - {proj.ceiling} pts
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </div>
                    </GlassPanel>
                  );
                })}
              </div>

              {/* Bench Section */}
              {bench.length > 0 && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                      Available Bench ({bench.length})
                    </h4>
                    <span className="text-xs font-mono text-slate-400">
                      Reserve Points: {bench.reduce((sum, b) => sum + calculateProjection(b, settings).projectedPoints, 0).toFixed(1)} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bench.map(player => {
                      const proj = calculateProjection(player, settings);
                      return (
                        <div
                          key={player.id}
                          onClick={() => onSelectPlayerDetail(player)}
                          className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              avatarUrl={player.avatar}
                              name={player.name}
                              position={player.position}
                              team={player.team}
                              size="sm"
                              showTeamBadge={false}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <PositionBadge position={player.position} size="xs" />
                                <span className="text-xs font-bold text-white truncate">{player.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">{player.team} vs {player.opponent}</span>
                            </div>
                          </div>

                          <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                            {proj.projectedPoints} pts
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'matchup' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-display">Head-to-Head Positional Advantages</h3>
                <span className="text-xs font-mono text-slate-400">By Starting Role</span>
              </div>

              <div className="space-y-3">
                {matchupAnalysis.keyPositionalAdvantages.map(posAdv => (
                  <GlassPanel
                    key={posAdv.position}
                    accent={posAdv.advantage === 'USER' ? 'emerald' : posAdv.advantage === 'OPPONENT' ? 'rose' : 'slate'}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <PositionBadge position={posAdv.position} size="md" />
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{posAdv.position} Matchup</span>
                          <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold ${
                            posAdv.advantage === 'USER' ? 'bg-emerald-500/20 text-emerald-400' :
                            posAdv.advantage === 'OPPONENT' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {posAdv.advantage === 'USER' ? 'ADVANTAGE YOU' : posAdv.advantage === 'OPPONENT' ? 'ADVANTAGE OPPONENT' : 'EVEN'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-mono mt-0.5">{posAdv.summary}</p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-sm font-black text-white shrink-0">
                      {posAdv.marginPoints > 0 ? `±${posAdv.marginPoints} pts` : '0.0 pts'}
                    </div>
                  </GlassPanel>
                ))}
              </div>

              {/* X-Factor Comparison */}
              <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  X-Factor Ceiling Players
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {matchupAnalysis.xFactorPlayer && (
                    <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                      <div className="text-[11px] font-mono text-emerald-400 font-bold uppercase">Your Top Boom Ceiling</div>
                      <div className="text-sm font-extrabold text-white mt-1">{matchupAnalysis.xFactorPlayer.name}</div>
                      <div className="text-xs font-mono text-slate-300 mt-0.5">
                        Ceiling: {calculateProjection(matchupAnalysis.xFactorPlayer, settings).ceiling} pts
                      </div>
                    </div>
                  )}

                  {matchupAnalysis.dangerMatchupPlayer && (
                    <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30">
                      <div className="text-[11px] font-mono text-rose-400 font-bold uppercase">Opponent Danger Asset</div>
                      <div className="text-sm font-extrabold text-white mt-1">{matchupAnalysis.dangerMatchupPlayer.name}</div>
                      <div className="text-xs font-mono text-slate-300 mt-0.5">
                        Ceiling: {calculateProjection(matchupAnalysis.dangerMatchupPlayer, settings).ceiling} pts
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'insights' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white font-display">Tactical Roster Assessment</h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">Grade: {rosterReport.overallGrade}</span>
              </div>

              {/* Strengths */}
              <div className="p-4 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Key Roster Strengths
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {rosterReport.strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vulnerabilities */}
              <div className="p-4 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Vulnerabilities & Risk Traps
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {rosterReport.vulnerabilities.map((vul, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{vul}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tactical Recommendations */}
              <div className="p-4 rounded-3xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4" />
                  Gameday Strategic Directives
                </div>
                <ul className="space-y-1.5 text-xs text-slate-200">
                  {rosterReport.tacticalRecommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Sunday Action Alerts & Streamers (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* 1. Injury Alerts on My Roster */}
          <GlassPanel accent={injuredStarters.length > 0 ? 'rose' : 'slate'} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${injuredStarters.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
                <h4 className="text-sm font-bold text-white font-display">Active Roster Injury Flags</h4>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                injuredStarters.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {injuredStarters.length > 0 ? `${injuredStarters.length} Flags` : 'All Clear'}
              </span>
            </div>

            {injuredStarters.length > 0 ? (
              <div className="space-y-2">
                {injuredStarters.map(player => (
                  <div
                    key={player.id}
                    onClick={() => onSelectPlayerDetail(player)}
                    className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 hover:border-rose-500/50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{player.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-rose-500 text-slate-950">
                        {player.injuryStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1">
                      {player.injuryNote || `${player.name} is listed as ${player.injuryStatus}. Verify inactives before kickoff.`}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                All players in your active starting lineup are currently designated as healthy.
              </p>
            )}
          </GlassPanel>

          {/* 2. Weather Warnings for Your Games */}
          <GlassPanel accent={userWeatherAlerts.length > 0 ? 'cyan' : 'slate'} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wind className={`w-4 h-4 ${userWeatherAlerts.length > 0 ? 'text-cyan-400' : 'text-slate-400'}`} />
                <h4 className="text-sm font-bold text-white font-display">My Roster Doppler Flags</h4>
              </div>
              <button
                onClick={onOpenWeather}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>Full Radar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {userWeatherAlerts.length > 0 ? (
              <div className="space-y-2">
                {userWeatherAlerts.map(player => (
                  <div
                    key={player.id}
                    className="p-3 rounded-2xl bg-cyan-950/30 border border-cyan-500/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{player.name} ({player.team})</span>
                      <span className="text-xs font-mono font-bold text-cyan-400">{player.weather.windSpeed} mph Wind</span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                      {player.weather.stadiumName} • {player.weather.precipitation}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                No high-wind or severe weather alerts affecting games your starting players are playing in.
              </p>
            )}
          </GlassPanel>

          {/* 3. Vegas Shootout Catalysts */}
          <GlassPanel accent="gold" className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white font-display">Shootout Upside Catalysts</h4>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">Vegas O/U &gt; 48.5</span>
            </div>

            <div className="space-y-2">
              {highShootoutPlayers.slice(0, 3).map(player => (
                <div
                  key={player.id}
                  onClick={() => onSelectPlayerDetail(player)}
                  className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/25 hover:border-amber-500/40 transition-all flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-bold text-white">{player.name} ({player.position} - {player.team})</span>
                    <div className="text-[10px] font-mono text-slate-400">vs {player.opponent} • Total: {player.vegas.overUnder} pts</div>
                  </div>

                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    {player.vegas.impliedTeamTotal} Implied
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* 4. Surging Waiver Recommendations */}
          <GlassPanel accent="purple" className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h4 className="text-sm font-bold text-white font-display">Surging Waiver Targets</h4>
              </div>
              <button
                onClick={onOpenWaivers}
                className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold"
              >
                <span>FAAB Radar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Pick up breakout assets before Sunday kickoff to capitalize on snap share spikes.
            </p>

            <button
              onClick={onOpenWaivers}
              className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <span>Inspect 24h Sleeper Trending Adds</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </GlassPanel>

        </div>
      </div>

    </div>
  );
};
