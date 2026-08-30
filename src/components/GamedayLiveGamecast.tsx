import React, { useState } from 'react';
import type { Player, LeagueSettings, SimulatedPlay } from '../types';
import { 
  Play, 
  RotateCcw, 
  Zap, 
  Flame, 
  Clock, 
  Radio 
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GamedayLiveGamecastProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail?: (player: Player) => void;
}


const SAMPLE_PLAYS: SimulatedPlay[] = [
  {
    id: 'play-1',
    quarter: 1,
    clock: '12:44',
    down: 1,
    yardsToGo: 10,
    yardline: 75,
    possessionTeam: 'BAL',
    description: 'Lamar Jackson complete deep middle to Mark Andrews for 28 yards to the CIN 47.',
    isRedZone: false,
    isTouchdown: false,
    isTurnover: false,
    isSack: false,
    fantasyImpact: { playerName: 'Lamar Jackson', pointsAdded: 0.56, actionType: '28 Pass Yds' },
  },
  {
    id: 'play-2',
    quarter: 1,
    clock: '09:12',
    down: 2,
    yardsToGo: 4,
    yardline: 14,
    possessionTeam: 'BAL',
    description: '🚨 RED ZONE TOUCHDOWN! Lamar Jackson scrambles right and dives inside the pylon for a 14-yard Rushing Touchdown!',
    isRedZone: true,
    isTouchdown: true,
    isTurnover: false,
    isSack: false,
    fantasyImpact: { playerName: 'Lamar Jackson', pointsAdded: 6.7, actionType: '14 Rush Yds + TD (6 pts)' },
  },
  {
    id: 'play-3',
    quarter: 2,
    clock: '11:05',
    down: 3,
    yardsToGo: 8,
    yardline: 38,
    possessionTeam: 'DAL',
    description: '🛡️ SACK & STRIP! Maxx Crosby beats the right tackle and brings down the QB for an 8-yard loss!',
    isRedZone: false,
    isTouchdown: false,
    isTurnover: false,
    isSack: true,
    fantasyImpact: { playerName: 'Maxx Crosby', pointsAdded: 2.0, actionType: '1.0 IDP Sack (2 pts)' },
  },
  {
    id: 'play-4',
    quarter: 2,
    clock: '04:30',
    down: 1,
    yardsToGo: 10,
    yardline: 8,
    possessionTeam: 'PHI',
    description: '🚨 TOUCHDOWN! Saquon Barkley takes the handoff up the middle, breaks two tackles for an 8-yard Touchdown run!',
    isRedZone: true,
    isTouchdown: true,
    isTurnover: false,
    isSack: false,
    fantasyImpact: { playerName: 'Saquon Barkley', pointsAdded: 6.4, actionType: '8 Rush Yds + TD (6 pts)' },
  },
  {
    id: 'play-5',
    quarter: 3,
    clock: '07:22',
    down: 2,
    yardsToGo: 6,
    yardline: 42,
    possessionTeam: 'CIN',
    description: 'Ja\'Marr Chase catches a quick slant, eludes the safety and explodes for a 58-yard Receiving Touchdown!',
    isRedZone: false,
    isTouchdown: true,
    isTurnover: false,
    isSack: false,
    fantasyImpact: { playerName: 'Ja\'Marr Chase', pointsAdded: 8.9, actionType: '58 Rec Yds + TD (6 pts)' },
  },
  {
    id: 'play-6',
    quarter: 4,
    clock: '02:00',
    down: 4,
    yardsToGo: 2,
    yardline: 39,
    possessionTeam: 'DAL',
    description: '🎯 FIELD GOAL MADE! Brandon Aubrey drills a 57-yard Field Goal right down the middle with room to spare!',
    isRedZone: false,
    isTouchdown: false,
    isTurnover: false,
    isSack: false,
    fantasyImpact: { playerName: 'Brandon Aubrey', pointsAdded: 5.0, actionType: '57-yd FG (5 pts)' },
  },
];

export const GamedayLiveGamecast: React.FC<GamedayLiveGamecastProps> = ({
  settings: _settings,
}) => {
  const [playIndex, setPlayIndex] = useState<number>(1);


  const visiblePlays = SAMPLE_PLAYS.slice(0, playIndex);
  const currentPlay = visiblePlays[visiblePlays.length - 1] || SAMPLE_PLAYS[0];

  // Calculate live fantasy points
  const userLivePoints = visiblePlays.reduce((sum, p) => sum + p.fantasyImpact.pointsAdded, 118.4);
  const oppLivePoints = 112.0 + (playIndex * 3.4);

  const handleNextPlay = () => {
    if (playIndex < SAMPLE_PLAYS.length) {
      setPlayIndex(prev => prev + 1);
      const nextPlay = SAMPLE_PLAYS[playIndex];
      if (nextPlay?.isTouchdown) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    }
  };

  const handleFastForwardAll = () => {
    setPlayIndex(SAMPLE_PLAYS.length);
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.6 },
    });
  };

  const handleReset = () => {
    setPlayIndex(1);
  };

  return (
    <div className="space-y-6">
      
      {/* Gameday Super Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
              LIVE NFL GAMEDAY SIMULATOR
            </span>
            <span className="text-xs text-slate-400 font-mono">Week 10 Sunday Slate</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Real-Time Drive Tracker & Scoring Gamecast
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Simulates Sunday live drive progression, red zone triggers, 4th-down conversion odds, and instantaneous fantasy point updates.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleNextPlay}
            disabled={playIndex >= SAMPLE_PLAYS.length}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>Simulate Next Play</span>
          </button>

          <button
            onClick={handleFastForwardAll}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Simulate Full Slate</span>
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Reset Gamecast"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Matchup Scoreboard Bar */}
      <div className="p-5 rounded-3xl glass-panel border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* User Team */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-display font-black text-emerald-400 text-lg">
            LS
          </div>
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase">LEO SZN (YOU)</div>
            <div className="text-3xl font-black font-mono text-emerald-400">{userLivePoints.toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">pts</span></div>
          </div>
        </div>

        {/* Live Center Clock */}
        <div className="text-center px-4 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 font-mono text-xs">
          <div className="text-rose-400 font-bold flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>Q{currentPlay.quarter} • {currentPlay.clock}</span>
          </div>
          <div className="text-slate-400 text-[10px] mt-0.5">Spread: <strong className="text-emerald-400">+{(userLivePoints - oppLivePoints).toFixed(1)} pts</strong></div>
        </div>

        {/* Opponent Team */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="text-right">
            <div className="text-xs font-mono text-slate-400 uppercase">JALEN HURTS ME DADDY</div>
            <div className="text-3xl font-black font-mono text-indigo-400">{oppLivePoints.toFixed(1)} <span className="text-xs text-slate-400 font-sans font-normal">pts</span></div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-display font-black text-indigo-400 text-lg">
            JH
          </div>
        </div>

      </div>

      {/* Animated Football Field */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-[#0c1f17] p-6 text-slate-100 shadow-2xl space-y-4">
        
        {/* Field Header */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700/40">
              BALL ON: {currentPlay.possessionTeam} {currentPlay.yardline}
            </span>
            <span className="text-slate-400">{currentPlay.down}nd & {currentPlay.yardsToGo}</span>
          </div>
          {currentPlay.isRedZone && (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-600/30 text-rose-300 font-bold border border-rose-500 animate-pulse flex items-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              RED ZONE OPPORTUNITY
            </span>
          )}
        </div>

        {/* Field Graphic Visualizer */}
        <div className="relative h-28 w-full bg-emerald-950/70 rounded-2xl border-2 border-emerald-600/40 overflow-hidden flex items-center px-4">
          
          {/* Yardlines */}
          <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-25">
            {[10, 20, 30, 40, 50, 40, 30, 20, 10].map((yd, idx) => (
              <div key={idx} className="h-full border-r border-white flex flex-col justify-between py-1 text-[9px] font-mono">
                <span>{yd}</span>
                <span>{yd}</span>
              </div>
            ))}
          </div>

          {/* Red Zone Tint (Right 20% of field) */}
          <div className="absolute right-0 top-0 bottom-0 w-1/5 bg-rose-600/20 border-l border-rose-500/40 pointer-events-none"></div>

          {/* Animated Football Marker */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 flex flex-col items-center z-10"
            style={{ left: `${Math.min(92, Math.max(8, currentPlay.yardline))}%` }}
          >
            <div className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] font-mono shadow-lg shadow-amber-500/50 whitespace-nowrap mb-1">
              🏈 {currentPlay.possessionTeam}
            </div>
            <div className="w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
          </div>

        </div>

        {/* Latest Play Breakdown Card */}
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold">LATEST PLAY-BY-PLAY</div>
            <div className="text-sm font-semibold text-white">{currentPlay.description}</div>
          </div>

          {/* Fantasy Impact Badge */}
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-right shrink-0">
            <div className="text-[10px] font-mono text-emerald-300 uppercase">{currentPlay.fantasyImpact.playerName}</div>
            <div className="text-base font-black font-mono text-emerald-400">+{currentPlay.fantasyImpact.pointsAdded} pts</div>
            <div className="text-[9px] font-mono text-slate-400">{currentPlay.fantasyImpact.actionType}</div>
          </div>
        </div>

      </div>

      {/* Play-by-Play Live Feed */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Gameday Live Stream Feed ({visiblePlays.length} Plays Processed)</span>
        </h3>

        <div className="space-y-2">
          {[...visiblePlays].reverse().map((play) => (
            <div 
              key={play.id} 
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-4 transition-all ${
                play.isTouchdown 
                  ? 'bg-gradient-to-r from-emerald-950/60 to-slate-950 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-400 text-[11px] w-14 shrink-0">Q{play.quarter} {play.clock}</span>
                <span className="font-bold text-white">{play.description}</span>
              </div>

              <div className="text-right font-mono shrink-0">
                <span className="text-emerald-400 font-bold">+{play.fantasyImpact.pointsAdded} pts</span>
                <div className="text-[10px] text-slate-400">{play.fantasyImpact.playerName}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
