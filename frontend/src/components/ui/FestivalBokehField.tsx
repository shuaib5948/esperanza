import React from 'react';
import { motion } from 'framer-motion';

export interface FestivalBokehFieldProps {
  variant?: 'gold' | 'standings';
  className?: string;
}

interface BokehParticle {
  id: number;
  top: string;
  left: string;
  size: string;
  color: string;
  blur: string;
  opacityRange: [number, number, number];
  driftY: [number, number, number];
  driftX?: [number, number, number];
  duration: number;
  delay: number;
}

// -----------------------------------------------------------------------------
// Curated Authentic Festival Bokeh Light Configurations
// Strategically distributed in the blank flanks, upper horizons, and base margins
// -----------------------------------------------------------------------------
const GOLD_BOKEH_PARTICLES: BokehParticle[] = [
  // Upper Left Flank
  { id: 1, top: '10%', left: '8%', size: 'w-8 h-8 sm:w-12 sm:h-12', color: 'bg-amber-400/22', blur: 'blur-md', opacityRange: [0.15, 0.35, 0.15], driftY: [0, -18, 0], duration: 7.2, delay: 0.2 },
  { id: 2, top: '16%', left: '14%', size: 'w-3 h-3 sm:w-4 sm:h-4', color: 'bg-yellow-200/50', blur: 'blur-[1px]', opacityRange: [0.3, 0.7, 0.3], driftY: [0, -12, 0], duration: 5.4, delay: 1.1 },
  { id: 3, top: '24%', left: '6%', size: 'w-5 h-5 sm:w-7 sm:h-7', color: 'bg-amber-500/25', blur: 'blur-sm', opacityRange: [0.18, 0.42, 0.18], driftY: [0, -16, 0], duration: 6.8, delay: 2.3 },
  { id: 4, top: '8%', left: '22%', size: 'w-2 h-2', color: 'bg-amber-200/60', blur: 'blur-[0.5px]', opacityRange: [0.25, 0.8, 0.25], driftY: [0, -10, 0], duration: 4.8, delay: 0.7 },

  // Upper Right Flank
  { id: 5, top: '11%', left: '88%', size: 'w-9 h-9 sm:w-14 sm:h-14', color: 'bg-yellow-400/20', blur: 'blur-lg', opacityRange: [0.12, 0.32, 0.12], driftY: [0, -20, 0], duration: 8.0, delay: 0.5 },
  { id: 6, top: '18%', left: '82%', size: 'w-3.5 h-3.5', color: 'bg-amber-100/55', blur: 'blur-[1px]', opacityRange: [0.35, 0.75, 0.35], driftY: [0, -14, 0], duration: 5.6, delay: 1.8 },
  { id: 7, top: '26%', left: '91%', size: 'w-6 h-6', color: 'bg-amber-500/22', blur: 'blur-sm', opacityRange: [0.15, 0.38, 0.15], driftY: [0, -15, 0], duration: 6.4, delay: 2.9 },
  { id: 8, top: '9%', left: '76%', size: 'w-2 h-2', color: 'bg-yellow-300/65', blur: 'blur-[0.5px]', opacityRange: [0.3, 0.85, 0.3], driftY: [0, -10, 0], duration: 5.1, delay: 1.3 },

  // Mid Left Flank
  { id: 9, top: '48%', left: '4%', size: 'w-10 h-10 sm:w-16 sm:h-16', color: 'bg-amber-400/18', blur: 'blur-xl', opacityRange: [0.1, 0.28, 0.1], driftY: [0, -22, 0], duration: 8.5, delay: 0.9 },
  { id: 10, top: '56%', left: '10%', size: 'w-4 h-4', color: 'bg-yellow-200/45', blur: 'blur-[1px]', opacityRange: [0.25, 0.65, 0.25], driftY: [0, -14, 0], duration: 6.0, delay: 2.1 },
  { id: 11, top: '65%', left: '5%', size: 'w-2.5 h-2.5', color: 'bg-amber-300/60', blur: 'blur-[0.8px]', opacityRange: [0.3, 0.75, 0.3], driftY: [0, -12, 0], duration: 5.2, delay: 1.6 },

  // Mid Right Flank
  { id: 12, top: '46%', left: '92%', size: 'w-11 h-11 sm:w-16 sm:h-16', color: 'bg-amber-500/16', blur: 'blur-xl', opacityRange: [0.1, 0.26, 0.1], driftY: [0, -24, 0], duration: 9.0, delay: 1.2 },
  { id: 13, top: '55%', left: '86%', size: 'w-4 h-4', color: 'bg-amber-200/50', blur: 'blur-[1px]', opacityRange: [0.25, 0.65, 0.25], driftY: [0, -14, 0], duration: 5.8, delay: 2.7 },
  { id: 14, top: '67%', left: '93%', size: 'w-2 h-2', color: 'bg-yellow-200/65', blur: 'blur-[0.5px]', opacityRange: [0.35, 0.8, 0.35], driftY: [0, -10, 0], duration: 4.9, delay: 0.4 },

  // Lower Horizons
  { id: 15, top: '82%', left: '12%', size: 'w-7 h-7 sm:w-10 sm:h-10', color: 'bg-amber-500/20', blur: 'blur-md', opacityRange: [0.12, 0.32, 0.12], driftY: [0, -15, 0], duration: 7.0, delay: 1.5 },
  { id: 16, top: '86%', left: '20%', size: 'w-2.5 h-2.5', color: 'bg-yellow-300/55', blur: 'blur-[0.8px]', opacityRange: [0.25, 0.7, 0.25], driftY: [0, -12, 0], duration: 5.5, delay: 2.4 },
  { id: 17, top: '80%', left: '84%', size: 'w-8 h-8 sm:w-11 sm:h-11', color: 'bg-yellow-500/18', blur: 'blur-md', opacityRange: [0.12, 0.3, 0.12], driftY: [0, -16, 0], duration: 7.4, delay: 0.8 },
  { id: 18, top: '85%', left: '76%', size: 'w-3 h-3', color: 'bg-amber-200/60', blur: 'blur-[1px]', opacityRange: [0.3, 0.75, 0.3], driftY: [0, -12, 0], duration: 5.3, delay: 2.0 },
];

// Standings specific: blends warm amber with house emblems (Crimson on left, Emerald on right)
const STANDINGS_BOKEH_PARTICLES: BokehParticle[] = [
  // Rivaya Flank (Crimson embers + gold)
  { id: 101, top: '15%', left: '7%', size: 'w-7 h-7 sm:w-10 sm:h-10', color: 'bg-rose-500/22', blur: 'blur-md', opacityRange: [0.15, 0.35, 0.15], driftY: [0, -16, 0], duration: 6.8, delay: 0.3 },
  { id: 102, top: '22%', left: '15%', size: 'w-3 h-3', color: 'bg-rose-300/50', blur: 'blur-[1px]', opacityRange: [0.25, 0.7, 0.25], driftY: [0, -12, 0], duration: 5.2, delay: 1.5 },
  { id: 103, top: '48%', left: '5%', size: 'w-9 h-9 sm:w-14 sm:h-14', color: 'bg-rose-600/18', blur: 'blur-xl', opacityRange: [0.1, 0.28, 0.1], driftY: [0, -20, 0], duration: 8.2, delay: 0.9 },
  { id: 104, top: '58%', left: '12%', size: 'w-3.5 h-3.5', color: 'bg-amber-300/55', blur: 'blur-[1px]', opacityRange: [0.3, 0.7, 0.3], driftY: [0, -14, 0], duration: 5.8, delay: 2.1 },
  { id: 105, top: '78%', left: '9%', size: 'w-6 h-6', color: 'bg-rose-500/20', blur: 'blur-sm', opacityRange: [0.15, 0.36, 0.15], driftY: [0, -15, 0], duration: 6.5, delay: 1.2 },

  // Diraya Flank (Emerald motes + gold)
  { id: 106, top: '14%', left: '89%', size: 'w-7 h-7 sm:w-10 sm:h-10', color: 'bg-emerald-500/22', blur: 'blur-md', opacityRange: [0.15, 0.35, 0.15], driftY: [0, -16, 0], duration: 7.0, delay: 0.6 },
  { id: 107, top: '23%', left: '83%', size: 'w-3 h-3', color: 'bg-emerald-300/50', blur: 'blur-[1px]', opacityRange: [0.25, 0.7, 0.25], driftY: [0, -12, 0], duration: 5.4, delay: 1.8 },
  { id: 108, top: '50%', left: '91%', size: 'w-9 h-9 sm:w-14 sm:h-14', color: 'bg-emerald-600/18', blur: 'blur-xl', opacityRange: [0.1, 0.28, 0.1], driftY: [0, -20, 0], duration: 8.6, delay: 1.1 },
  { id: 109, top: '60%', left: '85%', size: 'w-3.5 h-3.5', color: 'bg-amber-300/55', blur: 'blur-[1px]', opacityRange: [0.3, 0.7, 0.3], driftY: [0, -14, 0], duration: 6.0, delay: 2.5 },
  { id: 110, top: '80%', left: '88%', size: 'w-6 h-6', color: 'bg-emerald-500/20', blur: 'blur-sm', opacityRange: [0.15, 0.36, 0.15], driftY: [0, -15, 0], duration: 6.7, delay: 1.7 },

  // Central Golden Stage Sparkles (Above & Below Core Dais)
  { id: 111, top: '8%', left: '32%', size: 'w-2 h-2', color: 'bg-amber-200/60', blur: 'blur-[0.5px]', opacityRange: [0.25, 0.8, 0.25], driftY: [0, -10, 0], duration: 4.8, delay: 0.4 },
  { id: 112, top: '7%', left: '68%', size: 'w-2 h-2', color: 'bg-yellow-200/65', blur: 'blur-[0.5px]', opacityRange: [0.3, 0.85, 0.3], driftY: [0, -10, 0], duration: 5.1, delay: 1.9 },
  { id: 113, top: '88%', left: '26%', size: 'w-2.5 h-2.5', color: 'bg-amber-400/50', blur: 'blur-[0.8px]', opacityRange: [0.2, 0.65, 0.2], driftY: [0, -12, 0], duration: 5.7, delay: 2.2 },
  { id: 114, top: '87%', left: '74%', size: 'w-2.5 h-2.5', color: 'bg-yellow-300/50', blur: 'blur-[0.8px]', opacityRange: [0.2, 0.65, 0.2], driftY: [0, -12, 0], duration: 5.6, delay: 1.4 },
];

export const FestivalBokehField: React.FC<FestivalBokehFieldProps> = ({
  variant = 'gold',
  className = '',
}) => {
  const particles = variant === 'standings' ? STANDINGS_BOKEH_PARTICLES : GOLD_BOKEH_PARTICLES;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.size} ${p.color} ${p.blur} will-change-transform`}
          style={{
            top: p.top,
            left: p.left,
          }}
          animate={{
            y: p.driftY,
            opacity: p.opacityRange,
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};
