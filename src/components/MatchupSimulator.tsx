import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings, MonteCarloSimulationResult } from '../types';
import { runMonteCarloSimulation } from '../services/aiEngine';
import { LEAGUE_TEAMS_ROSTERS } from '../data/mockData';
import { 
  BarChart3, 
  Sparkles, 
  RotateCcw, 
  TrendingUp, 
  ShieldAlert, 
  Flame,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MatchupSimulatorProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail?: (player: Player) => void;
  myRoster?: Player[];
  opponentRoster?: Player[];
}

export const MatchupSimulator: React.FC<MatchupSimulatorProps> = ({
  players,
  settings,
  myRoster = [],
  opponentRoster = [],
}) => {
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('team-1');
  const [simIterations] = useState<number>(10000);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // User Roster
  const userTeam = LEAGUE_TEAMS_ROSTERS.find(t => t.isUser) || LEAGUE_TEAMS_ROSTERS[2];
  const userRoster = useMemo(() => {
    if (myRoster && myRoster.length > 0) return myRoster.slice(0, 9);
    return userTeam.roster.length > 0 ? userTeam.roster : players.slice(0, 9);
  }, [myRoster, userTeam, players]);

  // Opponent Roster
  const opponentTeam = LEAGUE_TEAMS_ROSTERS.find(t => t.id === selectedOpponentId) || LEAGUE_TEAMS_ROSTERS[0];
  const activeOpponentRoster = useMemo(() => {
    if (selectedOpponentId === 'active-opp' && opponentRoster && opponentRoster.length > 0) {
      return opponentRoster.slice(0, 9);
    }
    return opponentTeam.roster.length > 0 ? opponentTeam.roster : players.slice(4, 13);
  }, [selectedOpponentId, opponentRoster, opponentTeam, players]);

  // Monte Carlo Simulation Result
  const simResult: MonteCarloSimulationResult = useMemo(() => {
    return runMonteCarloSimulation(userRoster, activeOpponentRoster, settings, simIterations);
  }, [userRoster, activeOpponentRoster, settings, simIterations]);

  const handleRerunSim = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      if (simResult.userWinProbabilityPct >= 65) {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
        });
      }
    }, 400);
  };

  const maxBucketCount = Math.max(...simResult.distributionBuckets.map(b => Math.max(b.userCount, b.opponentCount)), 1);

  return (
    <div className="space-y-6">
      
      {/* Super Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              10,000-ITERATION MONTE CARLO ENGINE
            </span>
            <span className="text-xs text-slate-400 font-mono">{settings.name}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Weekly Matchup Win Probability & Score Distribution
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulates player floor/ceiling volatility distributions, touchdown variance, and game-script paths across 10,000 simulated iterations.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRerunSim}
            disabled={isSimulating}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>Re-Run 10,000 Sims</span>
          </button>
        </div>
      </div>

      {/* Opponent Selector Cards */}
      <div className="space-y-2">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Select Week Opponent to Simulate:</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {LEAGUE_TEAMS_ROSTERS.filter(t => !t.isUser).map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedOpponentId(team.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                selectedOpponentId === team.id
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/20'
                  : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <img src={team.avatar} alt={team.name} className="w-7 h-7 rounded-xl object-cover" />
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{team.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{team.roster.length} Starters</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Head to Head Duel Super-Card */}
      <div className="rounded-3xl glass-panel border border-slate-800 p-6 space-y-6">
        
        {/* Win Probability Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between font-display text-base">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-400">{settings.userTeamName}</span>
              <span className="text-2xl font-black font-mono text-white">{simResult.userWinProbabilityPct}%</span>
            </div>
            <div className="text-xs font-mono text-slate-400 uppercase">PROJECTED WIN PROBABILITY</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black font-mono text-white">{(100 - simResult.userWinProbabilityPct).toFixed(1)}%</span>
              <span className="font-extrabold text-indigo-400">{opponentTeam.name}</span>
            </div>
          </div>

          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 shadow-sm shadow-emerald-500/50"
              style={{ width: `${simResult.userWinProbabilityPct}%` }}
            ></div>
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-700"
              style={{ width: `${100 - simResult.userWinProbabilityPct}%` }}
            ></div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>MEDIAN OUTCOME</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-black font-mono text-emerald-400">{simResult.userMedianScore} <span className="text-xs font-normal text-slate-400">pts</span></div>
                <div className="text-[11px] text-slate-400">{settings.userTeamName}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black font-mono text-indigo-400">{simResult.opponentMedianScore} <span className="text-xs font-normal text-slate-400">pts</span></div>
                <div className="text-[11px] text-slate-400">{opponentTeam.name}</div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-emerald-300/80 pt-1 border-t border-slate-800/80">
              Spread Edge: +{simResult.scoreDifferenceSpread} pts favorite
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>UPSIDE CEILING (90TH %)</span>
              <Flame className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-black font-mono text-amber-400">{simResult.userScore90thPercentile} <span className="text-xs font-normal text-slate-400">pts</span></div>
                <div className="text-[11px] text-slate-400">Boom Chance: {simResult.userBoomProbabilityPct}%</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black font-mono text-slate-400">{simResult.opponentScore90thPercentile} <span className="text-xs font-normal text-slate-400">pts</span></div>
                <div className="text-[11px] text-slate-400">Opponent Ceiling</div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-amber-300/80 pt-1 border-t border-slate-800/80">
              Multi-TD Ceiling upside potential
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>SAFETY FLOOR (10TH %)</span>
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-2xl font-black font-mono text-cyan-400">{simResult.userScore10thPercentile} <span className="text-xs font-normal text-slate-400">pts</span></div>
                <div className="text-[11px] text-slate-400">Bust Chance: {simResult.userBustProbabilityPct}%</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black font-mono text-slate-400">{simResult.opponentScore10thPercentile} <span className="text-xs font-normal text-slate-400">pts</span></div>
                <div className="text-[11px] text-slate-400">Opponent Floor</div>
              </div>
            </div>
            <div className="text-[11px] font-mono text-cyan-300/80 pt-1 border-t border-slate-800/80">
              Solid baseline prevents collapse
            </div>
          </div>

        </div>

        {/* Score Distribution Bell Curve Histogram */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Score Distribution Curves (10,000 Iterations)</span>
            </span>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span>
                <span className="text-slate-300">{settings.userTeamName}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500"></span>
                <span className="text-slate-300">{opponentTeam.name}</span>
              </span>
            </div>
          </div>

          <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-slate-800">
            {simResult.distributionBuckets.map((bucket, idx) => {
              const userHeightPct = (bucket.userCount / maxBucketCount) * 100;
              const oppHeightPct = (bucket.opponentCount / maxBucketCount) * 100;

              return (
                <div key={idx} className="flex-1 flex items-end justify-center gap-0.5 h-full group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-[10px] font-mono text-white p-1.5 rounded-lg z-20 whitespace-nowrap shadow-xl pointer-events-none">
                    <div>{bucket.scoreRange} pts</div>
                    <div className="text-emerald-400">User: {bucket.userCount} sims</div>
                    <div className="text-indigo-400">Opp: {bucket.opponentCount} sims</div>
                  </div>

                  <div 
                    className="w-1/2 bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
                    style={{ height: `${Math.max(4, userHeightPct)}%` }}
                  ></div>
                  <div 
                    className="w-1/2 bg-indigo-500/70 hover:bg-indigo-400 rounded-t transition-all"
                    style={{ height: `${Math.max(4, oppHeightPct)}%` }}
                  ></div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>{simResult.distributionBuckets[0]?.scoreRange.split('-')[0]} pts</span>
            <span>Median ~{simResult.userMedianScore} pts</span>
            <span>{simResult.distributionBuckets[simResult.distributionBuckets.length - 1]?.scoreRange.split('-')[1]} pts</span>
          </div>
        </div>

        {/* Key Insights & Tactical Drivers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/30 space-y-2">
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Key Win Drivers for Leo Szn</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5">
              {simResult.keyWinDrivers.map((driver, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-800/30 space-y-2">
            <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Key Matchup Volatility & Risks</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5">
              {simResult.keyRiskFactors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
};
