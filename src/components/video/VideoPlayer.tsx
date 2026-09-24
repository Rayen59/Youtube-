import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  FastForward,
  Rewind,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Video } from '../../types';

interface VideoPlayerProps {
  video: Video;
  onProgressUpdate?: (secondsWatched: number) => void;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  onProgressUpdate,
  onEnded,
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [wasAutoplayMuted, setWasAutoplayMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  // Jump feedback
  const [jumpFeedback, setJumpFeedback] = useState<{ text: string; side: 'left' | 'right' } | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset states on video switch
  useEffect(() => {
    setSourceIndex(0);
    setHasError(false);
    setIsBuffering(true);
    setCurrentTime(0);
    setDuration(video.duration || 0);
  }, [video.id, video.videoUrl]);

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
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
      setIsPlaying(true);
      setHasError(false);
    } catch {
      // Browser blocked unmuted autoplay: mute and retry
      if (videoRef.current) {
        videoRef.current.muted = true;
        setIsMuted(true);
        setWasAutoplayMuted(true);
        try {
          await videoRef.current.play();
          setIsPlaying(true);
          setHasError(false);
        } catch {
          // If still blocked, wait for user click
          setIsPlaying(false);
        }
      }
    }
  }, []);

  // On mount or source change, attempt playback
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    attemptPlay();
  }, [attemptPlay, sourceIndex, video.videoUrl]);

  // Instant Play / Pause toggle (0ms latency!)
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      // If was autoplay-muted and user interacts, unmute
      if (wasAutoplayMuted && videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
        setWasAutoplayMuted(false);
      }
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback
        videoRef.current?.play();
      });
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [wasAutoplayMuted]);

  // Jump 10s Forward
  const handleFastForward10s = useCallback(() => {
    if (!videoRef.current) return;
    const maxDur = videoRef.current.duration || duration;
    const newTime = Math.min(maxDur, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    setJumpFeedback({ text: '+10s', side: 'right' });
    setTimeout(() => setJumpFeedback(null), 650);
  }, [duration]);

  // Jump 10s Backward
  const handleRewind10s = useCallback(() => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    setJumpFeedback({ text: '-10s', side: 'left' });
    setTimeout(() => setJumpFeedback(null), 650);
  }, []);

  // Fallback handler when stream errors
  const handleVideoError = () => {
    console.warn(`Video stream error on source index ${sourceIndex}: ${allSources[sourceIndex]}`);
    if (sourceIndex + 1 < allSources.length) {
      // Automatically switch to next mirror
      setSourceIndex((prev) => prev + 1);
      setHasError(false);
      setIsBuffering(true);
    } else {
      // All sources tried
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
  }, [togglePlayPause, handleFastForward10s, handleRewind10s]);

  // Time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current || isDraggingScrubber) return;
    const cur = videoRef.current.currentTime;
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
      setShowSpeedMenu(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  const currentSourceUrl = allSources[sourceIndex] || video.videoUrl;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group shadow-2xl border border-white/10"
    >
      {/* HTML5 VIDEO TAG */}
      <video
        ref={videoRef}
        key={currentSourceUrl}
        src={currentSourceUrl}
        poster={video.thumbnailUrl}
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (videoRef.current?.duration) {
            setDuration(videoRef.current.duration);
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
          if (onEnded) onEnded();
        }}
        onError={handleVideoError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain"
      />

      {/* CLICKABLE SURFACE (INSTANT TOGGLE PLAY / PAUSE) */}
      <div
        onClick={togglePlayPause}
        className="absolute inset-0 cursor-pointer z-10"
        title="Cliquer pour Lecture / Pause (ou Espace)"
      >
        {/* BIG CENTER PLAY BUTTON WHEN PAUSED */}
        {!isPlaying && !isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/75 hover:bg-[#ff0000] rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl transition-all scale-100 hover:scale-110">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white text-white translate-x-0.5" />
            </div>
          </div>
        )}

        {/* BUFFERING SPINNER */}
        {isBuffering && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
            <div className="w-12 h-12 border-4 border-white/20 border-t-[#ff0000] rounded-full animate-spin" />
          </div>
        )}

        {/* JUMP FEEDBACK (+10s or -10s) */}
        <AnimatePresence>
          {jumpFeedback && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.4 }}
              className={`absolute inset-y-0 ${
                jumpFeedback.side === 'right' ? 'right-0 rounded-l-full' : 'left-0 rounded-r-full'
              } w-1/3 flex flex-col items-center justify-center bg-black/50 backdrop-blur-xs pointer-events-none border border-white/20`}
            >
              <div className="flex items-center gap-2 text-white font-black text-2xl sm:text-3xl">
                {jumpFeedback.side === 'right' ? (
                  <>
                    <span>{jumpFeedback.text}</span>
                    <FastForward className="w-8 h-8 fill-white" />
                  </>
                ) : (
                  <>
                    <Rewind className="w-8 h-8 fill-white" />
                    <span>{jumpFeedback.text}</span>
                  </>
                )}
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
              Le flux vidéo distant a rencontré un délai réseau. Vous pouvez recharger la vidéo ou tester une autre vidéo.
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
            className="absolute top-4 left-4 z-25 flex items-center gap-2 bg-black/85 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white shadow-xl cursor-pointer hover:bg-[#ff0000] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
          >
            <VolumeX className="w-4 h-4 text-[#ff0000]" />
            <span>Son coupé par sécurité du navigateur — Cliquez pour activer</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP OVERLAY HEADER */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between text-white z-20 pointer-events-none"
          >
            <div className="truncate max-w-[80%]">
              <h2 className="text-sm sm:text-base font-bold truncate drop-shadow">{video.title}</h2>
              <p className="text-xs text-gray-300 drop-shadow flex items-center gap-2 mt-0.5">
                <span>{video.channelTitle}</span>
                <span>•</span>
                <span className="bg-[#ff0000] text-white text-[10px] font-black px-1.5 py-0.2 rounded">
                  {video.resolution}
                </span>
                {video.isFromGallery && (
                  <span className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                    Galerie Locale
                  </span>
                )}
              </p>
            </div>

            <div className="text-[11px] text-gray-200 bg-black/60 px-3 py-1 rounded-full border border-white/15 hidden sm:flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#ff0000]" />
              <span>Lecteur Haute Précision</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CONTROLS OVERLAY */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/75 to-transparent z-20 flex flex-col gap-2"
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
              className="relative w-full h-3 flex items-center cursor-pointer group/bar py-1"
            >
              {/* Background Track */}
              <div className="w-full h-1 group-hover/bar:h-2 bg-white/25 rounded-full overflow-hidden transition-all relative">
                {/* Current Play Progress */}
                <div
                  className="h-full bg-[#ff0000] rounded-full relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Knob */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-[#ff0000] rounded-full shadow-md scale-0 group-hover/bar:scale-100 transition-transform pointer-events-none"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Hover Tooltip */}
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
              {/* Left group: Play/Pause, Rewind 10s, Forward 10s, Volume, Time */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Play / Pause button */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
                  title={isPlaying ? 'Pause (Espace)' : 'Lecture (Espace)'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white" />
                  )}
                </button>

                {/* Rewind 10s */}
                <button
                  type="button"
                  onClick={handleRewind10s}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-gray-300 hover:text-white"
                  title="Reculer de 10 secondes (Touche J)"
                >
                  <Rewind className="w-4 h-4" />
                </button>

                {/* Fast Forward 10s */}
                <button
                  type="button"
                  onClick={handleFastForward10s}
                  className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-gray-300 hover:text-white"
                  title="Avancer de 10 secondes (Touche L)"
                >
                  <FastForward className="w-4 h-4" />
                </button>

                {/* Volume & Slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-full hover:bg-white/15 transition-colors cursor-pointer text-white"
                    title={isMuted ? 'Activer le son (Touche M)' : 'Couper le son (Touche M)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-[#ff0000]" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-14 sm:w-20 h-1 accent-[#ff0000] cursor-pointer"
                  />
                </div>

                {/* Time Display */}
                <div className="text-[11px] sm:text-xs font-semibold text-gray-300 ml-1">
                  <span>{formatTime(currentTime)}</span>
                  <span className="mx-1 text-gray-500">/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Right group: Speed selector, Fullscreen */}
              <div className="flex items-center gap-2">
                {/* Speed Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    {playbackSpeed}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-8 right-0 bg-[#1f1f1f] border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 min-w-[70px] z-30">
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedSelect(s)}
                          className={`text-left text-xs px-2.5 py-1 rounded-md transition-colors ${
                            playbackSpeed === s
                              ? 'bg-[#ff0000] text-white font-bold'
                              : 'hover:bg-white/10 text-gray-300'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
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
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MINI 2PX TIMELINE WHEN CONTROLS ARE HIDDEN */}
      {!showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-15 pointer-events-none">
          <div
            className="h-full bg-[#ff0000]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
};
