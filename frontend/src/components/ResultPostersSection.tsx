import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FestivalBokehField } from './ui/FestivalBokehField.js';

export interface PosterCardItem {
  id: number;
  imageUrl?: string;
  title?: string;
}

// -----------------------------------------------------------------------------
// Official Esperanza 9.0 Poster Cards (Clean Minimal Blank Cards with Logo Only)
// -----------------------------------------------------------------------------
export const FESTIVAL_POSTERS: PosterCardItem[] = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
  { id: 6 },
];

// Backwards-compatible alias for any external references
export const MOCKUP_POSTERS = FESTIVAL_POSTERS;

// Triplicated posters array for infinite seamless looping
const BASE_POSTERS = FESTIVAL_POSTERS;
const BASE_COUNT = BASE_POSTERS.length;
const LOOPED_POSTERS = [...BASE_POSTERS, ...BASE_POSTERS, ...BASE_POSTERS];

export const ResultPostersSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  // Start in the middle set of the triplicated loop
  const [currentIndex, setCurrentIndex] = useState(BASE_COUNT);
  const [selectedPoster, setSelectedPoster] = useState<PosterCardItem | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Window viewport measurement for responsive center offset
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute card dimensions dynamically per viewport matching 2200px x 2600px ratio (22:26)
  const getCardDimensions = () => {
    if (windowWidth < 640) {
      const w = Math.min(290, windowWidth - 56);
      const h = Math.round(w * (2600 / 2200));
      return { width: w, height: h, gap: 16 };
    }
    if (windowWidth < 1024) {
      const w = 330;
      const h = Math.round(w * (2600 / 2200));
      return { width: w, height: h, gap: 20 };
    }
    const w = 380;
    const h = Math.round(w * (2600 / 2200));
    return { width: w, height: h, gap: 24 };
  };

  const { width: cardWidth, height: cardHeight, gap } = getCardDimensions();

  // IntersectionObserver: auto-scroll only when visible
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(entry.isIntersecting && entry.intersectionRatio >= 0.15);
      },
      { threshold: [0, 0.15, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll loop every 3.5s
  useEffect(() => {
    if (!isInView || selectedPoster || isInteracting) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, [isInView, selectedPoster, isInteracting]);

  // Handle seamless infinite loop wrap-around without jumps
  const handleAnimationComplete = () => {
    if (currentIndex >= BASE_COUNT * 2) {
      setIsTransitioning(false);
      setCurrentIndex((prev) => prev - BASE_COUNT);
    } else if (currentIndex < BASE_COUNT) {
      setIsTransitioning(false);
      setCurrentIndex((prev) => prev + BASE_COUNT);
    }
  };

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedPoster(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePrev = () => setCurrentIndex((prev) => prev - 1);
  const handleNext = () => setCurrentIndex((prev) => prev + 1);
  const handleDotClick = (dotIndex: number) => setCurrentIndex(BASE_COUNT + dotIndex);

  const activeDotIndex = ((currentIndex % BASE_COUNT) + BASE_COUNT) % BASE_COUNT;
  const centerOffsetPx = currentIndex * (cardWidth + gap) + cardWidth / 2;

  return (
    <section
      ref={sectionRef}
      id="results"
      data-alias="result-posters"
      className="relative w-full h-[100dvh] max-h-[100dvh] min-h-[560px] flex flex-col justify-center items-center py-4 md:py-16 px-4 sm:px-8 pb-20 md:pb-16 bg-transparent overflow-hidden select-none snap-start"
      aria-label="Official Competition Posters"
    >
      {/* Top Seamless Dark Gradient Blend (Connecting Flush with Standings - Behind Content) */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-12 md:h-48 bg-gradient-to-b from-[#070503] via-[#070503]/85 to-transparent z-0" />

      {/* Bottom Seamless Dark Gradient Blend (Connecting Flush with Gallery - Behind Content) */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-12 md:h-48 bg-gradient-to-t from-[#070503] via-[#070503]/85 to-transparent z-0" />

      {/* Background Volumetric Ambience */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-yellow-600/3 to-transparent blur-[140px] z-0" />

      {/* Floating Festival Bokeh Lights Field */}
      <FestivalBokehField variant="gold" />

      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto space-y-4 md:space-y-8 flex flex-col items-center justify-center">
        {/* ===================================================================
            SECTION TITLE: "RESULT POSTERS"
        =================================================================== */}
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="font-display font-black text-lg sm:text-2xl md:text-2xl tracking-[0.24em] uppercase text-white">
            <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">RESULT </span>
            <span className="text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">POSTERS</span>
          </h2>
          <div className="flex items-center justify-center gap-2.5 pt-1.5">
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
            <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
          </div>
        </div>

        {/* ===================================================================
            THE INFINITE LOOP ROTATING CAROUSEL OF PURE POSTER CARDS (2200x2600)
        =================================================================== */}
        <div className="relative w-full py-2 overflow-hidden">
          {/* Side Vignette Fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-r from-[#070503] via-[#070503]/80 to-transparent z-40" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-l from-[#070503] via-[#070503]/80 to-transparent z-40" />

          {/* Sliding Track Stage with 2200x2600 Proportional Clearance */}
          <div className="relative h-[390px] sm:h-[450px] md:h-[510px] overflow-hidden w-full">
            <motion.div
              className="flex items-center absolute top-0 bottom-0 left-1/2 my-auto"
              animate={{
                x: -centerOffsetPx,
              }}
              transition={
                isTransitioning
                  ? { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
                  : { duration: 0 }
              }
              onAnimationComplete={handleAnimationComplete}
              drag="x"
              dragElastic={0.12}
              dragSnapToOrigin={true}
              onDragStart={() => setIsInteracting(true)}
              onDragEnd={(_e, info) => {
                setIsInteracting(false);
                if (info.offset.x < -35 || info.velocity.x < -250) {
                  handleNext();
                } else if (info.offset.x > 35 || info.velocity.x > 250) {
                  handlePrev();
                }
              }}
            >
              {LOOPED_POSTERS.map((poster, index) => {
                const distance = Math.abs(index - currentIndex);
                const isCenter = distance === 0;
                const isAdjacent = distance === 1;
                const isNear = distance === 2;

                const scale = isCenter
                  ? windowWidth < 640
                    ? 1.02
                    : 1.05
                  : isAdjacent
                  ? 0.82
                  : isNear
                  ? 0.68
                  : 0.55;

                const opacity = isCenter ? 1 : isAdjacent ? 0.55 : isNear ? 0.22 : 0;
                const zIndex = isCenter ? 30 : isAdjacent ? 20 : isNear ? 10 : 0;
                const blurAmount = isCenter ? '0px' : isAdjacent ? '0.4px' : '1.5px';
                const brightnessAmount = isCenter ? 1 : isAdjacent ? 0.72 : 0.45;

                return (
                  <motion.div
                    key={`${poster.id}-${index}`}
                    style={{
                      width: cardWidth,
                      height: cardHeight,
                      marginRight: gap,
                      zIndex,
                    }}
                    animate={{
                      scale,
                      opacity,
                      filter: `brightness(${brightnessAmount}) blur(${blurAmount})`,
                    }}
                    transition={
                      isTransitioning
                        ? { duration: 0.65, ease: [0.22, 1, 0.36, 1] }
                        : { duration: 0 }
                    }
                    onClick={() => {
                      setSelectedPoster(poster);
                    }}
                    className="shrink-0 cursor-pointer select-none transition-all group"
                  >
                    {/* The Pure Poster Card: Sleek 2200x2600 Frame with Official Logo */}
                    <div
                      className={`relative h-full w-full aspect-[22/26] rounded-2xl overflow-hidden transition-all duration-300 p-4 sm:p-5 flex items-center justify-center ${
                        isCenter
                          ? 'border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.3),0_15px_30px_rgba(0,0,0,0.9)] bg-gradient-to-b from-[#181108] via-[#0b0804] to-[#040201]'
                          : 'border border-amber-500/25 shadow-[0_4px_20px_rgba(0,0,0,0.7)] bg-gradient-to-b from-[#120d06] via-[#080502] to-[#030201]'
                      }`}
                    >
                      {/* Clean Geometric Inner Border Inlay matching 2200x2600 Proportion */}
                      <div className="w-full h-full rounded-xl border border-amber-500/20 flex flex-col items-center justify-center relative overflow-hidden bg-black/40">
                        {/* Ambient Radial Golden Glow */}
                        <div className="absolute inset-0 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />

                        {/* Official Esperanza Geometric Logo (Crisp Centered Emblem) */}
                        <img
                          src="/assets/esperanza-logo.png"
                          alt="Esperanza Logo"
                          className={`w-auto object-contain pointer-events-none select-none transition-all duration-500 ${
                            isCenter
                              ? 'h-24 sm:h-28 md:h-32 drop-shadow-[0_0_24px_rgba(245,158,11,0.5)] scale-105'
                              : 'h-16 sm:h-20 md:h-24 drop-shadow-[0_0_12px_rgba(245,158,11,0.25)] opacity-80'
                          }`}
                        />

                        {/* Subtle Corner Accents on Inner Border */}
                        <div className="absolute top-2.5 left-2.5 w-2 h-2 border-t border-l border-amber-400/40" />
                        <div className="absolute top-2.5 right-2.5 w-2 h-2 border-t border-r border-amber-400/40" />
                        <div className="absolute bottom-2.5 left-2.5 w-2 h-2 border-b border-l border-amber-400/40" />
                        <div className="absolute bottom-2.5 right-2.5 w-2 h-2 border-b border-r border-amber-400/40" />

                        {/* Subtle Specular Sheen Sweep on Hover */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Navigation Controls: Prev / Next Buttons & Indicator Dots */}
          <div className="flex items-center justify-between gap-3 pt-4 max-w-sm mx-auto">
            <button
              onClick={handlePrev}
              className="w-9 h-9 rounded-full bg-black/60 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Previous poster"
            >
              <ChevronLeft className="w-4 h-4 text-amber-300" />
            </button>

            {/* Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {BASE_POSTERS.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  onClick={() => handleDotClick(dotIdx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    activeDotIndex === dotIdx
                      ? 'w-6 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                      : 'w-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                  title={`Go to poster ${dotIdx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="w-9 h-9 rounded-full bg-black/60 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Next poster"
            >
              <ChevronRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          FULLSCREEN POSTER VIEWER MODAL (2200x2600 EXACT RATIO • THAT POSTER ONLY)
      =================================================================== */}
      <AnimatePresence>
        {selectedPoster && (
          <div
            onClick={() => setSelectedPoster(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md cursor-pointer select-none"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative max-h-[90vh] flex flex-col items-center cursor-default"
            >
              {/* Floating Close Button */}
              <button
                onClick={() => setSelectedPoster(null)}
                className="absolute -top-12 right-0 sm:-right-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg"
                title="Close viewer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Exact 2200x2600 Aspect Ratio Container (Showing THAT Poster Only) */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.35),0_20px_50px_rgba(0,0,0,0.9)] bg-gradient-to-b from-[#181108] via-[#0b0804] to-[#040201] aspect-[22/26] max-h-[82vh] w-auto flex items-center justify-center p-5 sm:p-8">
                {selectedPoster.imageUrl ? (
                  /* Uploaded Poster Image (Clean Display) */
                  <img
                    src={selectedPoster.imageUrl}
                    alt={selectedPoster.title || 'Esperanza Result Poster'}
                    className="w-full h-full object-contain select-none rounded-xl"
                  />
                ) : (
                  /* Official Blank Poster Card (2200x2600 Frame with Centered Logo Only) */
                  <div className="w-full h-full rounded-xl sm:rounded-2xl border border-amber-500/25 flex flex-col items-center justify-center relative overflow-hidden bg-black/50 p-6 min-w-[260px] sm:min-w-[340px]">
                    {/* Ambient Radial Golden Glow */}
                    <div className="absolute inset-0 bg-radial from-amber-500/15 via-transparent to-transparent pointer-events-none" />

                    {/* Official Centered Emblem Logo */}
                    <img
                      src="/assets/esperanza-logo.png"
                      alt="Esperanza Emblem"
                      className="h-32 sm:h-44 md:h-52 w-auto object-contain pointer-events-none select-none drop-shadow-[0_0_30px_rgba(245,158,11,0.55)]"
                    />

                    {/* Corner Accents on Inner Border */}
                    <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-amber-400/60" />
                    <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-amber-400/60" />
                    <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-amber-400/60" />
                    <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-amber-400/60" />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
