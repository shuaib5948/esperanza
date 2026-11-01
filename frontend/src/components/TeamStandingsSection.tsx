import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import confetti from 'canvas-confetti';
import { FestivalBokehField } from './ui/FestivalBokehField.js';

interface TeamStandingsSectionProps {
  rivayaPoints?: number;
  dirayaPoints?: number;
  autoTrigger?: boolean;
  isLiveScreen?: boolean;
}

// -----------------------------------------------------------------------------
// Subtle Crown Glint Sparkle Effect
// -----------------------------------------------------------------------------
const CrownGlint: React.FC = () => (
  <motion.div
    aria-hidden="true"
    className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 z-30"
    animate={{
      scale: [0, 1.2, 0, 0],
      rotate: [0, 90, 180, 180],
      opacity: [0, 1, 0, 0],
    }}
    transition={{
      duration: 3.5,
      repeat: Infinity,
      ease: 'easeInOut',
      times: [0, 0.25, 0.5, 1],
      delay: 0.8,
    }}
  >
    <svg className="w-5 h-5 text-amber-100 drop-shadow-[0_0_8px_#F59E0B]" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0 L14 9 L23 12 L14 15 L12 24 L10 15 L1 12 L10 9 Z" />
    </svg>
  </motion.div>
);

// -----------------------------------------------------------------------------
// Reference-Accurate 3D Sculpted Gold Crown Component (Drop-in Animation)
// -----------------------------------------------------------------------------
const ReferenceGoldCrown: React.FC<{ visible?: boolean }> = ({ visible = true }) => (
  <div
    className={`relative transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
      visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-8 scale-75 pointer-events-none'
    }`}
  >
    {visible && <CrownGlint />}
    <svg
      className="w-10 h-8 sm:w-14 sm:h-11 drop-shadow-[0_0_8px_rgba(245,158,11,0.45)] filter transition-transform duration-300 group-hover:scale-105"
      viewBox="0 0 100 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="crownGoldMain" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="20%" stopColor="#FDE68A" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="90%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <linearGradient id="crownRimGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="50%" stopColor="#FEF08A" />
          <stop offset="75%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      {/* Base Band Shadow & Rim */}
      <path d="M12 55 Q50 63 88 55 L88 64 Q50 72 12 64 Z" fill="url(#crownRimGold)" stroke="#F59E0B" strokeWidth="0.8" />
      <ellipse cx="50" cy="59.5" rx="36" ry="3.5" fill="#78350F" opacity="0.65" />

      {/* Band Jewels */}
      <circle cx="28" cy="59.5" r="2.2" fill="#EF4444" stroke="#FDE68A" strokeWidth="0.8" />
      <circle cx="50" cy="60.5" r="3" fill="#3B82F6" stroke="#FDE68A" strokeWidth="1" />
      <circle cx="72" cy="59.5" r="2.2" fill="#10B981" stroke="#FDE68A" strokeWidth="0.8" />

      {/* 5-Peak Royal Crown Silhouette */}
      <path
        d="M12 55 L9 24 L28 42 L50 8 L72 42 L91 24 L88 55 Q50 63 12 55 Z"
        fill="url(#crownGoldMain)"
        stroke="#FEF08A"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Peak Pearls */}
      <circle cx="9" cy="24" r="3" fill="#FDE68A" stroke="#B45309" strokeWidth="0.6" />
      <circle cx="50" cy="8" r="4.2" fill="#FFFBEB" stroke="#D97706" strokeWidth="1" />
      <circle cx="91" cy="24" r="3" fill="#FDE68A" stroke="#B45309" strokeWidth="0.6" />
    </svg>
  </div>
);

// -----------------------------------------------------------------------------
// Reference-Accurate Stylized Heraldic Winged Sigil with Ambient Breathing Light
// -----------------------------------------------------------------------------
const TeamSigil: React.FC<{ color: string }> = ({ color }) => (
  <motion.div
    animate={{
      scale: [1, 1.03, 1],
      filter: [
        'drop-shadow(0 0 6px currentColor) drop-shadow(0 0 10px currentColor)',
        'drop-shadow(0 0 10px currentColor) drop-shadow(0 0 16px currentColor)',
        'drop-shadow(0 0 6px currentColor) drop-shadow(0 0 10px currentColor)',
      ],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className="transition-transform duration-300 group-hover:scale-110"
  >
    <svg
      className="w-9 h-9 sm:w-11 sm:h-11"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Sweeping Winged Arch */}
      <path
        d="M32 6 C24 16 12 28 12 48 C18 43 25 44 32 50 C39 44 46 43 52 48 C52 28 40 16 32 6 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner Chevron Arch */}
      <path
        d="M32 18 C26 26 19 35 19 46 C24 43 28 44 32 47 C36 44 40 43 45 46 C45 35 38 26 32 18 Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Central Diamond Gemstone */}
      <path
        d="M32 26 L35.5 34 L32 42 L28.5 34 Z"
        fill={color}
        opacity="0.95"
      />
    </svg>
  </motion.div>
);

// -----------------------------------------------------------------------------
// Floating Ambient Golden Stage Motes
// -----------------------------------------------------------------------------
const StageMotes: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
    {[
      { left: '18%', delay: 0, duration: 6, size: 'w-1.5 h-1.5' },
      { left: '30%', delay: 2, duration: 7, size: 'w-1 h-1' },
      { left: '50%', delay: 4, duration: 5.5, size: 'w-2 h-2' },
      { left: '70%', delay: 1, duration: 6.5, size: 'w-1.5 h-1.5' },
      { left: '82%', delay: 3, duration: 8, size: 'w-1 h-1' },
    ].map((mote, i) => (
      <motion.div
        key={i}
        aria-hidden="true"
        className={`absolute bottom-8 rounded-full bg-amber-400/50 blur-[0.6px] ${mote.size}`}
        style={{ left: mote.left }}
        animate={{
          y: [-10, -160],
          opacity: [0, 0.7, 0],
          x: [0, (i % 2 === 0 ? 1 : -1) * 15],
        }}
        transition={{
          duration: mote.duration,
          repeat: Infinity,
          delay: mote.delay,
          ease: 'easeOut',
        }}
      />
    ))}
  </div>
);

// -----------------------------------------------------------------------------
// Main Team Standings Section Component (Suspenseful Tie-and-Surge Reveal)
// -----------------------------------------------------------------------------
export const TeamStandingsSection: React.FC<TeamStandingsSectionProps> = ({
  rivayaPoints = 148,
  dirayaPoints = 115,
  autoTrigger = false,
  isLiveScreen = false,
}) => {
  const podiumRef = useRef<HTMLDivElement>(null);

  // Equal tie point
  const tiePoint = Math.min(rivayaPoints, dirayaPoints);
  const isTied = rivayaPoints === dirayaPoints;
  const isRivayaLeader = rivayaPoints > dirayaPoints;
  const isDirayaLeader = dirayaPoints > rivayaPoints;

  // Stage sequence:
  // 'idle' -> 'baseline' (both 0, equal low base)
  //        -> 'lockstep' (both count to 115 in lockstep, blocks rise together)
  //        -> 'freeze'   (heartbeat pause at 115, tie suspense)
  //        -> 'surge'    (Rivaya breaks tie to 148, Diraya stays 115)
  //        -> 'ranks'    (rank 2 and rank 1 drop in)
  //        -> 'crowned'  (gold crown descends onto Rivaya + fireworks)
  const [stage, setStage] = useState<'idle' | 'baseline' | 'lockstep' | 'freeze' | 'surge' | 'ranks' | 'crowned'>('baseline');
  const [rivayaCount, setRivayaCount] = useState(0);
  const [dirayaCount, setDirayaCount] = useState(0);

  // 1. Reveal Ceremony Trigger (Immediate on Live TV Screen; Viewport Observer on Homepage)
  useEffect(() => {
    let cleanupTimers: (() => void) | null = null;
    let ceremonyActive = false;

    const startCeremony = () => {
      if (ceremonyActive) return;
      ceremonyActive = true;

      // Start from clean baseline: 0 pts, equal low height
      setStage('baseline');
      setRivayaCount(0);
      setDirayaCount(0);

      const t1 = setTimeout(() => setStage('lockstep'), 600);  // 0.6s: Lockstep climb
      const t2 = setTimeout(() => setStage('freeze'), 2800);   // 2.8s: Frozen at 115 tie
      const t3 = setTimeout(() => setStage('surge'), 4200);    // 4.2s: Leader surges
      const t4 = setTimeout(() => setStage('ranks'), 6200);    // 6.2s: Ranks drop in
      const t5 = setTimeout(() => {
        setStage('crowned');                                   // 6.9s: Crowning + Fireworks
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: isLiveScreen ? 0.52 : 0.62 },
            colors: isTied
              ? ['#F59E0B', '#FF2A6D', '#00E676', '#FFFFFF', '#FDE68A']
              : isRivayaLeader
              ? ['#F59E0B', '#EF4444', '#FDE68A', '#FFFFFF']
              : ['#F59E0B', '#10B981', '#FDE68A', '#FFFFFF'],
            ticks: 170,
            gravity: 1.1,
          });
        } catch {}
      }, 6900);

      cleanupTimers = () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
      };
    };

    if (autoTrigger) {
      startCeremony();
      return () => {
        if (cleanupTimers) cleanupTimers();
      };
    }

    const el = podiumRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        
        // When podium enters screen (> 35% visible), trigger the reveal ceremony
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          startCeremony();
        } else if (!entry.isIntersecting || entry.intersectionRatio < 0.1) {
          // Scrolled away: cancel ongoing timers and reset to baseline so it replays when user returns
          ceremonyActive = false;
          if (cleanupTimers) {
            cleanupTimers();
            cleanupTimers = null;
          }
          setStage('baseline');
          setRivayaCount(0);
          setDirayaCount(0);
        }
      },
      {
        threshold: [0.1, 0.35, 0.6],
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (cleanupTimers) cleanupTimers();
    };
  }, [autoTrigger, tiePoint, rivayaPoints, dirayaPoints, isLiveScreen]);

  // 2. Synchronized & Tie-Break Counting Math
  useEffect(() => {
    if (stage === 'idle' || stage === 'baseline') {
      setRivayaCount(0);
      setDirayaCount(0);
      return;
    }

    // Phase A: Lockstep rise from 0 to 115 (Both identical frame-for-frame)
    if (stage === 'lockstep') {
      let startTime: number | null = null;
      let frameId: number;
      const durationMs = 2200;

      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / durationMs, 1);
        const ease = 1 - Math.pow(1 - progress, 2.5);
        const val = Math.round(ease * tiePoint);
        setRivayaCount(val);
        setDirayaCount(val);
        if (progress < 1) frameId = requestAnimationFrame(step);
      };
      frameId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frameId);
    }

    // Phase B: Frozen at 115
    if (stage === 'freeze') {
      setRivayaCount(tiePoint);
      setDirayaCount(tiePoint);
      return;
    }

    // Phase C: Solo Surge (Leader climbs while other stays locked; if tied, both remain locked)
    if (stage === 'surge' || stage === 'ranks' || stage === 'crowned') {
      if (isTied) {
        setRivayaCount(tiePoint);
        setDirayaCount(tiePoint);
        return;
      }

      const leaderPts = Math.max(rivayaPoints, dirayaPoints);
      const diff = leaderPts - tiePoint;

      if (stage === 'ranks' || stage === 'crowned') {
        setRivayaCount(rivayaPoints);
        setDirayaCount(dirayaPoints);
        return;
      }

      let startTime: number | null = null;
      let frameId: number;
      const durationMs = 2000;

      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / durationMs, 1);
        const ease = 1 - Math.pow(1 - progress, 2);
        const val = Math.round(tiePoint + ease * diff);

        if (isRivayaLeader) {
          setRivayaCount(val);
          setDirayaCount(dirayaPoints);
        } else {
          setDirayaCount(val);
          setRivayaCount(rivayaPoints);
        }

        if (progress < 1) frameId = requestAnimationFrame(step);
      };
      frameId = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frameId);
    }
  }, [stage, tiePoint, rivayaPoints, dirayaPoints, isTied, isRivayaLeader]);

  const cheerTeam = (team: 'RIVAYA' | 'DIRAYA') => {
    const colors =
      team === 'RIVAYA'
        ? ['#EF4444', '#DC2626', '#F87171', '#F59E0B', '#FFFFFF']
        : ['#10B981', '#059669', '#34D399', '#F59E0B', '#FFFFFF'];

    confetti({
      particleCount: 45,
      spread: 50,
      origin: { y: 0.65 },
      colors,
      ticks: 140,
      gravity: 1.1,
      scalar: 0.9,
    });
  };

  const isLockstepOrMore = stage !== 'idle' && stage !== 'baseline';
  const isSurgingOrDone  = stage === 'surge' || stage === 'ranks' || stage === 'crowned';
  const isRankRevealed   = stage === 'ranks' || stage === 'crowned';
  const isCrowned        = stage === 'crowned';
  const isFrozen         = stage === 'freeze';

  return (
    <section
      id="standings"
      data-alias="duel-arena"
      className={
        isLiveScreen
          ? "relative w-full h-full flex flex-col justify-between items-center pt-2 pb-0 px-2 select-none"
          : "relative h-[100dvh] max-h-[100dvh] min-h-[560px] w-full flex flex-col justify-center md:justify-between items-center pt-4 sm:pt-6 md:pt-7 pb-20 md:pb-8 px-2 sm:px-6 overflow-hidden bg-transparent select-none snap-start"
      }
      aria-label="Official Team Standings"
    >
      {/* ===================================================================
          1. CONTINUOUS COLOR FLOW & CINEMATIC GRADIENT LIGHTING
      =================================================================== */}
      {/* Seamless Top Bleed Blending 100% Flush with About Section (Only on Homepage - Behind Content) */}
      {!isLiveScreen && (
        <div className="pointer-events-none absolute top-0 inset-x-0 h-16 sm:h-40 bg-gradient-to-b from-[#070503] via-[#070503]/85 to-transparent z-0" />
      )}
      {!isLiveScreen && (
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-20 sm:h-36 bg-gradient-to-t from-[#070503] via-[#070503]/85 to-transparent z-0" />
      )}

      {/* Center Stage Spotlight Illuminating the Podium Dais */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[900px] h-[450px] sm:h-[550px] bg-gradient-to-b from-amber-500/14 via-yellow-600/4 to-transparent blur-[130px] z-0" />

      {/* Left and Right Edge Warm Volumetric Glows */}
      <div className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/3 w-[360px] h-[520px] bg-gradient-to-r from-amber-500/16 via-yellow-600/4 to-transparent blur-[120px] z-0" />
      <div className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/3 w-[360px] h-[520px] bg-gradient-to-l from-amber-500/16 via-yellow-600/4 to-transparent blur-[120px] z-0" />

      {/* Subtle Matrix Micro-Grid Texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.025] bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:24px_24px] z-0" />

      {/* Flank Arena Fill: Angled Upward Volumetric Light Shafts */}
      <div className="pointer-events-none absolute bottom-0 -left-6 sm:left-4 md:left-8 w-28 sm:w-40 md:w-52 h-[480px] sm:h-[620px] bg-gradient-to-t from-rose-600/18 via-amber-500/8 to-transparent -rotate-[18deg] origin-bottom-left blur-2xl z-0" />
      <div className="pointer-events-none absolute bottom-0 -right-6 sm:right-4 md:right-8 w-28 sm:w-40 md:w-52 h-[480px] sm:h-[620px] bg-gradient-to-t from-emerald-500/18 via-amber-500/8 to-transparent rotate-[18deg] origin-bottom-right blur-2xl z-0" />

      {/* Flank Arena Fill: Ultra-Subtle (3.5% Opacity) Vertical Watermark Typography */}
      <div className="pointer-events-none absolute left-4 sm:left-8 md:left-12 lg:left-16 top-1/2 -translate-y-1/2 z-0 hidden md:block select-none">
        <span className="font-display font-black text-6xl sm:text-7xl lg:text-8xl tracking-[0.35em] uppercase text-rose-500/[0.035] [writing-mode:vertical-rl] rotate-180 drop-shadow-[0_0_20px_rgba(244,63,94,0.06)]">
          RIVAYA
        </span>
      </div>
      <div className="pointer-events-none absolute right-4 sm:right-8 md:right-12 lg:right-16 top-1/2 -translate-y-1/2 z-0 hidden md:block select-none">
        <span className="font-display font-black text-6xl sm:text-7xl lg:text-8xl tracking-[0.35em] uppercase text-emerald-500/[0.035] [writing-mode:vertical-rl] drop-shadow-[0_0_20px_rgba(16,185,129,0.06)]">
          DIRAYA
        </span>
      </div>

      {/* Comprehensive Dynamic Festival Bokeh Light Field (Flank Embers & Stage Sparkles) */}
      <FestivalBokehField variant="standings" />

      {/* ===================================================================
          2 & 3. UNIFIED BALANCED CORE: HEADING + PODIUM CLUSTER
          Mobile: Grouped into one centered, balanced unit (~405px total)
          Desktop: Anchored heading at top, dais grounded at bottom
      =================================================================== */}
      <div className="relative z-10 w-full max-w-2xl sm:max-w-3xl mx-auto flex flex-col items-center justify-center my-auto md:my-0 md:h-full md:justify-between">
        {/* HEADING: "T E A M   S T A N D I N G S" WITH GOLD DIVIDER & DIAMOND */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center pt-1 sm:pt-2 text-center mb-16 sm:mb-20 md:mb-0"
        >
          <h2 className="font-display font-black text-lg sm:text-2xl md:text-2xl tracking-[0.24em] uppercase text-white">
            <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">TEAM </span>
            <span className="text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">
              STANDINGS
            </span>
          </h2>

          {/* Thin Gold Divider with Centered Solid Gold Diamond */}
          <div className="flex items-center justify-center gap-2.5 pt-1.5">
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
            <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
          </div>
        </motion.div>

        {/* CENTER STAGE: THE TWO STEPPED PODIUM BLOCKS ON THE RAISED DAIS */}
        <div
          ref={podiumRef}
          className="relative z-10 w-full flex flex-col items-center justify-center md:justify-end md:mt-auto md:mb-0"
        >
        
        {/* The Two Stepped Podium Blocks Side-by-Side (Sitting Flush on the Dais Base) */}
        <div className="flex items-end justify-center gap-2 sm:gap-5 md:gap-6 w-full z-10">
          
          {/* -------------------------------------------------------------
              TEAM 1 — RIVAYA (BURGUNDY • TIED AT 115, THEN SURGES TO 148)
          ------------------------------------------------------------- */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => cheerTeam('RIVAYA')}
            className="flex flex-col items-center w-[38vw] max-w-[130px] sm:w-48 md:w-56 lg:w-64 cursor-pointer group select-none transition-transform duration-300 hover:-translate-y-1.5 active:translate-y-0"
          >
            {/* 3D Gold Crown (Descends on Crowning Stage only if single winner; hidden if tied) */}
            <div className="flex flex-col items-center -mb-1 relative z-20">
              <ReferenceGoldCrown visible={isCrowned && isRivayaLeader && !isTied} />
            </div>

            {/* Stepped Upper Pedestal Tier (Rank 1 Revealed After Surge; both rank 1 if tied) */}
            <div
              className={`w-[68%] sm:w-[72%] h-8 sm:h-11 bg-gradient-to-b from-[#3a0810] to-[#200408] border-t-2 border-x-2 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)] relative z-10 flex items-center justify-center transition-all duration-500 ease-out overflow-hidden ${
                isRankRevealed ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-90 pointer-events-none'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-white/40" />
              <span className="font-display font-black text-base sm:text-2xl text-amber-300 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">
                {isTied ? '1' : isRivayaLeader ? '1' : '2'}
              </span>
            </div>

            {/* Main Lower Rectangular Block Body */}
            <div
              className={`w-full bg-gradient-to-b from-[#2b050b] via-[#1a0307] to-[#0d0103] border-t-2 border-b-2 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.18),inset_0_1px_2px_rgba(255,255,255,0.15)] border-x border-amber-500/20 rounded-b-xs flex flex-col items-center justify-between p-2 sm:p-5 relative z-10 group-hover:border-amber-400/80 group-hover:shadow-[0_0_16px_rgba(245,158,11,0.35),0_0_24px_rgba(244,63,94,0.25)] overflow-hidden ${
                isTied
                  ? isLockstepOrMore
                    ? 'h-[25vh] max-h-[250px] min-h-[200px] sm:h-[245px] md:h-[280px] transition-all duration-[2200ms] ease-[cubic-bezier(0.25,1,0.5,1)]'
                    : 'h-[160px] sm:h-[180px] transition-all duration-[800ms] ease-out'
                  : isRivayaLeader && isSurgingOrDone
                  ? 'h-[29vh] max-h-[290px] min-h-[235px] sm:h-[285px] md:h-[320px] transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)]'
                  : isLockstepOrMore
                  ? 'h-[23vh] max-h-[235px] min-h-[185px] sm:h-[230px] md:h-[260px] transition-all duration-[2200ms] ease-[cubic-bezier(0.25,1,0.5,1)]'
                  : 'h-[160px] sm:h-[180px] transition-all duration-[800ms] ease-out'
              }`}
            >
              {/* Subtle Specular Light Sweep on Hover / Idle */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden z-10 opacity-30 group-hover:opacity-60 transition-opacity duration-300">
                <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>

              {/* Subtle Crimson Edge Ambient Sheen */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-500/12 via-transparent to-black/85" />

              {/* Team Name: Bold Crimson/Magenta Typography */}
              <div className="relative z-10 text-center pt-1 sm:pt-2">
                <h3 className="font-display font-black text-sm sm:text-2xl md:text-2xl tracking-[0.14em] sm:tracking-[0.2em] text-[#FF2A6D] drop-shadow-[0_2px_10px_rgba(255,42,109,0.7)] uppercase transition-colors duration-300 group-hover:text-[#ff528e]">
                  RIVAYA
                </h3>
              </div>

              {/* Center: Numerals (In Lockstep with Diraya, Frozen, then Surges to 148) */}
              <div className="relative z-10 flex flex-col items-center my-auto">
                <span
                  className={`font-mono font-black text-3xl sm:text-5xl md:text-5xl tracking-tight drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] transition-all duration-300 ${
                    isFrozen ? 'text-amber-200 scale-105 drop-shadow-[0_0_18px_rgba(245,158,11,0.7)]' : 'text-white'
                  }`}
                >
                  {rivayaCount}
                </span>
                <span className="mt-0.5 text-[9px] sm:text-[10px] font-mono font-extrabold tracking-[0.3em] uppercase text-white/85">
                  POINTS
                </span>
              </div>

              {/* Bottom: Glowing Crimson Neon Heraldic Sigil with Breathing Light */}
              <div className="relative z-10 flex flex-col items-center pb-0.5 text-[#FF2A6D]">
                <TeamSigil color="#FF2A6D" />
              </div>
            </div>
          </motion.div>

          {/* -------------------------------------------------------------
              TEAM 2 — DIRAYA (FOREST GREEN • TIED AT 115, STAYS LOCKED)
          ------------------------------------------------------------- */}
          <motion.div
            whileTap={{ scale: 0.98 }}
            onClick={() => cheerTeam('DIRAYA')}
            className="flex flex-col items-center w-[38vw] max-w-[130px] sm:w-48 md:w-56 lg:w-64 cursor-pointer group select-none transition-transform duration-300 hover:-translate-y-1.5 active:translate-y-0"
          >
            {/* 3D Gold Crown (Descends on Crowning Stage only if single winner; hidden if tied) */}
            <div className="flex flex-col items-center -mb-1 relative z-20">
              <ReferenceGoldCrown visible={isCrowned && isDirayaLeader && !isTied} />
            </div>

            {/* Stepped Upper Pedestal Tier (Rank 1 Revealed After Surge; both rank 1 if tied) */}
            <div
              className={`w-[68%] sm:w-[72%] h-8 sm:h-11 bg-gradient-to-b from-[#0a2c17] to-[#04160a] border-t-2 border-x-2 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.25)] relative z-10 flex items-center justify-center transition-all duration-500 ease-out overflow-hidden ${
                isRankRevealed ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-90 pointer-events-none'
              }`}
            >
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-white/40" />
              <span className="font-display font-black text-base sm:text-2xl text-amber-300 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">
                {isTied ? '1' : isDirayaLeader ? '1' : '2'}
              </span>
            </div>

            {/* Main Lower Rectangular Block Body */}
            <div
              className={`w-full bg-gradient-to-b from-[#082212] via-[#04140a] to-[#020a05] border-t-2 border-b-2 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.18),inset_0_1px_2px_rgba(255,255,255,0.15)] border-x border-amber-500/20 rounded-b-xs flex flex-col items-center justify-between p-2 sm:p-5 relative z-10 group-hover:border-amber-400/80 group-hover:shadow-[0_0_16px_rgba(245,158,11,0.35),0_0_24px_rgba(0,230,118,0.25)] overflow-hidden ${
                isTied
                  ? isLockstepOrMore
                    ? 'h-[25vh] max-h-[250px] min-h-[200px] sm:h-[245px] md:h-[280px] transition-all duration-[2200ms] ease-[cubic-bezier(0.25,1,0.5,1)]'
                    : 'h-[160px] sm:h-[180px] transition-all duration-[800ms] ease-out'
                  : isDirayaLeader && isSurgingOrDone
                  ? 'h-[29vh] max-h-[290px] min-h-[235px] sm:h-[285px] md:h-[320px] transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)]'
                  : isLockstepOrMore
                  ? 'h-[23vh] max-h-[235px] min-h-[185px] sm:h-[230px] md:h-[260px] transition-all duration-[2200ms] ease-[cubic-bezier(0.25,1,0.5,1)]'
                  : 'h-[160px] sm:h-[180px] transition-all duration-[800ms] ease-out'
              }`}
            >
              {/* Subtle Specular Light Sweep on Hover / Idle */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden z-10 opacity-30 group-hover:opacity-60 transition-opacity duration-300">
                <div className="w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              </div>

              {/* Subtle Emerald Edge Ambient Sheen */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/12 via-transparent to-black/85" />

              {/* Team Name: Bold Emerald Typography */}
              <div className="relative z-10 text-center pt-1 sm:pt-2">
                <h3 className="font-display font-black text-sm sm:text-2xl md:text-2xl tracking-[0.14em] sm:tracking-[0.2em] text-[#00E676] drop-shadow-[0_2px_10px_rgba(0,230,118,0.7)] uppercase transition-colors duration-300 group-hover:text-[#2eff99]">
                  DIRAYA
                </h3>
              </div>

              {/* Center: Numerals (In Lockstep with Rivaya to 115, then Stays at 115) */}
              <div className="relative z-10 flex flex-col items-center my-auto">
                <span
                  className={`font-mono font-black text-3xl sm:text-5xl md:text-5xl tracking-tight drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)] transition-all duration-300 ${
                    isFrozen ? 'text-amber-200 scale-105 drop-shadow-[0_0_18px_rgba(245,158,11,0.7)]' : 'text-white'
                  }`}
                >
                  {dirayaCount}
                </span>
                <span className="mt-0.5 text-[9px] sm:text-[10px] font-mono font-extrabold tracking-[0.3em] uppercase text-white/85">
                  POINTS
                </span>
              </div>

              {/* Bottom: Glowing Emerald Neon Heraldic Sigil with Breathing Light */}
              <div className="relative z-10 flex flex-col items-center pb-0.5 text-[#00E676]">
                <TeamSigil color="#00E676" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* ===================================================================
            4. THE RAISED CIRCULAR GOLDEN STAGE DAIS / BASE
            (Straight-On Front Eye-Level Perspective • Seamlessly Joined to Blocks)
        =================================================================== */}
        <div className="relative w-[92vw] max-w-[330px] sm:w-full sm:max-w-xl md:max-w-2xl -mt-5 sm:-mt-6 flex flex-col items-center pointer-events-none z-0">
          
          {/* Top Surface of the Circular Raised Dais (Matching Eye-Level Horizon) */}
          <div className="w-full h-11 sm:h-14 rounded-[100%] border-2 border-amber-500/70 bg-gradient-to-b from-[#181105] via-[#0d0903] to-[#040301] shadow-[inset_0_1px_3px_rgba(255,255,255,0.3),0_0_12px_rgba(245,158,11,0.18)] relative flex items-center justify-center overflow-hidden">
            {/* Concentric Golden Inlay Ring */}
            <div className="w-[96%] h-[82%] rounded-[100%] border border-amber-300/40 bg-gradient-to-b from-amber-500/10 to-transparent" />

            {/* Subtle Vertical Reflections Across the Dais Platform */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 sm:gap-5 md:gap-6 opacity-35 blur-[2px]">
              <div className="w-[38vw] max-w-[130px] sm:w-44 h-8 sm:h-10 bg-gradient-to-b from-rose-500/40 to-transparent rounded-[100%]" />
              <div className="w-[38vw] max-w-[130px] sm:w-44 h-8 sm:h-10 bg-gradient-to-b from-emerald-500/40 to-transparent rounded-[100%]" />
            </div>
          </div>

          {/* 3D Vertical Golden Plinth Edge / Step (Solid Physical Presence with Valid Negative Margin) */}
          <div className="w-full h-5 sm:h-7 -mt-5 sm:-mt-7 rounded-b-[100%] bg-gradient-to-r from-amber-800 via-amber-500 via-30% via-yellow-300 via-50% via-amber-500 via-70% to-amber-800 border-b-2 border-amber-300 shadow-[0_12px_24px_rgba(0,0,0,0.95)]" />

          {/* Deep Ground Contact Shadow Directly Underneath the Physical Base */}
          <div className="w-[94%] h-4 sm:h-6 rounded-[100%] bg-black/98 blur-sm sm:blur-md -mt-2 sm:-mt-3" />

          {/* Glossy Floor Mirror Reflections Falling Downward Directly Beneath Plinth */}
          <div className="w-full flex items-start justify-center gap-2 sm:gap-5 md:gap-6 opacity-30 transform scale-y-[-1] blur-[2px] [mask-image:linear-gradient(to_bottom,black_0%,transparent_80%)] overflow-hidden h-10 sm:h-16 mt-0.5">
            <div className="w-[38vw] max-w-[130px] sm:w-48 md:w-56 lg:w-64 h-16 sm:h-20 bg-gradient-to-t from-transparent via-[#2b050b]/60 to-[#FF2A6D]/30" />
            <div className="w-[38vw] max-w-[130px] sm:w-48 md:w-56 lg:w-64 h-12 sm:h-16 bg-gradient-to-t from-transparent via-[#082212]/60 to-[#00E676]/30" />
          </div>
        </div>
      </div>
      </div>
    </section>
  );
};