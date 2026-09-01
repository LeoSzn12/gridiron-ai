import React, { useState, useMemo, useEffect } from 'react';
import type { Player, LeagueSettings, DraftPick, PlayerPosition } from '../types';
import { calculateProjection } from '../services/aiEngine';
import { 
  Trophy, 
  RotateCcw, 
  Layers, 
  Zap, 
  Search, 
  Play,
  Pause,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DraftRoomProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
}

const INITIAL_TEAM_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
];

export const DraftRoom: React.FC<DraftRoomProps> = ({
  players,
  settings,
  onSelectPlayerDetail,
}) => {
  // Total roster slots per team
  const totalRounds = useMemo(() => {
    return (
      (settings.roster.qb || 0) +
      (settings.roster.rb || 0) +
      (settings.roster.wr || 0) +
      (settings.roster.te || 0) +
      (settings.roster.k || 0) +
      (settings.roster.def || 0) +
      (settings.roster.db || 0) +
      (settings.roster.dl || 0) +
      (settings.roster.lb || 0) +
      (settings.roster.bench || 0)
    ) || 16;
  }, [settings.roster]);

  // User draft position (0-based index, defaults to 0)
  const [userDraftSlot, setUserDraftSlot] = useState<number>(0);
  const [draftedPicks, setDraftedPicks] = useState<DraftPick[]>([]);
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isAutoDrafting, setIsAutoDrafting] = useState<boolean>(false);

  // Dynamic Teams List
  const teams = useMemo(() => {
    const defaultNames = [
      'Mahomes & Chill', 'Jalen Hurts Me Daddy', 'Bijan Mustard', 
      'Chase The Bag', 'Kittle Big Town', 'Lamarable', 
      'Surtain Doom', 'Caleb & Able', 'Nabers In Paris',
      'Stroud 9', 'Allen Wrench', 'Dak To The Future'
    ];
    return Array.from({ length: settings.numTeams }).map((_, idx) => ({
      id: `team-${idx + 1}`,
      slot: idx + 1,
      name: idx === userDraftSlot ? (settings.userTeamName || 'My Team (You)') : (defaultNames[idx % defaultNames.length]),
      isUser: idx === userDraftSlot,
      avatar: INITIAL_TEAM_AVATARS[idx % INITIAL_TEAM_AVATARS.length],
    }));
  }, [settings.numTeams, settings.userTeamName, userDraftSlot]);

  const draftedPlayerIds = useMemo(() => new Set(draftedPicks.map(p => p.player.id)), [draftedPicks]);

  // Available Players with live VORP calculation
  const availablePlayers = useMemo(() => {
    return players
      .filter(p => !draftedPlayerIds.has(p.id))
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
  const currentTeamIndex = useMemo(() => {
    if (currentPickIndex >= totalRounds * settings.numTeams) return 0;
    return currentRound % 2 === 1 
      ? (currentPickIndex % settings.numTeams) 
      : (settings.numTeams - 1 - (currentPickIndex % settings.numTeams));
  }, [currentPickIndex, currentRound, settings.numTeams, totalRounds]);

  const currentTeam = teams[currentTeamIndex] || teams[0];
  const isUserOnTheClock = currentTeam.isUser && currentPickIndex < totalRounds * settings.numTeams;
  const isDraftFinished = currentPickIndex >= totalRounds * settings.numTeams;

  // AI Recommended Pick for team on clock
  const aiRecommendedPlayer = useMemo(() => {
    if (availablePlayers.length === 0) return null;
    return availablePlayers[0].player;
  }, [availablePlayers]);

  // Core Draft Action
  const handleDraftPlayer = (player: Player) => {
    if (isDraftFinished || draftedPlayerIds.has(player.id)) return;

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

  // Auto-Draft loop
  useEffect(() => {
    if (!isAutoDrafting || isDraftFinished || isUserOnTheClock) {
      return;
    }

    const timer = setTimeout(() => {
      if (aiRecommendedPlayer) {
        handleDraftPlayer(aiRecommendedPlayer);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
    };
  });

  // Simulate to User's next pick
  const handleSimulateToUserPick = () => {
    if (isDraftFinished) return;
    setIsAutoDrafting(true);
  };

  // Reset Draft
  const handleResetDraft = () => {
    setIsAutoDrafting(false);
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

  // Dynamic Roster Slots Breakdown
  const rosterSlotGroups = useMemo(() => {
    const groups: Array<{ pos: PlayerPosition | 'BENCH'; label: string; count: number; color: string }> = [];
    if (settings.roster.qb > 0) groups.push({ pos: 'QB', label: `Quarterbacks (${settings.roster.qb})`, count: settings.roster.qb, color: 'text-indigo-400' });
    if (settings.roster.rb > 0) groups.push({ pos: 'RB', label: `Running Backs (${settings.roster.rb})`, count: settings.roster.rb, color: 'text-emerald-400' });
    if (settings.roster.wr > 0) groups.push({ pos: 'WR', label: `Wide Receivers (${settings.roster.wr})`, count: settings.roster.wr, color: 'text-cyan-400' });
    if (settings.roster.te > 0) groups.push({ pos: 'TE', label: `Tight Ends (${settings.roster.te})`, count: settings.roster.te, color: 'text-amber-400' });
    if (settings.roster.k > 0) groups.push({ pos: 'K', label: `Kicker (${settings.roster.k})`, count: settings.roster.k, color: 'text-rose-400' });
    if (settings.roster.def > 0) groups.push({ pos: 'DEF', label: `Defense (${settings.roster.def})`, count: settings.roster.def, color: 'text-purple-400' });
    if (settings.roster.dl > 0) groups.push({ pos: 'DL', label: `Defensive Line (${settings.roster.dl})`, count: settings.roster.dl, color: 'text-teal-400' });
    if (settings.roster.lb > 0) groups.push({ pos: 'LB', label: `Linebackers (${settings.roster.lb})`, count: settings.roster.lb, color: 'text-blue-400' });
    if (settings.roster.db > 0) groups.push({ pos: 'DB', label: `Defensive Backs (${settings.roster.db})`, count: settings.roster.db, color: 'text-violet-400' });
    if (settings.roster.bench > 0) groups.push({ pos: 'BENCH', label: `Bench (${settings.roster.bench})`, count: settings.roster.bench, color: 'text-slate-400' });
    return groups;
  }, [settings.roster]);

  return (
    <div className="space-y-6">
      
      {/* Draft Room Super Header */}
      <div className={`rounded-3xl p-6 border transition-all shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
        isUserOnTheClock 
          ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950/80 border-emerald-500/80 ring-2 ring-emerald-500/30'
          : 'bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-950 border-slate-800'
      }`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-indigo-400" />
              AI LIVE DRAFT ROOM
            </span>
            <span className="text-xs text-slate-400 font-mono">[{settings.name}]</span>
            <span className="text-xs text-emerald-400 font-mono font-bold">
              {settings.numTeams} Teams • {totalRounds} Rounds
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-display flex items-center gap-3">
            {isDraftFinished ? (
              <span>🎉 Draft Complete!</span>
            ) : isUserOnTheClock ? (
              <span className="text-emerald-300 animate-pulse flex items-center gap-2">
                <span>🚨 YOU ARE ON THE CLOCK!</span>
              </span>
            ) : (
              <span>{currentTeam.name} is on the clock (Pick #{currentPickIndex + 1})</span>
            )}
          </h2>

          <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3 font-mono">
            <span>Round: <strong className="text-white font-bold">{currentRound}</strong> / {totalRounds}</span>
            <span>•</span>
            <span>Pick in Round: <strong className="text-indigo-400 font-bold">#{pickInRound}</strong></span>
            <span>•</span>
            <span>Overall Pick: <strong className="text-emerald-400 font-bold">#{currentPickIndex + 1}</strong></span>
            <span>•</span>
            <span>Your Slot: 
              <select
                value={userDraftSlot}
                onChange={(e) => {
                  setUserDraftSlot(parseInt(e.target.value, 10));
                  handleResetDraft();
                }}
                className="ml-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-emerald-300 font-mono focus:outline-none"
              >
                {Array.from({ length: settings.numTeams }).map((_, idx) => (
                  <option key={idx} value={idx}>Pick #{idx + 1}</option>
                ))}
              </select>
            </span>
          </div>
        </div>

        {/* Draft Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!isDraftFinished && (
            <>
              {isAutoDrafting ? (
                <button
                  onClick={() => setIsAutoDrafting(false)}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Draft</span>
                </button>
              ) : (
                <button
                  onClick={handleSimulateToUserPick}
                  className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/30"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>{currentPickIndex === 0 ? 'Start Live Draft' : 'Resume Draft'}</span>
                </button>
              )}

              {aiRecommendedPlayer && (
                <button
                  onClick={() => handleDraftPlayer(aiRecommendedPlayer)}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-emerald-600/30"
                  title="Draft top AI recommendation"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{isUserOnTheClock ? 'Take AI Recommendation' : 'Auto-Pick Next'}</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={handleResetDraft}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all"
            title="Reset Draft Board"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Draft Action Center Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Available Players & Live Draft Ticker */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Top Recommendation Banner */}
          {aiRecommendedPlayer && !isDraftFinished && (
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/40 border border-emerald-500/50 shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={aiRecommendedPlayer.avatar}
                  alt={aiRecommendedPlayer.name}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500/60 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase">
                      AI #1 BEST AVAILABLE
                    </span>
                    <span className="text-xs font-mono text-slate-400">{aiRecommendedPlayer.position} • {aiRecommendedPlayer.team}</span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white font-display mt-0.5 flex items-center gap-2">
                    <span>{aiRecommendedPlayer.name}</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      (+{calculateProjection(aiRecommendedPlayer, settings).vorpValue} VORP)
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDraftPlayer(aiRecommendedPlayer)}
                className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
              >
                Draft Player
              </button>
            </div>
          )}

          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap gap-1">
              {(['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'DL', 'LB', 'DB'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                    positionFilter === pos
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Available Players Table */}
          <div className="overflow-x-auto rounded-3xl border border-slate-800 glass-panel max-h-[550px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3.5">Rank / Player</th>
                  <th className="p-3.5">Pos</th>
                  <th className="p-3.5">VORP</th>
                  <th className="p-3.5">Weekly Proj</th>
                  <th className="p-3.5">Implied Pts</th>
                  <th className="p-3.5 text-right">Draft</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
                {availablePlayers
                  .filter(({ player }) => positionFilter === 'ALL' || player.position === positionFilter)
                  .filter(({ player }) => player.name.toLowerCase().includes(searchFilter.toLowerCase()) || player.team.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(({ player, proj }, idx) => (
                    <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-white flex items-center gap-3">
                        <span className="text-slate-500 text-xs w-5">#{idx + 1}</span>
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <span 
                            onClick={() => onSelectPlayerDetail(player)}
                            className="hover:text-emerald-400 cursor-pointer transition-colors font-sans text-xs font-bold"
                          >
                            {player.name}
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal">{player.team} • #{player.jerseyNumber}</div>
                        </div>
                      </td>

                      <td className="p-3.5">
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

                      <td className="p-3.5 font-bold text-emerald-400">
                        +{proj.vorpValue}
                      </td>

                      <td className="p-3.5 font-black text-slate-100">
                        {proj.projectedPoints} pts
                      </td>

                      <td className="p-3.5 text-slate-300">
                        {player.vegas.impliedTeamTotal} pts
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDraftPlayer(player)}
                          disabled={isDraftFinished}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
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

        {/* Right Column: User's Drafted Roster & Dynamic Roster Slots */}
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-3xl space-y-4 border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base font-display flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>{settings.userTeamName}'s Roster</span>
                </h3>
                <div className="text-xs text-slate-400 font-mono">
                  {userDraftedRoster.length} / {totalRounds} Picks Made
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400 uppercase">WEEKLY PROJ</div>
                <div className="text-lg font-black text-emerald-400">{userProjectedWeeklyScore.toFixed(1)} pts</div>
              </div>
            </div>

            {/* Dynamic Position Slots */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {rosterSlotGroups.map((group, gIdx) => {
                const draftedInPos = group.pos === 'BENCH' 
                  ? userDraftedRoster.slice(totalRounds - (settings.roster.bench || 0))
                  : userDraftedRoster.filter(p => p.position === group.pos);

                return (
                  <div key={gIdx} className="space-y-1.5">
                    <div className={`text-[11px] font-mono font-bold uppercase flex justify-between ${group.color}`}>
                      <span>{group.label}</span>
                      <span>{draftedInPos.length}/{group.count}</span>
                    </div>

                    {Array.from({ length: group.count }).map((_, slotIdx) => {
                      const p = draftedInPos[slotIdx];
                      return (
                        <div 
                          key={slotIdx} 
                          className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                        >
                          {p ? (
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-lg object-cover shrink-0" />
                              <span className="font-bold text-white truncate">{p.name}</span>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">({p.team})</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-[11px]">{group.pos} {slotIdx + 1} (Empty Slot)</span>
                          )}

                          {p && (
                            <span className="font-mono text-emerald-400 font-bold shrink-0 ml-2">
                              {calculateProjection(p, settings).projectedPoints} pts
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Live Draft Picks History Ticker */}
      {draftedPicks.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Draft Picks Feed ({draftedPicks.length} Total Picks)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[...draftedPicks].reverse().slice(0, 12).map((pick) => (
              <div 
                key={pick.pickNumber} 
                className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                  pick.isUser 
                    ? 'bg-emerald-950/50 border-emerald-500/50 ring-1 ring-emerald-500/30' 
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>R{pick.round} P{pick.pickNumber}</span>
                  <span className={pick.isUser ? 'text-emerald-400 font-bold' : 'text-slate-400 truncate max-w-[80px]'}>
                    {pick.teamName}
                  </span>
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
