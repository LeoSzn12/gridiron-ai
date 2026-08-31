import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onResetFilters?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Matching Players Found',
  description = 'No players match your active search and filter criteria. Try broadening your query or clearing filters.',
  onResetFilters,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-md">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        {icon || <SearchX className="w-7 h-7 text-slate-400" />}
      </div>

      <h3 className="text-lg font-bold text-white font-display mb-1.5">{title}</h3>
      <p className="text-xs text-slate-400 max-w-md mb-6">{description}</p>

      {onResetFilters && (
        <button
          onClick={onResetFilters}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-bold text-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-md hover:text-white"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Filters</span>
        </button>
      )}
    </div>
  );
};
