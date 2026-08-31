import React from 'react';

export type MetricTone = 'positive' | 'warning' | 'negative' | 'neutral' | 'highlight' | 'gold' | 'cyan' | 'purple';

interface MetricBadgeProps {
  label: string;
  value: string | number;
  tone?: MetricTone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

const TONES: Record<MetricTone, { bg: string; text: string; border: string; valueText: string }> = {
  positive: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/25',
    valueText: 'text-emerald-300 font-bold',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/25',
    valueText: 'text-amber-300 font-bold',
  },
  negative: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/25',
    valueText: 'text-rose-300 font-bold',
  },
  neutral: {
    bg: 'bg-slate-800/60',
    text: 'text-slate-400',
    border: 'border-slate-700/60',
    valueText: 'text-slate-200 font-medium',
  },
  highlight: {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    valueText: 'text-indigo-200 font-bold',
  },
  gold: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    valueText: 'text-amber-200 font-bold',
  },
  cyan: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    valueText: 'text-cyan-200 font-bold',
  },
  purple: {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    valueText: 'text-purple-200 font-bold',
  },
};

export const MetricBadge: React.FC<MetricBadgeProps> = ({
  label,
  value,
  tone = 'neutral',
  size = 'sm',
  icon,
}) => {
  const t = TONES[tone];

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-xl border backdrop-blur-sm
        ${t.bg} ${t.border}
        ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span className={`text-[11px] font-mono uppercase tracking-wider ${t.text}`}>{label}:</span>
      <span className={`font-mono ${t.valueText}`}>{value}</span>
    </div>
  );
};
