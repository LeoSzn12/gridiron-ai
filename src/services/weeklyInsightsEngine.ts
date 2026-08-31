import type { Player, LeagueSettings } from '../types';
import { calculateProjection } from './aiEngine';

export interface RosterAnalysisReport {
  overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D';
  totalProjectedPoints: number;
  startersProjectedPoints: number;
  benchProjectedPoints: number;
  strengths: string[];
  vulnerabilities: string[];
  tacticalRecommendations: string[];
  injuryAlertsCount: number;
  weatherAlertsCount: number;
}

export interface MatchupPreviewAnalysis {
  userTotalPoints: number;
  opponentTotalPoints: number;
  winProbabilityPct: number;
  keyPositionalAdvantages: Array<{
    position: string;
    advantage: 'USER' | 'OPPONENT' | 'EVEN';
    marginPoints: number;
    summary: string;
  }>;
  xFactorPlayer: Player;
  dangerMatchupPlayer?: Player;
  tacticalVerdict: string;
}

/**
 * 1. Deep Roster Analysis for the user's active team
 */
export function analyzeUserRoster(
  userPlayers: Player[],
  settings: LeagueSettings
): RosterAnalysisReport {
  if (!userPlayers || userPlayers.length === 0) {
    return {
      overallGrade: 'B',
      totalProjectedPoints: 0,
      startersProjectedPoints: 0,
      benchProjectedPoints: 0,
      strengths: ['No players loaded on roster'],
      vulnerabilities: ['Import league from Sleeper or select preset'],
      tacticalRecommendations: ['Add players to your active team'],
      injuryAlertsCount: 0,
      weatherAlertsCount: 0,
    };
  }

  const projections = userPlayers.map(p => ({
    player: p,
    proj: calculateProjection(p, settings),
  }));

  // Sort by projected points
  projections.sort((a, b) => b.proj.projectedPoints - a.proj.projectedPoints);

  const starterSlots = settings.roster.qb + settings.roster.rb + settings.roster.wr + settings.roster.te + settings.roster.k + settings.roster.def + settings.roster.dl + settings.roster.lb + settings.roster.db;
  const starters = projections.slice(0, Math.min(starterSlots, projections.length));
  const bench = projections.slice(starterSlots);

  const startersProjected = starters.reduce((sum, s) => sum + s.proj.projectedPoints, 0);
  const benchProjected = bench.reduce((sum, b) => sum + b.proj.projectedPoints, 0);
  const totalProjected = startersProjected + benchProjected;

  const injured = userPlayers.filter(p => p.injuryStatus !== 'HEALTHY');
  const weatherRisks = userPlayers.filter(p => !p.weather.isDome && p.weather.windSpeed >= 12);

  const strengths: string[] = [];
  const vulnerabilities: string[] = [];
  const recommendations: string[] = [];

  // Positional strength checks
  const qbs = userPlayers.filter(p => p.position === 'QB');
  if (qbs.length >= 3) {
    const qbTotalVORP = qbs.reduce((sum, p) => sum + calculateProjection(p, settings).vorpValue, 0);
    if (qbTotalVORP >= 20) {
      strengths.push(`🚀 Elite QB Foundation: Anchored by ${qbs.slice(0, 2).map(q => q.name).join(' & ')} (+${qbTotalVORP.toFixed(1)} VORP in ${settings.roster.qb}-QB format)`);
    }
  }

  const rbs = userPlayers.filter(p => p.position === 'RB');
  const topRB = rbs.find(r => r.stats.redZoneOpportunitiesPerGame >= 2.5);
  if (topRB) {
    strengths.push(`🎯 High-Value Touch RB: ${topRB.name} commands ${topRB.stats.redZoneOpportunitiesPerGame} red zone touches/gm (6pt TD scoring gold)`);
  }

  // Vulnerability checks
  if (injured.length > 0) {
    vulnerabilities.push(`⚠️ ${injured.length} Active Injury Flags: ${injured.map(i => `${i.name} (${i.injuryStatus})`).join(', ')}`);
    recommendations.push(`Swap injured starters for guaranteed touch volume before kickoff.`);
  }

  if (weatherRisks.length > 0) {
    vulnerabilities.push(`🌪️ High Wind Risk: ${weatherRisks.map(w => `${w.name} (${w.weather.windSpeed} mph)`).join(', ')}`);
    recommendations.push(`Monitor Doppler radar for outdoor pass catchers; consider pivoting to indoor assets.`);
  }

  const wrs = userPlayers.filter(p => p.position === 'WR');
  if (settings.roster.wr >= 4 && wrs.length < settings.roster.wr + 2) {
    vulnerabilities.push(`📉 WR Depth Warning: Only ${wrs.length} WRs on roster for a ${settings.roster.wr}-WR requirement`);
    recommendations.push(`Target high-target-share receivers on waiver wire to insulate starting slots.`);
  }

  // Grade calculation
  let overallGrade: RosterAnalysisReport['overallGrade'] = 'B+';
  if (startersProjected >= 145) overallGrade = 'A+';
  else if (startersProjected >= 135) overallGrade = 'A';
  else if (startersProjected >= 125) overallGrade = 'B+';
  else if (startersProjected >= 115) overallGrade = 'B';
  else if (startersProjected >= 100) overallGrade = 'C+';
  else overallGrade = 'C';

  return {
    overallGrade,
    totalProjectedPoints: Number(totalProjected.toFixed(1)),
    startersProjectedPoints: Number(startersProjected.toFixed(1)),
    benchProjectedPoints: Number(benchProjected.toFixed(1)),
    strengths: strengths.length > 0 ? strengths : ['Solid baseline across core starting slots'],
    vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : ['Standard variance across skill positions'],
    tacticalRecommendations: recommendations.length > 0 ? recommendations : ['Optimize starting flex slots using Vegas implied totals'],
    injuryAlertsCount: injured.length,
    weatherAlertsCount: weatherRisks.length,
  };
}

/**
 * 2. Head-to-head Matchup Preview Analysis (User vs Opponent)
 */
export function analyzeMatchupPreview(
  userPlayers: Player[],
  opponentPlayers: Player[],
  settings: LeagueSettings
): MatchupPreviewAnalysis {
  const userProjections = userPlayers.map(p => ({ player: p, proj: calculateProjection(p, settings) }));
  const oppProjections = opponentPlayers.map(p => ({ player: p, proj: calculateProjection(p, settings) }));

  const userStarters = userProjections.sort((a, b) => b.proj.projectedPoints - a.proj.projectedPoints).slice(0, 9);
  const oppStarters = oppProjections.sort((a, b) => b.proj.projectedPoints - a.proj.projectedPoints).slice(0, 9);

  const userTotal = userStarters.reduce((s, p) => s + p.proj.projectedPoints, 0);
  const oppTotal = oppStarters.reduce((s, p) => s + p.proj.projectedPoints, 0);

  const spread = userTotal - oppTotal;
  const winProbabilityPct = Math.min(92, Math.max(15, Math.round(50 + spread * 2.2)));

  // Position breakdowns
  const positions: Array<'QB' | 'RB' | 'WR' | 'TE'> = ['QB', 'RB', 'WR', 'TE'];
  const keyPositionalAdvantages = positions.map(pos => {
    const userPts = userProjections.filter(p => p.player.position === pos).slice(0, 2).reduce((s, p) => s + p.proj.projectedPoints, 0);
    const oppPts = oppProjections.filter(p => p.player.position === pos).slice(0, 2).reduce((s, p) => s + p.proj.projectedPoints, 0);
    const diff = userPts - oppPts;

    let advantage: 'USER' | 'OPPONENT' | 'EVEN' = 'EVEN';
    if (diff >= 2.0) advantage = 'USER';
    else if (diff <= -2.0) advantage = 'OPPONENT';

    return {
      position: pos,
      advantage,
      marginPoints: Number(Math.abs(diff).toFixed(1)),
      summary: diff > 0 ? `+${diff.toFixed(1)} pt edge for your team` : diff < 0 ? `+${Math.abs(diff).toFixed(1)} pt edge for opponent` : 'Evenly matched projection',
    };
  });

  // X-Factor player (highest ceiling player on user team)
  const xFactor = userProjections.sort((a, b) => b.proj.ceiling - a.proj.ceiling)[0]?.player || userPlayers[0];
  const danger = oppProjections.sort((a, b) => b.proj.ceiling - a.proj.ceiling)[0]?.player;

  let tacticalVerdict = '';
  if (winProbabilityPct >= 65) {
    tacticalVerdict = `High-conviction favorite (${winProbabilityPct}%). Play floor-solid starters to lock in median projection and avoid volatile risks.`;
  } else if (winProbabilityPct >= 45) {
    tacticalVerdict = `Toss-up matchup (${winProbabilityPct}%). Maximize touchdown upside in high Vegas total games to create the winning margin.`;
  } else {
    tacticalVerdict = `Projected underdog (${winProbabilityPct}%). Start high-ceiling boom candidates and dome pass catchers to chase outlier scoring.`;
  }

  return {
    userTotalPoints: Number(userTotal.toFixed(1)),
    opponentTotalPoints: Number(oppTotal.toFixed(1)),
    winProbabilityPct,
    keyPositionalAdvantages,
    xFactorPlayer: xFactor,
    dangerMatchupPlayer: danger,
    tacticalVerdict,
  };
}
