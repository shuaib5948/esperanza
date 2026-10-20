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
    
    // Contingent / Battle Colors
    diraya: '#D97706',          // Team 1 (Golden Amber)
    rivaya: '#10B981',          // Team 2 (Emerald)
    
    // Real-Time Telemetry
    telemetryPulse: '#10B981',  // Emerald Green for Live Radar Signals
    // Dark Luxury Bronze & Poster Tones
    darkBronze: '#241407',      // Deep roasted coffee bronze
    darkBronzeMid: '#170d04',   // Espresso bronze
    posterDark: '#070908',      // Festival noir background
  },

  // Ready-to-use Tailwind class presets across platform UI components
  classes: {
    // Buttons & CTAs
    primaryBtn:
      'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold shadow-md shadow-amber-500/20 focus:ring-amber-400',
    secondaryBtn:
      'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/80 focus:ring-slate-400',

    // Global Header & Navbar Avatars
    avatarCircle:
      'bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black',

    // Sidebar & Navigation
    activeTab:
      'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-bold shadow-xs',
    activeIndicator:
      'bg-amber-500',
    inactiveTab:
      'text-slate-600 hover:text-slate-950 hover:bg-amber-50/60',
    
    // Badges & Status Chips
    badgeInactive:
      'bg-amber-50 text-amber-900 border border-amber-200/80 font-bold',
    badgeActive:
      'bg-black/10 text-slate-950 font-bold',
    lotBadge:
      'bg-gradient-to-br from-[#241407] via-[#170d04] to-[#070908] text-amber-300 border border-amber-500/35 font-black shadow-xs',

    // Shimmering Golden Title & Numbers
    goldTextGradient:
      'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 font-black',

    // Bento Hero KPI Tiles (Dark Luxury Bronze Brown & Poster Gold Gradient)
    heroCard:
      'bg-gradient-to-br from-[#241407] via-[#170d04] to-[#070908] text-white border border-amber-500/35 shadow-lg shadow-amber-950/20',
    heroCardSubtle:
      'bg-gradient-to-br from-[#241407] via-[#170d04] to-[#070908] text-white border border-amber-500/30 shadow-md shadow-amber-950/15',

    // Form inputs & borders
    inputFocusRing:
      'focus:border-amber-500 focus:ring-amber-500/30',
  },
} as const;

export type ThemeConfig = typeof THEME;
