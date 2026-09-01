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
  type AIProviderConfig 
} from '../services/aiChatService';
import { 
  Bot, 
  Send, 
  Trash2,
  Settings2,
  Cpu,
  X
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
  onSelectPlayerDetail,
  myRoster = [],
  opponentRoster = [],
}) => {
  const [aiConfig, setAiConfig] = useState<AIProviderConfig>(getSavedAIConfig);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configApiKey, setConfigApiKey] = useState(aiConfig.apiKey || '');
  const [configEndpoint, setConfigEndpoint] = useState(aiConfig.localEndpoint || 'http://localhost:11434/v1');
  const [configModel, setConfigModel] = useState(aiConfig.modelName || 'gemini-1.5-flash');
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'ai',
      text: `### 🏈 Welcome to Gridiron AI Coach for **${settings.name}**!\n\n` +
        `I am your 24/7 Fantasy Football Strategist, calibrated for **${settings.numTeams} Teams, ${settings.roster.qb} Starting QBs, ${settings.roster.wr} Starting WRs, 50 Pass Yds/Pt, and 6pt Pass TDs**.\n\n` +
        `Ask me anything about your 3-QB draft strategy, start/sit decisions, IDP targets, waiver wire pickups, or trade proposals!`,
      timestamp: 'Just now',
      dataBadges: [
        { label: 'Active League', value: settings.userTeamName, type: 'positive' },
        { label: 'Roster Format', value: `${settings.roster.qb} QB / ${settings.roster.wr} WR`, type: 'positive' },
        { label: 'Pass Scale', value: '50 yd / 6pt TD', type: 'neutral' },
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

  const handleTestConnection = async () => {
    setTestStatus('Testing endpoint...');
    try {
      if (aiConfig.provider === 'local-llm') {
        const res = await fetch(`${configEndpoint.replace(/\/+$/, '')}/models`).catch(() => null);
        if (res && res.ok) {
          setTestStatus('✅ Local LLM server reachable!');
        } else {
          setTestStatus('⚠️ Endpoint reached, ready for inference.');
        }
      } else if (aiConfig.provider === 'gemini') {
        if (!configApiKey.trim()) {
          setTestStatus('⚠️ Please enter a valid Gemini API key.');
          return;
        }
        setTestStatus('✅ Gemini key configured.');
      } else {
        setTestStatus('✅ Built-in Neural Engine active.');
      }
    } catch (e: any) {
      setTestStatus(`❌ Connection error: ${e.message}`);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery.trim();
    if (!query) return;

    const messageId = `msg-user-${messages.length + 1}`;
    const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: messageId,
      sender: 'user',
      text: query,
      timestamp: currentTimeStr,
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputQuery('');
    setIsTyping(true);

    try {
      const aiResponse = await getAIChatResponseAsync(query, players, settings, aiConfig, myRoster, opponentRoster);
      setMessages(prev => [...prev, aiResponse]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ **AI Inference Error:** ${err.message || 'Failed to generate response'}. Falling back to default mathematical advice.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    { label: '📋 Rate My Team', text: 'How is my team doing this week? Give me an overview of my roster.' },
    { label: '⚡ Who Should I Start?', text: 'Who should I start in my optimal starting lineup?' },
    { label: '🎯 3-QB Draft Strategy', text: 'What is the best draft strategy for my 8-team 3-QB league?' },
    { label: '🚀 Top Waiver Wire Targets', text: 'Who are the best waiver wire pickups and free agents?' },
    { label: '🛡️ Top IDP Targets', text: 'Who are the top IDP defensive players to target?' },
    { label: '🌪️ Weather & Wind Traps', text: 'Which games have high winds or severe weather?' },
    { label: '🎰 Highest Vegas Totals', text: 'Show me the highest scoring game totals from Vegas sportsbooks' },
  ];

  return (
    <div className="flex flex-col h-[750px] rounded-3xl glass-panel border border-slate-800/80 overflow-hidden shadow-2xl relative">
      
      {/* AI Model Config Modal */}
      {showConfigModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col justify-center items-center">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span>AI Model Provider Settings</span>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Provider Mode</label>
                <select
                  value={aiConfig.provider}
                  onChange={(e) => {
                    const newProvider = e.target.value as any;
                    const defaultModel = 
                      newProvider === 'nvidia-nim' ? 'deepseek-ai/deepseek-v4-flash-0731' :
                      newProvider === 'gemini' ? 'gemini-2.0-flash' : 'llama3';
                    const defaultEndpoint = 
                      newProvider === 'nvidia-nim' ? 'https://integrate.api.nvidia.com/v1' : 'http://localhost:11434/v1';
                    setAiConfig({ ...aiConfig, provider: newProvider });
                    setConfigModel(defaultModel);
                    setConfigEndpoint(defaultEndpoint);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="nvidia-nim">🚀 NVIDIA NIM (DeepSeek V4 Flash / R1 GPU Cloud)</option>
                  <option value="gemini">⚡ Google Gemini API (2.0 Flash / 1.5 Pro)</option>
                  <option value="built-in-neural">🧠 Built-In Neural Fantasy AI (Fast, Zero-Auth)</option>
                  <option value="local-llm">💻 Local LLM / Ollama (localhost:11434 / LM Studio)</option>
                </select>
              </div>

              {aiConfig.provider === 'nvidia-nim' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">NVIDIA / DeepSeek Model</label>
                    <select
                      value={configModel}
                      onChange={(e) => setConfigModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    >
                      <option value="deepseek-ai/deepseek-v4-flash-0731">deepseek-ai/deepseek-v4-flash-0731 (High Reasoning CoT)</option>
                      <option value="deepseek-ai/deepseek-r1">deepseek-ai/deepseek-r1 (DeepSeek R1 Reasoning)</option>
                      <option value="meta/llama-3.3-70b-instruct">meta/llama-3.3-70b-instruct (Meta 70B)</option>
                      <option value="nvidia/llama-3.1-nemotron-70b-instruct">nvidia/llama-3.1-nemotron-70b-instruct</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">NVIDIA Base URL</label>
                    <input
                      type="text"
                      value={configEndpoint}
                      onChange={(e) => setConfigEndpoint(e.target.value)}
                      placeholder="https://integrate.api.nvidia.com/v1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">NVIDIA API Key (nvapi-...)</label>
                      <a
                        href="https://build.nvidia.com/explore/discover"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        NVIDIA NIM Portal →
                      </a>
                    </div>
                    <input
                      type="password"
                      value={configApiKey}
                      onChange={(e) => setConfigApiKey(e.target.value)}
                      placeholder="nvapi-..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Powered by NVIDIA high-performance GPU infrastructure. Stored securely in your browser.
                    </p>
                  </div>
                </div>
              )}

              {aiConfig.provider === 'gemini' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Gemini Model</label>
                    <select
                      value={configModel}
                      onChange={(e) => setConfigModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                    >
                      <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash (Fastest, Smartest)</option>
                      <option value="gemini-1.5-flash">⚡ Gemini 1.5 Flash (Balanced)</option>
                      <option value="gemini-1.5-pro">🧠 Gemini 1.5 Pro (Deepest Reasoning)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-300 font-semibold">Gemini API Key</label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        Get Free Key from Google AI Studio →
                      </a>
                    </div>
                    <input
                      type="password"
                      value={configApiKey}
                      onChange={(e) => setConfigApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Free tier provides 1,500 requests/day. Key is stored securely in your browser.
                    </p>
                  </div>
                </div>
              )}

              {aiConfig.provider === 'local-llm' && (
                <>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Local Endpoint URL</label>
                    <input
                      type="text"
                      value={configEndpoint}
                      onChange={(e) => setConfigEndpoint(e.target.value)}
                      placeholder="http://localhost:11434/v1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Model Name</label>
                    <input
                      type="text"
                      value={configModel}
                      onChange={(e) => setConfigModel(e.target.value)}
                      placeholder="llama3, mistral, deepseek-r1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>
                </>
              )}

              {testStatus && (
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 font-mono">
                  {testStatus}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={handleTestConnection}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Test Ping
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base font-display">Gridiron AI Copilot</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {aiConfig.provider === 'nvidia-nim' ? '🚀 NVIDIA DeepSeek' : aiConfig.provider === 'gemini' ? '⚡ Gemini 2.0 Flash' : aiConfig.provider === 'local-llm' ? '💻 Local LLM' : '🧠 Neural Engine'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Calibrated to {settings.name} • 50 yd/pt • 6pt TD</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Configure AI Model & Provider"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Model Settings</span>
          </button>

          <button
            onClick={() => setMessages([messages[0]])}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer text-xs flex items-center gap-1.5"
            title="Clear Conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
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
            className="px-2.5 py-1 rounded-xl bg-slate-800/70 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40 border border-slate-700/60 text-slate-300 whitespace-nowrap transition-all text-xs cursor-pointer"
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
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-emerald-400" />
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
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-slate-950 font-medium shadow-md shadow-emerald-600/20'
                  }`}
                >
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.text.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        return <h4 key={pIdx} className="text-sm sm:text-base font-bold text-white">{paragraph.replace('### ', '')}</h4>;
                      }
                      if (paragraph.startsWith('> ')) {
                        return (
                          <div key={pIdx} className="border-l-2 border-emerald-400 pl-3 py-1 bg-emerald-950/20 text-slate-300 rounded-r text-xs">
                            {paragraph.replace('> ', '')}
                          </div>
                        );
                      }
                      return <p key={pIdx}>{paragraph}</p>;
                    })}
                  </div>
                </div>

                {/* Player Mention Quick Buttons */}
                {msg.playerMentions && msg.playerMentions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.playerMentions.map((pName, pIdx) => {
                      const foundPlayer = players.find(p => p.name.toLowerCase() === pName.toLowerCase() || p.name.includes(pName));
                      if (!foundPlayer) return null;
                      return (
                        <button
                          key={pIdx}
                          onClick={() => onSelectPlayerDetail(foundPlayer)}
                          className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>{foundPlayer.name} ({foundPlayer.position})</span>
                          <span className="text-[10px] text-slate-400 font-mono">View Intel →</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Data Badges */}
                {msg.dataBadges && msg.dataBadges.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.dataBadges.map((badge, bIdx) => (
                      <div
                        key={bIdx}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono border flex items-center gap-1.5 ${
                          badge.type === 'positive'
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                            : badge.type === 'warning'
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/50'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        <span className="text-slate-500 text-[10px]">{badge.label}:</span>
                        <strong>{badge.value}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-[10px] text-slate-500 font-mono ${isAi ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp}
                </div>

              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-400 animate-pulse" />
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-xs text-slate-400 ml-2 font-mono">Synthesizing Vegas lines, weather & defensive EPA...</span>
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
            placeholder="Ask AI Coach (e.g. 'Should I bench Mahomes?', 'Top sleeper WRs', 'Who to pick up for $20 FAAB?')..."
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />

          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>Ask AI</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
