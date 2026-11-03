import React from 'react';

export const DynamicHeroBackdrop: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-[#040404]">
      {/* 1. Deep Atmospheric Dark Base Canvas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 120% 90% at 50% 30%, #121212 0%, #080808 50%, #040404 100%)',
        }}
      />

      {/* 2. Top-Center/Right Soft Golden Amber Glow Spot (Exact Peak at x: 55%, y: 8% from poster) */}
      <div
        className="absolute top-[5%] left-[50%] sm:left-[55%] -translate-x-1/2 w-[22rem] h-[18rem] sm:w-[32rem] sm:h-[26rem] rounded-full blur-[60px] sm:blur-[80px] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(220, 156, 48, 0.5) 0%, rgba(180, 115, 28, 0.22) 38%, transparent 70%)',
        }}
      />

      {/* 3. Mid-Right Warm Amber Ambient Glow Spot (Exact Peak at x: 88%, y: 58% from poster) */}
      <div
        className="absolute top-[50%] -right-12 sm:right-[4%] -translate-y-1/2 w-[20rem] h-[20rem] sm:w-[28rem] sm:h-[28rem] rounded-full blur-[65px] sm:blur-[85px] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(218, 154, 48, 0.42) 0%, rgba(160, 95, 20, 0.18) 40%, transparent 72%)',
        }}
      />

      {/* 4. Very Subtle Soft Ambient Backlight Directly Behind ESPERANZA Title */}
      <div
        className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] sm:w-[42rem] h-[14rem] sm:h-[18rem] rounded-full blur-[50px] sm:blur-[70px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse, rgba(220, 156, 48, 0.2) 0%, rgba(180, 115, 28, 0.08) 45%, transparent 75%)',
        }}
      />

      {/* 5. Minimal, Ultra-Subtle Golden Dotted Matrix Accent (Right Side, Soft & Non-Intrusive) */}
      <div
        className="absolute top-6 right-6 sm:right-12 w-48 sm:w-64 h-48 sm:h-64 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(220, 156, 48, 0.8) 1.2px, transparent 1.2px)',
          backgroundSize: '16px 16px',
          maskImage:
            'radial-gradient(circle at 75% 25%, black 20%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(circle at 75% 25%, black 20%, transparent 70%)',
        }}
      />

      {/* 6. Soft Edge Fades for Seamless Navigation and Section Bleed */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#0a0805] via-[#0a0805]/60 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0a0805] via-[#0a0805]/80 to-transparent pointer-events-none" />
    </div>
  );
};
