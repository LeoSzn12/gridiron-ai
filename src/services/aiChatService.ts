import type { Player, LeagueSettings, ChatMessage } from '../types';
import { calculateProjection, comparePlayers } from './aiEngine';
import { solveOptimalLineup } from './lineupOptimizer';

export type AIProvider = 
  | 'openrouter' 
  | 'anthropic' 
  | 'openai' 
  | 'gemini' 
  | 'nvidia-nim' 
  | 'local-llm' 
  | 'built-in-neural';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string;
  localEndpoint?: string;
  modelName?: string;
}

const DEFAULT_CONFIG_STORAGE_KEY = 'gridiron_ai_config_v2';

export const POPULAR_AI_MODELS: Record<AIProvider, Array<{ id: string; name: string; description: string }>> = {
  'openrouter': [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Deepest NFL tactical reasoning & scheme mastery' },
    { id: 'openai/gpt-4o', name: 'ChatGPT-4o', description: 'Top-tier analytical precision & start/sit clarity' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 Reasoning', description: 'High-effort chain-of-thought mathematical reasoning' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', description: 'Ultra-fast multimodal search & live speed' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B', description: 'Open-weights powerhouse' },
  ],
  'openai': [
    { id: 'gpt-4o', name: 'ChatGPT-4o (Omni)', description: 'Flagship OpenAI model' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast, lightweight & highly capable' },
    { id: 'o3-mini', name: 'o3-mini (Reasoning)', description: 'Advanced mathematical logic' },
  ],
  'anthropic': [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Industry benchmark in analysis' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Instant response latency' },
  ],
  'gemini': [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Next-gen speed & live reasoning' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Deep analytical context window' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Balanced everyday performer' },
  ],
  'nvidia-nim': [
    { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash (CoT)', description: 'NVIDIA GPU Accelerated Chain-of-Thought' },
    { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', description: 'High-reasoning pure logic' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', description: 'NVIDIA NIM High Throughput' },
  ],
  'local-llm': [
    { id: 'llama3:latest', name: 'Llama 3 (Local Ollama)', description: 'Runs 100% offline on your machine' },
    { id: 'mistral:latest', name: 'Mistral (Local)', description: 'Fast local reasoning' },
    { id: 'deepseek-r1:latest', name: 'DeepSeek R1 (Local)', description: 'Local thinking model' },
  ],
  'built-in-neural': [
    { id: 'neural-engine-v2', name: 'Gridiron Statistical Engine', description: 'Instant client-side 5-factor composite model' }
  ]
};

export function getSavedAIConfig(): AIProviderConfig {
  try {
    const saved = localStorage.getItem(DEFAULT_CONFIG_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }

  // Check if OpenRouter key is provided via env
  const envOpenRouterKey = (import.meta as any).env?.VITE_OPENROUTER_API_KEY || '';
  if (envOpenRouterKey) {
    return {
      provider: 'openrouter',
      apiKey: envOpenRouterKey,
      modelName: 'anthropic/claude-3.5-sonnet',
    };
  }

  // Check if NVIDIA key is provided via env
  const envNvidiaKey = (import.meta as any).env?.VITE_NVIDIA_API_KEY || '';
  if (envNvidiaKey) {
    return {
      provider: 'nvidia-nim',
      apiKey: envNvidiaKey,
      modelName: 'deepseek-ai/deepseek-v4-flash-0731',
    };
  }

  return {
    provider: 'openrouter',
    modelName: 'anthropic/claude-3.5-sonnet',
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

  return `You are Gridiron AI, an elite NFL Fantasy Football Strategist, Lineup Optimizer, and Betting Analyst.
Active League Profile: "${settings.name}" (${settings.userTeamName})
League Scoring & Roster Architecture:
- Format: ${settings.numTeams} Teams, ${settings.roster.qb} Starting QBs, ${settings.roster.rb} Starting RBs, ${settings.roster.wr} Starting WRs, ${settings.roster.te} TEs
- Scoring System: Passing = ${settings.offense.passYardsPerPoint} yds/pt (${settings.offense.passTouchdown}pt Pass TD, ${settings.offense.interception}pt INT), Rushing/Receiving = ${settings.offense.rushYardsPerPoint} yds/pt (${settings.offense.rushTouchdown}pt TD), PPR = ${settings.offense.receptionsPPR} pts/rec.

User's Active Starting Team Roster (${myRoster?.length || 0} players):
${myRosterSummary}

Opponent's Team Roster:
${oppRosterSummary}

Top League Projections & Matchups:
${topPlayersSummary}

Analysis Directives:
1. Deliver concise, high-conviction, mathematically grounded fantasy football counsel tailored to the user's starting lineup.
2. Directly answer start/sit questions with clear confidence margins and ceiling/floor risk assessments.
3. Factor in Vegas implied game totals, spread scripts, receiver target shares, and stadium weather.
4. Format all responses cleanly using markdown headers (###), bullet points, and bold text.`;
}

/**
 * Universal AI Gateway Dispatcher (Handles OpenRouter, OpenAI, Claude, NVIDIA NIM, Gemini, Local LLM)
 */
async function callUniversalAIProxy(
  query: string,
  players: Player[],
  settings: LeagueSettings,
  config: AIProviderConfig,
  myRoster?: Player[],
  opponentRoster?: Player[]
): Promise<{ text: string; reasoning?: string; modelName: string; providerName: string }> {
  const systemPrompt = buildSystemPrompt(players, settings, myRoster, opponentRoster);

  // 1. If Local LLM (Ollama)
  if (config.provider === 'local-llm') {
    const endpoint = (config.localEndpoint || 'http://localhost:11434/v1').replace(/\/+$/, '');
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.modelName || 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) throw new Error(`Local LLM error status ${res.status}`);
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      modelName: config.modelName || 'Local LLM',
      providerName: 'Local Ollama',
    };
  }

  // 2. If Direct Google Gemini API
  if (config.provider === 'gemini' && config.apiKey?.trim()) {
    const model = config.modelName || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey.trim()}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${query}` }] }
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error ${res.status}`);
    }

    const data = await res.json();
    return {
      text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      modelName: model,
      providerName: 'Google Gemini',
    };
  }

  // 3. Universal Serverless Proxy (/api/ai-chat) for OpenRouter, Claude, ChatGPT, NVIDIA NIM
  const proxyRes = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: query,
      systemPrompt,
      provider: config.provider,
      model: config.modelName || (config.provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : undefined),
      apiKey: config.apiKey?.trim() || undefined,
      temperature: 0.7,
      maxTokens: 3000,
    }),
  });

  if (!proxyRes.ok) {
    const errText = await proxyRes.text();
    throw new Error(`AI Gateway error (${proxyRes.status}): ${errText}`);
  }

  const data = await proxyRes.json();
  if (!data.text && !data.reasoning) {
    throw new Error('Empty response received from AI Gateway');
  }

  return {
    text: data.text || data.reasoning,
    reasoning: data.reasoning || undefined,
    modelName: data.model || config.modelName || 'Cloud Model',
    providerName: config.provider === 'openrouter' ? 'OpenRouter Gateway' :
                  config.provider === 'anthropic' ? 'Anthropic Claude' :
                  config.provider === 'openai' ? 'OpenAI ChatGPT' :
                  config.provider === 'nvidia-nim' ? 'NVIDIA GPU Cloud' : 'Cloud LLM',
  };
}

/**
 * Built-In Neural NLP Engine (Offline Fallback)
 */
function generateHeuristicResponse(
  query: string, 
  players: Player[], 
  settings: LeagueSettings, 
  myRoster?: Player[], 
  _opponentRoster?: Player[]
): ChatMessage {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const q = query.toLowerCase();

  // 1. START/SIT COMPARISON
  const mentionedPlayers = players.filter(p => q.includes(p.name.toLowerCase()));
  if (mentionedPlayers.length >= 2) {
    const p1 = mentionedPlayers[0];
    const p2 = mentionedPlayers[1];
    const comparison = comparePlayers(p1, p2, settings);
    const winner = p1.id === comparison.recommendedPlayerId ? p1 : p2;
    const loser = p1.id === comparison.recommendedPlayerId ? p2 : p1;
    const winProj = calculateProjection(winner, settings);
    const loseProj = calculateProjection(loser, settings);

    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: `### 🎯 High-Conviction Start/Sit Recommendation\n\n` +
        `**START:** **${winner.name}** (${winner.position} - ${winner.team})\n` +
        `**SIT:** **${loser.name}** (${loser.position} - ${loser.team})\n\n` +
        `**Confidence Level:** **${comparison.winProbabilityPct}% Probability Edge** (+${comparison.confidenceMargin} projected pts)\n\n` +
        `**Key Mathematical Edge:**\n` +
        `• **${winner.name}:** ${winProj.projectedPoints} Proj Pts (Floor: ${winProj.floor}, Ceiling: ${winProj.ceiling}), Implied Total: ${winner.vegas.impliedTeamTotal} pts.\n` +
        `• **${loser.name}:** ${loseProj.projectedPoints} Proj Pts (Floor: ${loseProj.floor}, Ceiling: ${loseProj.ceiling}), Implied Total: ${loser.vegas.impliedTeamTotal} pts.\n\n` +
        `**Tactical Rationale:**\n` +
        comparison.reasoning.map(r => `• ${r}`).join('\n'),
      timestamp,
      dataBadges: [
        { label: 'Recommended Start', value: winner.name, type: 'positive' },
        { label: 'Edge Margin', value: `+${comparison.confidenceMargin} pts`, type: 'positive' },
        { label: 'Confidence', value: `${comparison.winProbabilityPct}%`, type: 'neutral' },
      ],
      playerMentions: [winner.name, loser.name],
    };
  }

  // 2. ROSTER / TEAM RATE
  if (q.includes('my team') || q.includes('roster') || q.includes('how is my') || q.includes('rate')) {
    const roster = myRoster && myRoster.length > 0 ? myRoster : players.slice(0, 12);
    const optimal = solveOptimalLineup(roster, roster.slice(0, 9), settings, 'BALANCED_ALPHA');
    const totalProj = optimal.totalProjectedPoints;

    return {
      id: `ai-${Math.random()}`,
      sender: 'ai',
      text: `### 📊 Complete Roster Diagnostics for **${settings.userTeamName}**\n\n` +
        `Your optimal starting lineup projects for **${totalProj.toFixed(1)} Total Points** in **${settings.name}**:\n\n` +
        optimal.starters.map(p => {
          const proj = calculateProjection(p, settings);
          return `• **${p.position}:** ${p.name} (${p.team}) — **${proj.projectedPoints} pts** (Floor: ${proj.floor}, Ceiling: ${proj.ceiling})`;
        }).join('\n') + `\n\n` +
        `**Optimal Bench:** ${optimal.bench.map(p => p.name).join(', ')}\n\n` +
        `**Key Strengths:** High-powered QB tier with favorable passing scripts and red-zone carry share.`,
      timestamp,
      dataBadges: [
        { label: 'Active Starters', value: `${optimal.starters.length} Players`, type: 'positive' },
        { label: 'Projected Points', value: `${totalProj.toFixed(1)} pts`, type: 'positive' },
        { label: 'Scoring Rules', value: `${settings.offense.passYardsPerPoint} yd / ${settings.offense.passTouchdown}pt TD`, type: 'neutral' },
      ],
    };
  }

  // 3. WAIVER WIRE
  if (q.includes('waiver') || q.includes('pickup') || q.includes('free agent') || q.includes('faab')) {
    const waivers = players.filter(p => p.isWaiverTarget).slice(0, 4);
    return {
      id: `ai-${Math.random()}`,
      sender: 'ai',
      text: `### 📡 Top Priority Waiver Wire Targets\n\n` +
        waivers.map((w, idx) => {
          const proj = calculateProjection(w, settings);
          return `**#${idx + 1} ${w.name}** (${w.position} - ${w.team})\n` +
                 `• **Recommended FAAB:** **${w.faabRecommendedPct}% FAAB**\n` +
                 `• **Weekly Projection:** **${proj.projectedPoints} pts** | TD Odds: **${w.vegas.props.anytimeTDOdds}**\n` +
                 `• **Reason to Add:** ${w.aiAnalysisSummary || 'Surging snap share and high red-zone target volume.'}\n`;
        }).join('\n'),
      timestamp,
      dataBadges: [
        { label: 'Priority Target', value: waivers[0]?.name || 'Available', type: 'positive' },
        { label: 'Max Recommended FAAB', value: `${waivers[0]?.faabRecommendedPct || 15}%`, type: 'warning' },
      ],
    };
  }

  // Default General Advice
  return {
    id: `ai-${Date.now()}`,
    sender: 'ai',
    text: `### 🏈 Gridiron AI Tactical Intelligence\n\n` +
      `Here is your real-time strategic overview for **${settings.name}**:\n\n` +
      `• **League Scoring Multiplier:** ${settings.offense.passYardsPerPoint} pass yds/pt with **${settings.offense.passTouchdown}pt Pass TDs** heavily elevates high-volume passing QBs.\n` +
      `• **Roster Optimization:** Your roster has ${settings.roster.qb} starting QB slots. Maximizing QB floor and ceiling yields the single largest competitive VORP advantage.\n\n` +
      `*Ask me any specific start/sit duel (e.g. "Should I start Lamar Jackson or Jayden Daniels?"), trade proposal, or waiver wire question!*`,
    timestamp,
    dataBadges: [
      { label: 'Active Team', value: settings.userTeamName, type: 'positive' },
      { label: 'Format', value: `${settings.numTeams} Teams • ${settings.roster.qb} QB`, type: 'positive' },
    ],
  };
}

/**
 * Main AI Dispatcher
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

  // If Built-in Neural Engine chosen
  if (config.provider === 'built-in-neural') {
    return generateHeuristicResponse(query, players, settings, myRoster, opponentRoster);
  }

  // Call Universal AI Gateway
  try {
    const result = await callUniversalAIProxy(query, players, settings, config, myRoster, opponentRoster);
    const fullText = result.reasoning
      ? `> 🧠 **Thinking / Chain of Thought**:\n> ${result.reasoning.split('\n').join('\n> ')}\n\n${result.text}`
      : result.text;

    return {
      id: messageId,
      sender: 'ai',
      text: fullText,
      timestamp,
      dataBadges: [
        { label: 'AI Model', value: result.modelName.split('/').pop() || result.modelName, type: 'positive' },
        { label: 'Provider', value: result.providerName, type: 'neutral' },
        ...(result.reasoning ? [{ label: 'Reasoning', value: 'High Effort CoT', type: 'positive' as const }] : []),
      ],
    };
  } catch (err: any) {
    console.warn('External AI call failed, falling back to built-in Neural Engine:', err);
    return generateHeuristicResponse(query, players, settings, myRoster, opponentRoster);
  }
}
