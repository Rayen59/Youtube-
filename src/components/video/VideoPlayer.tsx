import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  FastForward,
  Rewind,
  Sparkles,
  Clock,
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

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isDraggingScrubber, setIsDraggingScrubber] = useState(false);

  // Jump feedback animations: "+10s" (Right) and "-10s" (Left)
  const [skipForwardAnimation, setSkipForwardAnimation] = useState(false);
  const [rewindAnimation, setRewindAnimation] = useState(false);
  const [jumpFeedbackText, setJumpFeedbackText] = useState<string | null>(null);

  // Timers to distinguish single click (play/pause) from double click (±10s jump)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickSideRef = useRef<'left' | 'right' | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format seconds to MM:SS or HH:MM:SS
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

  // Toggle play/pause
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // JUMP FORWARD 10 SECONDS (+10s)
  const handleFastForward10s = useCallback(() => {
    if (!videoRef.current) return;
    const maxDur = videoRef.current.duration || duration;
    const newTime = Math.min(maxDur, videoRef.current.currentTime + 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    setSkipForwardAnimation(true);
    setJumpFeedbackText('+10 secondes');
    setTimeout(() => {
      setSkipForwardAnimation(false);
      setJumpFeedbackText(null);
    }, 750);
  }, [duration]);

  // JUMP BACKWARD 10 SECONDS (-10s)
  const handleRewind10s = useCallback(() => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime - 10);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);

    setRewindAnimation(true);
    setJumpFeedbackText('-10 secondes');
    setTimeout(() => {
      setRewindAnimation(false);
      setJumpFeedbackText(null);
    }, 750);
  }, []);

  // DISPATCH CLICKS: Handles 2 SUCCESSIVE CLICKS (Double Click) cleanly!
  // Right side = jump forward 10s (+10s)
  // Left side = jump backward 10s (-10s)
  // Single click = toggle play/pause after threshold
  const handleSurfaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only capture clicks on the video surface (not controls)
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const side: 'left' | 'right' = clickX < width / 2 ? 'left' : 'right';

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;

    // Check if this is the 2nd successive click within 340ms on the same side or video area
    if (timeSinceLastClick < 340 && lastClickSideRef.current === side) {
      // SUCCESSIVE DOUBLE CLICK DETECTED!
      // Cancel the scheduled single click (prevent play/pause toggle)
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      lastClickTimeRef.current = 0;
      lastClickSideRef.current = null;

      if (side === 'right') {
        handleFastForward10s();
      } else {
        handleRewind10s();
      }
    } else {
      // First click: record time and side, schedule single click action
      lastClickTimeRef.current = now;
      lastClickSideRef.current = side;

      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }

      clickTimeoutRef.current = setTimeout(() => {
        handlePlayPause();
        lastClickTimeRef.current = 0;
        lastClickSideRef.current = null;
      }, 260);
    }
  };

  // Double tap handler for touch devices (Mobile / iPad)
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const touch = e.changedTouches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const side: 'left' | 'right' = touchX < rect.width / 2 ? 'left' : 'right';

    const now = Date.now();
    const diff = now - lastClickTimeRef.current;

    if (diff < 340 && lastClickSideRef.current === side) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      lastClickTimeRef.current = 0;
      lastClickSideRef.current = null;
      if (side === 'right') {
        handleFastForward10s();
      } else {
        handleRewind10s();
      }
    } else {
      lastClickTimeRef.current = now;
      lastClickSideRef.current = side;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = setTimeout(() => {
        handlePlayPause();
        lastClickTimeRef.current = 0;
        lastClickSideRef.current = null;
      }, 260);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        handlePlayPause();
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
  }, [handlePlayPause, handleFastForward10s, handleRewind10s]);

  // Video timeupdate listener
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

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  // Progress Bar / Scrubber Seek Handlers
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

  const handleScrubberMouseLeave = () => {
    setHoverPosition(null);
    setHoverTime(null);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
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

  // Auto-hide controls when mouse is idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentSecs = Math.floor(currentTime);
  const totalSecs = Math.floor(duration);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group shadow-2xl border border-white/10"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={onEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain pointer-events-none"
      />

      {/* CLICKABLE VIDEO SURFACE (Handles Double Click Forward/Backward and Single Click Play/Pause) */}
      <div
        onClick={handleSurfaceClick}
        onTouchEnd={handleTouchEnd}
        className="absolute inset-0 cursor-pointer z-10"
        title="Double-clic à droite (+10s) | Double-clic à gauche (-10s) | Clic simple (Play/Pause)"
      >
        {/* ========================================================
            YOUTUBE-STYLE ANIMATED RIPPLE: DOUBLE CLICK BACKWARD (-10s)
           ======================================================== */}
        <AnimatePresence>
          {rewindAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-y-0 left-0 w-1/2 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs rounded-r-full pointer-events-none border-r border-white/20"
            >
              <div className="flex items-center gap-1.5 text-white font-black text-2xl sm:text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                <Rewind className="w-9 h-9 sm:w-12 sm:h-12 fill-white animate-pulse" />
                <span>-10s</span>
              </div>
              <span className="text-xs font-bold text-gray-200 mt-2 bg-black/60 px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider">
                Recul de 10 secondes
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================
            YOUTUBE-STYLE ANIMATED RIPPLE: DOUBLE CLICK FORWARD (+10s)
           ======================================================== */}
        <AnimatePresence>
          {skipForwardAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-y-0 right-0 w-1/2 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs rounded-l-full pointer-events-none border-l border-white/20"
            >
              <div className="flex items-center gap-1.5 text-white font-black text-2xl sm:text-4xl drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                <span>+10s</span>
                <FastForward className="w-9 h-9 sm:w-12 sm:h-12 fill-white animate-pulse" />
              </div>
              <span className="text-xs font-bold text-gray-200 mt-2 bg-black/60 px-3 py-1 rounded-full border border-white/10 uppercase tracking-wider">
                Avance de 10 secondes
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CENTER BIG PLAY/PAUSE INDICATOR WHEN PAUSED */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/75 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl">
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white text-white translate-x-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* TOP BAR OVERLAY WITH VIDEO TITLE */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between text-white z-20 pointer-events-none"
          >
            <div className="truncate max-w-[75%]">
              <h2 className="text-sm sm:text-base font-extrabold truncate drop-shadow">{video.title}</h2>
              <p className="text-xs text-gray-300 drop-shadow flex items-center gap-2 mt-0.5">
                <span>{video.channelTitle}</span>
                <span>•</span>
                <span className="bg-[#ff0000] text-white text-[10px] font-black px-1.5 py-0.2 rounded">
                  {video.resolution}
                </span>
              </p>
            </div>

            {/* Jump Helper Badge */}
            <div className="text-[11px] text-gray-200 bg-black/60 px-3 py-1 rounded-full border border-white/15 hidden sm:flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#ff0000] animate-pulse" />
              <span>Double-clic : ±10s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ALWAYS VISIBLE 3PX MINI PROGRESS BAR AT THE VERY BOTTOM (EVEN WHEN CONTROLS ARE HIDDEN) */}
      {!showControls && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-15 pointer-events-none">
          <div
            className="h-full bg-[#ff0000] shadow-[0_0_8px_rgba(255,0,0,0.8)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* ========================================================
          BOTTOM CONTROLS BAR WITH PROMINENT TIME PROGRESS BAR
         ======================================================== */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent pt-8 pb-3 px-3 sm:px-5 z-20 pointer-events-auto"
          >
            {/* 1. TIME VIDEO BARRA (PROMINENT INTERACTIVE PROGRESS TRACK) */}
            <div
              ref={progressBarRef}
              onMouseDown={handleScrubberMouseDown}
              onMouseMove={handleScrubberMouseMove}
              onMouseLeave={handleScrubberMouseLeave}
              className="relative h-2 hover:h-3.5 bg-white/25 hover:bg-white/35 rounded-full cursor-pointer transition-all duration-150 mb-3 group/bar select-none"
              title="Cliquer ou glisser pour naviguer dans la vidéo"
            >
              {/* Buffer track indicator */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-white/40 rounded-full"
                style={{ width: `${Math.min(100, progressPercent + 25)}%` }}
              />

              {/* Played progress track in Vivid MK Red */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-[#ff0000] rounded-full shadow-[0_0_10px_rgba(255,0,0,0.7)]"
                style={{ width: `${progressPercent}%` }}
              />

              {/* Scrubber Knob / Thumb with active pulse */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_12px_rgba(255,0,0,0.9)] ring-2 ring-[#ff0000] opacity-0 group-hover/bar:opacity-100 transition-opacity"
                style={{ left: `${progressPercent}%` }}
              />

              {/* Floating Tooltip displaying Time & Exact Seconds on Hover */}
              {hoverPosition !== null && hoverTime !== null && (
                <div
                  className="absolute bottom-full mb-3 -translate-x-1/2 bg-[#181818] text-white text-xs font-mono px-2.5 py-1.5 rounded-lg border border-white/20 shadow-2xl pointer-events-none whitespace-nowrap flex flex-col items-center z-30"
                  style={{ left: `${hoverPosition}%` }}
                >
                  <span className="font-bold text-white text-sm">{formatTime(hoverTime)}</span>
                  <span className="text-[10px] text-gray-300 font-sans">
                    {Math.floor(hoverTime)}s / {totalSecs}s
                  </span>
                </div>
              )}
            </div>

            {/* 2. PLAYER BUTTONS & TIMESTAMPS ROW */}
            <div className="flex items-center justify-between text-white gap-2">
              
              {/* LEFT CONTROLS: PLAY/PAUSE, -10s, +10s, VOLUME, TIME DISPLAY */}
              <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className="p-2 rounded-full hover:bg-white/20 active:scale-95 transition-all text-white"
                  title={isPlaying ? 'Pause (Espace / K)' : 'Lecture (Espace / K)'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-white text-white" />
                  ) : (
                    <Play className="w-5 h-5 fill-white text-white" />
                  )}
                </button>

                {/* Rewind 10s button */}
                <button
                  onClick={handleRewind10s}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 active:scale-90 transition-all text-gray-200 hover:text-white flex items-center gap-0.5"
                  title="Reculer de 10s (Double-clic gauche / Flèche gauche)"
                >
                  <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-200" />
                  <span className="text-[10px] font-black text-white">10</span>
                </button>

                {/* Fast Forward 10s button */}
                <button
                  onClick={handleFastForward10s}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 active:scale-90 transition-all text-gray-200 hover:text-white flex items-center gap-0.5"
                  title="Avancer de 10s (Double-clic droit / Flèche droite)"
                >
                  <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-200" />
                  <span className="text-[10px] font-black text-white">10</span>
                </button>

                {/* Volume slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition-all"
                    title={isMuted ? 'Activer le son (M)' : 'Couper le son (M)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5 text-red-400" />
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
                    className="w-14 sm:w-20 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#ff0000]"
                  />
                </div>

                {/* TIME VIDEO DISPLAY WITH FORMATTED TIME & EXACT SECONDS */}
                <div className="flex items-center gap-2 pl-1 select-none">
                  {/* Formatted time (e.g. 02:45 / 10:15) */}
                  <span className="text-xs sm:text-sm font-mono font-bold text-white">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs sm:text-sm font-mono text-gray-300">
                    {formatTime(duration)}
                  </span>

                  {/* Exact seconds badge (e.g. 165s / 615s) */}
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono bg-white/10 px-2 py-0.5 rounded-md text-gray-200 border border-white/10">
                    <Clock className="w-3 h-3 text-[#ff0000]" />
                    <span>{currentSecs}s / {totalSecs}s</span>
                  </span>
                </div>
              </div>

              {/* RIGHT CONTROLS: SPEED, QUALITY, FULLSCREEN */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Playback speed selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg hover:bg-white/20 text-gray-200 hover:text-white transition-colors border border-white/15"
                    title="Vitesse de lecture"
                  >
                    {playbackSpeed}x
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-[#181818] border border-white/15 rounded-xl shadow-2xl p-1 z-50 text-xs">
                      <div className="px-2 py-1 text-[10px] text-gray-400 uppercase font-bold border-b border-white/10">
                        Vitesse
                      </div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedSelect(s)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors ${
                            playbackSpeed === s ? 'text-[#ff0000] font-bold' : 'text-gray-200'
                          }`}
                        >
                          <span>{s}x</span>
                          {playbackSpeed === s && <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality tag */}
                <span className="hidden md:inline-block text-[10px] font-black tracking-wider bg-[#ff0000] text-white px-2 py-0.5 rounded shadow-sm">
                  {video.resolution}
                </span>

                {/* Fullscreen button */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/20 text-gray-200 hover:text-white transition-all"
                  title={isFullscreen ? 'Quitter le plein écran (F)' : 'Plein écran (F)'}
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
    </div>
  );
};
