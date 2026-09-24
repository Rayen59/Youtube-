import React, { useState, useRef } from 'react';
import {
  CheckCircle2,
  Bookmark,
  Share2,
  MoreVertical,
  Play,
  Clock,
} from 'lucide-react';
import { Video } from '../../types';

interface VideoCardProps {
  video?: Video;
  isLoading?: boolean;
  onSelect?: (video: Video) => void;
  recommendationReason?: string;
  onSaveQuick?: (video: Video, e: React.MouseEvent) => void;
  onShareQuick?: (video: Video, e: React.MouseEvent) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isLoading = false,
  onSelect,
  onSaveQuick,
  onShareQuick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  if (isLoading || !video) {
    // Pure YouTube Skeleton Loader (Matches Screenshot 2)
    return (
      <div className="flex flex-col gap-3 animate-pulse pb-4">
        <div className="aspect-video w-full rounded-none sm:rounded-xl bg-[#282828]" />
        <div className="flex gap-3 px-3 sm:px-0 items-start">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#282828] shrink-0" />
          <div className="flex-1 space-y-2 py-0.5">
            <div className="h-4 bg-[#282828] rounded w-11/12" />
            <div className="h-3 bg-[#282828] rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsHovered(false);
    setShowOptions(false);
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1).replace('.', ',')} M de`;
    if (views >= 1000) return `${Math.round(views / 1000)} k`;
    return `${views}`;
  };

  return (
    <div
      onClick={() => onSelect && onSelect(video)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group flex flex-col cursor-pointer select-none relative transition-all duration-150 pb-4 sm:pb-6"
    >
      {/* 16:9 THUMBNAIL (YouTube pure styling - no heavy boxes) */}
      <div className="relative aspect-video w-full overflow-hidden rounded-none sm:rounded-xl bg-[#202020]">
        {/* Main Thumbnail Image */}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200 ease-out"
        />

        {/* Hover preview simulation with animated red progress bar */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-2 pointer-events-none transition-opacity duration-200">
            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden mb-0.5">
              <div className="h-full bg-[#ff0000] w-1/3 animate-pulse" />
            </div>
          </div>
        )}

        {/* Duration badge (bottom-right - YouTube standard) */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-white text-[11px] font-semibold tracking-tight font-mono backdrop-blur-xs pointer-events-none">
          {video.durationFormatted}
        </div>

        {/* Resolution Badge if 4K */}
        {video.resolution === '4K' && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 text-gray-200 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs pointer-events-none">
            4K
          </div>
        )}
      </div>

      {/* METADATA ROW (Avatar + Title + Channel + Views - Exact YouTube Layout) */}
      <div className="flex gap-3 pt-3 px-3 sm:px-0 items-start">
        {/* Channel Avatar */}
        <img
          src={video.channelAvatar}
          alt={video.channelTitle}
          loading="lazy"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 mt-0.5 hover:opacity-90"
        />

        {/* Video Information */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Title (2 lines max, clean YouTube font) */}
          <h3 className="text-[14px] sm:text-[15px] font-medium text-white leading-snug line-clamp-2 group-hover:text-zinc-100 transition-colors">
            {video.title}
          </h3>

          {/* Channel Name & Stats Line */}
          <div className="text-xs text-[#aaa] mt-1 space-y-0.5">
            <div className="flex items-center gap-1 hover:text-white transition-colors">
              <span className="truncate">{video.channelTitle}</span>
              {video.verified && (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#aaa] fill-[#aaa]/20 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1 font-normal text-zinc-400">
              <span>{formatViews(video.views)} vues</span>
              <span>•</span>
              <span>{video.uploadDate}</span>
            </div>
          </div>
        </div>

        {/* Three Dots Context Button (⋮) */}
        <div className="relative shrink-0" ref={optionsRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(!showOptions);
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 opacity-70 group-hover:opacity-100 transition-all cursor-pointer"
            title="Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Quick Options Menu */}
          {showOptions && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 w-52 bg-[#282828] border border-[#3f3f3f] rounded-xl shadow-2xl py-1 z-40 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={(e) => {
                  setShowOptions(false);
                  onSaveQuick && onSaveQuick(video, e);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Bookmark className="w-4 h-4 text-zinc-400" />
                <span>Enregistrer dans Favoris</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowOptions(false);
                  onShareQuick && onShareQuick(video, e);
                }}
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/10 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-zinc-400" />
                <span>Partager la vidéo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
