import React, { useState, useEffect } from 'react';
import { Video, User, SubscribedChannel } from '../../types';
import { VideoCard } from '../video/VideoCard';
import {
  getSubscribedChannels,
  toggleChannelSubscription,
  toggleChannelNotificationBell,
} from '../../storage/userNamespace';
import { Tv, Bell, BellOff, UserCheck, Video as VideoIcon } from 'lucide-react';

interface SubscriptionsViewProps {
  currentUser: User | null;
  allVideos?: Video[];
  onSelectVideo: (video: Video) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  currentUser,
  allVideos = [],
  onSelectVideo,
}) => {
  const [subscribedChannels, setSubscribedChannels] = useState<SubscribedChannel[]>(() =>
    getSubscribedChannels(currentUser?.id)
  );
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string | null>(null);

  useEffect(() => {
    setSubscribedChannels(getSubscribedChannels(currentUser?.id));
  }, [currentUser?.id]);

  const handleToggleBell = (channelTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = toggleChannelNotificationBell(channelTitle, currentUser?.id);
    setSubscribedChannels(updated);
  };

  const handleUnsubscribe = (ch: SubscribedChannel, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = toggleChannelSubscription(
      {
        channelId: ch.channelId,
        channelTitle: ch.channelTitle,
        channelAvatar: ch.channelAvatar,
        subscribers: ch.subscribers,
      },
      currentUser?.id
    );
    setSubscribedChannels(res.list);
    if (selectedChannelFilter === ch.channelTitle) {
      setSelectedChannelFilter(null);
    }
  };

  const subscribedTitles = new Set(
    subscribedChannels.map((c) => c.channelTitle.toLowerCase())
  );

  const subscribedVideos = allVideos.filter((v) => {
    const isSub = subscribedTitles.has(v.channelTitle.toLowerCase());
    if (!isSub) return false;
    if (selectedChannelFilter) {
      return v.channelTitle.toLowerCase() === selectedChannelFilter.toLowerCase();
    }
    return true;
  });

  // Extract unique available channels from real platform videos so user can subscribe in 1 click
  const availableChannels = Array.from(
    new Map(
      allVideos.map((v) => [
        v.channelTitle.toLowerCase(),
        {
          channelId: v.channelId,
          channelTitle: v.channelTitle,
          channelAvatar: v.channelAvatar,
          subscribers: v.subscribers,
        },
      ])
    ).values()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#161616] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <Tv className="w-5 h-5 text-[#ff0000]" />
            <span>Vos Abonnements Réels ({subscribedChannels.length})</span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Retrouvez uniquement les chaînes auxquelles vous êtes réellement abonné et gérez leurs notifications.
          </p>
        </div>

        {selectedChannelFilter && (
          <button
            onClick={() => setSelectedChannelFilter(null)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer self-start sm:self-auto"
          >
            Afficher toutes les chaînes abonnées
          </button>
        )}
      </div>

      {/* Subscribed Channels Management List (No Stories!) */}
      {subscribedChannels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subscribedChannels.map((ch) => {
            const isSelected = selectedChannelFilter === ch.channelTitle;
            return (
              <div
                key={ch.channelTitle}
                onClick={() =>
                  setSelectedChannelFilter(isSelected ? null : ch.channelTitle)
                }
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#ff0000]/15 border-[#ff0000]'
                    : 'bg-[#181818] hover:bg-[#202020] border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={ch.channelAvatar}
                    alt={ch.channelTitle}
                    className="w-11 h-11 rounded-full object-cover border border-white/15 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      {ch.channelTitle}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Abonné le {new Date(ch.subscribedAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleBell(ch.channelTitle, e)}
                    title={
                      ch.notificationsEnabled
                        ? 'Notifications activées (cliquer pour couper)'
                        : 'Notifications désactivées (cliquer pour activer)'
                    }
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      ch.notificationsEnabled
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    {ch.notificationsEnabled ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <BellOff className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleUnsubscribe(ch, e)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-[11px] font-bold text-gray-200 transition-colors cursor-pointer"
                  >
                    Se désabonner
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-[#161616] border border-white/10 text-center space-y-4">
          <Tv className="w-10 h-10 text-gray-500 mx-auto" />
          <div>
            <h2 className="text-base font-black text-white">
              Aucun abonnement actif pour le moment
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Abonnez-vous aux chaînes ci-dessous ou depuis le lecteur vidéo pour suivre leurs vidéos et recevoir des notifications.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-left">
            {availableChannels.map((ch) => (
              <div
                key={ch.channelTitle}
                className="p-3 rounded-2xl bg-[#202020] border border-white/10 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={ch.channelAvatar}
                    alt={ch.channelTitle}
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {ch.channelTitle}
                    </div>
                    <div className="text-[10px] text-gray-400">{ch.subscribers} abonnés</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const res = toggleChannelSubscription(ch, currentUser?.id);
                    setSubscribedChannels(res.list);
                  }}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-gray-200 text-black text-xs font-bold shrink-0 cursor-pointer"
                >
                  S'abonner
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Videos from Subscribed Channels */}
      {subscribedChannels.length > 0 && (
        <div>
          <h2 className="text-sm sm:text-base font-black text-white mb-4 flex items-center gap-2">
            <VideoIcon className="w-4 h-4 text-[#ff0000]" />
            <span>
              Vidéos de vos abonnements ({subscribedVideos.length})
            </span>
          </h2>

          {subscribedVideos.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#161616] text-center text-xs text-gray-400">
              Aucune vidéo trouvée pour cette chaîne.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subscribedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onSelect={onSelectVideo}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
