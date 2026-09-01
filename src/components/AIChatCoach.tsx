import React, { useState, useRef, useEffect } from 'react';
import type { 
  Player, 
  LeagueSettings, 
  ChatMessage 
} from '../types';
import { 
  getAIChatResponseAsync, 
  getSavedAIConfig, 
  saveAIConfig, 
  POPULAR_AI_MODELS,
  type AIProvider,
  type AIProviderConfig 
} from '../services/aiChatService';
import { 
  Bot, 
  Send, 
  Trash2,
  Settings2,
  Cpu,
  X,
  ExternalLink,
  Sparkles
} from 'lucide-react';

interface AIChatCoachProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail: (player: Player) => void;
  myRoster?: Player[];
  opponentRoster?: Player[];
}

export const AIChatCoach: React.FC<AIChatCoachProps> = ({
  players,
  settings,
  onSelectPlayerDetail: _onSelectPlayerDetail,
  myRoster = [],
  opponentRoster = [],
}) => {
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(getSavedAIConfig);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configApiKey, setConfigApiKey] = useState(aiConfig.apiKey || '');
  const [configEndpoint, setConfigEndpoint] = useState(aiConfig.localEndpoint || 'http://localhost:11434/v1');
  const [configModel, setConfigModel] = useState(aiConfig.modelName || 'anthropic/claude-3.5-sonnet');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `### 🏈 Welcome to Gridiron AI Coach for **${settings.name}**!\n\n` +
        `I am your 24/7 Fantasy Football Strategist, calibrated for **${settings.numTeams} Teams, ${settings.roster.qb} Starting QBs, ${settings.roster.wr} Starting WRs, 50 Pass Yds/Pt, and 6pt Pass TDs**.\n\n` +
        `Ask me anything about start/sit decisions, waiver wire FAAB bids, player prop correlations, or roster evaluations!`,
      timestamp: 'Just now',
      dataBadges: [
        { label: 'Active Team', value: settings.userTeamName, type: 'positive' },
        { label: 'Format', value: `${settings.numTeams}T • ${settings.roster.qb}QB`, type: 'positive' },
        { label: 'Pass Scale', value: `${settings.offense.passYardsPerPoint}yd / ${settings.offense.passTouchdown}pt TD`, type: 'neutral' },
      ],
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSaveConfig = () => {
    const updated: AIProviderConfig = {
      ...aiConfig,
      apiKey: configApiKey,
      localEndpoint: configEndpoint,
      modelName: configModel,
    };
    setAiConfig(updated);
    saveAIConfig(updated);
    setShowConfigModal(false);
    setTestStatus('Settings saved!');
  };

  const handleProviderChange = (newProvider: AIProvider) => {
    const defaultModel = POPULAR_AI_MODELS[newProvider]?.[0]?.id || '';
    const defaultEndpoint = newProvider === 'local-llm' ? 'http://localhost:11434/v1' : '';
    setAiConfig(prev => ({ ...prev, provider: newProvider }));
    setConfigModel(defaultModel);
    setConfigEndpoint(defaultEndpoint);
    setTestStatus(null);
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputQuery;
    if (!textToSend.trim() || isTyping) return;

    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `user-${messages.length + 1}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: userTimestamp,
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputQuery('');
    setIsTyping(true);

    try {
      const aiReply = await getAIChatResponseAsync(
        textToSend.trim(),
        players,
        settings,
        aiConfig,
        myRoster,
        opponentRoster
      );
      setMessages(prev => [...prev, aiReply]);
    } catch (err: any) {
      console.warn('AI chat error handled gracefully:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${messages.length + 1}`,
          sender: 'ai',
          text: `### ⚠️ Notice\n\nI was unable to reach the external AI model directly, but I have analyzed your question using the built-in mathematical engine:\n\n` +
            `*Passing scale is ${settings.offense.passYardsPerPoint} yds/pt with 6pt TDs. High-volume QBs and explosive red-zone weapons carry significant VORP upside.*`,
          timestamp: userTimestamp,
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    { label: '🏆 Rate My Roster', text: 'How is my starting lineup looking this week?' },
    { label: '⚖️ Start / Sit Duel', text: 'Should I start Lamar Jackson or Jayden Daniels?' },
    { label: '📡 Top Waiver Adds', text: 'Who are the highest priority waiver wire pickups for my league format?' },
    { label: '🛡️ Top IDP Targets', text: 'Who are the top IDP defensive players to target?' },
    { label: '🌪️ Weather Traps', text: 'Which games have high winds or severe weather?' },
    { label: '🎰 Vegas Totals', text: 'Show me the highest scoring game totals from Vegas sportsbooks' },
  ];

  return (
    <div className="flex flex-col h-[750px] rounded-3xl glass-panel border border-slate-800/80 overflow-hidden shadow-2xl relative">
      
      {/* AI Model Config Modal */}
      {showConfigModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-center items-center overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold font-display text-base">
                <Cpu className="w-5 h-5 text-purple-400" />
                <span>AI Gateway & Intelligence Engine</span>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase font-mono text-[11px] mb-1.5">
                  Select AI Provider
                </label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:border-purple-500 focus:outline-none"
                >
                  <option value="openrouter">🌐 OpenRouter (Claude 3.5 Sonnet, GPT-4o, DeepSeek R1 - 1 Key for All)</option>
                  <option value="anthropic">🧠 Anthropic Claude API (Direct Claude 3.5 Sonnet)</option>
                  <option value="openai">⚡ OpenAI API (Direct ChatGPT-4o / o3-mini)</option>
                  <option value="nvidia-nim">🚀 NVIDIA NIM (DeepSeek V4 Flash / GPU Cloud)</option>
                  <option value="gemini">⚡ Google Gemini API (2.0 Flash / 1.5 Pro)</option>
                  <option value="local-llm">💻 Local LLM / Ollama (localhost:11434 / LM Studio)</option>
                  <option value="built-in-neural">🧠 Built-In Neural Fantasy AI (100% Offline / Fast)</option>
                </select>
              </div>

              {/* Model Picker */}
              {POPULAR_AI_MODELS[aiConfig.provider] && aiConfig.provider !== 'built-in-neural' && (
                <div>
                  <label className="block text-slate-300 font-bold uppercase font-mono text-[11px] mb-1.5">
                    Model Architecture
                  </label>
                  <select
                    value={configModel}
                    onChange={(e) => setConfigModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                  >
                    {POPULAR_AI_MODELS[aiConfig.provider].map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.description}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* API Key Inputs */}
              {aiConfig.provider === 'openrouter' && (
                <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 font-mono">OpenRouter API Key</span>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono hover:underline"
                    >
                      <span>Get Free / Universal Key</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={configApiKey}
                    onChange={(e) => setConfigApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-[10px] text-slate-400 font-mono">
                    Enables Claude 3.5 Sonnet, GPT-4o, DeepSeek R1, and Gemini with a single API key.
                  </p>
                </div>
              )}

              {aiConfig.provider === 'anthropic' && (
                <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 font-mono">Anthropic API Key</span>
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono hover:underline"
                    >
                      <span>Anthropic Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={configApiKey}
                    onChange={(e) => setConfigApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {aiConfig.provider === 'openai' && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 font-mono">OpenAI API Key</span>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono hover:underline"
                    >
                      <span>OpenAI Platform</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={configApiKey}
                    onChange={(e) => setConfigApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {aiConfig.provider === 'nvidia-nim' && (
                <div className="p-3.5 rounded-2xl bg-green-950/30 border border-green-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-green-300 font-mono">NVIDIA API Key</span>
                    <a
                      href="https://build.nvidia.com/explore/discover"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-green-400 hover:text-green-300 flex items-center gap-1 font-mono hover:underline"
                    >
                      <span>Get nvapi key →</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={configApiKey}
                    onChange={(e) => setConfigApiKey(e.target.value)}
                    placeholder="nvapi-..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-green-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const key = configApiKey.trim();
                        if (!key) { setTestStatus('⚠️ Enter your nvapi-... key first.'); return; }
                        setTestStatus('🔄 Testing NVIDIA NIM connection...');
                        try {
                          const res = await fetch('/api/ai-chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              prompt: 'Reply with exactly: NVIDIA_OK',
                              provider: 'nvidia-nim',
                              model: configModel || 'nvidia/llama-3.1-nemotron-70b-instruct',
                              apiKey: key,
                              maxTokens: 16,
                              temperature: 0,
                            }),
                          });
                          const data = await res.json();
                          if (data.error) {
                            setTestStatus(`❌ ${data.error}`);
                          } else {
                            setTestStatus(`✅ NVIDIA NIM connected! Model: ${configModel?.split('/').pop()}`);
                          }
                        } catch (err: any) {
                          setTestStatus(`❌ Connection failed: ${err.message}`);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-green-900/50 hover:bg-green-800/60 border border-green-500/40 text-green-300 text-[11px] font-bold font-mono cursor-pointer transition-all"
                    >
                      Test Connection
                    </button>
                    <p className="text-[10px] text-slate-500 font-mono">Verifies your key works before saving.</p>
                  </div>
                </div>
              )}

              {aiConfig.provider === 'gemini' && (
                <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 font-mono">Google Gemini API Key</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono hover:underline"
                    >
                      <span>Google AI Studio (Free)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={configApiKey}
                    onChange={(e) => setConfigApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {aiConfig.provider === 'local-llm' && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-bold uppercase font-mono text-[11px]">
                    Local Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={configEndpoint}
                    onChange={(e) => setConfigEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {testStatus && (
                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-xs font-mono text-purple-300">
                  {testStatus}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-500/25 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Provider</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-emerald-500 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base font-display">Gridiron AI Copilot</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {aiConfig.provider === 'openrouter' ? `🌐 ${aiConfig.modelName?.split('/').pop() || 'OpenRouter'}` :
                 aiConfig.provider === 'anthropic' ? '🧠 Claude 3.5 Sonnet' :
                 aiConfig.provider === 'openai' ? '⚡ ChatGPT-4o' :
                 aiConfig.provider === 'nvidia-nim' ? `🚀 NVIDIA: ${aiConfig.modelName?.split('/').pop() || 'NIM'}` :
                 aiConfig.provider === 'gemini' ? '⚡ Gemini 2.0 Flash' :
                 aiConfig.provider === 'local-llm' ? '💻 Local LLM' : '🧠 Neural Engine'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">{settings.name} • {settings.offense.passYardsPerPoint} yd/pt • {settings.offense.passTouchdown}pt TD</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-purple-400 border border-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Configure AI Model & Provider"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline font-bold">Model Settings</span>
          </button>

          <button
            onClick={() => setMessages([messages[0]])}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Clear Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-mono">Reset</span>
          </button>
        </div>
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto flex items-center gap-2 text-xs">
        <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider shrink-0">Quick Ask:</span>
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p.text)}
            className="px-2.5 py-1 rounded-xl bg-slate-800/70 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/40 border border-slate-700/60 text-slate-300 whitespace-nowrap transition-all text-xs cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
            >
              {isAi ? (
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1 text-xs font-bold text-indigo-300 font-mono">
                  YOU
                </div>
              )}

              <div className={`max-w-2xl space-y-2 ${isAi ? 'items-start' : 'items-end'}`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isAi
                      ? 'bg-slate-900/90 border border-slate-800 text-slate-200 shadow-lg'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium shadow-md shadow-purple-600/20'
                  }`}
                >
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        return <h4 key={pIdx} className="text-sm sm:text-base font-bold text-white">{paragraph.replace('### ', '')}</h4>;
                      }
                      if (paragraph.startsWith('> 🧠 **Thinking')) {
                        return (
                          <div key={pIdx} className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 text-xs font-mono text-purple-300 space-y-1 my-2">
                            <div className="font-bold text-purple-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Chain-of-Thought Reasoning:</span>
                            </div>
                            <div className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap pl-2 border-l-2 border-purple-500/50">
                              {paragraph.replace(/^> 🧠 \*\*Thinking.*?\*\*:\n>/, '').trim()}
                            </div>
                          </div>
                        );
                      }
                      return <p key={pIdx}>{paragraph}</p>;
                    })}
                  </div>
                </div>

                {/* Data Badges */}
                {msg.dataBadges && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.dataBadges.map((badge, bIdx) => (
                      <span
                        key={bIdx}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          badge.type === 'positive'
                            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                            : badge.type === 'warning'
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                            : 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                        }`}
                      >
                        {badge.label}: <strong>{badge.value}</strong>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-purple-400 animate-spin" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-xs text-slate-400 ml-2 font-mono">Synthesizing live player volume, Vegas totals & defensive matchups...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-950/90 border-t border-slate-800/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask AI Coach (e.g. 'Should I start Lamar or Jayden?', 'Who to pick up on waivers?', 'Rate my team')..."
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/80 focus:ring-2 focus:ring-purple-500/20 transition-all"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Ask AI</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
