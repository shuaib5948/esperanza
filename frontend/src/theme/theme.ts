/**
 * Global Festival Design System & Theme Configuration
 * Esperanza 2026 - Official Golden Luxury Identity
 * 
 * To switch the entire platform's color palette (e.g. to Emerald, Royal Ruby, or Sapphire),
 * modify the color codes and class presets here.
 */

export const THEME = {
  // Brand Hex Codes (useful for Canvas, SVG gradients, and dynamic inline charts)
  colors: {
    primary: '#F59E0B',         // Amber 500 (Main Festival Gold)
    primaryLight: '#FDE68A',    // Amber 200 (Champagne / Pale Gold)
    primaryHover: '#D97706',    // Amber 600
    primaryDark: '#B45309',     // Amber 700 (Deep Bronze Amber)
    primaryDeep: '#78350F',     // Amber 900 (Rich Typography Gold)
    
    // Backgrounds & Canvas
    darkBg: '#020617',          // Slate 950 (Dark Charcoal Landing Background)
    champagneCanvas: '#FFFFC5', // Festival Poster Pale Yellow
    warmWhite: '#FCFBF7',       // Soft off-white
    
    // Contingent / Battle Colors (Diraya Emerald vs Rivaya Crimson)
    diraya: '#00E676',          // Team 1 (Glowing Emerald Green)
    rivaya: '#FF2A6D',          // Team 2 (Glowing Crimson Burgundy)
    
    // Real-Time Telemetry
    telemetryPulse: '#10B981',  // Emerald Green for Live Radar Signals
    // Dark Luxury Bronze & Poster Tones
    darkBronze: '#0A0A0A',      // Deep roasted coffee bronze
    darkBronzeMid: '#0A0A0A',   // Espresso bronze
    posterDark: '#040404',      // Festival noir background
  },

  // Ready-to-use Tailwind class presets across platform UI components
  classes: {
    // Buttons & CTAs
    primaryBtn:
      'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold shadow-md shadow-amber-500/20 focus:ring-amber-400',
    secondaryBtn:
      'bg-[#121212] hover:bg-[#1a1a1a] text-slate-200 border border-white/[0.08] hover:border-white/20 focus:ring-amber-500/40 shadow-xs',

    // Global Header & Navbar Avatars
    avatarCircle:
      'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black',

    // Sidebar & Navigation
    activeTab:
      'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold shadow-xs',
    activeIndicator:
      'bg-amber-500',
    inactiveTab:
      'text-slate-400 hover:text-white hover:bg-white/5',
    
    // Badges & Status Chips
    badgeInactive:
      'bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold',
    badgeActive:
      'bg-black/10 text-slate-950 font-bold',
    lotBadge:
      'bg-gradient-to-br from-[#0A0A0A] via-[#0A0A0A] to-[#040404] text-amber-300 border border-amber-500/30 font-black shadow-xs',

    // Shimmering Golden Title & Numbers
    goldTextGradient:
      'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 font-black',

    // Bento Hero KPI Tiles (Dark Luxury Bronze Brown & Poster Gold Gradient)
    heroCard:
      'bg-gradient-to-br from-[#0A0A0A] via-[#0A0A0A] to-[#040404] text-white border border-amber-500/30 shadow-lg shadow-amber-950/20',
    heroCardSubtle:
      'bg-gradient-to-br from-[#0A0A0A] via-[#0A0A0A] to-[#040404] text-white border border-amber-500/30 shadow-md shadow-amber-950/15',

    // Form inputs & borders
    inputFocusRing:
      'focus:border-amber-500 focus:ring-amber-500/30',
  },
} as const;

export type ThemeConfig = typeof THEME;
