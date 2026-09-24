import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Sun,
  Moon,
  Shield,
  User as UserIcon,
  UserCircle,
  LogIn,
  UserPlus,
  LogOut,
  SlidersHorizontal,
  Bookmark,
  History,
  Download,
  Play,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { User } from '../../types';

interface HeaderProps {
  currentUser: User | null;
  canGoBack: boolean;
  onGoBack: () => void;
  onGoHome: () => void;
  onSearch: (query: string) => void;
  onOpenAuth: (initialMode?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  onOpenLibrary: (tab?: string) => void;
  onOpenProfile: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  canGoBack,
  onGoBack,
  onGoHome,
  onSearch,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  onOpenLibrary,
  onOpenProfile,
  theme,
  onToggleTheme,
  onToggleFilters,
  isFiltersOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchHistory] = useState<string[]>([
    'Intelligence Artificielle',
    'React & TypeScript',
    'Animation 3D Blender',
    'Tutoriel Vidéo MK',
  ]);

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search trigger (250ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchQuery);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery, onSearch]);

  // Click outside listener for user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectHistory = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    setIsSearchFocused(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#121212]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.6)] transition-all">
      <div className="max-w-7xl mx-auto h-full px-2 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* ========================================================
            LEFT SECTION: ALWAYS VISIBLE RETURN BUTTON + LOGO MK
           ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          
          {/* TOUJOURS VISIBLE BACK ARROW WITH ATTRACTIVE BADGE */}
          <button
            onClick={onGoBack}
            title={canGoBack ? 'Page précédente (Retour)' : 'Retour à l\'accueil'}
            className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-[#ff0000]/20 active:scale-90 border border-white/15 hover:border-[#ff0000]/50 transition-all text-white group shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-200 group-hover:text-[#ff0000] group-hover:-translate-x-0.5 transition-all" />
          </button>

          {/* VIBRANT MK LOGO */}
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 group cursor-pointer text-left select-none focus:outline-none"
            title="Accueil MK Stream"
          >
            {/* Red badge with play icon */}
            <div className="relative w-9 h-7 sm:w-10 sm:h-8 bg-gradient-to-br from-[#ff0000] via-[#ee0000] to-[#b30000] rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(255,0,0,0.5)] group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(255,0,0,0.8)] transition-all">
              <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
            </div>

            {/* Brand title */}
            <div className="flex flex-col">
              <div className="flex items-baseline">
                <span className="font-black text-lg sm:text-xl tracking-tight text-white group-hover:text-gray-100">
                  MK
                </span>
                <span className="text-[#ff0000] font-black text-xl leading-none">.</span>
              </div>
              <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase -mt-1 hidden xs:block">
                STREAM
              </span>
            </div>
          </button>

        </div>

        {/* ========================================================
            MIDDLE SECTION: HIGH-CONTRAST DISTINCT SEARCH BAR
           ======================================================== */}
        <div className="relative flex-1 max-w-2xl mx-1 sm:mx-3">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
            <div className="relative flex-1 flex items-center">
              
              {/* Magnifier icon */}
              <div className="absolute left-3.5 pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </div>

              {/* Input field */}
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Rechercher des vidéos, créateurs, sujets..."
                className="w-full bg-[#1e1e1e] hover:bg-[#252525] focus:bg-[#222222] text-xs sm:text-sm text-white placeholder-gray-400 rounded-l-full pl-10 pr-9 py-2 sm:py-2.5 border border-white/15 focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] outline-none transition-all shadow-inner"
              />

              {/* Clear button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dedicated Search Action Button */}
            <button
              type="submit"
              title="Lancer la recherche"
              className="h-[34px] sm:h-[38px] px-4 bg-[#282828] hover:bg-[#333333] border-y border-r border-white/15 rounded-r-full flex items-center justify-center text-gray-300 hover:text-white transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Filters Toggle Pill Button */}
            <button
              type="button"
              onClick={onToggleFilters}
              title="Afficher les filtres de recherche"
              className={`ml-1.5 sm:ml-2 p-2 sm:p-2.5 rounded-full border transition-all flex items-center justify-center shrink-0 ${
                isFiltersOpen
                  ? 'bg-[#ff0000] text-white border-[#ff0000] shadow-[0_0_12px_rgba(255,0,0,0.6)]'
                  : 'bg-[#1e1e1e] hover:bg-[#2a2a2a] text-gray-300 hover:text-white border-white/10'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </form>

          {/* Search Dropdown (Suggestions & History) */}
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1b1b1b] border border-white/15 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#ff0000]" />
                  Recherches rapides suggérées
                </span>
                <button
                  type="button"
                  onMouseDown={() => setIsSearchFocused(false)}
                  className="text-xs text-gray-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/5"
                >
                  Fermer
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {searchHistory.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={() => handleSelectHistory(item)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#ff0000]/20 hover:text-white text-gray-300 transition-colors flex items-center gap-1.5 border border-white/10"
                  >
                    <Search className="w-3 h-3 text-[#ff0000]" />
                    <span>{item}</span>
                  </button>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400">
                <span>Recherche instantanée MK en temps réel</span>
                <span className="text-[#ff4444] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Algorithme IA actif
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            RIGHT SECTION: THEME SWITCH + PROMINENT LOGIN BUTTON
           ======================================================== */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Theme switch button */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
            className="p-2 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* USER AUTHENTICATION STATE */}
          {currentUser ? (
            /* Logged in User Menu */
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-[#ff0000]/50 transition-all focus:outline-none"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.username}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-[#ff0000]"
                />
                <span className="text-xs font-bold text-white hidden md:inline-block max-w-[100px] truncate">
                  {currentUser.username}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#181818] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 text-white animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-3 border-b border-white/10 mb-1">
                    <div className="flex items-center gap-3">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.username}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-[#ff0000]"
                      />
                      <div className="overflow-hidden">
                        <div className="font-bold text-sm truncate flex items-center gap-1.5">
                          {currentUser.username}
                          {currentUser.role === 'admin' && (
                            <span className="text-[9px] bg-[#ff0000] text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{currentUser.email}</div>
                      </div>
                    </div>
                  </div>

                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-[#ff4444] bg-[#ff0000]/10 hover:bg-[#ff0000]/20 rounded-xl mb-1 flex items-center gap-2.5 transition-colors border border-[#ff0000]/30"
                    >
                      <Shield className="w-4 h-4 text-[#ff0000]" />
                      <span>Tableau de Bord Administrateur</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfile();
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span>Mon Profil & Dossier Isolé</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenLibrary('favorites');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Bookmark className="w-4 h-4 text-gray-400" />
                    <span>Vidéos Enregistrées (Favoris)</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenLibrary('history');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <History className="w-4 h-4 text-gray-400" />
                    <span>Historique de Visionnage</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenLibrary('downloads');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-200 hover:bg-white/10 rounded-xl flex items-center gap-2.5 transition-colors font-medium"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                    <span>Mes Téléchargements</span>
                  </button>

                  <div className="my-1 border-t border-white/10" />

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2.5 transition-colors font-bold"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Se Déconnecter</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Visitor: PROMINENT & HIGH-VISIBILITY LOG IN + SIGN UP BUTTONS */
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* PRIMARY PROMINENT "SE CONNECTER" BUTTON */}
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-gradient-to-r from-[#ff0000] to-[#d60000] hover:from-[#ff1a1a] hover:to-[#e60000] text-white text-xs sm:text-sm font-black tracking-tight shadow-[0_0_15px_rgba(255,0,0,0.5)] hover:shadow-[0_0_22px_rgba(255,0,0,0.8)] active:scale-95 transition-all border border-red-400/40 cursor-pointer"
                title="Se connecter à votre compte MK"
              >
                <LogIn className="w-4 h-4 text-white" />
                <span>Se connecter</span>
              </button>

              {/* SECONDARY "S'INSCRIRE" BUTTON */}
              <button
                onClick={() => onOpenAuth('register')}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 hover:border-white/30 active:scale-95 transition-all cursor-pointer"
                title="Créer un nouveau compte MK"
              >
                <UserPlus className="w-3.5 h-3.5 text-gray-300" />
                <span>S'inscrire</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
