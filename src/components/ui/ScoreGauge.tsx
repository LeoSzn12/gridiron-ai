import React from 'react';

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  maxScore = 100,
  label,
  size = 'md',
  showPercentage = false,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((score / maxScore) * 100)));

  // Determine color based on percentage
  const getColor = (pct: number) => {
    if (pct >= 85) return { stroke: '#10b981', text: 'text-emerald-400', glow: 'shadow-emerald-500/30' };
    if (pct >= 70) return { stroke: '#06b6d4', text: 'text-cyan-400', glow: 'shadow-cyan-500/30' };
    if (pct >= 55) return { stroke: '#f59e0b', text: 'text-amber-400', glow: 'shadow-amber-500/30' };
    return { stroke: '#f43f5e', text: 'text-rose-400', glow: 'shadow-rose-500/30' };
  };

  const color = getColor(percentage);

  const radius = size === 'sm' ? 18 : size === 'md' ? 26 : 36;
  const strokeWidth = size === 'sm' ? 3.5 : size === 'md' ? 5 : 7;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            stroke={color.stroke}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-black ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'} ${color.text}`}>
            {score}{showPercentage ? '%' : ''}
          </span>
        </div>
      </div>

      {label && (
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1 text-center font-bold">
          {label}
        </span>
      )}
    </div>
  );
};
