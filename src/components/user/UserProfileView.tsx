import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  FileCode,
  Download,
  Calendar,
  Sparkles,
  Trash2,
  Edit3,
  Video as VideoIcon,
  Search,
  History,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Play,
  Plus,
  X,
  BarChart3,
  Clock,
  Globe,
  Monitor,
  Eye,
  MessageSquare,
  Tv,
} from 'lucide-react';
import { User, Video, UserPreferences } from '../../types';
import {
  getUserFile,
  saveUserFile,
  getSearchHistory,
  deleteSearchHistoryItem,
  clearAllSearchHistory,
  clearUserWatchHistory,
  updateUserProfile,
  SearchHistoryItem,
  getGlobalSiteTelemetrySummary,
  detectClientEnvironment,
  getAllRealVideoEngagement,
  getSubscribedChannels,
  getGuestActivities,
  getUserGeoTelemetry,
} from '../../storage/userNamespace';

interface UserProfileViewProps {
  currentUser: User | null;
  userVideos?: Video[];
  allVideos?: Video[];
  onRequireAuth: (message: string) => void;
  onSelectVideo?: (video: Video) => void;
  onEditVideo?: (video: Video) => void;
  onDeleteVideo?: (video: Video) => void;
  onOpenCreateModal?: () => void;
  onDeleteAccount?: () => void;
  onUserUpdated?: (user: User) => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  currentUser,
  userVideos = [],
  allVideos = [],
  onRequireAuth,
  onSelectVideo,
  onEditVideo,
  onDeleteVideo,
  onOpenCreateModal,
  onDeleteAccount,
  onUserUpdated,
}) => {
  const [activeSection, setActiveSection] = useState<
    'real_stats' | 'publications' | 'searches_history' | 'settings' | 'namespace'
  >('real_stats');

  const [activeFile, setActiveFile] = useState<
    'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json'
  >('profile.json');

  const [searches, setSearches] = useState<SearchHistoryItem[]>([]);
  const [editUsername, setEditUsername] = useState(currentUser?.username || '');
  const [editChannelName, setEditChannelName] = useState(
    currentUser?.channelName || `${currentUser?.username || 'Mon'} Studio`
  );
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [preferredQuality, setPreferredQuality] = useState('4K Ultra HD');
  const [autoplay, setAutoplay] = useState(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);

  useEffect(() => {
    setSearches(getSearchHistory(currentUser?.id));
    if (currentUser) {
      setEditUsername(currentUser.username);
      setEditChannelName(currentUser.channelName || `${currentUser.username} Studio`);
      setEditAvatar(currentUser.avatar);
      const prefs = getUserFile<UserPreferences>(currentUser.id, 'preferences.json');
      if (prefs) {
        setPreferredQuality(prefs.preferredQuality || '4K Ultra HD');
        setAutoplay(prefs.autoplay !== undefined ? prefs.autoplay : true);
      }
    }
  }, [currentUser]);

  // Compute 100% real statistics
  const globalStats = getGlobalSiteTelemetrySummary();
  const realEnv = currentUser ? getUserGeoTelemetry(currentUser.id) : detectClientEnvironment();
  const realVideoEngagements = getAllRealVideoEngagement();
  const subscribedChannels = getSubscribedChannels(currentUser?.id);
  const userActivities = currentUser
    ? getUserFile<any[]>(currentUser.id, 'activities.json') || []
    : getGuestActivities();

  const currentHour = new Date().getHours();
  const maxHourly = Math.max(1, ...globalStats.hourlyUsage24h);

  const fileContent = currentUser ? getUserFile(currentUser.id, activeFile) : null;

  const handleDownload = () => {
    if (!currentUser || !fileContent) return;
    const blob = new Blob([JSON.stringify(fileContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentUser.username}_${activeFile}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveProfileAndPrefs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !editUsername.trim()) return;

    const updatedUser = updateUserProfile(currentUser.id, {
      username: editUsername.trim(),
      channelName: editChannelName.trim() || `${editUsername.trim()} Studio`,
      avatar: editAvatar.trim() || currentUser.avatar,
    });

    const currentPrefs = getUserFile<UserPreferences>(currentUser.id, 'preferences.json') || {
      theme: 'dark',
      autoplay: true,
      preferredQuality: '4K Ultra HD',
      playbackSpeed: 1,
      volume: 1,
      categoryAffinity: {},
      dislikedTags: [],
      lastActive: new Date().toISOString(),
    };

    saveUserFile(currentUser.id, 'preferences.json', {
      ...currentPrefs,
      preferredQuality,
      autoplay,
      lastActive: new Date().toISOString(),
    });

    if (updatedUser && onUserUpdated) {
      onUserUpdated(updatedUser);
    }

    setSavedNotice('Vos modifications et préférences Grande Qualité ont été enregistrées !');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 text-white space-y-6">
      {/* CONFIRM DELETE ACCOUNT MODAL */}
      {showDeleteAccountConfirm && currentUser && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full bg-[#181818] border-2 border-red-500/60 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-[#ff0000] shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Supprimer définitivement votre compte ?
                </h3>
                <p className="text-xs text-gray-400">
                  Action irréversible • Compte : {currentUser.username}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-red-950/30 border border-red-500/30 p-3.5 rounded-2xl">
              En confirmant, votre compte <strong>{currentUser.username}</strong>, votre dossier isolé (<code>/users/{currentUser.id}/</code>), votre historique et vos préférences seront immédiatement supprimés de la plateforme.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAccountConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-200 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteAccountConfirm(false);
                  if (onDeleteAccount) onDeleteAccount();
                }}
                className="px-5 py-2.5 rounded-xl bg-[#ff0000] hover:bg-red-700 text-xs font-black text-white flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Oui, supprimer mon compte</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROFILE MASTER HEADER */}
      <div className="p-6 bg-gradient-to-br from-[#1c1c1c] via-[#161616] to-[#221212] border border-white/15 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <img
            src={
              currentUser
                ? currentUser.avatar
                : 'https://api.dicebear.com/7.x/identicon/svg?seed=SessionActuelle'
            }
            alt={currentUser ? currentUser.username : 'Session Actuelle'}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#ff0000] shadow-lg"
          />
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {currentUser
                  ? currentUser.channelName || currentUser.username
                  : 'Votre Espace & Statistiques Réelles'}
              </h1>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                100% STATISTIQUES RÉELLES
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {currentUser
                ? `@${currentUser.username} • ${currentUser.email}`
                : `Session Locale (${realEnv.flag} ${realEnv.country} - ${realEnv.os} / ${realEnv.browser})`}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-gray-400 mt-2">
              {currentUser && (
                <>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#ff0000]" />
                    Membre depuis le {new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="text-white font-bold">
                {userVideos.length} publication{userVideos.length > 1 ? 's' : ''}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">
                {globalStats.realTotalViews} vue{globalStats.realTotalViews > 1 ? 's' : ''} réelle{globalStats.realTotalViews > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {onOpenCreateModal && (
            <button
              onClick={onOpenCreateModal}
              className="px-4 py-2.5 rounded-2xl bg-[#ff0000] hover:bg-red-700 text-white text-xs font-black flex items-center gap-2 shadow-lg cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Publier une Vidéo</span>
            </button>
          )}

          {currentUser ? (
            <button
              onClick={() => setShowDeleteAccountConfirm(true)}
              className="px-4 py-2.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer mon compte</span>
            </button>
          ) : (
            <button
              onClick={() => onRequireAuth('Connectez-vous ou créez un compte personnel.')}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold cursor-pointer transition-colors"
            >
              Se connecter / Créer un compte
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSection('real_stats')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
            activeSection === 'real_stats'
              ? 'bg-[#ff0000] text-white shadow-lg'
              : 'bg-[#181818] text-gray-300 hover:bg-white/10'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistiques Réelles en Direct</span>
        </button>

        <button
          onClick={() => setActiveSection('publications')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
            activeSection === 'publications'
              ? 'bg-[#ff0000] text-white shadow-lg'
              : 'bg-[#181818] text-gray-300 hover:bg-white/10'
          }`}
        >
          <VideoIcon className="w-4 h-4" />
          <span>Mes Publications ({userVideos.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('searches_history')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
            activeSection === 'searches_history'
              ? 'bg-[#ff0000] text-white shadow-lg'
              : 'bg-[#181818] text-gray-300 hover:bg-white/10'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Mes Recherches Réelles ({searches.length})</span>
        </button>

        {currentUser && (
          <>
            <button
              onClick={() => setActiveSection('settings')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
                activeSection === 'settings'
                  ? 'bg-[#ff0000] text-white shadow-lg'
                  : 'bg-[#181818] text-gray-300 hover:bg-white/10'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Modifier Profil & Qualité 4K</span>
            </button>

            <button
              onClick={() => setActiveSection('namespace')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 cursor-pointer transition-all ${
                activeSection === 'namespace'
                  ? 'bg-[#ff0000] text-white shadow-lg'
                  : 'bg-[#181818] text-gray-300 hover:bg-white/10'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Mon Dossier Isolé (JSON)</span>
            </button>
          </>
        )}
      </div>

      {/* =====================================================================
          TAB 0: TOUTES LES STATISTIQUES RÉELLES EN DIRECT (100% AUTHENTIQUES)
         ===================================================================== */}
      {activeSection === 'real_stats' && (
        <div className="space-y-6">
          {/* 1. REAL KPI GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-[#161616] border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Vues Réelles</span>
                <Eye className="w-4 h-4 text-[#ff0000]" />
              </div>
              <div className="text-2xl font-black text-white">
                {globalStats.realTotalViews}
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                Visionnages réels
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161616] border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Temps Visionné</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {globalStats.realTotalWatchSeconds}s
              </div>
              <div className="text-[11px] text-amber-400 font-semibold mt-0.5">
                ({Math.round((globalStats.realTotalWatchSeconds / 60) * 10) / 10} min réelles)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161616] border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Commentaires</span>
                <MessageSquare className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {globalStats.realTotalComments}
              </div>
              <div className="text-[11px] text-blue-400 font-semibold mt-0.5">
                Postés en direct
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161616] border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Recherches</span>
                <Search className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {searches.length}
              </div>
              <div className="text-[11px] text-purple-400 font-semibold mt-0.5">
                Texte & Voix
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161616] border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Abonnements</span>
                <Tv className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {subscribedChannels.length}
              </div>
              <div className="text-[11px] text-cyan-400 font-semibold mt-0.5">
                Chaînes suivies
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#161616] border border-white/10">
              <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Comptes Réels</span>
                <UserIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {globalStats.totalUsers}
              </div>
              <div className="text-[11px] text-gray-400 font-semibold mt-0.5">
                0 compte virtuel
              </div>
            </div>
          </div>

          {/* 2. REAL CLIENT ENVIRONMENT & 24H HOURLY CHART */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Detected Real Hardware & Geo */}
            <div className="lg:col-span-5 p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Votre Appareil & Localisation Réelle
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Détectés en direct depuis votre navigateur actuel
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                  <span className="text-gray-400 block text-[10px]">Pays & Ville</span>
                  <strong className="text-white">
                    {realEnv.flag} {realEnv.country} ({realEnv.city})
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                  <span className="text-gray-400 block text-[10px]">Fuseau Horaire</span>
                  <strong className="text-white font-mono text-[11px]">
                    {realEnv.timezone}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                  <span className="text-gray-400 block text-[10px]">Système & Appareil</span>
                  <strong className="text-white">
                    {realEnv.os} ({realEnv.deviceType})
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#1f1f1f]">
                  <span className="text-gray-400 block text-[10px]">Navigateur & Écran</span>
                  <strong className="text-amber-400 font-mono text-[11px]">
                    {realEnv.browser} • {realEnv.screenResolution}
                  </strong>
                </div>
                <div className="p-3 rounded-2xl bg-[#1f1f1f] col-span-2 flex items-center justify-between">
                  <span className="text-gray-400 text-[11px]">
                    Bande passante réelle consommée :
                  </span>
                  <strong className="text-emerald-400 font-mono">
                    {globalStats.totalBandwidthMB} Mo
                  </strong>
                </div>
              </div>
            </div>

            {/* Real 24h Hourly Activity Chart */}
            <div className="lg:col-span-7 p-5 rounded-3xl bg-[#161616] border border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">
                        Activité Horaire Réelle (00h – 23h)
                      </h3>
                      <p className="text-[11px] text-gray-400">
                        Actions réelles effectuées par heure ({globalStats.totalActions24h} actions enregistrées)
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#ff0000]/15 text-[#ff4444] border border-[#ff0000]/30">
                    Heure actuelle : {String(currentHour).padStart(2, '0')}h00
                  </span>
                </div>

                <div className="pt-5 pb-2 px-2 rounded-2xl bg-[#111111] border border-white/5 overflow-x-auto">
                  <div className="grid grid-cols-24 min-w-[480px] items-end gap-1 h-36 px-1">
                    {globalStats.hourlyUsage24h.map((val, hIdx) => {
                      const pct = val === 0 ? 6 : Math.max(12, Math.round((val / maxHourly) * 100));
                      const isNow = hIdx === currentHour;
                      return (
                        <div
                          key={hIdx}
                          className="flex flex-col items-center justify-end h-full"
                        >
                          <span
                            className={`text-[9px] font-mono mb-1 ${
                              isNow ? 'text-[#ff0000] font-black' : 'text-gray-400'
                            }`}
                          >
                            {val}
                          </span>
                          <div
                            style={{ height: `${pct}%` }}
                            className={`w-full rounded-t ${
                              isNow
                                ? 'bg-[#ff0000]'
                                : val > 0
                                ? 'bg-blue-500'
                                : 'bg-white/10'
                            }`}
                          />
                          <span className="text-[8px] font-mono text-gray-500 mt-1">
                            {String(hIdx).padStart(2, '0')}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. REAL PER-VIDEO ENGAGEMENT TABLE */}
          <div className="p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Statistiques Réelles par Vidéo (Temps de visionnage & Vues de votre session)
                </h3>
                <p className="text-xs text-gray-400">
                  Chaque ouverture de vidéo et chaque seconde visionnée met à jour ce tableau en temps réel.
                </p>
              </div>
            </div>

            {Object.keys(realVideoEngagements).length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#111111] text-center text-xs text-gray-400">
                Aucune vidéo n'a encore été visionnée durant cette session. Cliquez sur une vidéo pour voir ses statistiques réelles s'afficher ici !
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(realVideoEngagements).map((eng) => {
                  const vid = allVideos.find((v) => v.id === eng.videoId);
                  return (
                    <div
                      key={eng.videoId}
                      onClick={() => vid && onSelectVideo && onSelectVideo(vid)}
                      className="p-3.5 rounded-2xl bg-[#1f1f1f] hover:bg-[#262626] border border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {vid && (
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.title}
                            className="w-20 h-12 object-cover rounded-xl shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {vid ? vid.title : eng.videoId}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {eng.realComments.length} commentaire{eng.realComments.length > 1 ? 's' : ''} réel{eng.realComments.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 font-mono">
                        <div className="text-xs font-black text-emerald-400">
                          {eng.realViews} vue{eng.realViews > 1 ? 's' : ''}
                        </div>
                        <div className="text-[11px] text-amber-400">
                          {eng.realWatchSeconds}s lues
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. REAL CHRONOLOGICAL ACTIVITY LOG */}
          <div className="p-5 rounded-3xl bg-[#161616] border border-white/10 space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#ff0000]" />
              <span>Journal de vos Actions Réelles ({userActivities.length})</span>
            </h3>
            {userActivities.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#111111] text-center text-xs text-gray-500">
                Aucune activité enregistrée pour le moment.
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {userActivities.slice(0, 30).map((act: any) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-[#1f1f1f] border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-[#ff0000]/20 text-[#ff4444] text-[10px] font-black uppercase shrink-0">
                        {act.action}
                      </span>
                      <span className="text-white font-medium truncate">
                        {act.videoTitle || act.searchQuery || 'Interaction'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 1: MES PUBLICATIONS (MODIFIER OU SUPPRIMER SA PUBLICATION)
         ===================================================================== */}
      {activeSection === 'publications' && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Mes Vidéos & Publications Partagées ({userVideos.length})
              </h2>
              <p className="text-xs text-gray-400">
                Vous pouvez regarder, modifier (découpage, filtres 4K, titre) ou supprimer définitivement chacune de vos publications.
              </p>
            </div>
            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#ff0000]" />
                <span>Nouvelle publication</span>
              </button>
            )}
          </div>

          {userVideos.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#121212] border border-white/5 text-center space-y-3">
              <VideoIcon className="w-10 h-10 text-gray-500 mx-auto" />
              <p className="text-sm font-bold text-white">
                Vous n'avez pas encore partagé de vidéo
              </p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Importez une vidéo depuis votre galerie téléphone ou PC, modifiez-la dans le studio 4K et partagez-la en un clic.
              </p>
              {onOpenCreateModal && (
                <button
                  onClick={onOpenCreateModal}
                  className="px-5 py-2.5 rounded-xl bg-[#ff0000] text-white text-xs font-bold cursor-pointer"
                >
                  Partager ma première vidéo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="p-4 rounded-2xl bg-[#202020] border border-white/10 flex flex-col justify-between gap-3 hover:border-white/25 transition-all"
                >
                  <div className="flex gap-3.5">
                    <div
                      onClick={() => onSelectVideo && onSelectVideo(vid)}
                      className="relative w-36 aspect-video rounded-xl overflow-hidden bg-black shrink-0 cursor-pointer group"
                    >
                      <img
                        src={vid.thumbnailUrl}
                        alt={vid.title}
                        style={{ filter: vid.videoFilter || 'none' }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono font-bold text-white">
                        {vid.durationFormatted}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded bg-[#ff0000]/20 text-[#ff4444] text-[10px] font-black uppercase">
                          {vid.resolution} HQ
                        </span>
                        <span className="text-[11px] text-gray-400">{vid.category}</span>
                      </div>
                      <h3
                        onClick={() => onSelectVideo && onSelectVideo(vid)}
                        className="text-sm font-bold text-white line-clamp-2 hover:text-[#ff0000] cursor-pointer"
                      >
                        {vid.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {(vid.views + (realVideoEngagements[vid.id]?.realViews || 0)).toLocaleString()} vues • {vid.uploadDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <button
                      onClick={() => onSelectVideo && onSelectVideo(vid)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Lire</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {onEditVideo && (
                        <button
                          onClick={() => onEditVideo(vid)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Modifier</span>
                        </button>
                      )}

                      {onDeleteVideo && (
                        <button
                          onClick={() => onDeleteVideo(vid)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Supprimer</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: GÉRER & SUPPRIMER SES RECHERCHES ET SON HISTORIQUE
         ===================================================================== */}
      {activeSection === 'searches_history' && (
        <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">
                Mon Historique de Recherche Réel ({searches.length})
              </h2>
              <p className="text-xs text-gray-400">
                Supprimez une recherche précise ou effacez l'intégralité de vos recherches et visionnages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {searches.length > 0 && (
                <button
                  onClick={() => setSearches(clearAllSearchHistory(currentUser?.id))}
                  className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer toutes les recherches</span>
                </button>
              )}

              {currentUser && (
                <button
                  onClick={() => {
                    clearUserWatchHistory(currentUser.id);
                    setSavedNotice('Votre historique de vidéos regardées a été effacé.');
                    setTimeout(() => setSavedNotice(null), 2500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#ff0000]" />
                  <span>Effacer l'historique de visionnage</span>
                </button>
              )}
            </div>
          </div>

          {savedNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedNotice}</span>
            </div>
          )}

          {searches.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#121212] text-center text-xs text-gray-500">
              Aucune recherche enregistrée dans votre historique.
            </div>
          ) : (
            <div className="divide-y divide-white/10 rounded-2xl bg-[#121212] border border-white/10 overflow-hidden">
              {searches.map((item) => (
                <div
                  key={item.id || item.text}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <History className="w-4 h-4 text-gray-400 shrink-0" />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-white block truncate">
                        {item.text}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {new Date(item.timestamp).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setSearches(deleteSearchHistoryItem(currentUser?.id, item.id || item.text))
                    }
                    className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: MODIFIER SON PROFIL & PRÉFÉRENCES GRANDE QUALITÉ 4K
         ===================================================================== */}
      {activeSection === 'settings' && currentUser && (
        <form
          onSubmit={handleSaveProfileAndPrefs}
          className="p-6 rounded-3xl bg-[#181818] border border-white/10 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-black text-white">
                Personnaliser mon Compte & Lecture Grande Qualité
              </h2>
              <p className="text-xs text-gray-400">
                Modifiez votre nom, votre chaîne et vos réglages vidéo par défaut.
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-[#ff0000]" />
          </div>

          {savedNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Nom d'utilisateur :
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-white/15 focus:border-[#ff0000] text-xs text-white outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Nom de votre Chaîne Studio :
              </label>
              <input
                type="text"
                value={editChannelName}
                onChange={(e) => setEditChannelName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-white/15 focus:border-[#ff0000] text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Qualité d'affichage vidéo par défaut :
              </label>
              <select
                value={preferredQuality}
                onChange={(e) => setPreferredQuality(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-white/15 focus:border-[#ff0000] text-xs text-white outline-none cursor-pointer"
              >
                <option value="4K Ultra HD">4K Ultra HD (2160p60 Crystal HDR)</option>
                <option value="1440p QHD">1440p Quad HD</option>
                <option value="1080p Full HD">1080p Full HD</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Photo de profil (URL) :
              </label>
              <input
                type="url"
                value={editAvatar}
                onChange={(e) => setEditAvatar(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#111111] border border-white/15 focus:border-[#ff0000] text-xs text-white outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowDeleteAccountConfirm(true)}
              className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Supprimer mon compte définitivement</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#ff0000] hover:bg-red-700 text-white text-xs font-black shadow-lg cursor-pointer"
            >
              Enregistrer mes préférences
            </button>
          </div>
        </form>
      )}

      {/* =====================================================================
          TAB 4: ISOLATED NAMESPACE INSPECTOR
         ===================================================================== */}
      {activeSection === 'namespace' && currentUser && (
        <div className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 bg-[#202020] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#ff0000]" />
                Mon Dossier Isolé :{' '}
                <code className="text-xs font-mono text-gray-300">
                  /users/{currentUser.id}/
                </code>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Chaque utilisateur possède son propre espace de stockage privé et isolé.
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter {activeFile}</span>
            </button>
          </div>

          <div className="flex border-b border-white/10 bg-[#161616] px-4 overflow-x-auto">
            {(
              ['profile.json', 'activities.json', 'preferences.json', 'favorites.json'] as const
            ).map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                className={`py-3 px-4 text-xs font-mono font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                  activeFile === file
                    ? 'border-[#ff0000] text-[#ff0000]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span>{file}</span>
              </button>
            ))}
          </div>

          <div className="p-4 bg-[#111111] max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto selection:bg-[#ff0000]/30">
              {JSON.stringify(fileContent, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
