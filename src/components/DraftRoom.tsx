import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings, DraftPick, PlayerPosition } from '../types';
import { calculateProjection } from '../services/aiEngine';
import { 
  Trophy, 
  Sparkles, 
  RotateCcw, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Search, 
  Play
} from 'lucide-react';
import confetti from 'canvas-confetti';


interface DraftRoomProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

const INITIAL_TEAMS: Array<{ id: string; name: string; isUser: boolean; avatar: string }> = [
  { id: 'team-1', name: 'Jalen Hurts Me Daddy', isUser: false, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-2', name: 'Mahomes & Chill', isUser: false, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-3', name: 'Leo Szn', isUser: true, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-4', name: 'Bijan Mustard', isUser: false, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-5', name: 'Chase The Bag', isUser: false, avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-6', name: 'Kittle Big Town', isUser: false, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-7', name: 'Lamarable', isUser: false, avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80' },
  { id: 'team-8', name: 'Surtain Doom', isUser: false, avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&auto=format&fit=crop&q=80' },
];

export const DraftRoom: React.FC<DraftRoomProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  const totalRounds = settings.roster.qb + settings.roster.rb + settings.roster.wr + settings.roster.te + 
                      settings.roster.k + settings.roster.def + settings.roster.db + settings.roster.dl + 
                      settings.roster.lb + settings.roster.bench; // e.g. 27 rounds
  
  const [draftedPicks, setDraftedPicks] = useState<DraftPick[]>([]);
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const draftedPlayerIds = useMemo(() => draftedPicks.map(p => p.player.id), [draftedPicks]);


  // Available Players with VORP sorted
  const availablePlayers = useMemo(() => {
    return players
      .filter(p => !draftedPlayerIds.includes(p.id))
      .map(p => ({
        player: p,
        proj: calculateProjection(p, settings),
      }))
      .sort((a, b) => b.proj.vorpValue - a.proj.vorpValue || b.proj.projectedPoints - a.proj.projectedPoints);
  }, [players, draftedPlayerIds, settings]);

  const currentPickIndex = draftedPicks.length; // 0-based
  const currentRound = Math.floor(currentPickIndex / settings.numTeams) + 1;
  const pickInRound = (currentPickIndex % settings.numTeams) + 1;
  
  // Snake Draft team determination
  const currentTeamIndex = currentRound % 2 === 1 
    ? (currentPickIndex % settings.numTeams) 
    : (settings.numTeams - 1 - (currentPickIndex % settings.numTeams));
  
  const currentTeam = INITIAL_TEAMS[currentTeamIndex] || INITIAL_TEAMS[0];
  const isUserOnTheClock = currentTeam.isUser;
  const isDraftFinished = currentPickIndex >= totalRounds * settings.numTeams;

  // AI Recommended Pick for current team
  const aiRecommendedPlayer = useMemo(() => {
    if (availablePlayers.length === 0) return null;
    return availablePlayers[0].player;
  }, [availablePlayers]);

  const handleDraftPlayer = (player: Player) => {
    if (isDraftFinished || draftedPlayerIds.includes(player.id)) return;

    const pickNum = currentPickIndex + 1;
    const proj = calculateProjection(player, settings);
    const aiGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' = proj.vorpValue >= 10 ? 'A+' : proj.vorpValue >= 5 ? 'A' : proj.vorpValue >= 0 ? 'B+' : 'B';
    const aiAnalysis = `Selected ${player.name} (${player.position} - ${player.team}) with +${proj.vorpValue} VORP rating in ${settings.name}.`;

    const newPick: DraftPick = {
      round: currentRound,
      pickNumber: pickNum,
      teamId: currentTeam.id,
      teamName: currentTeam.name,
      player,
      isUser: currentTeam.isUser,
      aiGrade,
      aiAnalysis,
    };

    setDraftedPicks(prev => [...prev, newPick]);

    if (currentTeam.isUser) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const handleAutoPickNext = () => {
    if (isDraftFinished || !aiRecommendedPlayer) return;
    handleDraftPlayer(aiRecommendedPlayer);
  };

  const handleSimulateToUserPick = () => {
    if (isDraftFinished) return;
    let nextPicks = [...draftedPicks];
    let simIndex = nextPicks.length;
    let pool = [...players.filter(p => !nextPicks.some(dp => dp.player.id === p.id))];

    while (simIndex < totalRounds * settings.numTeams) {
      const round = Math.floor(simIndex / settings.numTeams) + 1;
      const teamIdx = round % 2 === 1 
        ? (simIndex % settings.numTeams) 
        : (settings.numTeams - 1 - (simIndex % settings.numTeams));
      const team = INITIAL_TEAMS[teamIdx];

      // If it's user's turn and we've advanced at least once, stop and let user pick
      if (team.isUser && simIndex > draftedPicks.length) {
        break;
      }

      // Pick best available player for team
      const bestPlayer = pool[0];
      if (!bestPlayer) break;

      const proj = calculateProjection(bestPlayer, settings);
      const pickNum = simIndex + 1;
      const newPick: DraftPick = {
        round,
        pickNumber: pickNum,
        teamId: team.id,
        teamName: team.name,
        player: bestPlayer,
        isUser: team.isUser,
        aiGrade: proj.vorpValue >= 10 ? 'A+' : proj.vorpValue >= 5 ? 'A' : 'B+',
        aiAnalysis: `Auto-picked ${bestPlayer.name} with +${proj.vorpValue} VORP rating.`,
      };

      nextPicks.push(newPick);
      pool = pool.filter(p => p.id !== bestPlayer.id);
      simIndex++;

      // If just picked for user in step 0, continue until user's NEXT pick
      if (team.isUser && simIndex === draftedPicks.length + 1) {
        // continue
      }
    }

    setDraftedPicks(nextPicks);
  };

  const handleResetDraft = () => {
    setDraftedPicks([]);
  };

  // User's current drafted roster
  const userDraftedRoster = useMemo(() => {
    return draftedPicks.filter(p => p.isUser).map(p => p.player);
  }, [draftedPicks]);

  const userProjectedWeeklyScore = useMemo(() => {
    return userDraftedRoster.reduce((sum, p) => {
      const proj = calculateProjection(p, settings);
      return sum + proj.projectedPoints;
    }, 0);
  }, [userDraftedRoster, settings]);

  return (
    <div className="space-y-6">
      
      {/* Draft Room Super Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-indigo-400" />
              AI LIVE DRAFT ROOM
            </span>
            <span className="text-xs text-slate-400 font-mono">{settings.name}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            {isDraftFinished ? '🎉 Draft Complete!' : isUserOnTheClock ? '🚨 YOU ARE ON THE CLOCK!' : `${currentTeam.name} is on the clock`}
          </h2>

          <div className="text-xs text-slate-300 flex items-center gap-3 font-mono">
            <span>Round <strong className="text-white">{currentRound}</strong> of {totalRounds}</span>
            <span>•</span>
            <span>Overall Pick: <strong className="text-emerald-400">#{currentPickIndex + 1}</strong></span>
            <span>•</span>
            <span>Pick in Round: <strong className="text-indigo-400">#{pickInRound}</strong></span>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isDraftFinished && (
            <>
              <button
                onClick={handleAutoPickNext}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-indigo-400" />
                Auto-Pick 1
              </button>

              <button
                onClick={handleSimulateToUserPick}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                Simulate to My Next Pick
              </button>
            </>
          )}

          <button
            onClick={handleResetDraft}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
            title="Reset Draft"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Strategy & Best Available Banner */}
      {!isDraftFinished && aiRecommendedPlayer && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono font-bold">
              <Sparkles className="w-4 h-4" />
              <span>AI TOP RECOMMENDATION (VORP CALCULATED)</span>
            </div>
            <div className="text-lg font-bold text-white font-display flex items-center gap-2">
              <span>Draft <strong>{aiRecommendedPlayer.name}</strong></span>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/40">
                +{calculateProjection(aiRecommendedPlayer, settings).vorpValue} VORP
              </span>
              <span className="text-xs text-slate-400">({aiRecommendedPlayer.position} • {aiRecommendedPlayer.team})</span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              {settings.roster.qb >= 3 && aiRecommendedPlayer.position === 'QB'
                ? `In an 8-team league starting 3 QBs (24 starting QBs total), locking in elite QB volume early is mathematically mandatory.`
                : `Highest Value-Over-Replacement score on the board. Projected for ${calculateProjection(aiRecommendedPlayer, settings).projectedPoints} points.`}
            </p>
          </div>

          <button
            onClick={() => handleDraftPlayer(aiRecommendedPlayer)}
            className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Draft {aiRecommendedPlayer.name}</span>
          </button>
        </div>
      )}

      {/* Main Draft Area (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Available Players Board (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Sub Navigation & Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            {/* Position Badges */}
            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {(['ALL', 'QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'DB', 'K', 'DEF'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`px-2.5 py-1 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer ${
                    positionFilter === pos
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search player..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Available Players Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-800 glass-panel">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Rank / Player</th>
                  <th className="p-3.5">Pos</th>
                  <th className="p-3.5">ADP</th>
                  <th className="p-3.5">VORP ({settings.name})</th>
                  <th className="p-3.5">Proj Pts</th>
                  <th className="p-3.5">Anytime TD</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {availablePlayers
                  .filter(({ player }) => positionFilter === 'ALL' || player.position === positionFilter)
                  .filter(({ player }) => player.name.toLowerCase().includes(searchFilter.toLowerCase()) || player.team.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(({ player, proj }, idx) => (
                    <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-3">
                        <span className="font-mono text-slate-500 text-xs w-5">#{idx + 1}</span>
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <span 
                            onClick={() => onSelectPlayerDetail(player)}
                            className="hover:text-emerald-400 cursor-pointer transition-colors"
                          >
                            {player.name}
                          </span>
                          <div className="text-[10px] font-mono text-slate-400 font-normal">{player.team} • #{player.jerseyNumber}</div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          player.position === 'QB' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                          player.position === 'RB' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          player.position === 'WR' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                          player.position === 'TE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {player.position}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-400">
                        {player.adp}
                      </td>

                      <td className="p-3.5 font-mono font-bold text-emerald-400">
                        +{proj.vorpValue}
                      </td>

                      <td className="p-3.5 font-mono font-black text-slate-100">
                        {proj.projectedPoints} pts
                      </td>

                      <td className="p-3.5 font-mono text-slate-300">
                        {player.vegas.props.anytimeTDOdds}
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDraftPlayer(player)}
                          disabled={isDraftFinished}
                          className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold font-mono text-xs border border-emerald-500/40 transition-all cursor-pointer"
                        >
                          Draft
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: "Leo Szn" Live Roster Status */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-3xl space-y-4 border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base font-display flex items-center gap-2">
                  <span>{settings.userTeamName}'s Roster</span>
                </h3>
                <div className="text-xs text-slate-400 font-mono">
                  {userDraftedRoster.length} / {totalRounds} Players Picked
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400 uppercase">WEEKLY PROJ</div>
                <div className="text-lg font-black text-emerald-400">{userProjectedWeeklyScore.toFixed(1)} pts</div>
              </div>
            </div>

            {/* Position Slots */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              
              {/* QBs (3 starting) */}
              <div className="space-y-1">
                <div className="text-[11px] font-mono text-indigo-400 uppercase font-bold flex justify-between">
                  <span>Quarterbacks (3 Starting)</span>
                  <span>{userDraftedRoster.filter(p => p.position === 'QB').length}/3</span>
                </div>
                {[0, 1, 2].map((idx) => {
                  const p = userDraftedRoster.filter(p => p.position === 'QB')[idx];
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                      {p ? (
                        <div className="flex items-center gap-2">
                          <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-lg object-cover" />
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({p.team})</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">QB {idx + 1} (Empty Slot)</span>
                      )}
                      {p && <span className="font-mono text-emerald-400 font-bold">{calculateProjection(p, settings).projectedPoints} pts</span>}
                    </div>
                  );
                })}
              </div>

              {/* RBs (3 starting) */}
              <div className="space-y-1 pt-2">
                <div className="text-[11px] font-mono text-emerald-400 uppercase font-bold flex justify-between">
                  <span>Running Backs (3 Starting)</span>
                  <span>{userDraftedRoster.filter(p => p.position === 'RB').length}/3</span>
                </div>
                {[0, 1, 2].map((idx) => {
                  const p = userDraftedRoster.filter(p => p.position === 'RB')[idx];
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                      {p ? (
                        <div className="flex items-center gap-2">
                          <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-lg object-cover" />
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({p.team})</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">RB {idx + 1} (Empty Slot)</span>
                      )}
                      {p && <span className="font-mono text-emerald-400 font-bold">{calculateProjection(p, settings).projectedPoints} pts</span>}
                    </div>
                  );
                })}
              </div>

              {/* WRs (5 starting) */}
              <div className="space-y-1 pt-2">
                <div className="text-[11px] font-mono text-cyan-400 uppercase font-bold flex justify-between">
                  <span>Wide Receivers (5 Starting)</span>
                  <span>{userDraftedRoster.filter(p => p.position === 'WR').length}/5</span>
                </div>
                {[0, 1, 2, 3, 4].map((idx) => {
                  const p = userDraftedRoster.filter(p => p.position === 'WR')[idx];
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                      {p ? (
                        <div className="flex items-center gap-2">
                          <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-lg object-cover" />
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({p.team})</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">WR {idx + 1} (Empty Slot)</span>
                      )}
                      {p && <span className="font-mono text-emerald-400 font-bold">{calculateProjection(p, settings).projectedPoints} pts</span>}
                    </div>
                  );
                })}
              </div>

              {/* TEs (2 starting) */}
              <div className="space-y-1 pt-2">
                <div className="text-[11px] font-mono text-amber-400 uppercase font-bold flex justify-between">
                  <span>Tight Ends (2 Starting)</span>
                  <span>{userDraftedRoster.filter(p => p.position === 'TE').length}/2</span>
                </div>
                {[0, 1].map((idx) => {
                  const p = userDraftedRoster.filter(p => p.position === 'TE')[idx];
                  return (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                      {p ? (
                        <div className="flex items-center gap-2">
                          <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-lg object-cover" />
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] font-mono text-slate-400">({p.team})</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">TE {idx + 1} (Empty Slot)</span>
                      )}
                      {p && <span className="font-mono text-emerald-400 font-bold">{calculateProjection(p, settings).projectedPoints} pts</span>}
                    </div>
                  );
                })}
              </div>

              {/* IDP & Units */}
              <div className="space-y-1 pt-2">
                <div className="text-[11px] font-mono text-purple-400 uppercase font-bold">
                  <span>IDP (DL, LB, DB) & Special Teams</span>
                </div>
                {['DL', 'LB', 'DB', 'K', 'DEF'].map((pos) => {
                  const p = userDraftedRoster.find(pl => pl.position === pos);
                  return (
                    <div key={pos} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                      {p ? (
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-300 font-mono text-[10px]">{pos}</span>
                          <span className="font-bold text-white">{p.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">{pos} (Empty Slot)</span>
                      )}
                      {p && <span className="font-mono text-emerald-400 font-bold">{calculateProjection(p, settings).projectedPoints} pts</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Live Draft Picks Ticker History */}
      {draftedPicks.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Recent Draft Picks History ({draftedPicks.length} Total Picks)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...draftedPicks].reverse().slice(0, 12).map((pick) => (
              <div key={pick.pickNumber} className={`p-3 rounded-2xl border text-xs space-y-1 ${
                pick.isUser ? 'bg-emerald-950/40 border-emerald-500/40 ring-1 ring-emerald-500/20' : 'glass-panel border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>R{pick.round} P{pick.pickNumber}</span>
                  <span className={pick.isUser ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{pick.teamName}</span>
                </div>
                <div className="font-bold text-white truncate">{pick.player.name}</div>
                <div className="text-[10px] font-mono text-slate-400">{pick.player.position} • {pick.player.team}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
