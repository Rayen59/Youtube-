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
import { CreateVideoModal } from './components/video/CreateVideoModal';
import { Video, User, UserFavorites } from './types';
import { MOCK_VIDEOS } from './data/mockVideos';
import {
  initializeNamespaceSystem,
  getCurrentSession,
  clearSession,
  deleteUserAccount,
  logUserActivity,
  getUserFile,
  saveUserFile,
} from './storage/userNamespace';
import {
  getCustomVideos,
  saveCustomVideo,
  updateCustomVideo,
  deleteCustomVideo,
  getDeletedVideoIds,
  hydrateGalleryVideos,
} from './services/customVideosStorage';
import { CheckCircle2, Video as VideoIcon } from 'lucide-react';

interface NavigationState {
  view: 'home' | 'watch' | 'trending' | 'subscriptions' | 'library' | 'profile' | 'admin';
  selectedVideo?: Video;
  libraryTab?: string;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Custom user created videos & deleted IDs
  const [customVideos, setCustomVideos] = useState<Video[]>([]);
  const [deletedVideoIds, setDeletedVideoIds] = useState<string[]>([]);

  // Navigation state & history stack
  const [currentNav, setCurrentNav] = useState<NavigationState>({ view: 'home' });
  const [historyStack, setHistoryStack] = useState<NavigationState[]>([]);
  const [watchControlsVisible, setWatchControlsVisible] = useState(false);

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Perceived loading simulation for smooth skeleton cards
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Initialize storage, session & custom videos
  useEffect(() => {
    initializeNamespaceSystem().then(() => {
      const session = getCurrentSession();
      if (session) {
        setCurrentUser(session);
      }
    });
    setDeletedVideoIds(getDeletedVideoIds());
    hydrateGalleryVideos().then((hydrated) => {
      setCustomVideos(hydrated);
    }).catch(() => {
      setCustomVideos(getCustomVideos());
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Combine default mock videos and user created videos, excluding deleted ones
  const allVideos = useMemo(() => {
    const customIds = new Set(customVideos.map((v) => v.id));
    const defaults = MOCK_VIDEOS.filter((v) => !customIds.has(v.id) && !deletedVideoIds.includes(v.id));
    return [...customVideos.filter((v) => !deletedVideoIds.includes(v.id)), ...defaults];
  }, [customVideos, deletedVideoIds]);

  // User's own publications for Profile & Studio
  const userOwnedVideos = useMemo(() => {
    return allVideos.filter(
      (v) =>
        v.isFromGallery ||
        v.id.startsWith('vid-custom-') ||
        (currentUser && (v.creatorId === currentUser.id || v.channelTitle === currentUser.username))
    );
  }, [allVideos, currentUser]);

  // Check if current user can edit/delete a video publication
  const canManageVideo = useCallback(
    (video: Video): boolean => {
      if (video.isFromGallery || video.id.startsWith('vid-custom-')) return true;
      if (!currentUser) return false;
      if (currentUser.role === 'admin') return true;
      return video.creatorId === currentUser.id || video.channelTitle === currentUser.username;
    },
    [currentUser]
  );

  // Navigate to a new state and push to history
  const navigateTo = useCallback((nextState: NavigationState) => {
    setHistoryStack((prev) => [...prev, currentNav]);
    setCurrentNav(nextState);
    if (nextState.view === 'watch') {
      setWatchControlsVisible(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentNav]);

  // Back button handler
  const handleGoBack = useCallback(() => {
    if (isAdminDashboardOpen) {
      setIsAdminDashboardOpen(false);
      return;
    }
    if (isCreateModalOpen) {
      setIsCreateModalOpen(false);
      setEditingVideo(null);
      return;
    }

    if (historyStack.length > 0) {
      const previousState = historyStack[historyStack.length - 1];
      setHistoryStack((prev) => prev.slice(0, -1));
      setCurrentNav(previousState);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setCurrentNav({ view: 'home' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [historyStack, isAdminDashboardOpen, isCreateModalOpen]);

  const handleGoHome = useCallback(() => {
    if (currentNav.view !== 'home' || currentNav.selectedVideo) {
      navigateTo({ view: 'home' });
    }
    setSearchQuery('');
    setSelectedCategory('Tous');
    setIsAdminDashboardOpen(false);
    setIsCreateModalOpen(false);
    setEditingVideo(null);
  }, [currentNav, navigateTo]);

  // Video selection
  const handleSelectVideo = useCallback((video: Video) => {
    setWatchControlsVisible(false);
    navigateTo({ view: 'watch', selectedVideo: video });
  }, [navigateTo]);

  // Trigger Auth modal with restriction warning
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
    showToast('Vous avez été déconnecté.');
  };

  // Handle Account Deletion
  const handleAccountDeleted = () => {
    if (currentUser) {
      deleteUserAccount(currentUser.id);
    }
    setCurrentUser(null);
    setIsAdminDashboardOpen(false);
    setCurrentNav({ view: 'home' });
    showToast('Votre compte et toutes vos données ont été supprimés définitivement.');
  };

  // Search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (currentUser && query.trim().length > 2) {
      logUserActivity(currentUser.id, {
        action: 'search',
        searchQuery: query.trim(),
      });
    }
  };

  // Handle Video Creation
  const handleVideoCreated = (newVideo: Video) => {
    saveCustomVideo(newVideo);
    setCustomVideos((prev) => [newVideo, ...prev.filter((v) => v.id !== newVideo.id)]);
    setEditingVideo(null);
    showToast(`Vidéo "${newVideo.title}" publiée en Haute Qualité !`);
    handleSelectVideo(newVideo);
  };

  // Handle Video Edit / Update
  const handleVideoUpdated = (updatedVideo: Video) => {
    updateCustomVideo(updatedVideo);
    setCustomVideos((prev) => {
      const exists = prev.some((v) => v.id === updatedVideo.id);
      if (exists) {
        return prev.map((v) => (v.id === updatedVideo.id ? updatedVideo : v));
      }
      return [updatedVideo, ...prev];
    });
    if (currentNav.selectedVideo?.id === updatedVideo.id) {
      setCurrentNav((prev) => ({ ...prev, selectedVideo: updatedVideo }));
    }
    setEditingVideo(null);
    showToast(`Publication "${updatedVideo.title}" mise à jour avec succès !`);
  };

  // Handle Open Video Editor for an existing publication
  const handleOpenEditVideo = (video: Video) => {
    setEditingVideo(video);
    setIsCreateModalOpen(true);
  };

  // Handle Delete Publication
  const handleDeleteVideo = async (video: Video) => {
    await deleteCustomVideo(video.id);
    setCustomVideos((prev) => prev.filter((v) => v.id !== video.id));
    setDeletedVideoIds(getDeletedVideoIds());
    showToast(`Publication "${video.title}" supprimée définitivement.`);
    if (currentNav.view === 'watch' && currentNav.selectedVideo?.id === video.id) {
      setCurrentNav({ view: 'home' });
    }
  };

  // Quick Save (available to everyone)
  const handleQuickSave = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      const guestSaved = JSON.parse(localStorage.getItem('mk_guest_saved') || '[]') as string[];
      if (!guestSaved.includes(video.id)) {
        localStorage.setItem('mk_guest_saved', JSON.stringify([...guestSaved, video.id]));
        showToast('Ajouté à vos Favoris');
      } else {
        localStorage.setItem('mk_guest_saved', JSON.stringify(guestSaved.filter((id) => id !== video.id)));
        showToast('Retiré de vos Favoris');
      }
      return;
    }
    const favorites = getUserFile<UserFavorites>(currentUser.id, 'favorites.json') || {
      likedVideoIds: [],
      dislikedVideoIds: [],
      savedVideoIds: [],
      downloadedVideos: [],
      customPlaylists: [],
    };
    if (!favorites.savedVideoIds.includes(video.id)) {
      favorites.savedVideoIds.push(video.id);
      saveUserFile(currentUser.id, 'favorites.json', favorites);
      showToast('Ajouté à vos Favoris');
    } else {
      favorites.savedVideoIds = favorites.savedVideoIds.filter((id) => id !== video.id);
      saveUserFile(currentUser.id, 'favorites.json', favorites);
      showToast('Retiré de vos Favoris');
    }
  };

  // Quick Share (Instant native share or clipboard copy for everyone)
  const handleQuickShare = (video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/#watch?id=${video.id}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: video.title,
          text: `Regardez "${video.title}" sur MK Streaming :`,
          url: shareUrl,
        })
        .then(() => showToast('Partagé avec succès !'))
        .catch(() => {
          navigator.clipboard.writeText(shareUrl);
          showToast('Lien copié dans le presse-papier !');
        });
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast('Lien copié dans le presse-papier !');
    }
  };

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    return allVideos.filter((v) => {
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
      if (sortBy === 'date') return 0;
      return 0;
    });
  }, [allVideos, searchQuery, selectedCategory, durationFilter, sortBy]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#0f0f0f] text-white' : 'bg-[#f8f9fa] text-black'} selection:bg-[#ff0000] selection:text-white transition-colors`}>
      
      {/* 1. SPLASH SCREEN (2 seconds animation) */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* 2. FIXED HEADER (YOUTUBE EXACT REPLICA) */}
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
        onOpenCreateModal={() => {
          setEditingVideo(null);
          setIsCreateModalOpen(true);
        }}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onToggleFilters={() => setIsFiltersOpen(!isFiltersOpen)}
        isFiltersOpen={isFiltersOpen}
      />

      {/* 3. MAIN WORKSPACE WITH DESKTOP SIDEBAR / MOBILE BOTTOM NAV */}
      <div className={`pt-14 sm:pt-16 ${currentNav.view === 'watch' && !watchControlsVisible ? 'pb-4' : 'pb-16'} md:pb-6 flex min-h-[calc(100vh-64px)]`}>
        
        {/* Navigation Component */}
        <Navigation
          currentView={currentNav.view}
          onNavigate={(view) => navigateTo({ view: view as any })}
          currentUser={currentUser}
          onOpenAdmin={() => setIsAdminDashboardOpen(true)}
          onRequireAuth={handleRequireAuth}
          onOpenCreateModal={() => {
            setEditingVideo(null);
            setIsCreateModalOpen(true);
          }}
          watchControlsVisible={watchControlsVisible}
        />

        {/* Dynamic Center Stage Content (Fluid YouTube Feed) */}
        <main className="flex-1 md:ml-56 lg:ml-64 px-0 sm:px-4 lg:px-6 py-2 sm:py-3 overflow-x-hidden">
          
          {/* VIEW: HOME FEED (PURE YOUTUBE CONTINUOUS FEED) */}
          {currentNav.view === 'home' && (
            <div className="max-w-[1920px] mx-auto space-y-3 sm:space-y-4">
              
              {/* Category Pills Slider */}
              <div className="px-3 sm:px-0">
                <CategoryChips
                  selectedCategory={selectedCategory}
                  onSelectCategory={(cat) => {
                    setSelectedCategory(cat);
                    setIsLoadingFeed(true);
                    setTimeout(() => setIsLoadingFeed(false), 150);
                  }}
                  isFiltersOpen={isFiltersOpen}
                  sortBy={sortBy}
                  onSelectSortBy={setSortBy}
                  durationFilter={durationFilter}
                  onSelectDurationFilter={setDurationFilter}
                />
              </div>

              {/* Search Query indicator if searching */}
              {searchQuery && (
                <div className="px-3 sm:px-0 flex items-center justify-between pb-2 border-b border-[#282828]">
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    Résultats pour <span className="text-[#ff0000]">"{searchQuery}"</span>
                  </h2>
                  <span className="text-xs text-zinc-400">
                    {filteredVideos.length} vidéo{filteredVideos.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* CONTINUOUS VIDEO GRID */}
              {filteredVideos.length === 0 ? (
                <div className="p-16 text-center text-zinc-400 text-sm">
                  <VideoIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                  <p className="text-base font-semibold text-white">Aucune vidéo trouvée</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Essayez un autre mot-clé ou réinitialisez les filtres.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-y-2 sm:gap-x-4 sm:gap-y-8">
                  {filteredVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      isLoading={isLoadingFeed}
                      onSelect={handleSelectVideo}
                      onSaveQuick={handleQuickSave}
                      onShareQuick={handleQuickShare}
                      canManage={canManageVideo(video)}
                      onEditVideo={handleOpenEditVideo}
                      onDeleteVideo={handleDeleteVideo}
                    />
                  ))}
                </div>
              )}

            </div>
          )}

          {/* VIEW: WATCH VIDEO */}
          {currentNav.view === 'watch' && currentNav.selectedVideo && (
            <VideoWatchView
              video={currentNav.selectedVideo}
              currentUser={currentUser}
              onSelectVideo={handleSelectVideo}
              onRequireAuth={handleRequireAuth}
              onEditVideo={canManageVideo(currentNav.selectedVideo) ? handleOpenEditVideo : undefined}
              onDeleteVideo={canManageVideo(currentNav.selectedVideo) ? handleDeleteVideo : undefined}
              onControlsVisibilityChange={setWatchControlsVisible}
            />
          )}

          {/* VIEW: TRENDING */}
          {currentNav.view === 'trending' && (
            <div className="px-3 sm:px-0">
              <TrendingView onSelectVideo={handleSelectVideo} />
            </div>
          )}

          {/* VIEW: SUBSCRIPTIONS */}
          {currentNav.view === 'subscriptions' && (
            <div className="px-3 sm:px-0">
              <SubscriptionsView
                currentUser={currentUser}
                onSelectVideo={handleSelectVideo}
              />
            </div>
          )}

          {/* VIEW: LIBRARY */}
          {currentNav.view === 'library' && (
            <div className="px-3 sm:px-0">
              <UserLibraryView
                currentUser={currentUser}
                initialTab={currentNav.libraryTab || 'history'}
                onSelectVideo={handleSelectVideo}
                onRequireAuth={handleRequireAuth}
              />
            </div>
          )}

          {/* VIEW: PROFILE, PUBLICATIONS, SEARCHES & ACCOUNT DELETION */}
          {currentNav.view === 'profile' && (
            <div className="px-3 sm:px-0">
              <UserProfileView
                currentUser={currentUser}
                onRequireAuth={handleRequireAuth}
                userVideos={userOwnedVideos}
                onSelectVideo={handleSelectVideo}
                onEditVideo={handleOpenEditVideo}
                onDeleteVideo={handleDeleteVideo}
                onOpenCreateModal={() => {
                  setEditingVideo(null);
                  setIsCreateModalOpen(true);
                }}
                onDeleteAccount={handleAccountDeleted}
                onUserUpdated={(updatedUser) => {
                  setCurrentUser(updatedUser);
                  showToast('Profil mis à jour avec succès !');
                }}
              />
            </div>
          )}

        </main>
      </div>

      {/* 4. ADMIN DASHBOARD MODAL */}
      {isAdminDashboardOpen && (
        <AdminDashboard
          currentUser={currentUser}
          onClose={() => setIsAdminDashboardOpen(false)}
          onSelectVideo={(id) => {
            const v = allVideos.find((vid) => vid.id === id);
            if (v) {
              setIsAdminDashboardOpen(false);
              handleSelectVideo(v);
            }
          }}
        />
      )}

      {/* 5. CREATE / EDIT VIDEO STUDIO MODAL */}
      <CreateVideoModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingVideo(null);
        }}
        onVideoCreated={handleVideoCreated}
        onVideoUpdated={handleVideoUpdated}
        editingVideo={editingVideo}
        currentUser={currentUser}
      />

      {/* 6. AUTHENTICATION MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthModalOpen(false);
          showToast(`Bienvenue, ${user.username} !`);
        }}
        restrictionMessage={authRestrictionMessage}
      />

      {/* 7. TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 bg-[#1f1f1f] text-white text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#ff0000] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
