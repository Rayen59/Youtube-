import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Search,
  X,
  Sun,
  Moon,
  Shield,
  User as UserIcon,
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
  Video as VideoPlusIcon,
  Plus,
  Bell,
  Mic,
  ArrowUpLeft,
} from 'lucide-react';
import { User, Video } from '../../types';
import { MOCK_VIDEOS } from '../../data/mockVideos';

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
  onOpenCreateModal: () => void;
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
  onOpenCreateModal,
  theme,
  onToggleTheme,
  onToggleFilters,
  isFiltersOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  
  // Real search suggestions with matching thumbnails like YouTube
  const recentSearches = [
    { text: 'Intelligence Artificielle 2026', videoId: 'mk-vid-03' },
    { text: 'React & TypeScript Tutoriel', videoId: 'mk-vid-04' },
    { text: 'Tears of Steel 4K Sci-Fi', videoId: 'mk-vid-01' },
    { text: 'Big Buck Bunny Animation 3D', videoId: 'mk-vid-02' },
    { text: 'Nature & Grands Parcs 4K', videoId: 'mk-vid-05' },
    { text: 'Lo-Fi Chill Beats live', videoId: 'mk-vid-07' },
    { text: 'Speedrun Gaming Next-Gen', videoId: 'mk-vid-06' },
  ];

  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Focus mobile input when mobile search is activated
  useEffect(() => {
    if (isMobileSearchActive) {
      setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 100);
    }
  }, [isMobileSearchActive]);

  // Debounced search trigger (200ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(searchQuery);
    }, 200);

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

  const handleSelectSuggestion = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
    setIsSearchFocused(false);
    setIsMobileSearchActive(false);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
    if (isMobileSearchActive) {
      mobileInputRef.current?.focus();
    } else {
      searchInputRef.current?.focus();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    setIsSearchFocused(false);
    setIsMobileSearchActive(false);
  };

  // Find thumbnail for suggestions
  const getSuggestionThumbnail = (videoId?: string) => {
    if (!videoId) return null;
    const v = MOCK_VIDEOS.find((item) => item.id === videoId);
    return v ? v.thumbnailUrl : null;
  };

  return (
    <>
      {/* =========================================================================
          1. FULLSCREEN MOBILE SEARCH TAKEOVER (EXACT MATCH TO USER SCREENSHOT 1)
         ========================================================================= */}
      {isMobileSearchActive && (
        <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col animate-in fade-in duration-150 select-none">
          {/* Top Bar with Back Arrow + Search Input Pill + Mic */}
          <div className="h-16 px-3 flex items-center gap-2 border-b border-[#282828] bg-[#121212]">
            {/* Back button to exit mobile search */}
            <button
              onClick={() => setIsMobileSearchActive(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer shrink-0"
              title="Fermer la recherche"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Mobile Pill Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center min-w-0">
              <div className="relative flex-1 flex items-center bg-[#222222] border border-[#383838] focus-within:border-[#ff0000] rounded-full px-3.5 h-10 transition-colors">
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher sur MK..."
                  className="w-full bg-transparent text-white placeholder-zinc-400 text-base outline-none pr-8 caret-[#ff0000]"
                  autoComplete="off"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Mic Icon button */}
            <button
              type="button"
              onClick={() => {
                const sampleQueries = ['Intelligence Artificielle', 'Animation 3D', 'React TypeScript', '4K Nature'];
                const randomQ = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
                setSearchQuery(randomQ);
              }}
              className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center text-white hover:bg-white/10 shrink-0"
              title="Recherche vocale"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* Search History & Suggestions List (Exact layout of Screenshot 1) */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e1e]">
            {recentSearches
              .filter((item) =>
                searchQuery.trim()
                  ? item.text.toLowerCase().includes(searchQuery.toLowerCase().trim())
                  : true
              )
              .map((item, idx) => {
                const thumb = getSuggestionThumbnail(item.videoId);
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectSuggestion(item.text)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#1a1a1a] active:bg-[#252525] cursor-pointer transition-colors"
                  >
                    {/* Left: History Clock Icon + Query text clearly displayed in white */}
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-3">
                      <History className="w-5 h-5 text-zinc-400 shrink-0" />
                      <span className="text-white text-base font-medium truncate">
                        {item.text}
                      </span>
                    </div>

                    {/* Right: Small Thumbnail (if video) + Arrow Up-Left icon */}
                    <div className="flex items-center gap-3 shrink-0">
                      {thumb && (
                        <img
                          src={thumb}
                          alt=""
                          className="w-12 h-7 object-cover rounded-md border border-white/10"
                        />
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSearchQuery(item.text);
                          mobileInputRef.current?.focus();
                        }}
                        className="p-1.5 text-zinc-400 hover:text-white"
                        title="Remplir la recherche"
                      >
                        <ArrowUpLeft className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          2. MAIN HEADER (DESKTOP + MOBILE NORMAL - EXACT MATCH TO SCREENSHOT 2)
         ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 h-14 sm:h-16 z-40 bg-[#0f0f0f] border-b border-[#282828] shadow-md select-none">
        <div className="w-full h-full px-3 sm:px-6 flex items-center justify-between">
          
          {/* ========================================================
              LEFT: BACK ARROW + MK LOGO (YOUTUBE EXACT STYLE)
             ======================================================== */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {canGoBack && (
              <button
                onClick={onGoBack}
                title="Page précédente"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            {/* MK Logo */}
            <button
              onClick={onGoHome}
              className="flex items-center gap-2 group cursor-pointer text-left focus:outline-none shrink-0"
              title="Accueil MK Stream"
            >
              {/* Red YouTube-style badge */}
              <div className="relative w-8 h-6 sm:w-9 sm:h-7 bg-[#ff0000] rounded-lg flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
              </div>

              {/* Brand Typography */}
              <div className="flex items-baseline">
                <span className="font-black text-lg sm:text-xl tracking-tighter text-white">
                  MK
                </span>
                <span className="text-[#ff0000] font-black text-xl leading-none">.</span>
                <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase ml-1 hidden xs:inline">
                  STREAM
                </span>
              </div>
            </button>
          </div>

          {/* ========================================================
              CENTER: DESKTOP SEARCH BAR (WITH WHITE WRITING DISPLAY)
             ======================================================== */}
          <div className="hidden md:flex relative flex-1 max-w-xl lg:max-w-2xl mx-4">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full">
              <div className="relative flex-1 flex items-center min-w-0">
                <div className="absolute left-3.5 pointer-events-none text-zinc-400">
                  <Search className="w-4 h-4" />
                </div>

                {/* WRITING CLEARLY VISIBLE IN WHITE (#ffffff) */}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder="Rechercher sur MK..."
                  className="w-full h-10 bg-[#121212] hover:bg-[#181818] focus:bg-[#121212] text-white placeholder-zinc-400 text-sm rounded-l-full pl-10 pr-9 border border-[#333333] focus:border-[#ff0000] focus:ring-1 focus:ring-[#ff0000] outline-none transition-all caret-[#ff0000]"
                  autoComplete="off"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search submit button */}
              <button
                type="submit"
                title="Lancer la recherche"
                className="h-10 px-5 bg-[#222222] hover:bg-[#2c2c2c] border-y border-r border-[#333333] rounded-r-full flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Filters toggle button */}
              <button
                type="button"
                onClick={onToggleFilters}
                title="Filtres de recherche"
                className={`ml-2 h-10 w-10 rounded-full border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                  isFiltersOpen
                    ? 'bg-[#ff0000] text-white border-[#ff0000]'
                    : 'bg-[#222222] hover:bg-[#2a2a2a] text-zinc-300 hover:text-white border-[#333333]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </form>

            {/* Desktop Dropdown with White Writing and Thumbnails */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f1f1f] border border-[#383838] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {recentSearches.map((item, idx) => {
                  const thumb = getSuggestionThumbnail(item.videoId);
                  return (
                    <div
                      key={idx}
                      onMouseDown={() => handleSelectSuggestion(item.text)}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-[#2a2a2a] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-white text-sm font-medium">{item.text}</span>
                      </div>
                      {thumb && (
                        <img
                          src={thumb}
                          alt=""
                          className="w-10 h-6 object-cover rounded border border-white/10"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ========================================================
              RIGHT: MOBILE (ICONS MATCHING SCREENSHOT 2) / DESKTOP ACTIONS
             ======================================================== */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            
            {/* MOBILE ONLY: SEARCH ICON BUTTON (Opens full search like Screenshot 1) */}
            <button
              onClick={() => setIsMobileSearchActive(true)}
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer"
              title="Rechercher"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* NOTIFICATION BELL ICON (YouTube Mobile & Desktop) */}
            <button
              onClick={() => {
                if (!currentUser) {
                  onOpenAuth('login');
                }
              }}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-colors cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ff0000]" />
            </button>

            {/* DESKTOP ONLY: CRÉER BUTTON */}
            <button
              onClick={onOpenCreateModal}
              title="Créer une vidéo"
              className="hidden md:flex items-center gap-2 px-3.5 h-9 rounded-full bg-[#222222] hover:bg-[#2c2c2c] text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 text-[#ff0000]" />
              <span>Créer</span>
            </button>

            {/* THEME TOGGLE */}
            <button
              onClick={onToggleTheme}
              title="Mode clair/sombre"
              className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* USER PROFILE OR LOGIN */}
            {currentUser ? (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#ff0000] transition-all cursor-pointer focus:outline-none"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.username}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-[#ff0000]"
                  />
                </button>

                {/* Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-[#212121] border border-[#383838] rounded-2xl shadow-2xl p-2 z-50 text-white animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-3 border-b border-white/10 mb-1">
                      <div className="font-bold text-sm truncate">{currentUser.username}</div>
                      <div className="text-xs text-zinc-400 truncate">{currentUser.email}</div>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenCreateModal();
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-white bg-white/10 hover:bg-white/15 rounded-xl mb-1 flex items-center gap-2"
                    >
                      <VideoPlusIcon className="w-4 h-4 text-[#ff0000]" />
                      <span>Créer une vidéo</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-zinc-400" />
                      <span>Votre chaîne / Profil</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenLibrary('favorites');
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-white/10 rounded-xl flex items-center gap-2"
                    >
                      <Bookmark className="w-4 h-4 text-zinc-400" />
                      <span>Favoris</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-2 font-bold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* LOGIN BUTTON */
              <button
                onClick={() => onOpenAuth('login')}
                className="flex items-center gap-1.5 px-3 sm:px-4 h-8 sm:h-9 rounded-full bg-[#ff0000] hover:bg-[#e60000] text-white text-xs sm:text-sm font-bold tracking-tight shadow-sm cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Se connecter</span>
              </button>
            )}

          </div>

        </div>
      </header>
    </>
  );
};
