import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { Player, LeagueSettings, DraftPick, PlayerPosition, DraftTeam } from '../types';
import { calculateProjection, calculatePositionBaselines } from '../services/aiEngine';
import {
  analyzeLeagueDraftStrategy,
  generateDraftRecommendations,
  simulateOpponentPick,
  evaluateDraftedRoster,
  type DraftGradeReport,
} from '../services/draftStrategyService';
import { 
  Trophy, 
  RotateCcw, 
  Layers, 
  Zap, 
  Search, 
  Play, 
  Pause, 
  UserCheck,
  Brain,
  ChevronRight,
  Flame,
  ShieldAlert,
  Sparkles,
  Bot,
  Sliders,
  CheckCircle2,
  FastForward,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DraftRoomProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
  onLockRoster?: (playerIds: string[], teamName?: string) => void;
  onNavigateToTab?: (tab: string) => void;
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
  onLockRoster,
  onNavigateToTab,
}) => {
  // Navigation Sub-Tabs: 'board' | 'strategy' | 'recap'
  const [activeSubTab, setActiveSubTab] = useState<'board' | 'strategy' | 'recap'>('board');

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

  // User draft position (0-based index)
  const [userDraftSlot, setUserDraftSlot] = useState<number>(0);
  const [draftedPicks, setDraftedPicks] = useState<DraftPick[]>([]);
  const [positionFilter, setPositionFilter] = useState<PlayerPosition | 'ALL'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [isAutoDrafting, setIsAutoDrafting] = useState<boolean>(false);
  const [draftSpeedMs, setDraftSpeedMs] = useState<number>(400); // 400ms fast simulation
  const [showRecapModal, setShowRecapModal] = useState<boolean>(false);

  // Strategy Analysis
  const strategy = useMemo(() => {
    return analyzeLeagueDraftStrategy(settings, userDraftSlot, players);
  }, [settings, userDraftSlot, players]);

  // Dynamic Teams List with individual rosters
  const teams = useMemo<DraftTeam[]>(() => {
    const defaultNames = [
      'Mahomes & Chill', 'Jalen Hurts Me Daddy', 'Bijan Mustard', 
      'Chase The Bag', 'Kittle Big Town', 'Lamarable', 
      'Surtain Doom', 'Caleb & Able', 'Nabers In Paris',
      'Stroud 9', 'Allen Wrench', 'Dak To The Future'
    ];
    return Array.from({ length: settings.numTeams }).map((_, idx) => {
      const isUser = idx === userDraftSlot;
      const teamId = `team-${idx + 1}`;
      const roster = draftedPicks.filter(p => p.teamId === teamId).map(p => p.player);
      return {
        id: teamId,
        name: isUser ? (settings.userTeamName || 'Leo Szn (You)') : (defaultNames[idx % defaultNames.length]),
        isUser,
        avatar: INITIAL_TEAM_AVATARS[idx % INITIAL_TEAM_AVATARS.length],
        roster,
      };
    });
  }, [settings.numTeams, settings.userTeamName, userDraftSlot, draftedPicks]);

  const draftedPlayerIds = useMemo(() => new Set(draftedPicks.map(p => p.player.id)), [draftedPicks]);

  // True replacement baselines calculated dynamically
  const positionBaselines = useMemo(() => {
    return calculatePositionBaselines(players, settings);
  }, [players, settings]);

  const currentPickIndex = draftedPicks.length; // 0-based
  const currentRound = Math.floor(currentPickIndex / settings.numTeams) + 1;
  const pickInRound = (currentPickIndex % settings.numTeams) + 1;

  // Available Players with live VORP calculation and positional draft priority
  const availablePlayers = useMemo(() => {
    const hasTackleScoring = (settings.idp.soloTackle || 0) > 0 || (settings.idp.assistedTackle || 0) > 0;
    
    return players
      .filter(p => !draftedPlayerIds.has(p.id))
      .map(p => {
        const proj = calculateProjection(p, settings, positionBaselines);
        let draftPriorityScore = proj.vorpValue;

        if (p.position === 'QB') {
          if (settings.roster.qb >= 3) draftPriorityScore *= 1.4;
          else if (settings.roster.qb >= 2) draftPriorityScore *= 1.25;
        } else if (p.position === 'RB') {
          if (settings.roster.rb >= 3) draftPriorityScore *= 1.15;
        } else if (p.position === 'WR') {
          if (settings.roster.wr >= 5) draftPriorityScore *= 1.2;
        } else if (p.position === 'DEF' || p.position === 'K') {
          draftPriorityScore *= currentRound < 14 ? 0.1 : 0.45;
        } else if (p.position === 'DL' || p.position === 'LB' || p.position === 'DB') {
          if (!hasTackleScoring) {
            draftPriorityScore *= 0.2;
          } else {
            draftPriorityScore *= currentRound < 8 ? 0.35 : 0.8;
          }
        }

        return {
          player: p,
          proj,
          draftPriorityScore,
        };
      })
      .sort((a, b) => {
        if (positionFilter !== 'ALL') {
          return b.proj.vorpValue - a.proj.vorpValue || b.proj.projectedPoints - a.proj.projectedPoints;
        }
        return b.draftPriorityScore - a.draftPriorityScore || b.proj.vorpValue - a.proj.vorpValue || b.proj.projectedPoints - a.proj.projectedPoints;
      });
  }, [players, draftedPlayerIds, settings, positionBaselines, currentRound, positionFilter]);

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

  // User's current drafted roster
  const userDraftedRoster = useMemo(() => {
    return draftedPicks.filter(p => p.isUser).map(p => p.player);
  }, [draftedPicks]);

  // Generate Pick Recommendations
  const draftRecs = useMemo(() => {
    const rawAvailable = availablePlayers.map(a => a.player);
    return generateDraftRecommendations(
      rawAvailable,
      userDraftedRoster,
      settings,
      currentRound,
      currentPickIndex,
      userDraftSlot
    );
  }, [availablePlayers, userDraftedRoster, settings, currentRound, currentPickIndex, userDraftSlot]);

  // Draft Grade Report
  const draftGradeReport = useMemo<DraftGradeReport | null>(() => {
    if (!isDraftFinished && userDraftedRoster.length < 5) return null;
    return evaluateDraftedRoster(userDraftedRoster, draftedPicks, settings, players);
  }, [isDraftFinished, userDraftedRoster, draftedPicks, settings, players]);

  // Trigger celebration on finish
  useEffect(() => {
    if (isDraftFinished && draftedPicks.length > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      const t = setTimeout(() => setShowRecapModal(true), 200);
      return () => clearTimeout(t);
    }
  }, [isDraftFinished, draftedPicks.length]);

  // Core Draft Action
  const handleDraftPlayer = useCallback((player: Player) => {
    if (isDraftFinished || draftedPlayerIds.has(player.id)) return;

    const pickNum = currentPickIndex + 1;
    const proj = calculateProjection(player, settings, positionBaselines);
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
        particleCount: 35,
        spread: 50,
        origin: { y: 0.7 },
      });
    }
  }, [isDraftFinished, draftedPlayerIds, currentPickIndex, settings, positionBaselines, currentRound, currentTeam]);

  // Auto-Draft Simulation Loop
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAutoDrafting || isDraftFinished || isUserOnTheClock) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    timerRef.current = setTimeout(() => {
      const rawAvailable = availablePlayers.map(a => a.player);
      if (rawAvailable.length > 0) {
        const simPick = simulateOpponentPick(rawAvailable, currentTeam, settings, currentRound);
        handleDraftPlayer(simPick);
      }
    }, draftSpeedMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAutoDrafting, isDraftFinished, isUserOnTheClock, availablePlayers, currentTeam, settings, currentRound, draftSpeedMs, handleDraftPlayer]);

  // Step Single Pick
  const handleStepSinglePick = () => {
    if (isDraftFinished) return;
    const rawAvailable = availablePlayers.map(a => a.player);
    if (rawAvailable.length > 0) {
      const pick = currentTeam.isUser && draftRecs.recommendations[0]
        ? draftRecs.recommendations[0].player
        : simulateOpponentPick(rawAvailable, currentTeam, settings, currentRound);
      handleDraftPlayer(pick);
    }
  };

  // Simulate to User's next pick
  const handleSimulateToUserPick = () => {
    if (isDraftFinished) return;
    setIsAutoDrafting(true);
  };

  // Reset Draft
  const handleResetDraft = () => {
    setIsAutoDrafting(false);
    setDraftedPicks([]);
    setShowRecapModal(false);
  };

  // Fast-Forward / Complete Draft
  const handleFastForwardDraft = () => {
    let currentRoster = [...userDraftedRoster];
    let remainingPool = players.filter(p => !draftedPlayerIds.has(p.id));
    const simulatedPicks: DraftPick[] = [...draftedPicks];

    const totalPicks = totalRounds * settings.numTeams;
    let pIdx = simulatedPicks.length;

    while (pIdx < totalPicks && remainingPool.length > 0) {
      const rNum = Math.floor(pIdx / settings.numTeams) + 1;
      const roundIsOdd = rNum % 2 === 1;
      const teamIdx = roundIsOdd ? (pIdx % settings.numTeams) : (settings.numTeams - 1 - (pIdx % settings.numTeams));
      const team = teams[teamIdx] || teams[0];
      const isUser = team.isUser;

      let chosenPlayer: Player;
      if (isUser) {
        const recs = generateDraftRecommendations(remainingPool, currentRoster, settings, rNum, pIdx, userDraftSlot);
        chosenPlayer = recs.recommendations[0]?.player || remainingPool[0];
        currentRoster.push(chosenPlayer);
      } else {
        chosenPlayer = simulateOpponentPick(remainingPool, team, settings, rNum);
      }

      const proj = calculateProjection(chosenPlayer, settings, positionBaselines);
      simulatedPicks.push({
        round: rNum,
        pickNumber: pIdx + 1,
        teamId: team.id,
        teamName: team.name,
        player: chosenPlayer,
        isUser,
        aiGrade: proj.vorpValue >= 10 ? 'A+' : proj.vorpValue >= 5 ? 'A' : 'B+',
        aiAnalysis: `Auto-simulated pick: ${chosenPlayer.name}`,
      });

      remainingPool = remainingPool.filter(p => p.id !== chosenPlayer.id);
      pIdx++;
    }

    setDraftedPicks(simulatedPicks);
    setIsAutoDrafting(false);
    setShowRecapModal(true);
  };

  // Lock Roster Handler
  const handleLockRosterAndNavigate = (explicitRoster?: Player[]) => {
    const candidateRoster = explicitRoster && explicitRoster.length > 0 
      ? explicitRoster 
      : (userDraftedRoster.length > 0 ? userDraftedRoster : draftedPicks.filter(p => p.isUser).map(p => p.player));
    
    if (candidateRoster.length > 0) {
      const ids = candidateRoster.map(p => p.id);
      onLockRoster?.(ids, `${settings.userTeamName} (Mock Draft)`);
      if (onNavigateToTab) {
        onNavigateToTab('hq');
      } else if (typeof window !== 'undefined') {
        window.location.hash = 'hq';
      }
    }
  };

  // Split user's drafted roster into starters and bench based on league starting requirements
  const { startersByPos, benchPlayers } = useMemo(() => {
    const startersMap: Record<string, Player[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      K: [],
      DEF: [],
      DL: [],
      LB: [],
      DB: [],
    };
    const bench: Player[] = [];

    userDraftedRoster.forEach(p => {
      const pos = p.position;
      const maxStarters = settings.roster[pos.toLowerCase() as keyof typeof settings.roster] || 0;
      const currentList = startersMap[pos] || [];

      if (currentList.length < maxStarters) {
        currentList.push(p);
        startersMap[pos] = currentList;
      } else {
        bench.push(p);
      }
    });

    return { startersByPos: startersMap, benchPlayers: bench };
  }, [userDraftedRoster, settings.roster]);

  // Projected Weekly Score: Starters Points vs Reserve Points
  const userProjectedStarterScore = useMemo(() => {
    const allStarters = Object.values(startersByPos).flat();
    return allStarters.reduce((sum, p) => {
      const proj = calculateProjection(p, settings, positionBaselines);
      return sum + proj.projectedPoints;
    }, 0);
  }, [startersByPos, settings, positionBaselines]);

  const userProjectedBenchScore = useMemo(() => {
    return benchPlayers.reduce((sum, p) => {
      const proj = calculateProjection(p, settings, positionBaselines);
      return sum + proj.projectedPoints;
    }, 0);
  }, [benchPlayers, settings, positionBaselines]);

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
    if (settings.roster.bench > 0) {
      const benchSlotCount = Math.max(settings.roster.bench, benchPlayers.length);
      groups.push({ pos: 'BENCH', label: `Bench Reserves (${benchPlayers.length}/${settings.roster.bench})`, count: benchSlotCount, color: 'text-slate-300' });
    }
    return groups;
  }, [settings.roster, benchPlayers.length]);

  return (
    <div className="space-y-6">
      
      {/* Draft Room Navigation Hub */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('board')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'board'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-300" />
            <span>Live Draft Board</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 border border-emerald-500/40 text-emerald-300">
              Pick #{currentPickIndex + 1}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('strategy')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'strategy'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-4 h-4 text-purple-300" />
            <span>AI Strategy & Game Plan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-900/60 border border-purple-500/40 text-purple-200">
              {strategy.qbScarcityRating}
            </span>
          </button>

          {userDraftedRoster.length > 0 && (
            <button
              onClick={() => setActiveSubTab('recap')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'recap'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>Draft Recap & Grade</span>
              {draftGradeReport && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-900/60 border border-amber-500/40 text-amber-200 font-black">
                  {draftGradeReport.overallGrade}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Draft Slot Quick Selector */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">My Slot:</span>
          <select
            value={userDraftSlot}
            onChange={(e) => {
              setUserDraftSlot(parseInt(e.target.value, 10));
              handleResetDraft();
            }}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {Array.from({ length: settings.numTeams }).map((_, idx) => (
              <option key={idx} value={idx}>Pick #{idx + 1} ({teams[idx]?.name})</option>
            ))}
          </select>
        </div>
      </div>

      {/* VIEW 1: LIVE DRAFT BOARD */}
      {activeSubTab === 'board' && (
        <div className="space-y-6">
          {/* Draft Super Header Banner */}
          <div className={`rounded-3xl p-6 border transition-all shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
            isUserOnTheClock 
              ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950/80 border-emerald-500/80 ring-2 ring-emerald-500/30'
              : 'bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-950 border-slate-800'
          }`}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                  MOCK DRAFT SIMULATOR
                </span>
                <span className="text-xs text-slate-400 font-mono">[{settings.name}]</span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {settings.numTeams} Teams • {totalRounds} Rounds ({totalRounds * settings.numTeams} Total Picks)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {strategy.formatType}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white font-display flex items-center gap-3">
                {isDraftFinished ? (
                  <span className="text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-7 h-7 text-emerald-400" />
                    <span>🎉 Mock Draft Complete!</span>
                  </span>
                ) : isUserOnTheClock ? (
                  <span className="text-emerald-300 animate-pulse flex items-center gap-2">
                    <span>🚨 YOU ARE ON THE CLOCK (PICK #{currentPickIndex + 1})!</span>
                  </span>
                ) : (
                  <span>{currentTeam.name} is drafting (Pick #{currentPickIndex + 1})</span>
                )}
              </h2>

              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-3 font-mono">
                <span>Round: <strong className="text-white font-bold">{currentRound}</strong> / {totalRounds}</span>
                <span>•</span>
                <span>Pick in Round: <strong className="text-indigo-400 font-bold">#{pickInRound}</strong></span>
                <span>•</span>
                <span>Overall: <strong className="text-emerald-400 font-bold">#{currentPickIndex + 1}</strong></span>
                <span>•</span>
                <span>Speed:
                  <select
                    value={draftSpeedMs}
                    onChange={(e) => setDraftSpeedMs(parseInt(e.target.value, 10))}
                    className="ml-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-indigo-300 font-mono focus:outline-none"
                  >
                    <option value={800}>Normal (0.8s)</option>
                    <option value={300}>Fast (0.3s)</option>
                    <option value={100}>Lightning (0.1s)</option>
                  </select>
                </span>
              </div>
            </div>

            {/* Simulation Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              {!isDraftFinished && (
                <>
                  {isAutoDrafting ? (
                    <button
                      onClick={() => setIsAutoDrafting(false)}
                      className="px-4 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSimulateToUserPick}
                      className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg shadow-indigo-600/30"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{currentPickIndex === 0 ? 'Start Mock Draft' : 'Sim to My Pick'}</span>
                    </button>
                  )}

                  <button
                    onClick={handleStepSinglePick}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Simulate just 1 pick"
                  >
                    <ChevronRight className="w-4 h-4" />
                    <span>Next Pick</span>
                  </button>

                  <button
                    onClick={handleFastForwardDraft}
                    className="px-3.5 py-2.5 rounded-2xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/40 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    title="Instant finish entire draft"
                  >
                    <FastForward className="w-4 h-4" />
                    <span>Fast Finish</span>
                  </button>
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

          {/* Tier Cliff Warning Banner */}
          {draftRecs.tierCliffWarning && !isDraftFinished && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3 text-amber-200 text-xs font-mono">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1 font-semibold">{draftRecs.tierCliffWarning}</div>
            </div>
          )}

          {/* On-The-Clock AI Recommendations Deck */}
          {!isDraftFinished && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm sm:text-base font-extrabold text-white font-display">
                    {isUserOnTheClock ? 'AI Pick Recommendations For You' : 'Next Pick Scouting'}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    (Calibrated for {settings.name})
                  </span>
                </div>

                {draftRecs.turnPreview && (
                  <div className="text-xs font-mono text-indigo-300 hidden md:block">
                    {draftRecs.turnPreview.turnAdvice}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {draftRecs.recommendations.map((rec, rIdx) => (
                  <div
                    key={rIdx}
                    className={`p-4 rounded-3xl border transition-all flex flex-col justify-between space-y-3 ${
                      rec.type === 'BEST_VALUE'
                        ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20'
                        : rec.type === 'POSITION_NEED'
                        ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900/90 border-indigo-500/50 shadow-lg shadow-indigo-950/30'
                        : 'bg-gradient-to-br from-purple-950/60 to-slate-900/90 border-purple-500/50 shadow-lg shadow-purple-950/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          rec.type === 'BEST_VALUE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : rec.type === 'POSITION_NEED'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {rec.title}
                        </span>
                        <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800">
                          {rec.badge}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <img
                          src={rec.player.avatar}
                          alt={rec.player.name}
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-bold text-white truncate font-sans">
                            {rec.player.name}
                          </div>
                          <div className="text-xs font-mono text-slate-400">
                            {rec.player.position} • {rec.player.team} • #{rec.player.jerseyNumber}
                          </div>
                          <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                            {rec.projectedPoints} Proj Pts
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 font-mono mt-3 leading-relaxed border-t border-slate-800/80 pt-2.5">
                        {rec.rationale}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDraftPlayer(rec.player)}
                      className={`w-full py-2.5 rounded-2xl font-bold font-mono text-xs cursor-pointer transition-all shadow-md flex items-center justify-center gap-1.5 ${
                        rec.type === 'BEST_VALUE'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Draft {rec.player.name.split(' ')[0]}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Draft Action Grid: Available Players & Roster Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Columns: Available Players Table */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter Controls */}
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
                    placeholder="Search player..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              {/* Available Players Table */}
              <div className="overflow-x-auto rounded-3xl border border-slate-800 glass-panel max-h-[560px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/90 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-3.5">Rank / Player</th>
                      <th className="p-3.5">Pos</th>
                      <th className="p-3.5">VORP</th>
                      <th className="p-3.5">Weekly Proj</th>
                      <th className="p-3.5">Vegas Props</th>
                      <th className="p-3.5 text-right">Draft</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200 font-mono">
                    {availablePlayers
                      .filter(({ player }) => positionFilter === 'ALL' || player.position === positionFilter)
                      .filter(({ player }) => player.name.toLowerCase().includes(searchFilter.toLowerCase()) || player.team.toLowerCase().includes(searchFilter.toLowerCase()))
                      .slice(0, 100)
                      .map(({ player, proj }, idx) => (
                        <tr key={player.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-bold text-white flex items-center gap-3">
                            <span className="text-slate-500 text-xs w-5">#{idx + 1}</span>
                            <img
                              src={player.avatar}
                              alt={player.name}
                              className="w-8 h-8 rounded-xl object-cover border border-slate-700 shrink-0"
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
                            <div className="font-bold text-slate-200">{proj.vegasImpliedFantasyPoints} pts</div>
                            <div className="text-[10px] text-slate-500 font-normal">Team Total: {player.vegas.impliedTeamTotal}</div>
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

            {/* Right Column: User's Drafted Roster & Dynamic Slots */}
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
                    <div className="text-[10px] text-slate-400 uppercase">STARTERS / BENCH</div>
                    <div className="text-base sm:text-lg font-black text-emerald-400">
                      {userProjectedStarterScore.toFixed(1)} <span className="text-xs text-slate-400 font-normal">pts</span>
                      {userProjectedBenchScore > 0 && (
                        <span className="text-xs text-slate-400 font-normal ml-1">
                          (+{userProjectedBenchScore.toFixed(1)} res)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Position Group Slots */}
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {rosterSlotGroups.map((group, gIdx) => {
                    const isBench = group.pos === 'BENCH';
                    const draftedInPos = isBench ? benchPlayers : (startersByPos[group.pos] || []);

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
                              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                isBench 
                                  ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700' 
                                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {p ? (
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={p.avatar} alt={p.name} className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-700" />
                                  <div className="min-w-0 flex items-center gap-1.5">
                                    <span className="font-bold text-white truncate">{p.name}</span>
                                    {isBench && (
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                        p.position === 'QB' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                        p.position === 'RB' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                        p.position === 'WR' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                        p.position === 'TE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                        'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                      }`}>
                                        {p.position}
                                      </span>
                                    )}
                                    <span className="text-[10px] font-mono text-slate-400 shrink-0">({p.team})</span>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-600 font-mono text-[11px]">
                                  {isBench ? `Bench Slot ${slotIdx + 1} (Empty)` : `${group.pos} ${slotIdx + 1} (Empty Slot)`}
                                </span>
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

                {userDraftedRoster.length >= 8 && (
                  <button
                    onClick={() => handleLockRosterAndNavigate()}
                    className="w-full py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all mt-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lock as Active Team Roster</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Draft Picks History Ticker */}
          {draftedPicks.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2 font-display">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Draft Picks Feed ({draftedPicks.length} Total Picks)</span>
                </h3>
                <span className="text-xs font-mono text-slate-400">
                  Pick #{currentPickIndex} / {totalRounds * settings.numTeams}
                </span>
              </div>

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
      )}

      {/* VIEW 2: AI DRAFT STRATEGY & GAME PLAN */}
      {activeSubTab === 'strategy' && (
        <div className="space-y-6">
          {/* Strategy Hero Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/40 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-400" />
                  CALIBRATED STRATEGY BLUEPRINT
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {strategy.formatType}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pick #{userDraftSlot + 1} Slot Strategy
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
                Mathematical Game Plan for {settings.name}
              </h2>

              <p className="text-xs text-slate-300 font-mono max-w-3xl leading-relaxed">
                In an {settings.numTeams}-team format requiring {settings.roster.qb} starting QBs, 
                a total of <strong>{strategy.qbStartersTotal} QBs</strong> must start every week ({strategy.nflStarterSupplyPct}% of the entire 32-team NFL starter pool).
                Below is your high-conviction mathematical blueprint for Saturday's draft.
              </p>
            </div>

            <button
              onClick={() => onNavigateToTab?.('ai-coach')}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer shrink-0 transition-all"
            >
              <Bot className="w-4 h-4" />
              <span>Ask AI Draft Coach</span>
            </button>
          </div>

          {/* Positional Scarcity Heatmap */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-extrabold text-white font-display">
                League Positional Scarcity & Supply/Demand Analysis
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {(['QB', 'RB', 'WR', 'TE'] as const).map(pos => {
                const s = strategy.positionalScarcity[pos];
                return (
                  <div 
                    key={pos}
                    className={`p-4 rounded-3xl border flex flex-col justify-between space-y-3 ${
                      s.scarcityTier === 'CRITICAL'
                        ? 'bg-rose-950/40 border-rose-500/50 ring-1 ring-rose-500/30'
                        : s.scarcityTier === 'HIGH'
                        ? 'bg-amber-950/40 border-amber-500/40'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-white font-mono">{pos}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                          s.scarcityTier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          s.scarcityTier === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {s.scarcityTier} Scarcity
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-xs font-mono">
                        <div className="text-slate-300 flex justify-between">
                          <span>Starters Needed:</span>
                          <strong className="text-white font-bold">{s.totalStartersNeeded} players</strong>
                        </div>
                        <div className="text-slate-300 flex justify-between">
                          <span>Target Roster Count:</span>
                          <strong className="text-emerald-400 font-bold">{s.recommendedStartersTarget} QBs</strong>
                        </div>
                        <div className="text-slate-300 flex justify-between">
                          <span>Projected Cliff:</span>
                          <strong className="text-amber-400 font-bold">Round {s.cliffRound}</strong>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 font-mono leading-relaxed border-t border-slate-800/80 pt-2">
                      {s.advice}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Round-by-Round Blueprint for Draft Slot */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-extrabold text-white font-display">
                Round-by-Round Game Plan (Pick #{userDraftSlot + 1} Slot)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {strategy.roundByRoundGamePlan.map((plan, idx) => (
                <div key={idx} className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {plan.rounds}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-bold">{plan.phase}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {plan.targetPositions.map((pos, pIdx) => (
                      <span key={pIdx} className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-800 text-slate-200">
                        {pos}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    {plan.priorityRationale}
                  </p>

                  <div className="border-t border-slate-800 pt-2.5">
                    <div className="text-[10px] text-slate-500 uppercase font-mono mb-1">Key Target Candidates:</div>
                    <div className="text-xs font-mono text-emerald-400 font-semibold truncate">
                      {plan.keyTargets.join(' • ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scoring Insights Card */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <h4 className="text-sm font-bold text-white font-display">Format & Scoring Multipliers Detected</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {strategy.scoringInsights.map((insight, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs font-mono text-slate-300 leading-relaxed flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: DRAFT RECAP & GRADE */}
      {activeSubTab === 'recap' && draftGradeReport && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-4xl font-black text-emerald-400 font-mono shadow-xl shadow-emerald-500/20">
                {draftGradeReport.overallGrade}
              </div>
              <div>
                <span className="text-xs font-mono text-emerald-400 uppercase font-bold tracking-widest">
                  MOCK DRAFT PERFORMANCE REPORT
                </span>
                <h2 className="text-2xl font-black text-white font-display mt-0.5">
                  {settings.userTeamName}'s Draft Analysis
                </h2>
                <div className="text-xs text-slate-300 font-mono flex items-center gap-3 mt-1">
                  <span>Projected Weekly Score: <strong className="text-emerald-400 font-bold">{draftGradeReport.projectedWeeklyPoints.toFixed(1)} pts</strong></span>
                  <span>•</span>
                  <span>Predicted Finish: <strong className="text-white font-bold">#{draftGradeReport.projectedSeasonFinish} in League</strong></span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleLockRosterAndNavigate()}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black font-mono text-xs flex items-center gap-2 shadow-xl shadow-emerald-500/30 cursor-pointer transition-all shrink-0"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Lock As Active Roster & Open Sunday HQ</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(draftGradeReport.positionGrades).map(([posName, data], idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono text-slate-400">{posName}</div>
                  <div className="text-sm font-bold text-white font-mono mt-0.5">{data.points.toFixed(1)} Proj Pts</div>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono px-3 py-1 rounded-xl bg-slate-950 border border-slate-800">
                  {data.grade}
                </div>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Draft Strengths & Key Advantages</span>
            </h3>
            <div className="space-y-1.5">
              {draftGradeReport.strengths.map((s, idx) => (
                <div key={idx} className="text-xs font-mono text-slate-300 flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Post-Draft Modal */}
      {showRecapModal && draftGradeReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="text-center space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                MOCK DRAFT COMPLETED
              </span>
              <h3 className="text-2xl font-black text-white font-display">
                Draft Grade: {draftGradeReport.overallGrade}
              </h3>
              <p className="text-xs text-slate-300 font-mono">
                Your drafted squad projects for <strong>{draftGradeReport.projectedWeeklyPoints.toFixed(1)} points/week</strong> in {settings.name}!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {Object.entries(draftGradeReport.positionGrades).slice(0, 4).map(([pos, data], idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">{pos}:</span>
                  <strong className="text-emerald-400 font-bold">{data.grade} ({data.points.toFixed(0)} pts)</strong>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowRecapModal(false);
                  handleLockRosterAndNavigate();
                }}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black font-mono text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Lock as My Active Roster</span>
              </button>
              <button
                onClick={() => setShowRecapModal(false)}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
              >
                Review Board
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
