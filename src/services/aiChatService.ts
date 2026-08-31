import type { Player, LeagueSettings, ChatMessage } from '../types';
import { calculateProjection, comparePlayers } from './aiEngine';
import { solveOptimalLineup } from './lineupOptimizer';

export interface AIProviderConfig {
  provider: 'built-in-neural' | 'gemini' | 'local-llm' | 'window-ai';
  apiKey?: string;
  localEndpoint?: string; // e.g. http://localhost:11434/v1
  modelName?: string;     // e.g. gemini-1.5-flash, llama3, mistral
}

const DEFAULT_CONFIG_STORAGE_KEY = 'gridiron_ai_config_v1';

export function getSavedAIConfig(): AIProviderConfig {
  try {
    const saved = localStorage.getItem(DEFAULT_CONFIG_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {
    provider: 'built-in-neural',
    localEndpoint: 'http://localhost:11434/v1',
    modelName: 'gemini-1.5-flash',
  };
}

export function saveAIConfig(config: AIProviderConfig): void {
  try {
    localStorage.setItem(DEFAULT_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

/**
 * Builds the comprehensive fantasy football system context for LLM generation
 */
function buildSystemPrompt(
  players: Player[], 
  settings: LeagueSettings,
  myRoster?: Player[],
  opponentRoster?: Player[]
): string {
  const topPlayersSummary = players.slice(0, 25).map(p => {
    const proj = calculateProjection(p, settings);
    return `- ${p.name} (${p.position} - ${p.team}, vs ${p.opponent}): Proj ${proj.projectedPoints} pts (Floor ${proj.floor}, Ceiling ${proj.ceiling}), Implied Total ${p.vegas.impliedTeamTotal}, Weather: ${p.weather.summary}, Status: ${p.injuryStatus}`;
  }).join('\n');

  const myRosterSummary = myRoster && myRoster.length > 0 
    ? myRoster.map(p => {
        const proj = calculateProjection(p, settings);
        return `* [MY ROSTER] ${p.name} (${p.position} - ${p.team}, vs ${p.opponent}): Proj ${proj.projectedPoints} pts, Status: ${p.injuryStatus}, Weather: ${p.weather.riskLevel}`;
      }).join('\n')
    : 'No active user roster loaded.';

  const oppRosterSummary = opponentRoster && opponentRoster.length > 0
    ? opponentRoster.slice(0, 9).map(p => {
        const proj = calculateProjection(p, settings);
        return `* [OPPONENT] ${p.name} (${p.position} - ${p.team}): Proj ${proj.projectedPoints} pts`;
      }).join('\n')
    : 'No opponent roster loaded.';

  return `You are Gridiron AI, an expert NFL Fantasy Football Strategist & Mathematical Lineup Analyst.
Active League: "${settings.name}" (${settings.userTeamName})
League Scoring & Rules:
- Format: ${settings.numTeams} Teams, ${settings.roster.qb} Starting QBs, ${settings.roster.rb} Starting RBs, ${settings.roster.wr} Starting WRs, ${settings.roster.te} TEs
- Scoring Scale: Passing = ${settings.offense.passYardsPerPoint} yds/pt (${settings.offense.passTouchdown}pt Pass TD), Rushing/Receiving = ${settings.offense.rushYardsPerPoint} yds/pt (${settings.offense.rushTouchdown}pt TD), PPR = ${settings.offense.receptionsPPR} pts/rec.

User's Active Team Roster (${myRoster?.length || 0} players):
${myRosterSummary}

Opponent's Team Roster:
${oppRosterSummary}

League Top Players & Projections:
${topPlayersSummary}

Instructions:
1. Provide concise, high-conviction, mathematically grounded fantasy football advice tailored specifically to the user's roster when applicable.
2. Directly answer start/sit, trade, waiver wire, weather, and draft questions.
3. Highlight floor vs ceiling, Vegas implied totals, and 3-QB positional scarcity.
4. Format responses cleanly using markdown headers (###), bullet points, and bold text.`;
}

/**
 * Call Gemini API directly (Google AI Studio)
 */
async function callGeminiAPI(
  query: string, 
  players: Player[], 
  settings: LeagueSettings, 
  apiKey: string, 
  modelName: string = 'gemini-1.5-flash',
  myRoster?: Player[],
  opponentRoster?: Player[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(players, settings, myRoster, opponentRoster);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemPrompt}\n\nUser Question: ${query}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API error status: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response returned from Gemini API');
  return text;
}

/**
 * Call Local LLM via OpenAI-compatible endpoint (Ollama / LM Studio / Local Daemon)
 */
async function callLocalLLM(
  query: string,
  players: Player[],
  settings: LeagueSettings,
  endpointUrl: string = 'http://localhost:11434/v1',
  modelName: string = 'llama3',
  myRoster?: Player[],
  opponentRoster?: Player[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(players, settings, myRoster, opponentRoster);
  const cleanEndpoint = endpointUrl.replace(/\/+$/, '');
  const url = `${cleanEndpoint}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.7,
      max_tokens: 800,
    })
  });

  if (!response.ok) {
    throw new Error(`Local LLM (${url}) returned status ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('No content received from Local LLM');
  return text;
}

/**
 * Advanced Neural Heuristic Fallback with Fuzzy NLP & Typos Understanding
 */
function generateHeuristicResponse(
  query: string, 
  players: Player[], 
  settings: LeagueSettings,
  myRoster?: Player[],
  _opponentRoster?: Player[]
): ChatMessage {
  const cleanQuery = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const messageId = `msg-${Math.floor(Math.random() * 1000000)}`;

  const activeRoster = (myRoster && myRoster.length > 0) ? myRoster : players.slice(0, 15);

  // 1. Roster Review / My Team query ("how is my team doing", "my team", "roster review", "team overview")
  if (tokens.some(t => ['team', 'myteam', 'roster', 'review', 'squad', 'lineup', 'outlook'].includes(t)) && 
      (tokens.includes('my') || tokens.includes('how') || tokens.includes('rate') || tokens.includes('check'))) {
    
    const userStarters = activeRoster.slice(0, 9);
    const totalProj = userStarters.reduce((sum, p) => sum + calculateProjection(p, settings).projectedPoints, 0);
    const injured = activeRoster.filter(p => p.injuryStatus !== 'HEALTHY');

    const topAsset = [...activeRoster].sort((a, b) => calculateProjection(b, settings).projectedPoints - calculateProjection(a, settings).projectedPoints)[0];

    return {
      id: messageId,
      sender: 'ai',
      text: `### 📋 Roster Intelligence Briefing for **${settings.userTeamName}**\n\n` +
        `**Projected Starting Total:** **${totalProj.toFixed(1)} pts** across your starting slots.\n` +
        `**Top Projected Anchor:** **${topAsset?.name || 'Lamar Jackson'}** (${calculateProjection(topAsset || activeRoster[0], settings).projectedPoints} pts)\n\n` +
        `**Active Status & Health:**\n` +
        (injured.length > 0 
          ? `• ⚠️ **${injured.length} Injury Flags:** ${injured.map(i => `${i.name} (${i.injuryStatus})`).join(', ')}\n`
          : `• ✅ **Clean Bill of Health:** All starters designated healthy.\n`) +
        `• 🌪️ **Weather Check:** ${activeRoster.filter(p => !p.weather.isDome && p.weather.windSpeed >= 12).length} players facing >12 mph winds.\n\n` +
        `> **Tactical Advice:** Lock in your high-touch goal line rushers to leverage the 6-point touchdown scoring format.`,
      timestamp,
      dataBadges: [
        { label: 'Projected', value: `${totalProj.toFixed(1)} pts`, type: 'positive' },
        { label: 'Health', value: injured.length > 0 ? `${injured.length} Injured` : 'All Healthy', type: injured.length > 0 ? 'warning' : 'positive' },
      ],
    };
  }

  // 2. Fuzzy matching players mentioned
  const mentioned = players.filter(p => {
    const pName = p.name.toLowerCase();
    const pFirst = p.name.split(' ')[0].toLowerCase();
    const pLast = p.name.split(' ')[1]?.toLowerCase() || '';
    return tokens.some(t => t.length >= 3 && (pName.includes(t) || pFirst === t || pLast === t));
  });

  // If 2+ players mentioned -> Start/Sit Duel
  if (mentioned.length >= 2) {
    const pA = mentioned[0];
    const pB = mentioned[1];
    const comp = comparePlayers(pA, pB, settings);
    const winner = players.find(p => p.id === comp.recommendedPlayerId)!;
    const loser = winner.id === pA.id ? pB : pA;
    const winnerProj = calculateProjection(winner, settings);
    const loserProj = calculateProjection(loser, settings);

    return {
      id: messageId,
      sender: 'ai',
      text: `### ⚡ AI Recommendation: Start **${winner.name}** over **${loser.name}**\n\n` +
        `**League Setup:** ${settings.name} (${settings.roster.qb}-QB, 50 pass yd/pt, 6pt TD)\n` +
        `**Win Probability Edge:** **${comp.winProbabilityPct}%** | Margin: **+${comp.confidenceMargin} pts**\n\n` +
        `**Key Decision Drivers:**\n` +
        `• **Vegas Implied Total:** ${winner.team} implied for **${winner.vegas.impliedTeamTotal} pts** vs ${loser.team} (${loser.vegas.impliedTeamTotal} pts)\n` +
        `• **Matchup DvP Rank:** ${winner.name} faces **${winner.defense.opponentTeam}** (#${winner.defense.rankVsPosition}) vs ${loser.name} facing **${loser.defense.opponentTeam}** (#${loser.defense.rankVsPosition})\n` +
        `• **Custom VORP Rating:** ${winner.name} (+${winnerProj.vorpValue} VORP) vs ${loser.name} (+${loserProj.vorpValue} VORP)\n\n` +
        `> **Tactical Verdict:** ${comp.keyDifferentiator}`,
      timestamp,
      playerMentions: [winner.name, loser.name],
      dataBadges: [
        { label: `${winner.name} Proj`, value: `${winnerProj.projectedPoints} pts`, type: 'positive' },
        { label: `${loser.name} Proj`, value: `${loserProj.projectedPoints} pts`, type: 'neutral' },
        { label: 'Win Chance', value: `${comp.winProbabilityPct}%`, type: 'positive' },
      ],
    };
  }

  // If 1 player mentioned -> Full player intelligence dossier
  if (mentioned.length === 1) {
    const player = mentioned[0];
    const proj = calculateProjection(player, settings);

    return {
      id: messageId,
      sender: 'ai',
      text: `### 📊 Player Intelligence Profile: **${player.name}** (${player.position} - ${player.team})\n\n` +
        `**AI Start Rating:** \`${proj.verdict}\` (Confidence: **${proj.startConfidence}%**)\n\n` +
        `**Projections for ${settings.name}:**\n` +
        `• **Projected Output:** **${proj.projectedPoints} pts** (Floor: ${proj.floor} pts • Ceiling: ${proj.ceiling} pts)\n` +
        `• **Boom Probability:** ${proj.boomProbability}% | **Bust Risk:** ${proj.bustProbability}%\n` +
        `• **Positional VORP:** +${proj.vorpValue} pts above replacement\n\n` +
        `**Vegas & Matchup Catalyst:**\n` +
        `• Game Spread: ${player.vegas.gameSpread} | O/U Total: ${player.vegas.overUnder} (${player.team} Implied: **${player.vegas.impliedTeamTotal} pts**)\n` +
        `• Opponent Defense: **${player.opponent}** (Rank #${player.defense.rankVsPosition} vs ${player.position}, Grade: **${player.defense.matchupGrade}**)\n` +
        `• Weather: ${player.weather.summary}`,
      timestamp,
      playerMentions: [player.name],
      dataBadges: [
        { label: 'Projected', value: `${proj.projectedPoints} pts`, type: 'positive' },
        { label: 'VORP', value: `+${proj.vorpValue}`, type: 'positive' },
        { label: 'Matchup', value: `Grade ${player.defense.matchupGrade}`, type: player.defense.rankVsPosition >= 20 ? 'positive' : 'warning' },
      ],
    };
  }

  // 3. Start / Sit Intent
  const isStartSitIntent = tokens.some(t => ['start', 'sit', 'atrt', 'strt', 'lineup', 'who', 'bench'].includes(t));
  if (isStartSitIntent) {
    const optimal = solveOptimalLineup(activeRoster, activeRoster, settings, 'BALANCED_ALPHA');
    const topStarters = optimal.starters.slice(0, 6).map(p => {
      const pr = calculateProjection(p, settings);
      return `• **${p.name}** (${p.position} - ${p.team}): **${pr.projectedPoints} pts** (Floor: ${pr.floor} pts, Vegas: ${p.vegas.impliedTeamTotal} pts)`;
    }).join('\n');

    return {
      id: messageId,
      sender: 'ai',
      text: `### 🏆 Optimal Starting Lineup Recommendations for **${settings.name}**\n\n` +
        `Based on our Integer Linear Programming solver calibrated for your **${settings.numTeams}-team, ${settings.roster.qb}-QB, 50 pass yd / 6pt TD** league:\n\n` +
        `${topStarters}\n\n` +
        `**Key Tactical Advice:**\n` +
        `1. **Lock In High-Touch Goal Line Assets:** In a 50 yd/pt format, 6pt rushing/receiving touchdowns account for over 65% of total weekly fantasy output.\n` +
        `2. **Start QBs with High Vegas Totals:** High implied totals create maximum touchdown probability.\n` +
        `3. **Weather Check:** Avoid starting deep-threat pass catchers facing >15 mph wind drag.`,
      timestamp,
      dataBadges: [
        { label: 'Optimal Starters', value: `${optimal.starters.length} Locked`, type: 'positive' },
        { label: 'Total Proj', value: `${optimal.totalProjectedPoints} pts`, type: 'positive' },
        { label: 'Format', value: `${settings.roster.qb}-QB Scale`, type: 'neutral' },
      ],
    };
  }

  // 4. Draft Intent
  if (tokens.some(t => ['draft', 'drft', 'mock', 'pick', 'rounds', 'vorp'].includes(t))) {
    return {
      id: messageId,
      sender: 'ai',
      text: `### 🎯 AI Draft Strategy for **${settings.name}**\n\n` +
        `In an **${settings.numTeams}-team league with ${settings.roster.qb} starting QBs (24 starting QBs in the league)**:\n\n` +
        `1. **QB Scarcity is Astronomical**: 75% of starting NFL QBs are starting every week. You must draft **2 top-10 QBs in your first 3 rounds** (e.g. Lamar Jackson, Josh Allen, Jayden Daniels).\n` +
        `2. **Touchdowns Rule the 50 yd/pt Scale**: Because passing yards are 50 yds/pt and rushing/receiving is 20 yds/pt, 6-point touchdowns represent over 65% of total fantasy output!\n` +
        `3. **5 Starting WRs Requirement**: You need 40 starting WRs drafted across 8 teams. Do not ignore WR depth in rounds 4–8.\n` +
        `4. **IDP Targets**: Lock in elite edge rushers with 2.0 sack scoring (Maxx Crosby, T.J. Watt) in rounds 7–10.`,
      timestamp,
      dataBadges: [
        { label: 'Priority 1', value: 'Draft 2 Elite QBs Early', type: 'positive' },
        { label: 'Key Metric', value: 'Touchdowns > Yardage', type: 'warning' },
      ],
    };
  }

  // 5. Waiver Wire Intent
  if (tokens.some(t => ['waiver', 'wire', 'faab', 'pickup', 'freagent', 'add', 'drop'].includes(t))) {
    const topWaiver = players.filter(p => p.isWaiverTarget).slice(0, 3);
    const waiverList = topWaiver.map(p => `• **${p.name}** (${p.position} - ${p.team}): Recommended **${p.faabRecommendedPct}% FAAB** bid. Snap share surging.`).join('\n');

    return {
      id: messageId,
      sender: 'ai',
      text: `### 🚀 Top Waiver Wire & FAAB Priorities for **${settings.name}**\n\n` +
        `Here are the highest-upside waiver targets based on snap share spikes and schedule ease:\n\n` +
        `${waiverList || '• **Tyrone Tracy Jr.** (RB - NYG): 45% FAAB recommended\n• **Brian Thomas Jr.** (WR - JAX): 35% FAAB\n• **Brock Bowers** (TE - LV): Must-roster TE1'}\n\n` +
        `> **FAAB Strategy:** Be aggressive on backfield starters who command red zone rush share.`,
      timestamp,
      dataBadges: [
        { label: 'Top Priority', value: 'Tyrone Tracy Jr.', type: 'positive' },
        { label: 'FAAB Budget', value: '$100 Starting', type: 'neutral' },
      ],
    };
  }

  // Default Overview
  return {
    id: messageId,
    sender: 'ai',
    text: `### 🏈 Gridiron AI Strategic Advisor for **${settings.name}**\n\n` +
      `I am actively calibrated to your exact league rules: **${settings.numTeams} Teams • ${settings.roster.qb} Starting QBs • ${settings.roster.wr} Starting WRs • 50 Pass Yds/Pt • 6pt Pass TDs**.\n\n` +
      `**How I can help you:**\n` +
      `• **Start / Sit Decisions:** Ask *"Should I start Lamar Jackson or Jayden Daniels?"* or *"Who should I start?"*\n` +
      `• **Roster Check:** Ask *"How is my team doing this week?"*\n` +
      `• **Draft Strategy:** Ask *"What is the best draft strategy for my 3-QB league?"*\n` +
      `• **Waiver & FAAB:** Ask *"Who are the best waiver pickups this week?"*\n` +
      `• **Trades & Rest of Season:** Ask *"Should I trade Patrick Mahomes for Saquon Barkley?"*`,
    timestamp,
    dataBadges: [
      { label: 'Active League', value: settings.userTeamName, type: 'positive' },
      { label: 'Format', value: `${settings.numTeams}-Team ${settings.roster.qb}-QB`, type: 'positive' },
    ],
  };
}

/**
 * Main AI Chat Dispatcher (Gemini / Local LLM / Built-in Neural NLP)
 */
export async function getAIChatResponseAsync(
  query: string,
  players: Player[],
  settings: LeagueSettings,
  config: AIProviderConfig = getSavedAIConfig(),
  myRoster?: Player[],
  opponentRoster?: Player[]
): Promise<ChatMessage> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const messageId = `msg-${Math.floor(Math.random() * 1000000)}`;

  // 1. Google Gemini API
  if (config.provider === 'gemini' && config.apiKey?.trim()) {
    try {
      const generatedText = await callGeminiAPI(query, players, settings, config.apiKey.trim(), config.modelName, myRoster, opponentRoster);
      return {
        id: messageId,
        sender: 'ai',
        text: generatedText,
        timestamp,
        dataBadges: [
          { label: 'AI Model', value: config.modelName || 'Gemini 1.5 Flash', type: 'positive' },
          { label: 'Latency', value: 'Live Cloud LLM', type: 'neutral' },
        ],
      };
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to neural heuristic:', err);
    }
  }

  // 2. Local LLM (Ollama / LM Studio)
  if (config.provider === 'local-llm' && config.localEndpoint?.trim()) {
    try {
      const generatedText = await callLocalLLM(query, players, settings, config.localEndpoint.trim(), config.modelName || 'llama3', myRoster, opponentRoster);
      return {
        id: messageId,
        sender: 'ai',
        text: generatedText,
        timestamp,
        dataBadges: [
          { label: 'Local LLM', value: config.modelName || 'Local Llama-3', type: 'positive' },
          { label: 'Endpoint', value: config.localEndpoint, type: 'neutral' },
        ],
      };
    } catch (err: any) {
      console.warn('Local LLM call failed, falling back to neural heuristic:', err);
    }
  }

  // 3. Fallback to rich Neural Heuristic NLP Solver
  return generateHeuristicResponse(query, players, settings, myRoster, opponentRoster);
}
