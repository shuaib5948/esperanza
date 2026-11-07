import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from '../api/client.js';
import { Maximize2, Sparkles, Trophy } from 'lucide-react';
import { TeamStandingsSection } from '../components/TeamStandingsSection.js';
import { OfficialResultPosterCard } from '../components/OfficialResultPosterCard.js';

// Clean program name formatting (e.g. "General - Magazine")
export const formatProgramName = (programmeGroup?: string, competitionName?: string): string => {
  const group = (programmeGroup || '').trim();
  let name = (competitionName || '').trim();

  if (!name) return group || 'Competition';

  // Strip code prefixes like "j1-", "j01-", "s2-", "g1-", "p1-"
  name = name.replace(/^[a-z]{1,3}[-_]?\d+\s*[-.–—:]?\s*/i, '');
  name = name.replace(/^\d+\s*[-.–—:]\s*/, '');
  name = name.replace(/^[-.–—:]+\s*/, '').trim();

  if (!group) return name;

  // Check if name already starts with group (case-insensitive) followed by ' - ' or '-'
  const groupRegex = new RegExp(`^${group}\\s*[-–—:]?\\s*`, 'i');
  if (groupRegex.test(name)) {
    const stripped = name.replace(groupRegex, '').trim();
    if (stripped) {
      name = stripped;
    }
  }

  // Capitalize group nicely (e.g., "GENERAL" -> "General", "JUNIOR 1" -> "Junior 1")
  const formattedGroup = group
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return `${formattedGroup} - ${name}`;
};

// =============================================================================
// CONTINUOUS AMBIENT GOLD DUST & EMBER PARTICLES (60 FPS HTML5 CANVAS)
// =============================================================================
const StageParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // 40 ambient golden ember particles
    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.45 + 0.15,
      speedX: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.7 + 0.25,
      pulseSpeed: Math.random() * 0.025 + 0.008,
      pulseOffset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.4 ? '#F59E0B' : Math.random() > 0.5 ? '#10B981' : '#F43F5E',
    }));

    let frame = 0;
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.y -= p.speedY;
        p.x += p.speedX;
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentOpacity =
          p.opacity * (0.6 + 0.4 * Math.sin(frame * p.pulseSpeed + p.pulseOffset));

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, currentOpacity));
        ctx.shadowBlur = p.radius * 5;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[2] w-full h-full opacity-65"
    />
  );
};

// =============================================================================
// ANIMATED 2-LINE BATTLE PROGRESSION GRAPH (STAGE BROADCAST EDITION)
// Slow suspenseful reveal: 0-3.5s climb -> 3.5-5.0s tie suspense -> 5.0-7.2s surge
// =============================================================================
const BattleProgressionGraphView: React.FC<{
  recentResults: any[];
  dirayaPoints: number;
  rivayaPoints: number;
}> = ({ recentResults, dirayaPoints, rivayaPoints }) => {
  const [stage, setStage] = useState<'climb' | 'freeze' | 'surge' | 'done'>('climb');
  const [progress, setProgress] = useState(0);
  const [dScore, setDScore] = useState(0);
  const [rScore, setRScore] = useState(0);

  const tiePoint = Math.min(dirayaPoints, rivayaPoints);

  // Slow, curiosity-building animation ceremony (total ~7.5 seconds)
  useEffect(() => {
    setStage('climb');
    setProgress(0);
    setDScore(0);
    setRScore(0);

    let startTs: number | null = null;
    let animId: number;

    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const elapsed = ts - startTs;

      if (elapsed < 3500) {
        // Phase 1: Slow Neck-and-Neck Climb (0s - 3.5s)
        const p = elapsed / 3500;
        const easedP = 1 - Math.pow(1 - p, 2.2);
        const currentProg = easedP * 0.72;
        setProgress(currentProg);
        setDScore(Math.round(easedP * tiePoint * 0.9));
        setRScore(Math.round(easedP * tiePoint * 0.9));
        setStage('climb');
      } else if (elapsed < 5000) {
        // Phase 2: Suspense Freeze at Tie Point (3.5s - 5.0s)
        setProgress(0.72);
        setDScore(tiePoint);
        setRScore(tiePoint);
        setStage('freeze');
      } else if (elapsed < 7400) {
        // Phase 3: Solo Surge to the Finish (5.0s - 7.4s)
        const p = (elapsed - 5000) / 2400;
        const easedP = 1 - Math.pow(1 - p, 2.4);
        const currentProg = 0.72 + easedP * 0.28;
        setProgress(currentProg);

        const dDiff = dirayaPoints - tiePoint;
        const rDiff = rivayaPoints - tiePoint;
        setDScore(Math.round(tiePoint + easedP * dDiff));
        setRScore(Math.round(tiePoint + easedP * rDiff));
        setStage('surge');
      } else {
        // Phase 4: Final State
        setProgress(1);
        setDScore(dirayaPoints);
        setRScore(rivayaPoints);
        setStage('done');
        return;
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [dirayaPoints, rivayaPoints, tiePoint]);

  const battlePointsData = React.useMemo(() => {
    if (recentResults && recentResults.length > 1) {
      let dCum = 0;
      let rCum = 0;
      return recentResults.map((r: any, idx: number) => {
        dCum += Number(r.diraya_score || 0);
        rCum += Number(r.rivaya_score || 0);
        return {
          id: r.competition_id || idx,
          label: r.programme_number ? `P${String(r.programme_number).padStart(2, '0')}` : `P${idx + 1}`,
          name: r.competition_name || `Prog ${idx + 1}`,
          diraya: dCum || Number(r.diraya_score || 0),
          rivaya: rCum || Number(r.rivaya_score || 0),
        };
      });
    }
    // High-fidelity fallback milestones up to live points
    const dSteps = [
      Math.round(dirayaPoints * 0.16),
      Math.round(dirayaPoints * 0.38),
      Math.round(dirayaPoints * 0.62),
      Math.round(dirayaPoints * 0.84),
      dirayaPoints,
    ];
    const rSteps = [
      Math.round(rivayaPoints * 0.20),
      Math.round(rivayaPoints * 0.35),
      Math.round(rivayaPoints * 0.64),
      Math.round(rivayaPoints * 0.88),
      rivayaPoints,
    ];
    return [
      { label: 'P01', diraya: dSteps[0], rivaya: rSteps[0], name: 'General - Magazine' },
      { label: 'P04', diraya: dSteps[1], rivaya: rSteps[1], name: 'Senior - Quiz' },
      { label: 'P08', diraya: dSteps[2], rivaya: rSteps[2], name: 'Junior - Elocution' },
      { label: 'P14', diraya: dSteps[3], rivaya: rSteps[3], name: 'General - DTP' },
      { label: 'LIVE', diraya: dSteps[4], rivaya: rSteps[4], name: 'Current Total' },
    ];
  }, [recentResults, dirayaPoints, rivayaPoints]);

  const maxBattlePoint = Math.max(
    ...battlePointsData.map((d: any) => Math.max(d.diraya, d.rivaya)),
    100
  );
  const minBattlePoint = 0;
  const pointRange = (maxBattlePoint - minBattlePoint) || 1;

  const svgWidth = 880;
  const svgHeight = 280;
  const padX = 45;
  const padYTop = 25;
  const padYBot = 36;
  const plotW = svgWidth - padX * 2;
  const plotH = svgHeight - padYTop - padYBot;

  const pointsDiraya = battlePointsData.map((d: any, i: number) => {
    const x = padX + (i / (battlePointsData.length - 1 || 1)) * plotW;
    const y = padYTop + plotH - ((d.diraya - minBattlePoint) / pointRange) * plotH;
    return { x, y, val: d.diraya, label: d.label, name: d.name };
  });

  const pointsRivaya = battlePointsData.map((d: any, i: number) => {
    const x = padX + (i / (battlePointsData.length - 1 || 1)) * plotW;
    const y = padYTop + plotH - ((d.rivaya - minBattlePoint) / pointRange) * plotH;
    return { x, y, val: d.rivaya, label: d.label, name: d.name };
  });

  const dPathDiraya = pointsDiraya.reduce(
    (acc: string, p: any, i: number) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const dPathRivaya = pointsRivaya.reduce(
    (acc: string, p: any, i: number) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
    ''
  );
  const areaDiraya = `${dPathDiraya} L ${pointsDiraya[pointsDiraya.length - 1].x} ${svgHeight - padYBot} L ${pointsDiraya[0].x} ${svgHeight - padYBot} Z`;
  const areaRivaya = `${dPathRivaya} L ${pointsRivaya[pointsRivaya.length - 1].x} ${svgHeight - padYBot} L ${pointsRivaya[0].x} ${svgHeight - padYBot} Z`;

  return (
    <div className="w-full max-w-5xl flex-1 flex flex-col items-center justify-between py-3 sm:py-5 z-10 animate-fade-in select-none">
      {/* 1. SIMPLE HEADING MATCHING TEAM STANDINGS */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center pt-1 sm:pt-2 text-center"
      >
        <h2 className="font-display font-black text-lg sm:text-2xl md:text-2xl tracking-[0.24em] uppercase text-white">
          <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">CHAMPIONSHIP </span>
          <span className="text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">
            GRAPH
          </span>
        </h2>

        {/* Thin Gold Divider with Centered Solid Gold Diamond (Identical to Team Standings) */}
        <div className="flex items-center justify-center gap-2.5 pt-1.5">
          <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
          <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
          <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
        </div>
      </motion.div>

      {/* 2. THE HERO GRAPH CONTAINER (Clean, High Visibility) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full bg-[#0A0A0A]/90 border border-white/[0.08] rounded-3xl p-5 sm:p-7 backdrop-blur-md shadow-2xl relative overflow-hidden my-auto"
      >
        {/* Suspense Indicator Badge during Freeze */}
        {stage === 'freeze' && (
          <div className="absolute top-4 right-6 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-xs uppercase animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            NECK-AND-NECK TIE
          </div>
        )}

        <svg className="w-full h-[220px] sm:h-[280px] md:h-[320px] overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <defs>
            <linearGradient id="liveDirayaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00E676" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#00E676" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#00E676" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="liveRivayaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF2A6D" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#FF2A6D" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FF2A6D" stopOpacity="0.0" />
            </linearGradient>
            {/* Dynamic ClipPath driven by progressive ceremony */}
            <clipPath id="graphProgressClip">
              <rect x={0} y={0} width={padX + plotW * progress} height={svgHeight} />
            </clipPath>
          </defs>

          {/* Background Horizontal Grid Lines */}
          <line x1={padX} y1={padYTop} x2={svgWidth - padX} y2={padYTop} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" strokeWidth="1" />
          <line x1={padX} y1={padYTop + plotH * 0.5} x2={svgWidth - padX} y2={padYTop + plotH * 0.5} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" strokeWidth="1" />
          <line x1={padX} y1={padYTop + plotH} x2={svgWidth - padX} y2={padYTop + plotH} stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />

          {/* Area Fills revealed progressively */}
          <g clipPath="url(#graphProgressClip)">
            <path d={areaDiraya} fill="url(#liveDirayaGrad)" opacity={0.9} />
            <path d={areaRivaya} fill="url(#liveRivayaGrad)" opacity={0.9} />
          </g>

          {/* Glowing Animated Polylines */}
          <g clipPath="url(#graphProgressClip)">
            <path
              d={dPathRivaya}
              fill="none"
              stroke="#FF2A6D"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(255,42,109,0.85))' }}
            />
            <path
              d={dPathDiraya}
              fill="none"
              stroke="#00E676"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0,230,118,0.85))' }}
            />
          </g>

          {/* Checkpoint Nodes (Pop onto chart as line reaches each point) */}
          {pointsRivaya.map((p: any, idx: number) => {
            const nodeProgress = idx / (battlePointsData.length - 1 || 1);
            if (progress < nodeProgress * 0.95) return null;
            const isLatest = idx === pointsRivaya.length - 1 && progress >= 0.98;

            return (
              <g key={`r-node-${idx}`} className="transition-all duration-300">
                <circle cx={p.x} cy={p.y} r="6" fill="#FF2A6D" stroke="#040404" strokeWidth="2.5" />
                <circle cx={p.x} cy={p.y} r="2.5" fill="#FFFFFF" />
                {isLatest && (
                  <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#FF2A6D" strokeWidth="2" className="animate-ping opacity-75" />
                )}
              </g>
            );
          })}

          {pointsDiraya.map((p: any, idx: number) => {
            const nodeProgress = idx / (battlePointsData.length - 1 || 1);
            if (progress < nodeProgress * 0.95) return null;
            const isLatest = idx === pointsDiraya.length - 1 && progress >= 0.98;

            return (
              <g key={`d-node-${idx}`} className="transition-all duration-300">
                <circle cx={p.x} cy={p.y} r="6" fill="#00E676" stroke="#040404" strokeWidth="2.5" />
                <circle cx={p.x} cy={p.y} r="2.5" fill="#FFFFFF" />
                {isLatest && (
                  <circle cx={p.x} cy={p.y} r="12" fill="none" stroke="#00E676" strokeWidth="2" className="animate-ping opacity-75" />
                )}
                <text
                  x={p.x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  className="text-xs sm:text-sm font-mono font-bold fill-slate-400 select-none"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* 3. SIMPLE, CLEAN BOTTOM BAR (No over-contents, just the two team score indicators) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full flex items-center justify-between px-3 pt-2"
      >
        {/* Diraya Clean Badge */}
        <div className="flex items-center gap-3">
          <span className="w-3.5 h-3.5 rounded-full bg-[#00E676] shadow-[0_0_12px_#00E676]" />
          <span className="text-xl sm:text-2xl font-black uppercase text-white tracking-wider">
            DIRAYA
          </span>
          <span className="font-mono text-2xl sm:text-4xl font-black text-[#00E676] drop-shadow pl-1">
            {dScore} <span className="text-xs sm:text-sm text-slate-400 font-mono">PTS</span>
          </span>
        </div>

        {/* Rivaya Clean Badge */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-2xl sm:text-4xl font-black text-[#FF2A6D] drop-shadow pr-1">
            {rScore} <span className="text-xs sm:text-sm text-slate-400 font-mono">PTS</span>
          </span>
          <span className="text-xl sm:text-2xl font-black uppercase text-white tracking-wider">
            RIVAYA
          </span>
          <span className="w-3.5 h-3.5 rounded-full bg-[#FF2A6D] shadow-[0_0_12px_#FF2A6D]" />
        </div>
      </motion.div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// BROADCAST FESTIVAL LOGO ANIMATION VIEW (SMOOTH REVEAL CEREMONY)
// -----------------------------------------------------------------------------
const LiveScreenLogoAnimationView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fadeOpacity, setFadeOpacity] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let holdTimer: ReturnType<typeof setTimeout>;
    let fadeTimer: ReturnType<typeof setTimeout>;

    const handleEnded = () => {
      // Hold on the fully revealed festival lockup for 4.2 seconds
      holdTimer = setTimeout(() => {
        setFadeOpacity(0);
        fadeTimer = setTimeout(() => {
          if (video) {
            video.currentTime = 0;
            video.play().catch(() => {});
            setFadeOpacity(1);
          }
        }, 600);
      }, 4200);
    };

    video.addEventListener('ended', handleEnded);
    video.play().catch(() => {});

    return () => {
      video.removeEventListener('ended', handleEnded);
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

  return (
    <div className="relative w-full flex-1 flex flex-col items-center justify-center animate-fade-in py-2 select-none overflow-hidden">
      {/* Cinematic High-Definition Smooth Reveal Video with Native Alpha Transparency */}
      <motion.div
        style={{ opacity: fadeOpacity }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        className="relative w-full max-w-5xl md:max-w-6xl flex items-center justify-center px-4"
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-auto max-h-[84vh] object-contain drop-shadow-[0_0_60px_rgba(245,158,11,0.35)] pointer-events-none select-none"
        >
          <source src="/assets/esperanza-transparent-reveal-centered.webm" type="video/webm" />
          <source src="/assets/esperanza-transparent-reveal.webm" type="video/webm" />
          <source src="/assets/esperanza-logo-reveal.mp4" type="video/mp4" />
        </video>

        {/* Soft Waving Light Sheen (Directly color-dodged on text, ultra-subtle & not overdone) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
          <motion.div
            initial={{ x: '-130%', opacity: 0 }}
            animate={{
              x: ['-130%', '130%'],
              opacity: [0, 0.35, 0.45, 0.35, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              repeatDelay: 3,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              mixBlendMode: 'color-dodge',
            }}
            className="w-[260px] sm:w-[360px] md:w-[440px] h-[65%] bg-gradient-to-r from-transparent via-amber-200/40 to-transparent -skew-x-12 blur-2xl"
          />
        </div>
      </motion.div>
    </div>
  );
};

export const LiveStageScreenPage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoIndex, setAutoIndex] = useState(0);

  // Poll live screen display state every 3.5 seconds
  const { data } = useQuery({
    queryKey: ['live-screen-display'],
    queryFn: async () => {
      const res = await api.get<any>('/live-screen/display');
      return res.data;
    },
    refetchInterval: 3500,
  });

  const state = data?.state || { mode: 'AUTO', active_competition_id: null };
  const leaderboard = data?.leaderboard || [];
  const resultPosters: any[] = data?.result_posters || [];
  const activePoster = data?.active_poster || null;

  // Maximum 5 latest result posters for auto-loop
  const latestPosters = React.useMemo(() => {
    return (resultPosters || []).slice(0, 5);
  }, [resultPosters]);

  // Construct auto-cycle sequence:
  // 1. Promo Ad ('AD')
  // 2. Leaderboard ('LEADERBOARD')
  // 3. Battle Graph ('GRAPH')
  // 4. Up to 5 latest Result Posters ('RESULT')
  const autoSequence = React.useMemo(() => {
    const seq: Array<{
      type: 'AD' | 'LEADERBOARD' | 'GRAPH' | 'RESULT';
      poster?: any;
      posterIndex?: number;
      totalPosters?: number;
    }> = [
      { type: 'AD' },
      { type: 'LEADERBOARD' },
      { type: 'GRAPH' },
    ];

    latestPosters.forEach((p, idx) => {
      seq.push({
        type: 'RESULT',
        poster: p,
        posterIndex: idx + 1,
        totalPosters: latestPosters.length,
      });
    });

    return seq;
  }, [latestPosters]);

  // If state.mode === 'AUTO', cycle through the sequence every 14 seconds
  useEffect(() => {
    if (state.mode !== 'AUTO' || autoSequence.length === 0) return;
    const interval = setInterval(() => {
      setAutoIndex((prev) => (prev + 1) % autoSequence.length);
    }, 14000);
    return () => clearInterval(interval);
  }, [state.mode, autoSequence.length]);

  // Resolve active view and active poster
  let resolvedView: 'AD' | 'LEADERBOARD' | 'GRAPH' | 'RESULT' = 'AD';
  let displayPoster: any = activePoster;
  let autoPosterInfo: { current: number; total: number } | null = null;

  if (state.mode === 'RESULT') {
    resolvedView = 'RESULT';
    displayPoster = activePoster;
  } else if (state.mode === 'AD') {
    resolvedView = 'AD';
  } else if (state.mode === 'LEADERBOARD') {
    resolvedView = 'LEADERBOARD';
  } else if (state.mode === 'GRAPH') {
    resolvedView = 'GRAPH';
  } else {
    // Mode is 'AUTO'
    const currentItem = autoSequence[autoIndex % autoSequence.length] || { type: 'AD' };
    resolvedView = currentItem.type;
    if (currentItem.type === 'RESULT' && currentItem.poster) {
      displayPoster = currentItem.poster;
      if (currentItem.posterIndex && currentItem.totalPosters) {
        autoPosterInfo = {
          current: currentItem.posterIndex,
          total: currentItem.totalPosters,
        };
      }
    }
  }

  // Teams & Points
  const diraya = leaderboard.find(
    (t: any) => t.code?.toUpperCase() === 'DIRAYA' || t.name?.toUpperCase().includes('DIRAYA')
  );
  const rivaya = leaderboard.find(
    (t: any) => t.code?.toUpperCase() === 'RIVAYA' || t.name?.toUpperCase().includes('RIVAYA')
  );

  const dirayaPoints = diraya ? Math.round(Number(diraya.total_points)) : 115;
  const rivayaPoints = rivaya ? Math.round(Number(rivaya.total_points)) : 148;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Confetti celebration pop on result display
  useEffect(() => {
    if (resolvedView === 'RESULT') {
      const timer = setTimeout(() => {
        try {
          confetti({
            particleCount: 60,
            spread: 90,
            origin: { y: 0.55 },
            colors: ['#F59E0B', '#FDE68A', '#10B981', '#BE123C'],
          });
        } catch {}
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [resolvedView, displayPoster?.competition_id]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#040404] text-white flex flex-col justify-between font-sans select-none">
      {/* 60 FPS HTML5 Canvas Particle Engine */}
      <StageParticleCanvas />

      {/* Background Ambience & Spotlights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Golden Festival Bokeh & Ambient Glows */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/4 w-[650px] h-[450px] bg-[#0D472D]/30 rounded-full blur-[150px]" />
        <div className="absolute -bottom-40 right-1/4 w-[650px] h-[450px] bg-[#881337]/30 rounded-full blur-[150px]" />
        {/* Radial vignette */}
        <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-[#040404]/90" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #F59E0B 1px, transparent 1px), linear-gradient(to bottom, #F59E0B 1px, transparent 1px)',
            backgroundSize: '70px 70px',
          }}
        />
      </div>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA: SWITCHABLE 3 VIEWS (CLEAN & SIMPLE)              */}
      {/* =================================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 sm:px-16 min-h-0 py-2">
        {/* ----------------------------------------------------------------- */}
        {/* VIEW 1: ESPERANZA FESTIVAL PROMO (SMOOTH REVEAL LOGO ANIMATION)   */}
        {/* ----------------------------------------------------------------- */}
        {resolvedView === 'AD' && (
          <LiveScreenLogoAnimationView key={`tv-logo-anim-${autoIndex}`} />
        )}

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 2: LIVE 3D CINEMATIC TEAM STANDINGS (SAME AS HOMEPAGE)      */}
        {/* ----------------------------------------------------------------- */}
        {resolvedView === 'LEADERBOARD' && (
          <div className="w-full h-full flex-1 flex flex-col items-center justify-end animate-fade-in pb-0">
            <TeamStandingsSection
              key={`tv-standings-${autoIndex}`}
              autoTrigger={true}
              isLiveScreen={true}
              rivayaPoints={rivayaPoints}
              dirayaPoints={dirayaPoints}
            />
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 3: LIVE 2-LINE BATTLE PROGRESSION GRAPH (ANIMATED ACCELERATION) */}
        {/* ----------------------------------------------------------------- */}
        {resolvedView === 'GRAPH' && (
          <div className="w-full h-full flex-1 flex flex-col items-center justify-center animate-fade-in py-2">
            <BattleProgressionGraphView
              key={`tv-graph-${autoIndex}`}
              recentResults={data?.recent_results || []}
              dirayaPoints={dirayaPoints}
              rivayaPoints={rivayaPoints}
            />
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* VIEW 4: OFFICIAL RESULTS VICTORY POSTER (TEMPLATE EDITION)        */}
        {/* ----------------------------------------------------------------- */}
        {resolvedView === 'RESULT' && (
          <div
            key={displayPoster?.competition_id || autoIndex}
            className="w-full flex-1 flex flex-col items-center justify-center animate-fade-in py-1 select-none"
          >
            {/* Signature Heading Matching Team Standings Style */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative z-10 flex flex-col items-center pb-2 text-center"
            >
              <h2 className="font-display font-black text-lg sm:text-2xl md:text-2xl tracking-[0.24em] uppercase text-white">
                <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">OFFICIAL </span>
                <span className="text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">
                  RESULT
                </span>
              </h2>

              {/* Thin Gold Divider with Centered Solid Gold Diamond (Identical to Team Standings) */}
              <div className="flex items-center justify-center gap-2.5 pt-1.5">
                <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
                <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
                <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
              </div>
            </motion.div>

            {/* The Official Printed-Style Poster Template Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[470px] lg:max-w-[500px] my-auto"
            >
              <OfficialResultPosterCard
                poster={
                  displayPoster || {
                    competition_name: 'Madh Song',
                    programme_group: 'Junior',
                    participation_type: 'INDIVIDUAL',
                    winners: [
                      { position: 1, participant_name: 'Muhammed Ali', team_name: 'Rivaya' },
                      { position: 2, participant_name: 'Ahmed Raza', team_name: 'Diraya' },
                      { position: 3, participant_name: 'Bilal Perumbavoor', team_name: 'Rivaya' },
                    ],
                  }
                }
              />
            </motion.div>
          </div>
        )}
      </main>

      {/* Floating Bottom Fullscreen Toggle (Absolute so it does not offset vertical centering) */}
      <div className="absolute bottom-3 right-6 sm:right-10 z-30">
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-white/[0.08] opacity-25 hover:opacity-100"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fullscreen</span>
        </button>
      </div>
    </div>
  );
};
