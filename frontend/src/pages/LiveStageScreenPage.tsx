import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from '../api/client.js';
import { Maximize2 } from 'lucide-react';
import { TeamStandingsSection } from '../components/TeamStandingsSection';

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
  // 3. Up to 5 latest Result Posters ('RESULT')
  const autoSequence = React.useMemo(() => {
    const seq: Array<{
      type: 'AD' | 'LEADERBOARD' | 'RESULT';
      poster?: any;
      posterIndex?: number;
      totalPosters?: number;
    }> = [
      { type: 'AD' },
      { type: 'LEADERBOARD' },
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
  let resolvedView: 'AD' | 'LEADERBOARD' | 'RESULT' = 'AD';
  let displayPoster: any = activePoster;
  let autoPosterInfo: { current: number; total: number } | null = null;

  if (state.mode === 'RESULT') {
    resolvedView = 'RESULT';
    displayPoster = activePoster;
  } else if (state.mode === 'AD') {
    resolvedView = 'AD';
  } else if (state.mode === 'LEADERBOARD') {
    resolvedView = 'LEADERBOARD';
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
      {/* TOP BRANDING BAR (Ultra-Clean & Minimalist)                         */}
      {/* =================================================================== */}
      <header className="relative z-10 flex items-center justify-between px-8 sm:px-14 pt-6 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="/assets/esperanza-logo.png"
            alt="Esperanza Emblem"
            className="h-8 sm:h-9 w-auto object-contain drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]"
          />
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
            ESPERANZA <span className="text-amber-400">9.0</span>
          </h1>
          <span className="text-amber-400/40 text-xs font-bold">•</span>
          <span className="text-xs font-black tracking-widest text-amber-300 uppercase">
            NEXUS VERITATIS
          </span>
        </div>

        {/* Minimal Live Dot */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">LIVE</span>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA: SWITCHABLE 3 VIEWS (CLEAN & SIMPLE)              */}
      {/* =================================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 sm:px-16 min-h-0 py-2">
        {/* ----------------------------------------------------------------- */}
        {/* VIEW 1: ESPERANZA FESTIVAL PROMO (CONTINUOUS ANIMATING TEXT)       */}
        {/* ----------------------------------------------------------------- */}
        {resolvedView === 'AD' && (
          <div className="relative w-full flex-1 flex flex-col items-center justify-center animate-fade-in py-6">
            {/* Ambient Pulsing Backlight Halo */}
            <motion.div
              animate={{
                scale: [0.92, 1.25, 0.92],
                opacity: [0.35, 0.75, 0.35],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute w-[500px] sm:w-[850px] md:w-[1100px] h-[250px] sm:h-[400px] bg-gradient-to-r from-amber-500/25 via-yellow-400/40 to-amber-600/25 rounded-full blur-[130px] pointer-events-none -z-10"
            />

            {/* Continuous Floating Container */}
            <motion.div
              animate={{
                y: [-10, 10, -10],
              }}
              transition={{
                duration: 5.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative flex flex-col items-center justify-center text-center space-y-4 sm:space-y-7 px-4 select-none"
            >
              {/* Continuous Shimmering Main Title */}
              <motion.h1
                animate={{
                  backgroundPosition: ['0% 50%', '200% 50%'],
                  scale: [1, 1.025, 1],
                }}
                transition={{
                  backgroundPosition: {
                    duration: 6,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                  scale: {
                    duration: 4.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }}
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #FDE68A 0%, #F59E0B 20%, #FFFBEB 45%, #FDE68A 65%, #D97706 85%, #FDE68A 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                className="text-6xl sm:text-8xl md:text-9xl lg:text-[10.5rem] font-black uppercase tracking-tight leading-none drop-shadow-2xl"
              >
                ESPERANZA 9.0
              </motion.h1>

              {/* Continuous Breathing Subtitle */}
              <motion.div
                animate={{
                  opacity: [0.8, 1, 0.8],
                  letterSpacing: ['0.25em', '0.42em', '0.25em'],
                  textShadow: [
                    '0 0 20px rgba(245, 158, 11, 0.3)',
                    '0 0 50px rgba(245, 158, 11, 0.75)',
                    '0 0 20px rgba(245, 158, 11, 0.3)',
                  ],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase text-amber-300 drop-shadow-xl"
              >
                NEXUS VERITATIS
              </motion.div>
            </motion.div>
          </div>
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
        {/* VIEW 3: OFFICIAL RESULTS VICTORY POSTER (CLEAN & STAGGERED BARS)  */}
        {/* ----------------------------------------------------------------- */}
        {resolvedView === 'RESULT' && (
          <div
            key={displayPoster?.competition_id || autoIndex}
            className="w-full max-w-5xl flex flex-col items-center justify-center space-y-6 animate-fade-in py-2"
          >
            {/* Clean Program Header */}
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center space-y-1"
            >
              <div className="text-xs sm:text-sm font-black tracking-[0.25em] text-amber-400 uppercase">
                OFFICIAL RESULT {autoPosterInfo ? `(${autoPosterInfo.current} / ${autoPosterInfo.total})` : ''}
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white drop-shadow-lg">
                {displayPoster?.competition_name || 'Competition'}
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-widest block">
                {displayPoster?.programme_group || 'GENERAL'} • {displayPoster?.participation_type || 'INDIVIDUAL'}
              </span>
            </motion.div>

            {/* Victory Podium Columns with Physical Rising Pedestals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full max-w-4xl items-end pt-3 pb-2">
              {/* ----------------------------------------------------------- */}
              {/* 🥈 SECOND PLACE (Rises SECOND at delay: 0.95s)              */}
              {/* ----------------------------------------------------------- */}
              {(() => {
                const w2 = displayPoster?.winners?.find((w: any) => Number(w.position) === 2);
                const isRivaya = (w2?.team_name || w2?.team_code || '').toUpperCase().includes('RIVAYA');
                const badgeColor = isRivaya ? '#881337' : '#0D472D';
                const borderColor = isRivaya ? 'border-rose-400/30' : 'border-emerald-400/30';

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 120 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 16,
                      stiffness: 85,
                      delay: 0.95,
                    }}
                    className="flex flex-col items-center w-full order-2 md:order-1"
                  >
                    <div className="w-full p-5 rounded-2xl bg-[#0A0A0A]/90 border border-slate-300/30 shadow-xl flex flex-col items-center text-center space-y-2 backdrop-blur-md">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black flex items-center justify-center font-black text-xl shadow">
                        🥈
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-white truncate max-w-full">
                        {w2?.participant_name || 'Contestant'}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase text-white shadow border ${borderColor}`}
                        style={{ backgroundColor: badgeColor }}
                      >
                        {w2?.team_name || (isRivaya ? 'Rivaya House' : 'Diraya House')}
                      </span>
                    </div>

                    {/* Rising Pedestal Stand Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 85 }}
                      transition={{
                        delay: 1.0,
                        duration: 0.75,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="w-[85%] rounded-b-xl bg-gradient-to-b from-slate-700 to-[#120d08] border-x border-b border-slate-400/30 shadow-xl flex items-center justify-center overflow-hidden"
                    >
                      <span className="text-3xl font-black text-slate-200">2</span>
                    </motion.div>
                  </motion.div>
                );
              })()}

              {/* ----------------------------------------------------------- */}
              {/* 🥇 FIRST PLACE (CHAMPION: Rises FIRST at delay: 0.15s)      */}
              {/* ----------------------------------------------------------- */}
              {(() => {
                const w1 = displayPoster?.winners?.find((w: any) => Number(w.position) === 1);
                const isRivaya = (w1?.team_name || w1?.team_code || '').toUpperCase().includes('RIVAYA');
                const badgeColor = isRivaya ? '#881337' : '#0D472D';
                const borderColor = isRivaya ? 'border-rose-400/40' : 'border-emerald-400/40';

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 150, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      type: 'spring',
                      damping: 14,
                      stiffness: 80,
                      delay: 0.15,
                    }}
                    className="flex flex-col items-center w-full order-1 md:order-2 md:-translate-y-2 z-20"
                  >
                    <div className="w-full p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-[#0A0A0A] via-[#0A0A0A] to-[#040404] border-2 border-amber-400 shadow-2xl shadow-amber-500/25 flex flex-col items-center text-center space-y-3 backdrop-blur-md">
                      <motion.div
                        animate={{ y: [-3, 3, -3] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/30 border border-white/[0.08]"
                      >
                        🏆
                      </motion.div>
                      <h3 className="text-2xl sm:text-4xl font-black text-white drop-shadow">
                        {w1?.participant_name || 'Champion Contestant'}
                      </h3>
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-black uppercase text-white shadow-lg border ${borderColor}`}
                        style={{ backgroundColor: badgeColor }}
                      >
                        {w1?.team_name || (isRivaya ? 'Rivaya House' : 'Diraya House')}
                      </span>
                    </div>

                    {/* Champion Rising Pedestal Stand Bar (Highest) */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 135 }}
                      transition={{
                        delay: 0.2,
                        duration: 0.85,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="w-[88%] rounded-b-2xl bg-gradient-to-b from-amber-800 via-[#0A0A0A] to-[#120d08] border-x-2 border-b-2 border-amber-400 shadow-2xl shadow-amber-500/20 flex items-center justify-center overflow-hidden"
                    >
                      <span className="text-5xl font-black text-amber-300 drop-shadow">1</span>
                    </motion.div>
                  </motion.div>
                );
              })()}

              {/* ----------------------------------------------------------- */}
              {/* 🥉 THIRD PLACE (Rises THIRD at delay: 1.75s)                */}
              {/* ----------------------------------------------------------- */}
              {(() => {
                const w3 = displayPoster?.winners?.find((w: any) => Number(w.position) === 3);
                const isRivaya = (w3?.team_name || w3?.team_code || '').toUpperCase().includes('RIVAYA');
                const badgeColor = isRivaya ? '#881337' : '#0D472D';
                const borderColor = isRivaya ? 'border-rose-400/30' : 'border-emerald-400/30';

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 16,
                      stiffness: 85,
                      delay: 1.75,
                    }}
                    className="flex flex-col items-center w-full order-3"
                  >
                    <div className="w-full p-5 rounded-2xl bg-[#0A0A0A]/90 border border-amber-700/40 shadow-xl flex flex-col items-center text-center space-y-2 backdrop-blur-md">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-white flex items-center justify-center font-black text-xl shadow">
                        🥉
                      </div>
                      <h4 className="text-xl sm:text-2xl font-black text-white truncate max-w-full">
                        {w3?.participant_name || 'Contestant'}
                      </h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase text-white shadow border ${borderColor}`}
                        style={{ backgroundColor: badgeColor }}
                      >
                        {w3?.team_name || (isRivaya ? 'Rivaya House' : 'Diraya House')}
                      </span>
                    </div>

                    {/* Rising Pedestal Stand Bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 55 }}
                      transition={{
                        delay: 1.8,
                        duration: 0.75,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="w-[85%] rounded-b-xl bg-gradient-to-b from-amber-950 to-[#120d08] border-x border-b border-amber-700/40 shadow-xl flex items-center justify-center overflow-hidden"
                    >
                      <span className="text-2xl font-black text-amber-500">3</span>
                    </motion.div>
                  </motion.div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* MINIMAL BOTTOM BAR                                                  */}
      {/* =================================================================== */}
      <footer className="relative z-10 flex items-center justify-between px-8 sm:px-14 py-3 shrink-0 text-xs font-bold text-slate-500">
        <span className="tracking-widest uppercase text-amber-400/70">
          ESPERANZA 9.0 • STAGE BROADCAST
        </span>
        <button
          onClick={toggleFullscreen}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-white/[0.08]"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Fullscreen</span>
        </button>
      </footer>
    </div>
  );
};
