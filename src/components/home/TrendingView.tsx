import React from 'react';
import { Video } from '../../types';
import { VideoCard } from '../video/VideoCard';
import { MOCK_VIDEOS } from '../../data/mockVideos';
import { Flame, Sparkles } from 'lucide-react';

interface TrendingViewProps {
  onSelectVideo: (video: Video) => void;
}

export const TrendingView: React.FC<TrendingViewProps> = ({ onSelectVideo }) => {
  const trendingVideos = [...MOCK_VIDEOS].sort((a, b) => b.views - a.views);

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 bg-gradient-to-r from-[#ff0000]/20 via-black to-[#181818] rounded-3xl border border-[#ff0000]/20 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#ff0000] font-black text-xs uppercase tracking-wider mb-1">
            <Flame className="w-4 h-4" />
            <span>Tendances Mondiales MK</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Les Vidéos les Plus Populaires</h1>
          <p className="text-xs text-gray-400 mt-1">
            Actualisé toutes les heures en fonction des vues et du temps de visionnage cumulé.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {trendingVideos.map((video, index) => (
          <div key={video.id} className="relative">
            <div className="absolute -top-2 -left-2 z-10 w-7 h-7 bg-[#ff0000] text-white font-black text-xs rounded-full flex items-center justify-center shadow-lg border border-white/20">
              #{index + 1}
            </div>
            <VideoCard
              video={video}
              onSelect={onSelectVideo}
              recommendationReason={`N° ${index + 1} des Tendances`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
