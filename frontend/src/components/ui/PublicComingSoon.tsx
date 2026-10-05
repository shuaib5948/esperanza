import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Lock,
  ArrowLeft
} from 'lucide-react';
import posterImg from '../../assets/esperanza-poster.jpg';

export interface PublicComingSoonProps {
  showBackButton?: boolean;
}

export const PublicComingSoon: React.FC<PublicComingSoonProps> = ({
  showBackButton = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  const tickerItems = Array.from({ length: 14 }, () => 'COMING SOON');

  return (
    <div className="h-screen max-h-[100dvh] w-screen max-w-full bg-[#070908] text-white flex flex-col justify-between overflow-hidden relative font-bento select-none">
      {/* Ambient Background Gold Bokeh Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-black/80 pointer-events-none" />

      {/* 1. TOP BAR */}
      <header className="w-full z-20 px-4 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Sparkles className="w-3.5 h-3.5 text-slate-950 font-bold" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-black text-xs sm:text-sm tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
              ESPERANZA 9.0
            </span>
            <span className="hidden sm:inline-block text-[9px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold uppercase tracking-wider">
              Nexus Veritatis
            </span>
          </div>
        </div>

        {/* Right Navigation */}
        <div className="flex items-center gap-2">
          {showBackButton && !isHomePage && (
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </button>
          )}

          <Link
            to="/login"
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-md shadow-amber-500/20 transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Portal Login</span>
          </Link>
        </div>
      </header>

      {/* 2. CENTER HERO (Matched to HomePage Max-Width & Container Spacing) */}
      <main className="flex-1 w-full max-w-5xl sm:max-w-6xl mx-auto px-4 sm:px-8 py-2 sm:py-3 flex flex-col items-center justify-center min-h-0 overflow-hidden relative z-10 space-y-3 sm:space-y-4">
        
        {/* Compact Scaled Poster Card */}
        <div className="h-full max-h-[50vh] sm:max-h-[54vh] md:max-h-[56vh] w-auto max-w-full flex items-center justify-center min-h-0">
          <div className="relative h-full max-h-full w-auto max-w-full rounded-2xl sm:rounded-3xl overflow-hidden p-1 bg-gradient-to-b from-amber-400/40 via-yellow-500/15 to-amber-950/20 border border-amber-500/40 shadow-2xl shadow-amber-500/15 group flex items-center justify-center">
            <img
              src={posterImg}
              alt="Esperanza 9.0 Inter Campus Fest - Nexus Veritatis"
              className="h-full max-h-full w-auto max-w-full object-contain rounded-xl sm:rounded-2xl transition-transform duration-500 group-hover:scale-[1.005]"
            />
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-white/20 pointer-events-none" />
          </div>
        </div>

        {/* Full-Width Ticker (Seamless Borderless Ribbon with Edge Gradients) */}
        <div className="w-full relative overflow-hidden rounded-2xl py-1.5 sm:py-2 shrink-0">
          {/* Edge Fade Gradients matching Homescreen */}
          <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-[#070908] to-transparent" />
          <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-[#070908] to-transparent" />

          <div className="animate-ticker flex items-center">
            {[...tickerItems, ...tickerItems].map((text, idx) => (
              <div key={idx} className="flex items-center gap-2.5 px-5 sm:px-6 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="text-xs font-black tracking-widest text-amber-300 uppercase whitespace-nowrap">
                  {text}
                </span>
                <span className="text-amber-500/50 text-xs font-bold ml-3">•</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* 3. FOOTER (Matching Container Spacing) */}
      <footer className="w-full z-20 px-4 sm:px-8 py-2 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 font-semibold">
          <span className="text-amber-400 font-bold">Project Council.</span>
          <span>ESPERANZA 9.0</span>
        </div>
        <div className="text-[9px] sm:text-[10px] text-slate-400 tracking-wide font-medium">
          ASHARIYYA DA'WA STUDENTS ASSOCIATION
        </div>
      </footer>
    </div>
  );
};
