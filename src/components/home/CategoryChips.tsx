import React from 'react';
import { CATEGORIES } from '../../data/mockVideos';
import { Clock, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isFiltersOpen: boolean;
  sortBy: 'relevance' | 'views' | 'date' | 'duration';
  onSelectSortBy: (sort: 'relevance' | 'views' | 'date' | 'duration') => void;
  durationFilter: 'all' | 'short' | 'long';
  onSelectDurationFilter: (filter: 'all' | 'short' | 'long') => void;
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  selectedCategory,
  onSelectCategory,
  isFiltersOpen,
  sortBy,
  onSelectSortBy,
  durationFilter,
  onSelectDurationFilter,
}) => {
  return (
    <div className="space-y-3 mb-4">
      {/* Category Pills Slider (Fluid YouTube dark mode style) */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none select-none">
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'bg-[#272727] hover:bg-[#383838] text-zinc-100 hover:text-white'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      {/* Advanced Filters Expandable Bar */}
      {isFiltersOpen && (
        <div className="p-4 bg-[#1f1f1f] border border-[#333333] rounded-2xl animate-in fade-in slide-in-from-top-2 duration-150 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sort By */}
          <div>
            <span className="text-xs font-bold text-zinc-400 block mb-2 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#ff0000]" />
              Trier les vidéos par :
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'relevance', label: 'Pertinence (IA)' },
                { id: 'views', label: 'Nombre de vues' },
                { id: 'date', label: 'Date d\'ajout' },
                { id: 'duration', label: 'Durée' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSortBy(s.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    sortBy === s.id
                      ? 'bg-[#ff0000] text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Filter */}
          <div>
            <span className="text-xs font-bold text-zinc-400 block mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#ff0000]" />
              Filtre de Durée :
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Toutes les durées' },
                { id: 'short', label: '< 10 minutes' },
                { id: 'long', label: '> 10 minutes' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelectDurationFilter(d.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    durationFilter === d.id
                      ? 'bg-[#ff0000] text-white shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
