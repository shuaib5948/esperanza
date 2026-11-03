import React from 'react';
import { motion } from 'framer-motion';

interface MinimalFestivalLoaderProps {
  className?: string;
}

export const MinimalFestivalLoader: React.FC<MinimalFestivalLoaderProps> = ({ className = '' }) => {
  return (
    <div
      className={`fixed inset-0 bg-[#040404] flex flex-col items-center justify-center z-50 select-none ${className}`}
      role="status"
      aria-label="Loading Esperanza 9.0"
    >
      {/* Subtle Volumetric Glow */}
      <div className="pointer-events-none absolute w-72 h-72 rounded-full bg-amber-500/10 blur-[100px]" />

      <div className="relative flex flex-col items-center">
        {/* Glowing Logo */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.85, 1, 0.85],
          }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center"
        >
          <img
            src="/assets/esperanza-logo.png"
            alt="Esperanza 9.0"
            className="w-full h-full object-contain drop-shadow-[0_0_24px_rgba(245,158,11,0.5)]"
          />
        </motion.div>

        {/* Minimal Festival Title */}
        <div className="mt-5 flex flex-col items-center gap-2.5">
          <span className="font-sans font-bold text-[11px] sm:text-xs tracking-[0.35em] text-amber-200 uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
            ESPERANZA 9.0
          </span>

          {/* Minimal Golden Hairline Progress Track */}
          <div className="w-16 h-[2px] bg-amber-500/20 rounded-full overflow-hidden relative">
            <motion.div
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
