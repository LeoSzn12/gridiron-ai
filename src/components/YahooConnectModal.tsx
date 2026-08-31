import React, { useState, useMemo } from 'react';
import type { Player, LeagueSettings } from '../types';
import { 
  parseYahooRosterText, 
  getYahooAuthConfig, 
  saveYahooAuthConfig, 
  getYahooAuthorizationUrl, 
  fetchYahooUserLeagues,
  type YahooAuthConfig
} from '../services/yahooFantasyService';
import { GlassPanel, PositionBadge, PlayerAvatar } from './ui';
import { 
  X, 
  Sparkles, 
  ClipboardPaste, 
  Key, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Users, 
  Zap, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface YahooConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  allPlayers: Player[];
  settings: LeagueSettings;
  onImportMyRoster: (playerIds: string[], teamName?: string) => void;
  onImportOpponentRoster: (playerIds: string[], teamName?: string) => void;
  onImportWaiverTargets?: (playerIds: string[]) => void;
}

export const YahooConnectModal: React.FC<YahooConnectModalProps> = ({
  isOpen,
  onClose,
  allPlayers,
  settings,
  onImportMyRoster,
  onImportOpponentRoster,
  onImportWaiverTargets,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'oauth'>('paste');
  
  // Fast Paste State
  const [pastedText, setPastedText] = useState<string>('');
  const [customTeamName, setCustomTeamName] = useState<string>('');

  // OAuth State
  const [authConfig, setAuthConfig] = useState<YahooAuthConfig>(getYahooAuthConfig);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [oauthStatusMessage, setOauthStatusMessage] = useState<string | null>(null);
  const [userLeagues, setUserLeagues] = useState<any[]>([]);

  // Parse pasted text in real time
  const parsedResult = useMemo(() => {
    return parseYahooRosterText(pastedText, allPlayers);
  }, [pastedText, allPlayers]);

  if (!isOpen) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 65,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const handleImportAsMyRoster = () => {
    if (parsedResult.matchedPlayers.length === 0) return;
    const ids = parsedResult.matchedPlayers.map(p => p.id);
    onImportMyRoster(ids, customTeamName.trim() || undefined);
    triggerConfetti();
    onClose();
  };

  const handleImportAsOpponent = () => {
    if (parsedResult.matchedPlayers.length === 0) return;
    const ids = parsedResult.matchedPlayers.map(p => p.id);
    onImportOpponentRoster(ids, customTeamName.trim() || undefined);
    triggerConfetti();
    onClose();
  };

  const handleImportAsWaivers = () => {
    if (parsedResult.matchedPlayers.length === 0) return;
    if (onImportWaiverTargets) {
      onImportWaiverTargets(parsedResult.matchedPlayers.map(p => p.id));
    }
    triggerConfetti();
    onClose();
  };

  const handleLoadSampleYahooRoster = () => {
    const sample = `1. Lamar Jackson Bal - QB
2. Jayden Daniels Was - QB
3. Patrick Mahomes KC - QB
4. Saquon Barkley Phi - RB
5. Derrick Henry Bal - RB
6. Justin Jefferson Min - WR
7. Ja'Marr Chase Cin - WR
8. Brian Thomas Jr. Jax - WR
9. Malik Nabers NYG - WR
10. George Pickens Pit - WR
11. Brock Bowers LV - TE
12. Baltimore Ravens DEF - Bal
13. Maxx Crosby LV - DL
14. Fred Warner SF - LB
15. Kyle Hamilton Bal - DB`;
    setPastedText(sample);
    setCustomTeamName('Leo Szn (Yahoo Team)');
  };

  const handleLoadSampleOpponentRoster = () => {
    const sample = `1. Josh Allen Buf - QB
2. Jalen Hurts Phi - QB
3. C.J. Stroud Hou - QB
4. Bijan Robinson Atl - RB
5. Jahmyr Gibbs Det - RB
6. CeeDee Lamb Dal - WR
7. Amon-Ra St. Brown Det - WR
8. Garrett Wilson NYJ - WR
9. Nico Collins Hou - WR
10. Marvin Harrison Jr. Ari - WR
11. Trey McBride Ari - TE
12. San Francisco 49ers DEF - SF
13. T.J. Watt Pit - LB
14. Roquan Smith Bal - LB
15. Antoine Winfield Jr. TB - DB`;
    setPastedText(sample);
    setCustomTeamName('Championship Opponent');
  };

  const handleSaveOAuthCredentials = () => {
    saveYahooAuthConfig(authConfig);
    setOauthStatusMessage('Credentials saved locally in secure storage.');
    setTimeout(() => setOauthStatusMessage(null), 3000);
  };

  const handleInitiateOAuth = () => {
    if (!authConfig.clientId) {
      setOauthStatusMessage('Please enter your Yahoo Client ID first.');
      return;
    }
    const redirectUri = window.location.origin;
    const authUrl = getYahooAuthorizationUrl(authConfig.clientId, redirectUri);
    window.open(authUrl, '_blank', 'width=600,height=750');
    setIsAuthenticating(true);
    setOauthStatusMessage('Yahoo authorization window opened. Complete login and grant permissions.');
  };

  const handleFetchLeagues = async () => {
    if (!authConfig.accessToken) {
      setOauthStatusMessage('Please complete OAuth authentication first.');
      return;
    }
    setIsAuthenticating(true);
    try {
      const leagues = await fetchYahooUserLeagues(authConfig.accessToken);
      setUserLeagues(leagues);
      if (leagues.length === 0) {
        setOauthStatusMessage('No active NFL leagues found for this Yahoo account.');
      } else {
        setOauthStatusMessage(`Successfully retrieved ${leagues.length} Yahoo fantasy leagues!`);
      }
    } catch {
      setOauthStatusMessage('Failed to fetch Yahoo leagues. Check your access token.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl bg-slate-950 border border-purple-500/40 shadow-2xl shadow-purple-500/10 overflow-hidden my-8">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border-b border-purple-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shadow-inner">
              <span className="text-xl font-black text-purple-400 font-display">Y!</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  YAHOO FANTASY CONNECTOR
                </span>
                <span className="text-xs text-slate-400 font-mono">{settings.name}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                Plug In Your Yahoo Team & Free Agents
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6">
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'paste'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Fast Paste & Importer</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
              Instant
            </span>
          </button>

          <button
            onClick={() => setActiveTab('oauth')}
            className={`py-3.5 px-4 font-bold text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'oauth'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Yahoo OAuth 2.0 API</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono">
              Live Sync
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* TAB 1: Fast Paste Importer */}
          {activeTab === 'paste' && (
            <div className="space-y-5">
              
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-purple-200 leading-relaxed">
                <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Zero API Keys Required:</strong> Copy your roster, matchup table, or available free agent list from Yahoo Fantasy and paste it below. Our fuzzy recognition engine will match all players into Gridiron AI automatically!
                </div>
              </div>

              {/* Sample Quick Load Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-slate-400 font-bold">Quick Samples:</span>
                <button
                  onClick={handleLoadSampleYahooRoster}
                  className="px-3 py-1 text-xs rounded-xl bg-slate-900 hover:bg-purple-500/20 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>Sample Leo Szn 3-QB Roster</span>
                </button>

                <button
                  onClick={handleLoadSampleOpponentRoster}
                  className="px-3 py-1 text-xs rounded-xl bg-slate-900 hover:bg-purple-500/20 hover:text-purple-300 border border-slate-800 hover:border-purple-500/40 text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sample Opponent Roster</span>
                </button>
              </div>

              {/* Custom Team Name & Text Input */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                    Team Name (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Leo Szn (Yahoo)"
                    value={customTeamName}
                    onChange={(e) => setCustomTeamName(e.target.value)}
                    className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="relative">
                  <textarea
                    rows={7}
                    placeholder="Paste copied Yahoo roster text here... e.g.:
1. Lamar Jackson QB - BAL
2. Saquon Barkley RB - PHI
3. Justin Jefferson WR - MIN
4. Brock Bowers TE - LV
5. Baltimore Ravens DEF"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 leading-relaxed resize-none"
                  />
                  {pastedText && (
                    <button
                      onClick={() => setPastedText('')}
                      className="absolute top-3 right-3 text-xs text-slate-500 hover:text-slate-300 bg-slate-800 px-2 py-1 rounded-lg cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Real-Time Recognition Preview */}
              {pastedText.trim() && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white font-mono">
                        Recognized {parsedResult.matchedPlayers.length} of {parsedResult.totalParsed} Players
                      </span>
                    </div>

                    {parsedResult.unmatchedNames.length > 0 && (
                      <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {parsedResult.unmatchedNames.length} unmatched
                      </span>
                    )}
                  </div>

                  {/* Matched Players Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1">
                    {parsedResult.matchedPlayers.map(player => (
                      <div
                        key={player.id}
                        className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2.5"
                      >
                        <PlayerAvatar
                          name={player.name}
                          team={player.team}
                          avatarUrl={player.avatar}
                          position={player.position}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{player.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <PositionBadge position={player.position} size="xs" />
                            <span className="text-[10px] font-mono text-slate-400">{player.team}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Unmatched Notice */}
                  {parsedResult.unmatchedNames.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300 font-mono">
                      <strong>Unmatched Entries:</strong> {parsedResult.unmatchedNames.join(', ')}
                    </div>
                  )}

                  {/* Import Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                    <button
                      onClick={handleImportAsMyRoster}
                      disabled={parsedResult.matchedPlayers.length === 0}
                      className="py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      <Zap className="w-4 h-4 text-purple-200" />
                      <span>Import as My Team</span>
                    </button>

                    <button
                      onClick={handleImportAsOpponent}
                      disabled={parsedResult.matchedPlayers.length === 0}
                      className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md"
                    >
                      <Users className="w-4 h-4 text-amber-400" />
                      <span>Import as Opponent</span>
                    </button>

                    <button
                      onClick={handleImportAsWaivers}
                      disabled={parsedResult.matchedPlayers.length === 0}
                      className="py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-md"
                    >
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>Import as Free Agents</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Yahoo OAuth API Connector */}
          {activeTab === 'oauth' && (
            <div className="space-y-5">
              
              {/* Instructions Guide */}
              <GlassPanel accent="purple" className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-300 font-mono uppercase tracking-wider">
                    <Key className="w-4 h-4 text-purple-400" />
                    How to get your Yahoo API Credentials (Free)
                  </div>
                  <a
                    href="https://developer.yahoo.com/apps/create/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono hover:underline"
                  >
                    <span>Yahoo Apps Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Visit <strong className="text-white">developer.yahoo.com/apps/create/</strong> and log in.</li>
                  <li>Set App Name: <code className="text-purple-300 bg-purple-950/40 px-1 py-0.5 rounded">Gridiron AI</code>, check <strong className="text-white">Fantasy Sports (Read)</strong>.</li>
                  <li>Set Redirect URI to: <code className="text-purple-300 bg-purple-950/40 px-1 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'}</code></li>
                  <li>Copy your <strong className="text-white">Client ID</strong> and <strong className="text-white">Client Secret</strong> into the fields below.</li>
                </ol>
              </GlassPanel>

              {/* Form Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-slate-400 font-bold uppercase block mb-1">
                    Yahoo Client ID (Consumer Key):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. dj0yJmk9..."
                    value={authConfig.clientId}
                    onChange={(e) => setAuthConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-400 font-bold uppercase block mb-1">
                    Yahoo Client Secret (Consumer Secret):
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. a8f93bc..."
                    value={authConfig.clientSecret}
                    onChange={(e) => setAuthConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Status Message */}
              {oauthStatusMessage && (
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs font-mono text-purple-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{oauthStatusMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleSaveOAuthCredentials}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-all"
                >
                  Save Credentials
                </button>

                <button
                  onClick={handleInitiateOAuth}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer transition-all"
                >
                  <Key className="w-4 h-4" />
                  <span>Connect Yahoo Account</span>
                </button>

                {authConfig.accessToken && (
                  <button
                    onClick={handleFetchLeagues}
                    disabled={isAuthenticating}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAuthenticating ? 'animate-spin' : ''}`} />
                    <span>Sync Yahoo Leagues</span>
                  </button>
                )}
              </div>

              {/* User Leagues Display */}
              {userLeagues.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Your Connected Yahoo Leagues:
                  </div>
                  <div className="space-y-2">
                    {userLeagues.map((league) => (
                      <div
                        key={league.league_key}
                        className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold text-white font-display">{league.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {league.num_teams} Teams • Season {league.season} • Key: {league.league_key}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setOauthStatusMessage(`Selected league: ${league.name}`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 text-xs font-bold font-mono cursor-pointer transition-all flex items-center gap-1"
                        >
                          <span>Select Team</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Gridiron AI Yahoo Synthesis Engine</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
