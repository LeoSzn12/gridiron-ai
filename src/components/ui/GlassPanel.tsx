import React from 'react';

export type GlassPanelAccent = 'slate' | 'emerald' | 'gold' | 'purple' | 'cyan' | 'rose' | 'indigo';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: GlassPanelAccent;
  elevated?: boolean;
  hoverable?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

const ACCENT_STYLES: Record<GlassPanelAccent, { border: string; glow: string; bg: string }> = {
  slate: {
    border: 'border-slate-800',
    glow: 'hover:border-slate-700 hover:shadow-slate-900/40',
    bg: 'bg-slate-900/60',
  },
  emerald: {
    border: 'border-emerald-500/30',
    glow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    bg: 'bg-gradient-to-br from-emerald-950/20 via-slate-900/80 to-slate-950',
  },
  gold: {
    border: 'border-amber-500/30',
    glow: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    bg: 'bg-gradient-to-br from-amber-950/20 via-slate-900/80 to-slate-950',
  },
  purple: {
    border: 'border-purple-500/30',
    glow: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    bg: 'bg-gradient-to-br from-purple-950/20 via-slate-900/80 to-slate-950',
  },
  cyan: {
    border: 'border-cyan-500/30',
    glow: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
    bg: 'bg-gradient-to-br from-cyan-950/20 via-slate-900/80 to-slate-950',
  },
  rose: {
    border: 'border-rose-500/30',
    glow: 'hover:border-rose-500/50 hover:shadow-rose-500/10',
    bg: 'bg-gradient-to-br from-rose-950/20 via-slate-900/80 to-slate-950',
  },
  indigo: {
    border: 'border-indigo-500/30',
    glow: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
    bg: 'bg-gradient-to-br from-indigo-950/20 via-slate-900/80 to-slate-950',
  },
};

export const GlassPanel: React.FC<GlassPanelProps> = ({
  accent = 'slate',
  elevated = false,
  hoverable = false,
  glow = false,
  className = '',
  children,
  ...props
}) => {
  const accentStyle = ACCENT_STYLES[accent];

  return (
    <div
      className={`
        rounded-3xl border backdrop-blur-xl transition-all duration-200
        ${accentStyle.border}
        ${accentStyle.bg}
        ${elevated ? 'shadow-2xl shadow-black/60 ring-1 ring-white/5' : 'shadow-lg shadow-black/40'}
        ${hoverable ? `${accentStyle.glow} hover:-translate-y-0.5 cursor-pointer` : ''}
        ${glow ? 'shadow-lg' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
