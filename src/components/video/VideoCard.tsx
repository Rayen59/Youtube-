import React, { useState, useRef } from 'react';
import { CheckCircle2, Clock, Eye, Sparkles } from 'lucide-react';
import { Video } from '../../types';

interface VideoCardProps {
  video?: Video;
  isLoading?: boolean;
  onSelect?: (video: Video) => void;
  recommendationReason?: string;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isLoading = false,
  onSelect,
  recommendationReason,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (isLoading || !video) {
    // Skeleton loader
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="aspect-video w-full rounded-2xl bg-white/5 border border-white/5" />
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-5/6" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
            <div className="h-3 bg-white/5 rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)} M`;
    if (views >= 1000) return `${Math.round(views / 1000)} k`;
    return `${views}`;
  };

  return (
    <div
      onClick={() => onSelect && onSelect(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group flex flex-col gap-2.5 cursor-pointer select-none transition-all duration-200"
    >
      {/* THUMBNAIL / HOVER PREVIEW CONTAINER */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#181818] border border-white/5 group-hover:border-white/20 transition-all duration-300 shadow-md group-hover:shadow-2xl group-hover:-translate-y-1">
        {/* Main Thumbnail Image */}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-500 ${
            isHovered ? 'scale-105' : 'scale-100'
          }`}
        />

        {/* Dynamic preview simulation on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col justify-end p-2.5 transition-opacity">
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden mb-1">
              <div className="h-full bg-[#ff0000] w-1/3 animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-white font-medium">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] animate-ping" />
                Aperçu MK
              </span>
              <span>{video.durationFormatted}</span>
            </div>
          </div>
        )}

        {/* Duration badge */}
        {!isHovered && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/85 text-white text-[11px] font-bold font-mono tracking-tight backdrop-blur-xs">
            {video.durationFormatted}
          </div>
        )}

        {/* Resolution Badge */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-gray-200 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs border border-white/10">
          {video.resolution}
        </div>

        {/* AI Recommendation Badge if applicable */}
        {recommendationReason && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#ff0000]/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
            <Sparkles className="w-3 h-3" />
            <span>{recommendationReason}</span>
          </div>
        )}
      </div>

      {/* METADATA ROW */}
      <div className="flex gap-3 px-0.5">
        {/* Channel Avatar */}
        <img
          src={video.channelAvatar}
          alt={video.channelTitle}
          loading="lazy"
          className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-white/10 mt-0.5"
        />

        <div className="flex-1 min-w-0">
          {/* Video Title */}
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-[#ff3b30] transition-colors">
            {video.title}
          </h3>

          {/* Channel Name */}
          <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 group-hover:text-gray-300">
            <span className="truncate">{video.channelTitle}</span>
            {video.verified && (
              <CheckCircle2 className="w-3 h-3 text-gray-400 fill-gray-400 shrink-0" />
            )}
          </div>

          {/* Views & Date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 font-medium">
            <span>{formatViews(video.views)} vues</span>
            <span>•</span>
            <span>{video.uploadDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
