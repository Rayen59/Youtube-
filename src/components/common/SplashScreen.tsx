import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2200);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] text-white select-none overflow-hidden"
      >
        {/* Ambient Red Glow Backdrop */}
        <div className="absolute w-[500px] h-[500px] bg-[#ff0000]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Center Animated Logo Badge */}
        <div className="relative flex flex-col items-center justify-center z-10">
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 30 }}
            animate={{
              scale: [0.3, 1.15, 0.95, 1],
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 1.1,
              times: [0, 0.6, 0.85, 1],
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="relative flex items-center justify-center"
          >
            {/* YouTube-like Red Badge with curved pill rectangle */}
            <div className="relative w-28 h-20 sm:w-36 sm:h-24 bg-gradient-to-br from-[#ff0000] via-[#e60000] to-[#b80000] rounded-3xl shadow-[0_0_50px_rgba(255,0,0,0.4)] flex items-center justify-center border border-white/20">
              {/* Play symbol glow */}
              <div className="flex items-center gap-1.5 font-black tracking-tighter text-3xl sm:text-4xl text-white drop-shadow-md">
                <span className="font-extrabold tracking-tight">M</span>
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white translate-y-[1px]" />
                <span className="font-extrabold tracking-tight">K</span>
              </div>
            </div>

            {/* Pulsing ring */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-3xl border border-[#ff0000]/60 pointer-events-none"
            />
          </motion.div>

          {/* Slogan */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-6 flex flex-col items-center text-center"
          >
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              MK <span className="text-[#ff0000]">STREAM</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 font-medium tracking-wide">
              Streaming Vidéo & Recommandations IA
            </p>
          </motion.div>

          {/* Loading bar */}
          <div className="w-48 sm:w-56 h-1 bg-white/10 rounded-full mt-8 overflow-hidden relative">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.1, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-[#ff0000] via-red-400 to-[#ff0000] rounded-full"
            />
          </div>
        </div>

        {/* Quick Skip button */}
        <button
          onClick={onComplete}
          className="absolute bottom-8 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm"
        >
          Passer l'introduction →
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
