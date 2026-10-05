'use client';

import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Lenis from 'lenis';
import confetti from 'canvas-confetti';
import { api } from '../api/client.js';
import {
  Trophy,
  Radio,
  Calendar,
  Sparkles,
  Award,
  Search,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Flame,
  Crown,
  Zap,
  ExternalLink,
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

const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', glowColor = 'rgba(245, 158, 11, 0.15)', onClick }) => {
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
  const totalCombinedPts = leaderPts + runnerUpPts;
  const pointGap = leaderPts - runnerUpPts;

  const leaderShare = totalCombinedPts > 0 ? Math.round((leaderPts / totalCombinedPts) * 100) : 50;
  const runnerUpShare = totalCombinedPts > 0 ? 100 - leaderShare : 50;

  const diraya = leaderboard.find(
    (t) => t.code?.toUpperCase().includes('DIR') || t.name?.toLowerCase().includes('diraya')
  ) || leaderboard[0];

  const rivaya = leaderboard.find(
    (t) => t.code?.toUpperCase().includes('RIV') || t.name?.toLowerCase().includes('rivaya')
  ) || leaderboard[1];

  // 3. Celebratory Confetti Launcher
  const cheerHouse = (house: 'DIRAYA' | 'RIVAYA') => {
    const colors =
      house === 'DIRAYA'
        ? ['#007AFF', '#60A5FA', '#38BDF8', '#F59E0B', '#FFFFFF']
        : ['#EF4444', '#F87171', '#FB923C', '#F59E0B', '#FFFFFF'];

    confetti({
      particleCount: 75,
      spread: 65,
      origin: { y: 0.65 },
      colors,
      ticks: 200,
      gravity: 1.1,
    });
  };

  const burstTitleStars = () => {
    confetti({
      particleCount: 45,
      spread: 75,
      origin: { y: 0.28 },
      colors: ['#F59E0B', '#FBBF24', '#FDE68A', '#FFFFFF', '#6366F1'],
      ticks: 180,
      gravity: 0.9,
    });
  };

  const marqueeItems = [
    { text: 'Live Festival Operations Active', icon: Radio, color: 'text-emerald-600' },
    { text: 'House Diraya vs House Rivaya', icon: Trophy, color: 'text-amber-600' },
    { text: '60 Official Competitions', icon: Award, color: 'text-[#007AFF]' },
    { text: '3 Live Performance Stages', icon: MapPin, color: 'text-purple-600' },
    { text: '100% Blind Digital Judging', icon: Sparkles, color: 'text-pink-600' },
    { text: 'QR Verifiable Credentials', icon: ShieldCheck, color: 'text-emerald-600' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#ffffc5] text-slate-900 selection:bg-amber-400 selection:text-black font-sans antialiased overflow-x-hidden relative">
      {/* Ambient Breathing Festive Glows */}
      <div className="fixed top-10 right-12 w-[30rem] h-[30rem] bg-amber-200/40 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="fixed bottom-10 left-12 w-[34rem] h-[34rem] bg-orange-200/35 rounded-full blur-[130px] pointer-events-none -z-10 animate-pulse" />

      {/* Main Interactive Stage Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-12">
        {/* ===================================================================
            SECTION 1: FESTIVAL HERO WITH SHIMMER, SPARKLES & GLOWING CAPSULES
        =================================================================== */}
        <header className="text-center space-y-6 max-w-4xl mx-auto relative">
          {/* Pulsing Golden Aurora Halo Behind Title */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-56 bg-gradient-to-r from-amber-300/50 via-orange-300/40 to-yellow-200/50 rounded-full blur-3xl pointer-events-none -z-10 animate-festive-glow" />

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-amber-300/90 shadow-xs backdrop-blur-md">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-slate-800 uppercase font-bold">
              Live Festival Telemetry // 60 Events Active
            </span>
          </div>

          {/* Grand Title with Metallic Gold Shimmer & Floating Sparkles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            onClick={burstTitleStars}
            className="space-y-3 relative cursor-pointer group select-none"
            title="Click to celebrate with sparkles!"
          >
            {/* Ambient Floating Sparkle Constellation */}
            <span className="absolute -left-4 sm:left-4 top-2 text-amber-500 font-serif text-2xl sm:text-3xl animate-glimmer pointer-events-none select-none">
              ✦
            </span>
            <span className="absolute right-0 sm:right-6 top-4 text-orange-500 font-serif text-xl sm:text-2xl animate-glimmer [animation-delay:1.2s] pointer-events-none select-none">
              ✨
            </span>
            <span className="absolute left-1/4 -top-3 text-amber-400 font-serif text-lg animate-glimmer [animation-delay:0.6s] pointer-events-none select-none hidden sm:inline-block">
              ✧
            </span>
            <span className="absolute right-1/4 -bottom-2 text-amber-600 font-serif text-xl animate-glimmer [animation-delay:1.8s] pointer-events-none select-none hidden sm:inline-block">
              ✦
            </span>

            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.94] text-slate-900 uppercase">
              <span className="animate-text-shimmer inline-block">ESPERANZA</span> <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-600 inline-block group-hover:scale-105 transition-transform duration-300">
                2026–27
              </span>
            </h1>

            <p className="font-display font-bold text-lg sm:text-2xl text-slate-800 tracking-tight pt-1">
              The Grand Arena of Cultural & Literary Supremacy
            </p>
          </motion.div>

          {/* 3 Interactive Floating Festival Data Capsules (With Hover Glow) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 max-w-3xl mx-auto">
            {/* Capsule 1: 60 Programmes */}
            <Link
              to="/schedule"
              className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-amber-300/80 shadow-xs hover:shadow-md hover:scale-[1.03] transition-all flex items-center gap-3.5 group cursor-pointer text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 font-bold block">
                  Curriculum
                </span>
                <h4 className="font-display font-black text-sm text-slate-900 truncate">
                  60 Programmes
                </h4>
                <p className="text-[11px] text-slate-500 truncate">On-Stage & Off-Stage</p>
              </div>
            </Link>

            {/* Capsule 2: 2 Royal Houses */}
            <Link
              to="/leaderboard"
              className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-amber-300/80 shadow-xs hover:shadow-md hover:scale-[1.03] transition-all flex items-center gap-3.5 group cursor-pointer text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold block">
                  Faction Duel
                </span>
                <h4 className="font-display font-black text-sm text-slate-900 truncate">
                  2 Royal Houses
                </h4>
                <p className="text-[11px] text-slate-500 truncate">Diraya vs Rivaya</p>
              </div>
            </Link>

            {/* Capsule 3: October 15-18, 2026 */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/90 border border-amber-300/80 shadow-xs hover:shadow-md hover:scale-[1.03] transition-all flex items-center gap-3.5 group text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold block">
                  Festival Calendar
                </span>
                <h4 className="font-display font-black text-sm text-slate-900 truncate">
                  Oct 15–18, 2026
                </h4>
                <p className="text-[11px] text-slate-500 truncate">3 Days of Glory</p>
              </div>
            </div>
          </div>
        </header>

        {/* ===================================================================
            SECTION 2: INTERACTIVE 3D PERSPECTIVE DUEL ARENA (TILT ON MOUSE)
        =================================================================== */}
        <section aria-label="House Duel Arena" className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-600 px-2">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-900">
              <Flame className="w-4 h-4 text-amber-600" />
              Live Lead Difference: <strong className="text-slate-900 font-mono">+{pointGap.toFixed(1)} PTS</strong>
            </span>
            <span className="hidden sm:inline-block font-semibold uppercase tracking-widest text-[11px]">
              Tap House Cards to Cheer 🎊
            </span>
          </div>

          {/* 3D Duel Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 perspective-[1200px]">
            {/* -------------------------------------------------------------
                HOUSE DIRAYA (SAPPHIRE BLUE 3D CARD)
            ------------------------------------------------------------- */}
            <TiltCard
              onClick={() => cheerHouse('DIRAYA')}
              glowColor="rgba(0, 122, 255, 0.25)"
              className="p-8 sm:p-10 rounded-[2.25rem] bg-white border-2 border-blue-400/90 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <Crown className="w-3.5 h-3.5 text-blue-600" />
                    HOUSE #01 // DIRAYA
                  </span>
                  {diraya?.code === leader?.code && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                      <Trophy className="w-3 h-3 text-amber-600" />
                      LEADING
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                    {diraya?.name || 'House Diraya'}
                  </h2>
                  <p className="text-xs font-mono font-bold text-blue-700 uppercase tracking-widest">
                    "Valor, Wit & Artistry"
                  </p>
                </div>

                {/* Score Display */}
                <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Championship Score
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-black text-5xl sm:text-7xl tracking-tighter text-slate-900">
                      {Number(diraya?.total_points || 0).toFixed(1)}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600 ml-1.5">PTS</span>
                  </div>
                </div>

                {/* Podium Medals */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                    <span className="text-[10px] font-black text-amber-800 block">🥇 1st Place</span>
                    <span className="font-mono text-xl font-black text-amber-900">{diraya?.first_places || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-600 block">🥈 2nd Place</span>
                    <span className="font-mono text-xl font-black text-slate-800">{diraya?.second_places || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                    <span className="text-[10px] font-black text-orange-800 block">🥉 3rd Place</span>
                    <span className="font-mono text-xl font-black text-orange-900">{diraya?.third_places || 0}</span>
                  </div>
                </div>
              </div>

              {/* Cheer Button Trigger */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500 font-semibold">Tap to celebrate</span>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold hover:bg-blue-100 transition-colors">
                  <span>Cheer Diraya 🎊</span>
                </span>
              </div>
            </TiltCard>

            {/* -------------------------------------------------------------
                HOUSE RIVAYA (CRIMSON ROSE 3D CARD)
            ------------------------------------------------------------- */}
            <TiltCard
              onClick={() => cheerHouse('RIVAYA')}
              glowColor="rgba(239, 68, 68, 0.25)"
              className="p-8 sm:p-10 rounded-[2.25rem] bg-white border-2 border-rose-400/90 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    <Crown className="w-3.5 h-3.5 text-rose-600" />
                    HOUSE #02 // RIVAYA
                  </span>
                  {rivaya?.code === leader?.code && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-black text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                      <Trophy className="w-3 h-3 text-amber-600" />
                      LEADING
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                    {rivaya?.name || 'House Rivaya'}
                  </h2>
                  <p className="text-xs font-mono font-bold text-rose-700 uppercase tracking-widest">
                    "Wisdom, Passion & Honor"
                  </p>
                </div>

                {/* Score Display */}
                <div className="pt-4 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    Championship Score
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-black text-5xl sm:text-7xl tracking-tighter text-slate-900">
                      {Number(rivaya?.total_points || 0).toFixed(1)}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-600 ml-1.5">PTS</span>
                  </div>
                </div>

                {/* Podium Medals */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                    <span className="text-[10px] font-black text-amber-800 block">🥇 1st Place</span>
                    <span className="font-mono text-xl font-black text-amber-900">{rivaya?.first_places || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-600 block">🥈 2nd Place</span>
                    <span className="font-mono text-xl font-black text-slate-800">{rivaya?.second_places || 0}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                    <span className="text-[10px] font-black text-orange-800 block">🥉 3rd Place</span>
                    <span className="font-mono text-xl font-black text-orange-900">{rivaya?.third_places || 0}</span>
                  </div>
                </div>
              </div>

              {/* Cheer Button Trigger */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-mono text-slate-500 font-semibold">Tap to celebrate</span>
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold hover:bg-rose-100 transition-colors">
                  <span>Cheer Rivaya 🎊</span>
                </span>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* ===================================================================
            SECTION 3: 3 DIRECT ACTION DOORS (WHAT THE PUBLIC CARES ABOUT)
        =================================================================== */}
        <section aria-label="Portal Navigation" className="space-y-4">
          <div className="text-center">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500 font-bold">
              Direct Public Access
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Door 1: Live Leaderboard */}
            <Link
              to="/leaderboard"
              className="p-6 sm:p-7 rounded-[2rem] bg-white border border-amber-300/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Trophy className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                  Live Leaderboard
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full championship standings, category point shares, and individual candidate ranks.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-800">
                <span>View Full Standings</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Door 2: Stage Schedule */}
            <Link
              to="/schedule"
              className="p-6 sm:p-7 rounded-[2rem] bg-white border border-amber-300/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007AFF] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                  Stage Schedule
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Real-time timetables for Main Auditorium, Hall 1, and Hall 2 with live reporting slots.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>Open Timetables</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Door 3: Verify Certificate */}
            <Link
              to="/verify"
              className="p-6 sm:p-7 rounded-[2rem] bg-white border border-amber-300/80 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-display font-black text-xl text-slate-900 tracking-tight">
                  Verify Certificate
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cryptographic QR credential validator for official winner and participant awards.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Validate Credential</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>

        {/* ===================================================================
            SECTION 4: FESTIVE MARQUEE TICKER
        =================================================================== */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 border border-amber-300/80 py-3 shadow-xs backdrop-blur-sm">
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-[#ffffc5] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-[#ffffc5] to-transparent" />

          <div className="animate-ticker">
            {[...marqueeItems, ...marqueeItems].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-center gap-2.5 px-6 shrink-0">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    {item.text}
                  </span>
                  <span className="text-amber-300 ml-4 font-bold">•</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===================================================================
            SECTION 5: CLEAN MINIMAL SEMANTIC FOOTER
        =================================================================== */}
        <footer className="pt-8 pb-4 border-t border-amber-300/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-600 font-mono">
            © 2026–27 Esperanza Festival Council. All rights reserved.
          </p>

          <nav aria-label="Quick Navigation" className="flex items-center gap-6 font-mono text-slate-700 font-bold">
            <Link to="/leaderboard" className="hover:text-amber-800 transition-colors">
              [01] LEADERBOARD
            </Link>
            <Link to="/schedule" className="hover:text-amber-800 transition-colors">
              [02] SCHEDULE
            </Link>
            <Link to="/verify" className="hover:text-amber-800 transition-colors">
              [03] VERIFY QR
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  );
};
