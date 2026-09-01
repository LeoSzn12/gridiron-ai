import React, { useState } from 'react';
import type { LeagueSettings } from '../types';
import { LEO_SZN_YAHOO_PRESET, STANDARD_PPR_PRESET, HALF_PPR_10_PRESET, DFS_PROPS_PRESET } from '../data/mockData';
import { 
  X, 
  Settings, 
  Sparkles, 
  Check, 
  RotateCcw 
} from 'lucide-react';


interface LeagueSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: LeagueSettings;
  onSaveSettings: (newSettings: LeagueSettings) => void;
}

export const LeagueSettingsModal: React.FC<LeagueSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [currentSettings, setCurrentSettings] = useState<LeagueSettings>(settings);
  const [activeTab, setActiveTab] = useState<'roster' | 'offense' | 'defense' | 'idp'>('roster');

  if (!isOpen) return null;

  const handleApplyPreset = (preset: LeagueSettings) => {
    setCurrentSettings(preset);
  };

  const handleSave = () => {
    onSaveSettings(currentSettings);
    onClose();
  };

  const PRESETS = [
    { preset: LEO_SZN_YAHOO_PRESET, label: 'Leo Szn 8-Team 3-QB (Yahoo Custom)', highlight: true },
    { preset: STANDARD_PPR_PRESET, label: 'Standard 12-Team PPR' },
    { preset: HALF_PPR_10_PRESET, label: '10-Team Half-PPR (Sleeper)' },
    { preset: DFS_PROPS_PRESET, label: 'DFS & Props (PrizePicks / Underdog)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl glass-panel-elevated border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Settings className="w-3.5 h-3.5" />
              LEAGUE CUSTOMIZER
            </span>
            <span className="text-xs text-slate-400">Match Exact Platform Rules & Scoring</span>
          </div>
          <h2 className="text-2xl font-bold text-white font-display mt-1">League Settings & Custom Scoring</h2>
          <p className="text-xs text-slate-300">
            Every projection, VORP value, and AI recommendation will immediately adapt to these rules.
          </p>
        </div>

        {/* 1-Click Presets */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Quick Presets</span>
            <span className="text-emerald-400 text-[10px]">1-Click Sync</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(({ preset, label, highlight }) => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`px-3 py-2 rounded-xl text-xs font-bold font-display flex items-center gap-2 border transition-all cursor-pointer ${
                  currentSettings.id === preset.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                {highlight && <Sparkles className="w-4 h-4" />}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          {[
            { id: 'roster', label: 'Roster Positions (3 QB, 5 WR)' },
            { id: 'offense', label: 'Offense Scoring (50 yd / 6pt TD)' },
            { id: 'defense', label: 'Kickers & Team DEF' },
            { id: 'idp', label: 'IDP Players (DL, LB, DB)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. Roster Tab */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">Number of Teams in League:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="4"
                  max="20"
                  value={currentSettings.numTeams}
                  onChange={(e) => setCurrentSettings({ ...currentSettings, numTeams: Number(e.target.value) })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-xs text-slate-400">teams</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Starting QBs', field: 'qb', value: currentSettings.roster.qb, highlight: true },
                { label: 'Starting RBs', field: 'rb', value: currentSettings.roster.rb },
                { label: 'Starting WRs', field: 'wr', value: currentSettings.roster.wr, highlight: true },
                { label: 'Starting TEs', field: 'te', value: currentSettings.roster.te },
                { label: 'Kickers (K)', field: 'k', value: currentSettings.roster.k },
                { label: 'Defenses (DEF)', field: 'def', value: currentSettings.roster.def },
                { label: 'Defensive Backs (DB)', field: 'db', value: currentSettings.roster.db },
                { label: 'Defensive Linemen (DL)', field: 'dl', value: currentSettings.roster.dl },
                { label: 'Linebackers (LB)', field: 'lb', value: currentSettings.roster.lb },
                { label: 'Bench Spots (BN)', field: 'bench', value: currentSettings.roster.bench },
                { label: 'Injured Reserve (IR)', field: 'ir', value: currentSettings.roster.ir },
              ].map((pos) => (
                <div key={pos.field} className={`p-3 rounded-xl border ${pos.highlight ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-slate-900/60 border-slate-800'} flex items-center justify-between`}>
                  <span className="text-xs text-slate-300">{pos.label}:</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={pos.value}
                    onChange={(e) => setCurrentSettings({
                      ...currentSettings,
                      roster: { ...currentSettings.roster, [pos.field]: Number(e.target.value) }
                    })}
                    className="w-12 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Offense Scoring Tab */}
        {activeTab === 'offense' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Passing Yards per Point:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.passYardsPerPoint}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, passYardsPerPoint: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">yds/pt</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Passing Touchdown:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.passTouchdown}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, passTouchdown: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Interceptions (INT):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.interception}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, interception: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-rose-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Pick Six Thrown:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.pickSixThrown}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, pickSixThrown: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-rose-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Rushing Yards per Point:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.rushYardsPerPoint}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, rushYardsPerPoint: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">yds/pt</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Rushing Touchdown:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.rushTouchdown}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, rushTouchdown: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Receiving Yards per Point:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.recYardsPerPoint}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, recYardsPerPoint: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">yds/pt</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Receiving Touchdown:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.recTouchdown}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, recTouchdown: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Point Per Reception (PPR):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  value={currentSettings.offense.receptionsPPR}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, receptionsPPR: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-emerald-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-300">Fumbles Lost:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={currentSettings.offense.fumblesLost}
                  onChange={(e) => setCurrentSettings({
                    ...currentSettings,
                    offense: { ...currentSettings.offense, fumblesLost: Number(e.target.value) }
                  })}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-rose-400"
                />
                <span className="text-slate-500">pts</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Defense & Kicker Tab */}
        {activeTab === 'defense' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Sack (DEF)', key: 'sack', obj: 'defTeam', color: 'text-emerald-400' },
              { label: 'Interception / Fumble Rec', key: 'interception', obj: 'defTeam', color: 'text-emerald-400' },
              { label: 'Defensive / Return TD', key: 'touchdown', obj: 'defTeam', color: 'text-emerald-400' },
              { label: '60+ Yard Field Goal (K)', key: 'fg60Plus', obj: 'kicker', color: 'text-emerald-400' },
              { label: '50-59 Yard Field Goal (K)', key: 'fg50Plus', obj: 'kicker', color: 'text-emerald-400' },
              { label: 'Missed PAT (K)', key: 'patMissed', obj: 'kicker', color: 'text-rose-400' },
            ].map(({ label, key, obj, color }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">{label}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={(currentSettings as any)[obj][key]}
                    onChange={(e) => setCurrentSettings({
                      ...currentSettings,
                      [obj]: { ...(currentSettings as any)[obj], [key]: Number(e.target.value) }
                    })}
                    className={`w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold ${color}`}
                  />
                  <span className="text-slate-500">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. IDP Tab */}
        {activeTab === 'idp' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {[
              { label: 'IDP Sack', key: 'sack', color: 'text-emerald-400' },
              { label: 'IDP Interception', key: 'interception', color: 'text-emerald-400' },
              { label: 'IDP Forced Fumble', key: 'fumbleForce', color: 'text-emerald-400' },
              { label: 'IDP Solo Tackle', key: 'soloTackle', color: 'text-emerald-400' },
            ].map(({ label, key, color }) => (
              <div key={label} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">{label}:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    value={(currentSettings.idp as any)[key]}
                    onChange={(e) => setCurrentSettings({
                      ...currentSettings,
                      idp: { ...currentSettings.idp, [key]: Number(e.target.value) }
                    })}
                    className={`w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold ${color}`}
                  />
                  <span className="text-slate-500">pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={() => setCurrentSettings(LEO_SZN_YAHOO_PRESET)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Leo Szn Yahoo</span>
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save & Recalculate Projections</span>
          </button>
        </div>
      </div>
    </div>
  );
};
