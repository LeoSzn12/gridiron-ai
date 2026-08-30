import React, { useState, useEffect } from 'react';
import type { Player, LeagueSettings, AudioBriefingScript } from '../types';
import { generateAudioBriefing } from '../services/aiEngine';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Mic 
} from 'lucide-react';

interface AIAudioBriefingProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail?: (player: Player) => void;
}

export const AIAudioBriefing: React.FC<AIAudioBriefingProps> = ({
  players,
  settings,
}) => {
  const briefing: AudioBriefingScript = generateAudioBriefing(players, settings);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);


  // Web Speech API Integration
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      const textToSpeak = briefing.paragraphs.slice(currentParagraphIndex).join(' ');
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = playbackRate;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentParagraphIndex(0);
      };

      utterance.onerror = () => {
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isPlaying, playbackRate]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setCurrentParagraphIndex(0);
  };

  return (
    <div className="space-y-6">
      
      {/* Super Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              AI AUDIO PODCAST & MORNING BRIEFING
            </span>
            <span className="text-xs text-slate-400 font-mono">Neural Voice Synthesizer</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            {briefing.title}
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Synthesizes all overnight Vegas lines, weather alerts, and 3-QB VORP rankings into an episodic spoken gameday radio show.
          </p>
        </div>

        {/* Host Badge */}
        <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-display">{briefing.hostName}</div>
            <div className="text-[10px] font-mono text-slate-400">{briefing.leagueContext}</div>
          </div>
        </div>
      </div>

      {/* Audio Visualizer & Player Card */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-6">
        
        {/* Animated Waveform Visualizer */}
        <div className="h-20 bg-slate-950/90 rounded-2xl p-4 border border-slate-800 flex items-center justify-center gap-1.5 overflow-hidden">
          {[20, 45, 80, 60, 30, 95, 70, 40, 85, 100, 65, 35, 90, 75, 45, 95, 60, 30, 80, 50, 25, 70, 90, 40].map((height, i) => (
            <div
              key={i}
              className={`w-2 rounded-full transition-all duration-200 ${
                isPlaying ? 'bg-gradient-to-t from-purple-500 to-emerald-400 animate-pulse' : 'bg-slate-800'
              }`}
              style={{
                height: isPlaying ? `${Math.max(15, (height * Math.random()) + 20)}%` : '20%',
              }}
            ></div>
          ))}
        </div>

        {/* Player Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isPlaying ? 'Pause Briefing' : 'Play Audio Briefing'}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
              title="Reset Audio"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Playback Speed Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-500 text-[10px] uppercase px-2">Speed:</span>
            {[1.0, 1.25, 1.5].map(rate => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2.5 py-1 rounded-xl cursor-pointer ${
                  playbackRate === rate ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Spoken Transcript Paragraphs */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Spoken Briefing Transcript:</div>
          <div className="space-y-3">
            {briefing.paragraphs.map((para, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border transition-all text-xs leading-relaxed ${
                  isPlaying && currentParagraphIndex === idx
                    ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-lg'
                    : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-purple-400 font-bold shrink-0">
                    0{idx + 1}
                  </span>
                  <p>{para}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
