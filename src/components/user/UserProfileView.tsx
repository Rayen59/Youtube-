import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  FileCode,
  Lock,
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
} from '../../storage/userNamespace';

interface UserProfileViewProps {
  currentUser: User | null;
  userVideos?: Video[];
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
  onRequireAuth,
  onSelectVideo,
  onEditVideo,
  onDeleteVideo,
  onOpenCreateModal,
  onDeleteAccount,
  onUserUpdated,
}) => {
  const [activeSection, setActiveSection] = useState<
    'publications' | 'searches_history' | 'settings' | 'namespace'
  >('publications');

  const [activeFile, setActiveFile] = useState<
    'profile.json' | 'activities.json' | 'preferences.json' | 'favorites.json'
  >('profile.json');

  // Search history state
  const [searches, setSearches] = useState<SearchHistoryItem[]>([]);

  // Edit profile states
  const [editUsername, setEditUsername] = useState(currentUser?.username || '');
  const [editChannelName, setEditChannelName] = useState(
    currentUser?.channelName || `${currentUser?.username || 'Mon'} Studio`
  );
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || '');
  const [preferredQuality, setPreferredQuality] = useState('4K Ultra HD');
  const [autoplay, setAutoplay] = useState(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Confirm delete account modal
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

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center text-white space-y-6">
        <div className="p-8 rounded-3xl bg-[#181818] border border-white/10 shadow-2xl">
          <UserIcon className="w-14 h-14 text-[#ff0000] mx-auto mb-3" />
          <h2 className="text-xl font-black mb-2">Espace Utilisateur & Studio Créateur</h2>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Connectez-vous pour gérer votre profil, modifier ou supprimer vos publications vidéo, personnaliser la qualité 4K ou supprimer votre compte.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onRequireAuth('Connectez-vous pour accéder à votre profil complet.')}
              className="px-6 py-2.5 bg-[#ff0000] hover:bg-red-700 text-white font-bold text-xs rounded-full cursor-pointer shadow-lg"
            >
              Se connecter / Créer un compte
            </button>
            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-full cursor-pointer"
              >
                Partager une vidéo maintenant
              </button>
            )}
          </div>
        </div>

        {/* Even guests can manage their published gallery videos and search history! */}
        {userVideos.length > 0 && (
          <div className="p-6 rounded-3xl bg-[#181818] border border-white/10 text-left space-y-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <VideoIcon className="w-4 h-4 text-[#ff0000]" />
              <span>Vos Vidéos Partagées sur cet Appareil ({userVideos.length})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {userVideos.map((vid) => (
                <div
                  key={vid.id}
                  className="p-3 rounded-2xl bg-[#222222] border border-white/10 flex flex-col justify-between gap-3"
                >
                  <div className="flex gap-3">
                    <img
                      src={vid.thumbnailUrl}
                      alt={vid.title}
                      className="w-28 h-16 object-cover rounded-xl shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white line-clamp-2">{vid.title}</h4>
                      <span className="text-[10px] text-amber-400 font-bold">{vid.resolution}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                    {onEditVideo && (
                      <button
                        onClick={() => onEditVideo(vid)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                    )}
                    {onDeleteVideo && (
                      <button
                        onClick={() => onDeleteVideo(vid)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const fileContent = getUserFile(currentUser.id, activeFile);

  const handleDownload = () => {
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
    if (!editUsername.trim()) return;

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
      {showDeleteAccountConfirm && (
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
            src={currentUser.avatar}
            alt={currentUser.username}
            className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[#ff0000] shadow-lg"
          />
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {currentUser.channelName || currentUser.username}
              </h1>
              {currentUser.role === 'admin' ? (
                <span className="text-[10px] bg-[#ff0000] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  ADMINISTRATEUR
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  CRÉATEUR MK 4K
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              @{currentUser.username} • {currentUser.email}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-gray-400 mt-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#ff0000]" />
                Membre depuis le {new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}
              </span>
              <span>•</span>
              <span className="text-white font-bold">
                {userVideos.length} publication{userVideos.length > 1 ? 's' : ''}
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
              <span>Publier / Éditer une Vidéo</span>
            </button>
          )}

          <button
            onClick={() => setShowDeleteAccountConfirm(true)}
            className="px-4 py-2.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Supprimer mon compte</span>
          </button>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
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
          <span>Gérer mes Recherches ({searches.length})</span>
        </button>

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
      </div>

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
                        {vid.views.toLocaleString()} vues • {vid.uploadDate}
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
                          <span>Modifier la vidéo</span>
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
                Mon Historique de Recherche ({searches.length})
              </h2>
              <p className="text-xs text-gray-400">
                Supprimez une recherche précise ou effacez l'intégralité de vos recherches et visionnages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {searches.length > 0 && (
                <button
                  onClick={() => setSearches(clearAllSearchHistory(currentUser.id))}
                  className="px-3.5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer toutes les recherches</span>
                </button>
              )}

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
                      setSearches(deleteSearchHistoryItem(currentUser.id, item.id || item.text))
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
      {activeSection === 'settings' && (
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
      {activeSection === 'namespace' && (
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
