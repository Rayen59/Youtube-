import React from 'react';
import { Video, User } from '../../types';
import { VideoCard } from '../video/VideoCard';
import { MOCK_VIDEOS } from '../../data/mockVideos';
import { Tv, Sparkles, CheckCircle2 } from 'lucide-react';

interface SubscriptionsViewProps {
  currentUser: User | null;
  onSelectVideo: (video: Video) => void;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  currentUser,
  onSelectVideo,
}) => {
  // Mock subscriptions channels
  const channels = [
    {
      name: 'Blender Open Studio',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
      unreadCount: 2,
    },
    {
      name: 'Tech Horizon MK',
      avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&q=80',
      unreadCount: 1,
    },
    {
      name: 'Planet Earth 4K',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
      unreadCount: 3,
    },
    {
      name: 'Code Masters Pro',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&q=80',
      unreadCount: 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Channels story avatars */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
        {channels.map((ch, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative">
              <img
                src={ch.avatar}
                alt={ch.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-[#ff0000] p-0.5 group-hover:scale-105 transition-transform"
              />
              {ch.unreadCount > 0 && (
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#ff0000] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0f0f0f]">
                  {ch.unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium text-gray-300 group-hover:text-white max-w-[80px] truncate text-center">
              {ch.name}
            </span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
          <Tv className="w-4 h-4 text-[#ff0000]" />
          Dernières publications de vos abonnements
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MOCK_VIDEOS.slice(0, 6).map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onSelect={onSelectVideo}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
