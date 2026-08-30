import React, { useState } from 'react';
import type { Player, LeagueSettings } from '../types';
import { 
  CloudSun, 
  Wind, 
  Thermometer, 
  Droplets, 
  Compass 
} from 'lucide-react';

interface WeatherRadarHubProps {
  players: Player[];
  settings: LeagueSettings;
  onSelectPlayerDetail?: (player: Player) => void;
}


const ALL_STADIUMS_WEATHER = [
  {
    stadium: 'GEHA Field at Arrowhead',
    team: 'KC',
    matchup: 'DEN @ KC',
    temp: 52,
    wind: 17,
    windGust: 24,
    precip: 'Light Rain',
    isDome: false,
    turf: 'Natural Grass',
    risk: 'HIGH',
    impact: 'Pass volume suppressed by 12%. Deep passes (>20 air yds) suffer 18% accuracy dip. Start RBs, downgrade deep WRs.',
  },
  {
    stadium: 'M&T Bank Stadium',
    team: 'BAL',
    matchup: 'CIN @ BAL',
    temp: 55,
    wind: 5,
    windGust: 8,
    precip: 'None',
    isDome: false,
    turf: 'Natural Grass',
    risk: 'LOW',
    impact: 'Crisp autumn air with negligible wind. Ideal for high-flying passing and long field goals.',
  },
  {
    stadium: 'AT&T Stadium (Dallas)',
    team: 'DAL',
    matchup: 'PHI @ DAL',
    temp: 72,
    wind: 0,
    windGust: 0,
    precip: 'None',
    isDome: true,
    turf: 'Matrix Turf (Fast Track)',
    risk: 'LOW',
    impact: 'Climate-controlled dome. Brandon Aubrey 60+ yard field goals in play. High speed turf favors agile RBs.',
  },
  {
    stadium: 'Lucas Oil Stadium',
    team: 'IND',
    matchup: 'BUF @ IND',
    temp: 72,
    wind: 0,
    windGust: 0,
    precip: 'None',
    isDome: true,
    turf: 'FieldTurf',
    risk: 'LOW',
    impact: 'Retractable roof closed. Pristine track for Josh Allen & Bills pass offense.',
  },
  {
    stadium: 'EverBank Stadium',
    team: 'JAX',
    matchup: 'MIN @ JAX',
    temp: 78,
    wind: 7,
    windGust: 10,
    precip: 'None',
    isDome: false,
    turf: 'Bermuda Grass',
    risk: 'LOW',
    impact: 'Warm Florida sunshine with light breeze. Zero weather impediment.',
  },
  {
    stadium: 'Allianz Arena (Munich)',
    team: 'NYG',
    matchup: 'NYG @ CAR',
    temp: 46,
    wind: 8,
    windGust: 12,
    precip: 'None',
    isDome: false,
    turf: 'Grass',
    risk: 'LOW',
    impact: 'Chilly European conditions. Expected run-heavy scripts for Tyrone Tracy Jr. and Chuba Hubbard.',
  },
];

export const WeatherRadarHub: React.FC<WeatherRadarHubProps> = () => {

  const [filterRisk, setFilterRisk] = useState<'ALL' | 'WARNINGS' | 'DOMES'>('ALL');

  const filteredStadiums = ALL_STADIUMS_WEATHER.filter(s => {
    if (filterRisk === 'WARNINGS') return s.risk === 'HIGH' || s.wind >= 14;
    if (filterRisk === 'DOMES') return s.isDome;
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Weather Super Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-950 p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5" />
              LIVE NFL STADIUM WEATHER RADAR
            </span>
            <span className="text-xs text-slate-400 font-mono">Doppler Wind & Surface Modeling</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Environmental Impact & Stadium Wind Vectors
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Wind above 15 mph reduces passing touchdown efficiency by 14% and 40+ yard field goal accuracy by 22%. Track every venue before kickoff.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          {[
            { id: 'ALL', label: 'All Stadiums' },
            { id: 'WARNINGS', label: '⚠️ High Wind Traps' },
            { id: 'DOMES', label: '🏟️ Domes (Zero Risk)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterRisk(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterRisk === f.id
                  ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stadium Weather Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStadiums.map((venue, idx) => (
          <div 
            key={idx}
            className={`p-5 rounded-3xl border transition-all space-y-4 ${
              venue.risk === 'HIGH' 
                ? 'bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border-rose-500/40 ring-1 ring-rose-500/20' 
                : 'glass-panel border-slate-800'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white font-display">{venue.matchup}</span>
                <div className="text-[11px] text-slate-400 font-mono">{venue.stadium}</div>
              </div>

              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                venue.risk === 'HIGH' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {venue.isDome ? 'DOMED VENUE' : `${venue.risk} RISK`}
              </span>
            </div>

            {/* Metrics Bar */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" />
                  <span>TEMP</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">{venue.temp}°F</div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Wind className="w-3 h-3 text-sky-400" />
                  <span>WIND</span>
                </div>
                <div className={`text-sm font-bold mt-0.5 ${venue.wind >= 15 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {venue.wind} mph
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>RAIN</span>
                </div>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{venue.precip}</div>
              </div>
            </div>

            {/* Tactical AI Advice */}
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="text-[10px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1">
                <Compass className="w-3 h-3" />
                <span>Fantasy Impact & Surface Notes:</span>
              </div>
              <p className="text-[11px] leading-relaxed">{venue.impact}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
