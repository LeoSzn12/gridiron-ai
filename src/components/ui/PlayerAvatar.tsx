import React, { useState } from 'react';
import type { PlayerPosition } from '../../types';
import { Star } from 'lucide-react';

interface PlayerAvatarProps {
  avatarUrl?: string;
  name?: string;
  position: PlayerPosition | string;
  team: string;
  isMyTeam?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTeamBadge?: boolean;
}

const SIZES = {
  sm: { container: 'w-8 h-8 rounded-lg', text: 'text-xs', badge: 'text-[9px] -bottom-1 -right-1' },
  md: { container: 'w-11 h-11 rounded-xl', text: 'text-sm', badge: 'text-[10px] -bottom-1.5 -right-1.5' },
  lg: { container: 'w-14 h-14 rounded-2xl', text: 'text-base', badge: 'text-xs -bottom-2 -right-2' },
  xl: { container: 'w-20 h-20 rounded-3xl', text: 'text-xl', badge: 'text-xs -bottom-2.5 -right-2.5' },
};

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  avatarUrl,
  name = '',
  position,
  team,
  isMyTeam = false,
  size = 'md',
  showTeamBadge = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const sizeConfig = SIZES[size];

  const safeName = name || position || 'PL';
  const initials = safeName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={`
          ${sizeConfig.container} overflow-hidden bg-slate-800 border border-slate-700/80
          flex items-center justify-center font-bold text-slate-300 font-mono shadow-inner
          ${isMyTeam ? 'ring-2 ring-emerald-500/80 shadow-emerald-500/20' : ''}
        `}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <span className={sizeConfig.text}>{initials || position}</span>
        )}
      </div>

      {/* Team Badge Pill */}
      {showTeamBadge && (
        <span
          className={`
            absolute ${sizeConfig.badge} px-1.5 py-0.2 rounded-md font-mono font-black
            bg-slate-900 border border-slate-700 text-slate-200 shadow-md
          `}
        >
          {team}
        </span>
      )}

      {/* My Team Indicator Star */}
      {isMyTeam && (
        <div
          className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md shadow-emerald-500/40"
          title="On Your Active Roster"
        >
          <Star className="w-2.5 h-2.5 fill-current" />
        </div>
      )}
    </div>
  );
};
