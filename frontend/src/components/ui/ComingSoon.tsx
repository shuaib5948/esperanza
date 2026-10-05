import React from 'react';
import { Sparkles } from 'lucide-react';

export interface ComingSoonProps {
  /** Main feature or tab title (e.g. "Live Leaderboard", "Reports & CSV Export") */
  title?: string;
  /** Simple concise subtitle */
  subtitle?: string;
  /** Status badge text */
  badgeText?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title = 'Coming Soon',
  subtitle = 'This module is scheduled for the upcoming phase.',
  badgeText = 'COMING SOON',
}) => {
  return (
    <div className="w-full flex-1 min-h-[360px] rounded-[24px] bg-gradient-to-br from-[#0D472D] via-[#0A3B25] to-[#062919] text-white p-6 sm:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden flex flex-col items-center justify-center text-center font-bento select-none">
      {/* Ambient Glows */}
      <div className="absolute -top-16 -left-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto flex flex-col items-center relative z-10 space-y-4">
        {/* Glowing Icon & Badge */}
        <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-300 border border-white/20 flex items-center justify-center shadow-inner backdrop-blur-md">
          <Sparkles className="w-6 h-6 text-emerald-300 animate-pulse" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{badgeText}</span>
        </div>

        {/* Title & Simple Subtitle */}
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-emerald-100/80 max-w-sm mx-auto font-medium leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};
