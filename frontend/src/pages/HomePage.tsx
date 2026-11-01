'use client';

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import confetti from 'canvas-confetti';
import { api } from '../api/client.js';
import { TeamStandingsSection } from '../components/TeamStandingsSection';
import { ResultPostersSection } from '../components/ResultPostersSection';
import { FestivalGallerySection } from '../components/FestivalGallerySection';
import {
  Trophy,
  Sparkles,
  Award,
  Shield,
  Flame,
  Crown,
} from 'lucide-react';

interface LeaderboardItem {
  id: number;
  name: string;
  code: string;
  color: string;
  total_points: string | number;
  first_places: number;
  second_places: number;
  third_places: number;
  scored_competitions_count: number;
}

// -----------------------------------------------------------------------------
// Interactive 3D Physics Tilt Card Component
// -----------------------------------------------------------------------------
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
}

const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(245, 158, 11, 0.25)',
  onClick,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 200, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 200, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7.5deg', '-7.5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7.5deg', '7.5deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      className={`relative cursor-pointer transition-shadow duration-300 ${className}`}
    >
      <div
        className="absolute inset-0 rounded-[2.25rem] pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500 blur-xl -z-10"
        style={{ background: glowColor }}
      />
      <div style={{ transform: 'translateZ(25px)' }} className="h-full">
        {children}
      </div>
    </motion.div>
  );
};

// -----------------------------------------------------------------------------
// Main Public HomePage Component
// -----------------------------------------------------------------------------
export const HomePage: React.FC = () => {
  // 1. Initialize Lenis Smooth Momentum Scroll Engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 1.5,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // 2. Fetch live points tally
  const { data: leaderboard = [] } = useQuery({
    queryKey: ['public-leaderboard'],
    queryFn: async () => {
      const res = await api.get<LeaderboardItem[]>('/points/leaderboard');
      return res.data;
    },
    refetchInterval: 12000,
  });

  const leader = leaderboard[0];
  const runnerUp = leaderboard[1];
  const leaderPts = leader ? Number(leader.total_points) : 0;
  const runnerUpPts = runnerUp ? Number(runnerUp.total_points) : 0;
  const pointGap = Math.abs(leaderPts - runnerUpPts);

  const diraya = leaderboard.find(
    (t) => t.code?.toUpperCase().includes('DIR') || t.name?.toLowerCase().includes('diraya')
  ) || leaderboard[0];

  const rivaya = leaderboard.find(
    (t) => t.code?.toUpperCase().includes('RIV') || t.name?.toLowerCase().includes('rivaya')
  ) || leaderboard[1];

  const dirayaPts = Number(diraya?.total_points || 0);
  const rivayaPts = Number(rivaya?.total_points || 0);
  const totalCombinedPts = dirayaPts + rivayaPts;
  const dirayaShare = totalCombinedPts > 0 ? Math.round((dirayaPts / totalCombinedPts) * 100) : 50;
  const rivayaShare = totalCombinedPts > 0 ? 100 - dirayaShare : 50;

  const isDirayaLeader = dirayaPts >= rivayaPts;

  // 4. Celebratory Confetti Launcher
  const cheerHouse = (house: 'DIRAYA' | 'RIVAYA') => {
    const colors =
      house === 'DIRAYA'
        ? ['#007AFF', '#60A5FA', '#38BDF8', '#F59E0B', '#FFFFFF']
        : ['#EF4444', '#F87171', '#FB923C', '#F59E0B', '#FFFFFF'];

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors,
      ticks: 200,
      gravity: 1.1,
    });
  };

  const burstTitleStars = () => {
    confetti({
      particleCount: 55,
      spread: 85,
      origin: { y: 0.35 },
      colors: ['#F59E0B', '#FBBF24', '#FDE68A', '#FFFFFF', '#FF8A00'],
      ticks: 180,
      gravity: 0.9,
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#070503] text-slate-100 selection:bg-amber-400 selection:text-black font-sans antialiased overflow-x-hidden relative">
      {/* ===================================================================
          SECTION 1: FIXED SINGLE-SCREEN CINEMATIC FESTIVAL HERO
      =================================================================== */}
      <section
        id="home"
        className="relative h-[100dvh] min-h-[560px] w-full flex flex-col justify-center items-center text-center overflow-hidden px-4 sm:px-8 pt-16 md:pt-20 pb-16 md:pb-6 bg-[#070503] snap-start"
      >
        {/* Official Festival Bokeh & Cyber Atmosphere Backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none select-none z-0"
          style={{ backgroundImage: `url('/hero/hero-bg.png')` }}
        />

        {/* Soft Vignettes for Navbar & Section Bleed */}
        <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#070503]/80 via-[#070503]/30 to-transparent pointer-events-none z-0" />
        <div className="absolute bottom-0 inset-x-0 h-24 sm:h-60 bg-gradient-to-t from-[#070503] via-[#070503]/85 via-40% to-transparent pointer-events-none z-0" />

        {/* Centerpiece Hero Title & Subtitle Lockup */}
        <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center justify-center space-y-3 sm:space-y-4 px-2 my-auto">
          {/* Brand Logo, Motto & Subtitle Lockup */}
          <div className="flex flex-col items-center">
            {/* Festival Official Motto: NEXUS VERITATIS (Tight Lockup above Title on Desktop) */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="hidden md:flex items-center justify-center select-none mb-2 sm:mb-3"
            >
              <img
                src="/hero/nexus-veritatis.png"
                alt="Nexus Veritatis - Enduring Testament"
                className="h-8 sm:h-12 md:h-14 w-auto object-contain mix-blend-screen drop-shadow-[0_4px_16px_rgba(245,158,11,0.35)] pointer-events-none select-none"
              />
            </motion.div>

            {/* Official Master ESPERANZA Title Artwork (Unified Title, Subtitle & Dates) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              onClick={burstTitleStars}
              title="Click to celebrate!"
              className="relative cursor-pointer group select-none flex items-center justify-center w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <picture className="flex items-center justify-center">
                {/* Mobile Portrait View: Native Stacked Festival Typography & Emblem Lockup */}
                <source media="(max-width: 767px)" srcSet="/hero/esperanza-hero-mobile.png" />
                {/* Desktop & Tablet Landscape View: Horizontal Master Title Artwork */}
                <source media="(min-width: 768px)" srcSet="/hero/esperanza-master-title.png" />
                <img
                  src="/hero/esperanza-master-title.png"
                  alt="ESPERANZA - Campus Life Festival 2026"
                  className="w-auto max-w-[82vw] sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[58dvh] sm:max-h-[36vh] object-contain drop-shadow-[0_12px_36px_rgba(245,158,11,0.5)] transition-all duration-300"
                />
              </picture>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 1.5: FULL-SCREEN CINEMATIC ABOUT / MANIFESTO PAGE
          (Fixed Full Viewport Height • Edge-to-Edge • Seamless Dark Gradient Joins)
      =================================================================== */}
      <section
        id="about"
        className="relative h-[100dvh] min-h-[560px] w-full bg-[#070503] overflow-hidden select-none flex items-center justify-center snap-start"
        aria-label="Official Festival Manifesto"
      >
        {/* Full-Bleed Master Artwork Image (Zero Boxiness, Native 9:16 Edge-to-Edge Flow) */}
        <picture className="w-full h-full flex items-center justify-center">
          {/* Mobile Portrait View (Exact Native 9:16 Smartphone Artwork) */}
          <source media="(max-width: 767px)" srcSet="/about/esperanza-manifesto-mobile.png" />
          {/* Desktop & Tablet Landscape View (Full-Bleed Widescreen Master Artwork) */}
          <source media="(min-width: 768px)" srcSet="/about/esperanza-manifesto.png" />
          <img
            src="/about/esperanza-manifesto.png"
            alt="Esperanza 9.0 Manifesto: Flagship inter-house cultural, literary, and arts championship organized by the ADSA Project Council. Bringing together House Diraya and House Rivaya across 60+ competitive disciplines, the festival celebrates creative distinction, student talent, and impartial blind digital evaluation under the enduring motto Nexus Veritatis."
            className="w-full h-full object-cover object-center pointer-events-none select-none"
          />
        </picture>

        {/* Top Seamless Dark Gradient Blend (Connecting Flush with Hero - Behind Content) */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-16 sm:h-36 md:h-52 bg-gradient-to-b from-[#070503] via-[#070503]/80 via-35% to-transparent z-0" />

        {/* Bottom Seamless Dark Gradient Blend (Connecting Flush with Live Standings - Behind Content) */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 h-16 sm:h-40 md:h-56 bg-gradient-to-t from-[#070503] via-[#070503]/80 via-35% to-transparent z-0" />
      </section>

      {/* ===================================================================
          SECTION 2: CINEMATIC TEAM STANDINGS (DEMO MOCK - REAL VALUES HIDDEN)
      =================================================================== */}
      <TeamStandingsSection
        rivayaPoints={148}
        dirayaPoints={115}
      />

      {/* ===================================================================
          SECTION 3: OFFICIAL RESULT POSTERS (ONE-BY-ONE REEL + MODAL SEARCH)
      =================================================================== */}
      <ResultPostersSection />

      {/* ===================================================================
          SECTION 4: FESTIVAL GALLERY & ARCHIVES (CURATED LUXURY BENTO MOSAIC)
      =================================================================== */}
      <FestivalGallerySection />

      {/* ===================================================================
          SECTION 5: CLEAN MINIMAL SEMANTIC FOOTER
      =================================================================== */}
      <footer className="relative max-w-6xl mx-auto px-4 sm:px-8 pt-8 pb-24 md:pb-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
        {/* Soft Centered Fading Hairline (No harsh cut-off edge) */}
        <div className="absolute top-0 inset-x-8 sm:inset-x-24 h-[1px] bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

        <div className="flex items-center gap-2 text-xs sm:text-sm font-sans tracking-wide">
          <span className="text-slate-300 font-normal">Project Council</span>
          <span className="text-amber-500/70 font-semibold mx-1">.</span>
          <span className="font-semibold text-white tracking-wider">ESPERANZA 9.0</span>
        </div>
      </footer>
    </div>
  );
};