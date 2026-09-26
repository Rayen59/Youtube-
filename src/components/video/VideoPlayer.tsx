import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  Rewind,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Settings,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../../types';

interface VideoPlayerProps {
  video: Video;
  onProgressUpdate?: (secondsWatched: number) => void;
  onEnded?: () => void;
  onControlsVisibilityChange?: (visible: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onProgressUpdate,
  onEnded,
  onControlsVisibilityChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Fallback stream cycling
  const allSources = [
    video.videoUrl,
    ...(video.fallbackUrls || []),
    'https://vjs.zencdn.net/v/oceans.mp4',
    'https://media.w3.org/2010/05/sintel/trailer.mp4',
  ].filter(Boolean);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(video.trimStart || 0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(Boolean(video.defaultMuted));
  const [wasAutoplayMuted, setWasAutoplayMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // IMPORTANT YOUTUBE BEHAVIOR:
  // Bottom bar is HIDDEN on video open, and ONLY appears when the user clicks on the video!
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (onControlsVisibilityChange) {
      onControlsVisibilityChange(showControls);
    }
  }, [showControls, onControlsVisibilityChange]);

  // High-Quality & Speed states
  const [playbackSpeed, setPlaybackSpeed] = useState(video.defaultPlaybackSpeed || 1);
  const [selectedQuality, setSelectedQuality] = useState<'4K Ultra HD' | '1440p QHD' | '1080p Full HD' | '720p HD'>(
    video.resolution === '4K' ? '4K Ultra HD' : '1080p Full HD'
  );
  const [isUltraHqActive, setIsUltraHqActive] = useState<boolean>(
    video.ultraHqEnhanced !== undefined ? video.ultraHqEnhanced : true
  );
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'main' | 'quality' | 'speed'>('main');

  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  // YouTube Double-Click / Double-Tap 10s Skip state
  const [jumpFeedback, setJumpFeedback] = useState<{
    text: string;
    side: 'left' | 'right';
    accumulatedSecs: number;
  } | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapSideRef = useRef<'left' | 'right' | null>(null);
  const jumpHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset states when switching video — bottom bar stays hidden on open!
  useEffect(() => {
    setSourceIndex(0);
    setHasError(false);
    setIsBuffering(true);
    setCurrentTime(video.trimStart || 0);
    setDuration(video.duration || 0);
    setShowControls(false); // Hidden on open like YouTube!
    setShowSettingsMenu(false);
    setPlaybackSpeed(video.defaultPlaybackSpeed || 1);
    setIsMuted(Boolean(video.defaultMuted));
    setSelectedQuality(video.resolution === '4K' ? '4K Ultra HD' : '1080p Full HD');
  }, [video.id, video.videoUrl, video.trimStart, video.duration, video.defaultPlaybackSpeed, video.defaultMuted, video.resolution]);

  // Schedule auto-hide of controls after 3.2 seconds when shown
  const scheduleHideControls = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !showSettingsMenu) {
        setShowControls(false);
      }
    }, 3200);
  }, [showSettingsMenu]);

  // Format seconds into MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    const totalSecs = Math.max(0, Math.floor(secs || 0));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Attempt smart playback (handles browser autoplay policies smoothly)
  const attemptPlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    if (video.trimStart && v.currentTime < video.trimStart) {
      v.currentTime = video.trimStart;
    }
    v.playbackRate = video.defaultPlaybackSpeed || 1;
    v.muted = Boolean(video.defaultMuted);

    try {
      await v.play();
      setIsPlaying(true);
      setHasError(false);
    } catch {
      if (videoRef.current) {
        videoRef.current.muted = true;
        setIsMuted(true);
        setWasAutoplayMuted(true);
        try {
          await videoRef.current.play();
          setIsPlaying(true);
          setHasError(false);
        } catch {
          setIsPlaying(false);
        }
      }
    }
  }, [video.trimStart, video.defaultPlaybackSpeed, video.defaultMuted]);

  useEffect(() => {
    attemptPlay();
  }, [attemptPlay, sourceIndex, video.videoUrl]);

  // Play / Pause toggle
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (wasAutoplayMuted && videoRef.current.muted && !video.defaultMuted) {
        videoRef.current.muted = false;
        setIsMuted(false);
        setWasAutoplayMuted(false);
      }
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          scheduleHideControls();
        })
        .catch(() => {
          videoRef.current?.play();
        });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [wasAutoplayMuted, video.defaultMuted, scheduleHideControls]);

  // Jump 10s Forward (Double-click right)
  const handleFastForward10s = useCallback(() => {
    if (!videoRef.current) return;
    const maxDur = video.trimEnd || videoRef.current.duration || duration;
    const newTime = Math.min(maxDur, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    setJumpFeedback((prev) => {
      const acc = prev && prev.side === 'right' ? prev.accumulatedSecs + 10 : 10;
      return { text: `+${acc} secondes`, side: 'right', accumulatedSecs: acc };
    });

    if (jumpHideTimeoutRef.current) clearTimeout(jumpHideTimeoutRef.current);
    jumpHideTimeoutRef.current = setTimeout(() => setJumpFeedback(null), 750);
  }, [duration, video.trimEnd]);

  // Jump 10s Backward (Double-click left)
  const handleRewind10s = useCallback(() => {
    if (!videoRef.current) return;
    const minTime = video.trimStart || 0;
    const newTime = Math.max(minTime, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    setJumpFeedback((prev) => {
      const acc = prev && prev.side === 'left' ? prev.accumulatedSecs + 10 : 10;
      return { text: `-${acc} secondes`, side: 'left', accumulatedSecs: acc };
    });

    if (jumpHideTimeoutRef.current) clearTimeout(jumpHideTimeoutRef.current);
    jumpHideTimeoutRef.current = setTimeout(() => setJumpFeedback(null), 750);
  }, [video.trimStart]);

  // YOUTUBE SURFACE INTERACTION:
  // - Single click/tap on the video: Toggles showing/hiding the bottom bar!
  // - Double click/tap on the right side: Skips +10s forward!
  // - Double click/tap on the left side: Rewinds -10s backward!
  const handleVideoSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const side: 'left' | 'right' = clickX > rect.width / 2 ? 'right' : 'left';
    const now = Date.now();
    const timeDiff = now - lastTapTimeRef.current;

    if (timeDiff < 300 && lastTapSideRef.current === side) {
      // DOUBLE CLICK DETECTED!
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      if (side === 'right') {
        handleFastForward10s();
      } else {
        handleRewind10s();
      }
      lastTapTimeRef.current = now;
      return;
    }

    // First click: wait 230ms to see if a second click follows
    lastTapTimeRef.current = now;
    lastTapSideRef.current = side;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      // SINGLE CLICK: Toggle the bottom bar visibility just like YouTube!
      setShowControls((prev) => {
        const next = !prev;
        if (next) {
          scheduleHideControls();
        } else {
          setShowSettingsMenu(false);
        }
        return next;
      });
      clickTimerRef.current = null;
    }, 230);
  };

  // Fallback handler when stream errors
  const handleVideoError = () => {
    if (sourceIndex + 1 < allSources.length) {
      setSourceIndex((prev) => prev + 1);
      setHasError(false);
      setIsBuffering(true);
    } else {
      setHasError(true);
      setIsBuffering(false);
      setIsPlaying(false);
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setSourceIndex(0);
    setIsBuffering(true);
    if (videoRef.current) {
      videoRef.current.load();
      attemptPlay();
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
        setShowControls(true);
        scheduleHideControls();
      } else if (e.code === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        handleFastForward10s();
      } else if (e.code === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        handleRewind10s();
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlayPause, handleFastForward10s, handleRewind10s, scheduleHideControls]);

  // Time update listener with support for trimmed start/end
  const handleTimeUpdate = () => {
    if (!videoRef.current || isDraggingScrubber) return;
    const cur = videoRef.current.currentTime;

    if (video.trimEnd && video.trimEnd > 0 && cur >= video.trimEnd) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (onEnded) onEnded();
      return;
    }

    setCurrentTime(cur);
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
    if (onProgressUpdate) {
      onProgressUpdate(Math.floor(cur));
    }
  };

  // Progress Bar Seek
  const seekToPosition = (clientX: number) => {
    if (!progressBarRef.current || !videoRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDraggingScrubber(true);
    seekToPosition(e.clientX);

    const onMouseMove = (moveEvent: MouseEvent) => {
      seekToPosition(moveEvent.clientX);
    };

    const onMouseUp = () => {
      setIsDraggingScrubber(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleScrubberMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
    setWasAutoplayMuted(false);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
    setWasAutoplayMuted(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSpeedSelect = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setSettingsTab('main');
    }
  };

  // Compute combined visual filter (User Studio Filter + 4K Ultra HQ Enhancer)
  const computeVideoFilterCss = () => {
    const parts: string[] = [];
    if (video.videoFilter && video.videoFilter !== 'none') {
      parts.push(video.videoFilter);
    }
    if (video.brightness && video.brightness !== 100) {
      parts.push(`brightness(${video.brightness}%)`);
    }
    if (video.contrast && video.contrast !== 100) {
      parts.push(`contrast(${video.contrast}%)`);
    }
    if (video.saturation && video.saturation !== 100) {
      parts.push(`saturate(${video.saturation}%)`);
    }
    if (isUltraHqActive) {
      parts.push('contrast(1.06) saturate(1.12) brightness(1.02)');
    }
    return parts.length > 0 ? parts.join(' ') : 'none';
  };

  const currentSourceUrl = allSources[sourceIndex] || video.videoUrl;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-none sm:rounded-2xl overflow-hidden select-none group shadow-2xl border-0 sm:border sm:border-white/10"
    >
      {/* HTML5 VIDEO TAG WITH GRANDE QUALITÉ 4K HDR ENGINE */}
      <video
        ref={videoRef}
        key={currentSourceUrl}
        src={currentSourceUrl}
        poster={video.thumbnailUrl}
        playsInline
        preload="auto"
        style={{ filter: computeVideoFilterCss() }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current?.duration) {
            setDuration(videoRef.current.duration);
          }
          if (video.trimStart && videoRef.current) {
            videoRef.current.currentTime = video.trimStart;
          }
          setIsBuffering(false);
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (onEnded) onEnded();
        }}
        onError={handleVideoError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain transition-[filter] duration-300"
      />

      {/* CLICK & DOUBLE-CLICK SURFACE (YOUTUBE STYLE) */}
      <div
        onClick={handleVideoSurfaceClick}
        className="absolute inset-0 cursor-pointer z-10"
      >
        {/* CENTER PLAY/PAUSE OVERLAY BUTTON (VISIBLE ONLY WHEN CONTROLS ARE SHOWN OR VIDEO PAUSED) */}
        <AnimatePresence>
          {(showControls || !isPlaying) && !isBuffering && !hasError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none gap-10 sm:gap-16"
            >
              {/* Quick -10s circle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRewind10s();
                  scheduleHideControls();
                }}
                className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex flex-col items-center justify-center backdrop-blur-md border border-white/15 transition-transform active:scale-90 cursor-pointer"
                title="Reculer de 10s"
              >
                <Rewind className="w-4 h-4 fill-white" />
                <span className="text-[9px] font-black">-10s</span>
              </button>

              {/* Center Play / Pause button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="pointer-events-auto w-16 h-16 sm:w-20 sm:h-20 bg-black/70 hover:bg-[#ff0000] rounded-full flex items-center justify-center backdrop-blur-md border border-white/25 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-9 sm:h-9 fill-white text-white" />
                ) : (
                  <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white text-white translate-x-0.5" />
                )}
              </button>

              {/* Quick +10s circle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFastForward10s();
                  scheduleHideControls();
                }}
                className="pointer-events-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex flex-col items-center justify-center backdrop-blur-md border border-white/15 transition-transform active:scale-90 cursor-pointer"
                title="Avancer de 10s"
              >
                <FastForward className="w-4 h-4 fill-white" />
                <span className="text-[9px] font-black">+10s</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BUFFERING SPINNER */}
        {isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/25">
            <div className="w-12 h-12 border-4 border-white/20 border-t-[#ff0000] rounded-full animate-spin" />
          </div>
        )}

        {/* YOUTUBE DOUBLE-CLICK RIPPLE FEEDBACK (+10s RIGHT / -10s LEFT) */}
        <AnimatePresence>
          {jumpFeedback && (
            <motion.div
              key={`${jumpFeedback.side}-${jumpFeedback.accumulatedSecs}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.25 }}
              className={`absolute inset-y-0 ${
                jumpFeedback.side === 'right'
                  ? 'right-0 rounded-l-[120px]'
                  : 'left-0 rounded-r-[120px]'
              } w-[42%] flex flex-col items-center justify-center bg-white/15 backdrop-blur-sm pointer-events-none select-none`}
            >
              <div className="flex flex-col items-center gap-1.5 text-white drop-shadow-lg">
                <div className="flex items-center gap-1">
                  {jumpFeedback.side === 'right' ? (
                    <>
                      <FastForward className="w-7 h-7 sm:w-9 sm:h-9 fill-white animate-pulse" />
                    </>
                  ) : (
                    <>
                      <Rewind className="w-7 h-7 sm:w-9 sm:h-9 fill-white animate-pulse" />
                    </>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-black tracking-wide bg-black/60 px-3 py-1 rounded-full">
                  {jumpFeedback.text}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ERROR SCREEN WITH RECOVERY */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-20">
            <AlertCircle className="w-12 h-12 text-[#ff0000] mb-3" />
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">
              Lecture momentanément indisponible
            </h3>
            <p className="text-xs text-gray-400 max-w-md mb-4">
              Le flux vidéo distant a rencontré un délai réseau. Cliquez ci-dessous pour relancer en haute qualité.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRetry();
              }}
              className="px-5 py-2.5 bg-[#ff0000] hover:bg-[#cc0000] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Réessayer la lecture</span>
            </button>
          </div>
        )}
      </div>

      {/* AUTOPLAY MUTED UNMUTE NOTIFICATION PILL */}
      <AnimatePresence>
        {wasAutoplayMuted && isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute top-3 left-3 z-25 flex items-center gap-2 bg-black/85 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white shadow-xl cursor-pointer hover:bg-[#ff0000] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            <VolumeX className="w-4 h-4 text-[#ff0000]" />
            <span>Activer le son</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP OVERLAY HEADER — ONLY SHOWN WHEN USER CLICKS ON THE VIDEO */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="absolute top-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between text-white z-20 pointer-events-none"
          >
            <div className="truncate max-w-[75%]">
              <h2 className="text-xs sm:text-sm font-bold truncate drop-shadow">{video.title}</h2>
              <div className="text-[11px] text-gray-300 drop-shadow flex items-center gap-2 mt-0.5">
                <span>{video.channelTitle}</span>
                <span>•</span>
                <span className="bg-[#ff0000] text-white text-[10px] font-black px-1.5 py-0.2 rounded">
                  {selectedQuality}
                </span>
                {isUltraHqActive && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    HDR Crystal
                  </span>
                )}
              </div>
            </div>

            <div className="text-[10px] text-gray-200 bg-black/60 px-2.5 py-1 rounded-full border border-white/15 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#ff0000]" />
              <span>Double-clic G/D : ±10s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CONTROLS BAR — HIDDEN ON OPEN, ONLY SHOWN WHEN USER CLICKS THE VIDEO */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => {
              e.stopPropagation();
              scheduleHideControls();
            }}
            className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-20 flex flex-col gap-1.5"
          >
            {/* TIMELINE / PROGRESS BAR */}
            <div
              ref={progressBarRef}
              onMouseDown={handleScrubberMouseDown}
              onMouseMove={handleScrubberMouseMove}
              onMouseLeave={() => {
                setHoverPosition(null);
                setHoverTime(null);
              }}
              className="relative w-full h-3.5 flex items-center cursor-pointer group/bar py-1"
            >
              <div className="w-full h-1 group-hover/bar:h-1.5 bg-white/30 rounded-full overflow-hidden transition-all relative">
                <div
                  className="h-full bg-[#ff0000] rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#ff0000] rounded-full shadow-md scale-100 transition-transform pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />

              {hoverPosition !== null && hoverTime !== null && (
                <div
                  className="absolute bottom-5 -translate-x-1/2 bg-black/90 text-white text-[10px] font-bold px-2 py-0.5 rounded border border-white/15 pointer-events-none whitespace-nowrap shadow-lg"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* BUTTONS BAR */}
            <div className="flex items-center justify-between text-white text-xs">
              {/* Left group: Play/Pause, -10s, +10s, Volume, Time */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
                  title={isPlaying ? 'Pause' : 'Lecture'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRewind10s}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-gray-200 hover:text-white flex items-center gap-0.5"
                  title="Reculer de 10 secondes"
                >
                  <Rewind className="w-4 h-4" />
                  <span className="text-[10px] font-bold hidden xs:inline">10s</span>
                </button>

                <button
                  type="button"
                  onClick={handleFastForward10s}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-gray-200 hover:text-white flex items-center gap-0.5"
                  title="Avancer de 10 secondes"
                >
                  <span className="text-[10px] font-bold hidden xs:inline">10s</span>
                  <FastForward className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-[#ff0000]" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="hidden sm:block w-16 h-1 accent-[#ff0000] cursor-pointer"
                  />
                </div>

                <div className="text-[11px] font-mono font-semibold text-gray-200 ml-1">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-1 text-gray-500">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right group: Grande Qualité 4K HDR toggle, Settings (Quality & Speed), Fullscreen */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 1-Click Grande Qualité 4K HDR Enhancer Button */}
                <button
                  type="button"
                  onClick={() => setIsUltraHqActive(!isUltraHqActive)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1 ${
                    isUltraHqActive
                      ? 'bg-[#ff0000] text-white border-[#ff0000] shadow-sm'
                      : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20'
                  }`}
                  title="Amélioration Grande Qualité 4K HDR Crystal"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{selectedQuality.split(' ')[0]} HQ</span>
                </button>

                {/* Settings Menu (Quality & Speed) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsMenu(!showSettingsMenu);
                      setSettingsTab('main');
                    }}
                    className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
                    title="Qualité vidéo & Vitesse"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  {showSettingsMenu && (
                    <div className="absolute bottom-10 right-0 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2 shadow-2xl min-w-[210px] z-30 text-xs">
                      {settingsTab === 'main' && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => setSettingsTab('quality')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
                          >
                            <span className="text-gray-300">Qualité vidéo</span>
                            <span className="font-bold text-[#ff0000]">{selectedQuality}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSettingsTab('speed')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
                          >
                            <span className="text-gray-300">Vitesse</span>
                            <span className="font-bold text-white">{playbackSpeed}x</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsUltraHqActive(!isUltraHqActive)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
                          >
                            <span className="text-gray-300">Moteur Crystal HDR</span>
                            <span className={`font-bold ${isUltraHqActive ? 'text-emerald-400' : 'text-gray-500'}`}>
                              {isUltraHqActive ? 'Activé' : 'Désactivé'}
                            </span>
                          </button>
                        </div>
                      )}

                      {settingsTab === 'quality' && (
                        <div className="space-y-1">
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-gray-400 border-b border-white/10 mb-1">
                            Sélectionner Grande Qualité
                          </div>
                          {(['4K Ultra HD', '1440p QHD', '1080p Full HD', '720p HD'] as const).map(
                            (q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  setSelectedQuality(q);
                                  if (q === '4K Ultra HD' || q === '1440p QHD') {
                                    setIsUltraHqActive(true);
                                  }
                                  setShowSettingsMenu(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
                              >
                                <span className={selectedQuality === q ? 'font-bold text-[#ff0000]' : ''}>
                                  {q}
                                </span>
                                {selectedQuality === q && <Check className="w-3.5 h-3.5 text-[#ff0000]" />}
                              </button>
                            )
                          )}
                        </div>
                      )}

                      {settingsTab === 'speed' && (
                        <div className="space-y-1">
                          <div className="px-2 py-1 text-[10px] font-black uppercase text-gray-400 border-b border-white/10 mb-1">
                            Vitesse de lecture
                          </div>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                handleSpeedSelect(s);
                                setShowSettingsMenu(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/10 text-white cursor-pointer"
                            >
                              <span className={playbackSpeed === s ? 'font-bold text-[#ff0000]' : ''}>
                                {s === 1 ? 'Normale (1x)' : `${s}x`}
                              </span>
                              {playbackSpeed === s && <Check className="w-3.5 h-3.5 text-[#ff0000]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
                  title={isFullscreen ? 'Quitter plein écran (F)' : 'Plein écran (F)'}
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ULTRA-SLIM 2PX YOUTUBE RED PROGRESS LINE AT THE VERY BOTTOM WHEN BAR IS HIDDEN */}
      {!showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/15 z-15 pointer-events-none">
          <div
            className="h-full bg-[#ff0000] transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
