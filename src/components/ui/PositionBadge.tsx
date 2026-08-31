import React from 'react';
import type { PlayerPosition } from '../../types';

interface PositionBadgeProps {
  position: PlayerPosition | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const POSITION_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  QB: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
  RB: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  WR: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  TE: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  K: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  DEF: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  DL: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  LB: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
  DB: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/30' },
  FLEX: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
};

const SIZES = {
  xs: 'px-1.5 py-0.2 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs font-bold',
  lg: 'px-3 py-1.5 text-sm font-extrabold',
};

export const PositionBadge: React.FC<PositionBadgeProps> = ({
  position,
  size = 'sm',
}) => {
  const upperPos = position.toUpperCase();
  const theme = POSITION_THEMES[upperPos] || {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center font-mono font-bold rounded-lg border
        ${theme.bg} ${theme.text} ${theme.border}
        ${SIZES[size]}
      `}
    >
      {upperPos}
    </span>
  );
};
