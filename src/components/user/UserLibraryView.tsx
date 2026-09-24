import React, { useState, useEffect } from 'react';
import {
  History,
  Bookmark,
  ThumbsUp,
  Download,
  Trash2,
  Play,
  Film,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { Video, User, UserFavorites, UserActivity } from '../../types';
import { MOCK_VIDEOS } from '../../data/mockVideos';
import { getUserFile, saveUserFile } from '../../storage/userNamespace';

interface UserLibraryViewProps {
  currentUser: User | null;
  initialTab?: string;
  onSelectVideo: (video: Video) => void;
  onRequireAuth: (message: string) => void;
}

export const UserLibraryView: React.FC<UserLibraryViewProps> = ({
  currentUser,
  initialTab = 'history',
  onSelectVideo,
  onRequireAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'saved' | 'downloads'>(
    (initialTab as any) || 'history'
  );

  const [favoritesData, setFavoritesData] = useState<UserFavorites>({
    likedVideoIds: [],
    dislikedVideoIds: [],
    savedVideoIds: [],
    downloadedVideos: [],
    customPlaylists: [],
  });

  const [activities, setActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    const favs = getUserFile<UserFavorites>(currentUser.id, 'favorites.json');
    if (favs) setFavoritesData(favs);

    const acts = getUserFile<UserActivity[]>(currentUser.id, 'activities.json');
    if (acts) setActivities(acts);
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-white">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4 text-[#ff0000]">
          <Bookmark className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black mb-2">Votre Bibliothèque MK est Privée</h2>
        <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mb-6">
          Connectez-vous pour retrouver l'historique de vos vidéos vues, vos vidéos favorites, vos téléchargements et vos playlists personnalisées.
        </p>
        <button
          onClick={() => onRequireAuth('Connectez-vous pour accéder à votre bibliothèque personnelle.')}
          className="px-6 py-2.5 bg-[#ff0000] text-white font-bold text-sm rounded-full shadow-lg hover:bg-red-700 transition-colors"
        >
          Se connecter
        </button>
      </div>
    );
  }

  // Get matching videos
  const likedVideos = MOCK_VIDEOS.filter(v => favoritesData.likedVideoIds.includes(v.id));
  const savedVideos = MOCK_VIDEOS.filter(v => favoritesData.savedVideoIds.includes(v.id));
  const watchedVideoIds = Array.from(new Set(activities.filter(a => a.action === 'watch').map(a => a.videoId)));
  const historyVideos = watchedVideoIds.map(id => MOCK_VIDEOS.find(v => v.id === id)).filter(Boolean) as Video[];

  const handleClearHistory = () => {
    if (!currentUser) return;
    const filtered = activities.filter(a => a.action !== 'watch');
    setActivities(filtered);
    saveUserFile(currentUser.id, 'activities.json', filtered);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Bibliothèque Personnelle</h1>
          <p className="text-xs text-gray-400 mt-1">
            Namespace privé : <code className="text-white font-mono bg-white/10 px-1 rounded">/users/{currentUser.id}/favorites.json</code>
          </p>
        </div>

        {activeTab === 'history' && historyVideos.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold border border-red-500/20 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Effacer l'historique</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 pb-4 overflow-x-auto border-b border-white/5 mb-6">
        {[
          { id: 'history', label: 'Historique', icon: History, count: historyVideos.length },
          { id: 'saved', label: 'À regarder plus tard', icon: Bookmark, count: savedVideos.length },
          { id: 'favorites', label: 'Vidéos aimées', icon: ThumbsUp, count: likedVideos.length },
          { id: 'downloads', label: 'Téléchargements', icon: Download, count: favoritesData.downloadedVideos.length },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#ff0000] text-white shadow-md'
                  : 'bg-[#1e1e1e] hover:bg-[#282828] text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'history' && (
        <div>
          {historyVideos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Votre historique de visionnage est vide.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {historyVideos.map(video => (
                <div
                  key={video.id}
                  onClick={() => onSelectVideo(video)}
                  className="group cursor-pointer bg-[#181818] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all p-2"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] font-mono font-bold px-1 rounded text-white">
                      {video.durationFormatted}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{video.title}</h4>
                  <div className="text-[11px] text-gray-400 mt-1">{video.channelTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div>
          {savedVideos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Aucune vidéo enregistrée pour le moment. Cliquez sur "Enregistrer" sous une vidéo.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedVideos.map(video => (
                <div
                  key={video.id}
                  onClick={() => onSelectVideo(video)}
                  className="group cursor-pointer bg-[#181818] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all p-2"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] font-mono font-bold px-1 rounded text-white">
                      {video.durationFormatted}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{video.title}</h4>
                  <div className="text-[11px] text-gray-400 mt-1">{video.channelTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div>
          {likedVideos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Vous n'avez pas encore aimé de vidéos. Cliquez sur le pouce bleu pour en ajouter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {likedVideos.map(video => (
                <div
                  key={video.id}
                  onClick={() => onSelectVideo(video)}
                  className="group cursor-pointer bg-[#181818] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all p-2"
                >
                  <div className="relative aspect-video rounded-xl overflow-hidden mb-2">
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] font-mono font-bold px-1 rounded text-white">
                      {video.durationFormatted}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{video.title}</h4>
                  <div className="text-[11px] text-gray-400 mt-1">{video.channelTitle}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'downloads' && (
        <div>
          {favoritesData.downloadedVideos.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              Aucune vidéo téléchargée pour un visionnage hors-ligne.
            </div>
          ) : (
            <div className="space-y-3">
              {favoritesData.downloadedVideos.map((item, idx) => {
                const vid = MOCK_VIDEOS.find(v => v.id === item.videoId);
                return (
                  <div
                    key={idx}
                    onClick={() => vid && onSelectVideo(vid)}
                    className="p-3 bg-[#181818] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{item.title}</h4>
                        <div className="text-[11px] text-gray-400">
                          {item.fileSizeMb} Mo • Téléchargé le{' '}
                          {new Date(item.downloadedAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-white/10 text-xs font-bold rounded-xl hover:bg-white/20">
                      Lire la vidéo
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
