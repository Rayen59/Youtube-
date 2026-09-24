/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SplashScreen } from './components/common/SplashScreen';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { CategoryChips } from './components/home/CategoryChips';
import { VideoCard } from './components/video/VideoCard';
import { VideoWatchView } from './components/video/VideoWatchView';
import { TrendingView } from './components/home/TrendingView';
import { SubscriptionsView } from './components/home/SubscriptionsView';
import { UserLibraryView } from './components/user/UserLibraryView';
import { UserProfileView } from './components/user/UserProfileView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AuthModal } from './components/auth/AuthModal';
import { Video, User } from './types';
import { MOCK_VIDEOS } from './data/mockVideos';
import {
  initializeNamespaceSystem,
  getCurrentSession,
  clearSession,
  logUserActivity,
} from './storage/userNamespace';
import { getPersonalizedRecommendations } from './services/recommendationEngine';
import { Sparkles, Flame, Tv, Film } from 'lucide-react';

interface NavigationState {
  view: 'home' | 'watch' | 'trending' | 'subscriptions' | 'library' | 'profile' | 'admin';
  selectedVideo?: Video;
  libraryTab?: string;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Navigation state & history stack for the ALWAYS VISIBLE back arrow
  const [currentNav, setCurrentNav] = useState<NavigationState>({ view: 'home' });
  const [historyStack, setHistoryStack] = useState<NavigationState[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'views' | 'date' | 'duration'>('relevance');
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'long'>('all');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authRestrictionMessage, setAuthRestrictionMessage] = useState<string | null>(null);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);

  // Perceived loading simulation for skeleton cards
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Initialize storage & session
  useEffect(() => {
    initializeNamespaceSystem().then(() => {
      const session = getCurrentSession();
      if (session) {
        setCurrentUser(session);
      }
    });
  }, []);

  // Sync theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#0f0f0f';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f9f9f9';
    }
  }, [theme]);

  // Navigate to a new state and push to history
  const navigateTo = useCallback((nextState: NavigationState) => {
    setHistoryStack((prev) => [...prev, currentNav]);
    setCurrentNav(nextState);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentNav]);

  // ALWAYS VISIBLE BACK BUTTON HANDLER
  const handleGoBack = useCallback(() => {
    if (isAdminDashboardOpen) {
      setIsAdminDashboardOpen(false);
      return;
    }

    if (historyStack.length > 0) {
      const previousState = historyStack[historyStack.length - 1];
      setHistoryStack((prev) => prev.slice(0, -1));
      setCurrentNav(previousState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // If stack is empty, return to home
      setCurrentNav({ view: 'home' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [historyStack, isAdminDashboardOpen]);

  const handleGoHome = useCallback(() => {
    if (currentNav.view !== 'home' || currentNav.selectedVideo) {
      navigateTo({ view: 'home' });
    }
    setSearchQuery('');
    setSelectedCategory('Tous');
    setIsAdminDashboardOpen(false);
  }, [currentNav, navigateTo]);

  // Video selection
  const handleSelectVideo = useCallback((video: Video) => {
    navigateTo({ view: 'watch', selectedVideo: video });
  }, [navigateTo]);

  // Trigger Auth modal with optional restriction warning
  const handleRequireAuth = (message: string) => {
    setAuthRestrictionMessage(message);
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthRestrictionMessage(null);
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    setIsAdminDashboardOpen(false);
    if (currentNav.view === 'profile' || currentNav.view === 'admin') {
      setCurrentNav({ view: 'home' });
    }
  };

  // Search handler with simulated loader
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (currentUser && query.trim().length > 2) {
      logUserActivity(currentUser.id, {
        action: 'search',
        searchQuery: query.trim(),
      });
    }
  };

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    return MOCK_VIDEOS.filter((v) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = v.title.toLowerCase().includes(q);
        const matchesDesc = v.description.toLowerCase().includes(q);
        const matchesChannel = v.channelTitle.toLowerCase().includes(q);
        const matchesTag = v.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesChannel && !matchesTag) {
          return false;
        }
      }

      // 2. Category
      if (selectedCategory !== 'Tous' && v.category !== selectedCategory) {
        return false;
      }

      // 3. Duration filter
      if (durationFilter === 'short' && v.duration >= 600) return false;
      if (durationFilter === 'long' && v.duration < 600) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'duration') return b.duration - a.duration;
      if (sortBy === 'date') return 0; // maintain upload freshness
      return 0;
    });
  }, [searchQuery, selectedCategory, durationFilter, sortBy]);

  // Personalized recommendations
  const aiRecommended = useMemo(() => {
    return getPersonalizedRecommendations(currentUser ? currentUser.id : null);
  }, [currentUser]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-[#f4f4f5] text-black'} selection:bg-[#ff0000] selection:text-white transition-colors`}>
      
      {/* 1. SPLASH SCREEN (2 seconds animation) */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* 2. FIXED HEADER */}
      <Header
        currentUser={currentUser}
        canGoBack={historyStack.length > 0 || currentNav.view !== 'home'}
        onGoBack={handleGoBack}
        onGoHome={handleGoHome}
        onSearch={handleSearch}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminDashboardOpen(true)}
        onOpenLibrary={(tab) => navigateTo({ view: 'library', libraryTab: tab })}
        onOpenProfile={() => navigateTo({ view: 'profile' })}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onToggleFilters={() => setIsFiltersOpen(!isFiltersOpen)}
        isFiltersOpen={isFiltersOpen}
      />

      {/* 3. MAIN WORKSPACE WITH DESKTOP SIDEBAR / MOBILE BOTTOM NAV */}
      <div className="pt-16 pb-20 md:pb-6 flex min-h-[calc(100vh-64px)]">
        
        {/* Navigation Component */}
        <Navigation
          currentView={currentNav.view}
          onNavigate={(view) => navigateTo({ view: view as any })}
          currentUser={currentUser}
          onOpenAdmin={() => setIsAdminDashboardOpen(true)}
          onRequireAuth={handleRequireAuth}
        />

        {/* Dynamic Center Stage Content */}
        <main className="flex-1 md:ml-56 lg:ml-64 px-3 sm:px-6 py-4 overflow-x-hidden">
          
          {/* VIEW: HOME FEED */}
          {currentNav.view === 'home' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Category Pills & Filters */}
              <CategoryChips
                selectedCategory={selectedCategory}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                  setIsLoadingFeed(true);
                  setTimeout(() => setIsLoadingFeed(false), 200);
                }}
                isFiltersOpen={isFiltersOpen}
                sortBy={sortBy}
                onSelectSortBy={setSortBy}
                durationFilter={durationFilter}
                onSelectDurationFilter={setDurationFilter}
              />

              {/* SECTION: RECOMMANDÉ POUR VOUS (IA) */}
              {!searchQuery && selectedCategory === 'Tous' && (
                <div className="p-4 sm:p-5 bg-gradient-to-br from-[#181818] via-[#1a1a1a] to-[#202020] rounded-3xl border border-white/10 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#ff0000]" />
                        <span>Recommandé pour vous (Intelligence Artificielle MK)</span>
                      </h2>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {currentUser
                          ? `Sélection personnalisée selon vos ${currentUser.username ? 'goûts' : ''} et votre historique récent`
                          : 'Tendances calculées en continu par notre algorithme de recommandation'}
                      </p>
                    </div>

                    <span className="text-[11px] font-mono text-[#ff4444] bg-[#ff0000]/10 border border-[#ff0000]/20 px-2.5 py-1 rounded-full self-start sm:self-center font-bold">
                      Algorithme Hybride v2.4
                    </span>
                  </div>

                  {/* Top 3 AI Picks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {aiRecommended.slice(0, 3).map(({ video, matchReasons }) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        onSelect={handleSelectVideo}
                        recommendationReason={matchReasons[0]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ALL VIDEOS GRID */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {searchQuery ? `Résultats pour "${searchQuery}"` : 'Toutes les Vidéos'}
                  </h2>
                  <span className="text-xs text-gray-400 font-medium">
                    {filteredVideos.length} vidéos disponibles
                  </span>
                </div>

                {filteredVideos.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm">
                    Aucune vidéo trouvée pour ces critères de recherche.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isLoading={isLoadingFeed}
                        onSelect={handleSelectVideo}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW: WATCH VIDEO */}
          {currentNav.view === 'watch' && currentNav.selectedVideo && (
            <VideoWatchView
              video={currentNav.selectedVideo}
              currentUser={currentUser}
              onSelectVideo={handleSelectVideo}
              onRequireAuth={handleRequireAuth}
            />
          )}

          {/* VIEW: TRENDING */}
          {currentNav.view === 'trending' && (
            <TrendingView onSelectVideo={handleSelectVideo} />
          )}

          {/* VIEW: SUBSCRIPTIONS */}
          {currentNav.view === 'subscriptions' && (
            <SubscriptionsView
              currentUser={currentUser}
              onSelectVideo={handleSelectVideo}
            />
          )}

          {/* VIEW: LIBRARY */}
          {currentNav.view === 'library' && (
            <UserLibraryView
              currentUser={currentUser}
              initialTab={currentNav.libraryTab || 'history'}
              onSelectVideo={handleSelectVideo}
              onRequireAuth={handleRequireAuth}
            />
          )}

          {/* VIEW: PROFILE & ISOLATED NAMESPACE */}
          {currentNav.view === 'profile' && (
            <UserProfileView
              currentUser={currentUser}
              onRequireAuth={handleRequireAuth}
            />
          )}

        </main>
      </div>

      {/* 4. ADMIN DASHBOARD MODAL */}
      {isAdminDashboardOpen && (
        <AdminDashboard
          currentUser={currentUser}
          onClose={() => setIsAdminDashboardOpen(false)}
          onSelectVideo={(id) => {
            const v = MOCK_VIDEOS.find(vid => vid.id === id);
            if (v) {
              setIsAdminDashboardOpen(false);
              handleSelectVideo(v);
            }
          }}
        />
      )}

      {/* 5. AUTHENTICATION MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
        }}
        restrictionMessage={authRestrictionMessage}
      />

    </div>
  );
}
