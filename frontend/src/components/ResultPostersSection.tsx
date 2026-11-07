import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Download, Trophy, Loader2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';
import { useToast } from '../context/ToastContext.js';
import { FestivalBokehField } from './ui/FestivalBokehField.js';
import { OfficialResultPosterCard } from './OfficialResultPosterCard.js';
import { downloadPosterImage } from '../utils/posterDownload.js';

export interface PosterCardItem {
  id?: number;
  competition_id?: number;
  competition_name?: string;
  programme_group?: string;
  programme_number?: number | string;
  participation_type?: string;
  winners?: any[];
  imageUrl?: string;
  title?: string;
}

// -----------------------------------------------------------------------------
// Official Esperanza 9.0 Default Sample Results Matching Custom Template
// -----------------------------------------------------------------------------
export const DEFAULT_SAMPLE_POSTERS: PosterCardItem[] = [
  {
    competition_id: 1,
    competition_name: 'Madh Song',
    programme_group: 'Junior',
    winners: [
      { position: 1, participant_name: 'Muhammed Ali', team_name: 'Rivaya' },
      { position: 2, participant_name: 'Ahmed Raza', team_name: 'Diraya' },
      { position: 3, participant_name: 'Bilal Perumbavoor', team_name: 'Rivaya' },
    ],
  },
  {
    competition_id: 2,
    competition_name: 'Quiz',
    programme_group: 'Senior',
    winners: [
      { position: 1, participant_name: 'House Diraya', team_name: 'Diraya', is_group: true, group_members: 'Farhan & Zayan' },
      { position: 2, participant_name: 'House Rivaya', team_name: 'Rivaya', is_group: true, group_members: 'Hafiz & Adil' },
    ],
  },
  {
    competition_id: 3,
    competition_name: 'Elocution',
    programme_group: 'Junior',
    winners: [
      { position: 1, participant_name: 'Zaid Rahman', team_name: 'Rivaya' },
      { position: 2, participant_name: 'Shamil K', team_name: 'Diraya' },
      { position: 3, participant_name: 'Ihsanullah', team_name: 'Diraya' },
    ],
  },
  {
    competition_id: 4,
    competition_name: 'Magazine',
    programme_group: 'General',
    winners: [
      { position: 1, participant_name: 'Editorial Board', team_name: 'Rivaya', is_group: true, group_members: 'Team Rivaya' },
      { position: 2, participant_name: 'Writers Guild', team_name: 'Diraya', is_group: true, group_members: 'Team Diraya' },
    ],
  },
  {
    competition_id: 5,
    competition_name: 'Pencil Drawing',
    programme_group: 'Senior',
    winners: [
      { position: 1, participant_name: 'Rayan Ahmed', team_name: 'Diraya' },
      { position: 2, participant_name: 'Fawaz Bin Ali', team_name: 'Rivaya' },
      { position: 3, participant_name: 'Nihad CP', team_name: 'Rivaya' },
    ],
  },
];

export const FESTIVAL_POSTERS = DEFAULT_SAMPLE_POSTERS;
export const MOCKUP_POSTERS = DEFAULT_SAMPLE_POSTERS;

export const ResultPostersSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  // Fetch real published posters from live screen display endpoint
  const { data } = useQuery({
    queryKey: ['home-result-posters'],
    queryFn: async () => {
      const res = await api.get<any>('/live-screen/display');
      return res.data;
    },
    staleTime: 15000,
  });

  const basePosters = React.useMemo(() => {
    if (data?.result_posters && data.result_posters.length > 0) {
      return data.result_posters;
    }
    return DEFAULT_SAMPLE_POSTERS;
  }, [data?.result_posters]);

  const baseCount = basePosters.length;
  const loopedPosters = React.useMemo(
    () => [...basePosters, ...basePosters, ...basePosters],
    [basePosters]
  );

  // Start in the middle set of the triplicated loop
  const [currentIndex, setCurrentIndex] = useState(baseCount);
  const [selectedPoster, setSelectedPoster] = useState<PosterCardItem | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);

  const { success, error: toastError } = useToast();
  const [isAllResultsOpen, setIsAllResultsOpen] = useState(false);
  const [resultsSearch, setResultsSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | string | null>(null);

  const handleDownload = async (poster: PosterCardItem) => {
    const id = poster.competition_id || poster.id || poster.competition_name || 'poster';
    try {
      setDownloadingId(id);
      await downloadPosterImage(poster);
      success('Poster downloaded successfully!');
    } catch (err: any) {
      console.error('Download error:', err);
      toastError('Could not download poster. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredPublishedPosters = React.useMemo(() => {
    if (!resultsSearch.trim()) return basePosters;
    const q = resultsSearch.toLowerCase().trim();
    return basePosters.filter((p: PosterCardItem) => {
      const name = (p.competition_name || '').toLowerCase();
      const group = (p.programme_group || '').toLowerCase();
      const winners = (p.winners || [])
        .map((w: any) => `${w.participant_name || ''} ${w.team_name || ''}`)
        .join(' ')
        .toLowerCase();
      return name.includes(q) || group.includes(q) || winners.includes(q);
    });
  }, [basePosters, resultsSearch]);

  // Window viewport measurement for responsive center offset
  const [windowWidth, setWindowWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute card dimensions dynamically per viewport matching 866px x 1024px ratio
  const getCardDimensions = () => {
    if (windowWidth < 640) {
      const w = Math.min(270, windowWidth - 64);
      const h = Math.round(w * (1024 / 866));
      return { width: w, height: h, gap: 16 };
    }
    if (windowWidth < 1024) {
      const w = 280;
      const h = Math.round(w * (1024 / 866));
      return { width: w, height: h, gap: 20 };
    }
    const w = 310;
    const h = Math.round(w * (1024 / 866));
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
      setCurrentIndex((prev: number) => prev + 1);
    }, 3500);

    return () => clearInterval(interval);
  }, [isInView, selectedPoster, isInteracting]);

  // Handle seamless infinite loop wrap-around without jumps
  const handleAnimationComplete = () => {
    if (currentIndex >= baseCount * 2) {
      setIsTransitioning(false);
      setCurrentIndex((prev: number) => prev - baseCount);
    } else if (currentIndex < baseCount) {
      setIsTransitioning(false);
      setCurrentIndex((prev: number) => prev + baseCount);
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

  const handlePrev = () => setCurrentIndex((prev: number) => prev - 1);
  const handleNext = () => setCurrentIndex((prev: number) => prev + 1);
  const handleDotClick = (dotIndex: number) => setCurrentIndex(baseCount + dotIndex);

  const activeDotIndex = ((currentIndex % baseCount) + baseCount) % baseCount;
  const centerOffsetPx = currentIndex * (cardWidth + gap) + cardWidth / 2;

  return (
    <section
      ref={sectionRef}
      id="results"
      data-alias="result-posters"
      className="relative w-full h-[100dvh] max-h-[100dvh] min-h-[560px] flex flex-col justify-center items-center pt-6 sm:pt-8 md:pt-14 pb-20 md:pb-8 px-4 sm:px-8 bg-transparent overflow-hidden select-none snap-start"
      aria-label="Official Competition Posters"
    >
      {/* Top Seamless Dark Gradient Blend (Connecting Flush with Standings - Behind Content) */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-10 md:h-24 bg-gradient-to-b from-[#040404] via-[#040404]/85 to-transparent z-0" />

      {/* Bottom Seamless Dark Gradient Blend (Connecting Flush with Gallery - Behind Content) */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 md:h-28 bg-gradient-to-t from-[#040404] via-[#040404]/85 to-transparent z-0" />

      {/* Background Volumetric Ambience */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-yellow-600/3 to-transparent blur-[140px] z-0" />

      {/* Floating Festival Bokeh Lights Field */}
      <FestivalBokehField variant="gold" />

      <div className="relative z-10 max-w-6xl mx-auto w-full my-auto space-y-3 sm:space-y-4 md:space-y-5 flex flex-col items-center justify-center">
        {/* ===================================================================
            SECTION TITLE: "RESULT POSTERS"
        =================================================================== */}
        <div className="flex flex-col items-center justify-center text-center pt-1 md:pt-2 mb-1">
          <h2 className="font-display font-black text-lg sm:text-2xl md:text-2xl tracking-[0.24em] uppercase text-white">
            <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">RESULT </span>
            <span className="text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">POSTERS</span>
          </h2>
          <div className="flex items-center justify-center gap-2.5 pt-1.5">
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
            <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
          </div>

          {/* Small "View Results" Button */}
          <button
            type="button"
            onClick={() => setIsAllResultsOpen(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 hover:text-amber-200 border border-amber-400/30 hover:border-amber-400/60 transition-all text-xs font-bold cursor-pointer shadow-xs active:scale-95 group"
            title="View all published result posters"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>View Results</span>
          </button>
        </div>

        {/* ===================================================================
            THE INFINITE LOOP ROTATING CAROUSEL OF PURE POSTER CARDS (2200x2600)
        =================================================================== */}
        <div className="relative w-full py-2 overflow-hidden">
          {/* Side Vignette Fades */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-r from-[#040404] via-[#040404]/80 to-transparent z-40" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-28 bg-gradient-to-l from-[#040404] via-[#040404]/80 to-transparent z-40" />

          {/* Sliding Track Stage with 2200x2600 Proportional Clearance */}
          <div className="relative h-[360px] sm:h-[380px] md:h-[410px] overflow-hidden w-full">
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
              {loopedPosters.map((poster: PosterCardItem, index: number) => {
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
                    key={`${poster.competition_id || poster.id || index}-${index}`}
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
                    <div
                      className={`relative h-full w-full rounded-2xl overflow-hidden transition-all duration-300 ${
                        isCenter
                          ? 'border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35),0_15px_30px_rgba(0,0,0,0.9)]'
                          : 'border border-amber-500/30 shadow-[0_4px_20px_rgba(0,0,0,0.7)]'
                      }`}
                    >
                      <OfficialResultPosterCard poster={poster} className="w-full h-full" />
                      {isCenter && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(poster);
                          }}
                          disabled={downloadingId === (poster.competition_id || poster.id)}
                          className="absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full bg-black/80 hover:bg-black text-amber-300 hover:text-white border border-amber-400/40 hover:border-amber-400 flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-xs active:scale-90"
                          title="Download poster"
                        >
                          {downloadingId === (poster.competition_id || poster.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
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
              className="w-9 h-9 rounded-full bg-black/60 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/200/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Previous poster"
            >
              <ChevronLeft className="w-4 h-4 text-amber-300" />
            </button>

            {/* Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {basePosters.map((_: PosterCardItem, dotIdx: number) => (
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
              className="w-9 h-9 rounded-full bg-black/60 border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/200/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
              title="Next poster"
            >
              <ChevronRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================
          FULLSCREEN POSTER VIEWER MODAL (OFFICIAL RESULT POSTER TEMPLATE)
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

              {/* Exact 866x1024 Aspect Ratio Container (Showing THAT Poster Only) */}
              <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.35),0_20px_50px_rgba(0,0,0,0.9)] max-h-[76vh] w-[310px] sm:w-[390px] md:w-[440px]">
                <OfficialResultPosterCard poster={selectedPoster} />
              </div>

              {/* Action Buttons: Download & Close */}
              <div className="flex items-center justify-center gap-2.5 mt-3.5 w-full">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedPoster)}
                  disabled={downloadingId === (selectedPoster.competition_id || selectedPoster.id)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all shadow-[0_4px_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95 disabled:opacity-60"
                  title="Download poster image"
                >
                  {downloadingId === (selectedPoster.competition_id || selectedPoster.id) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating Image...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-slate-950" />
                      <span>Download Poster</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPoster(null)}
                  className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================================================================
          ALL PUBLISHED RESULTS MODAL (GRID VIEW WITH DOWNLOADS)
      =================================================================== */}
      <AnimatePresence>
        {isAllResultsOpen && (
          <div
            onClick={() => setIsAllResultsOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md select-none"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl bg-[#0A0A0A] border border-white/[0.1] shadow-[0_10px_50px_rgba(0,0,0,0.9)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-white/[0.08] bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Published Results
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-mono font-bold">
                        {basePosters.length} Posters
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Official published results and victory posters for download.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Search Input */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={resultsSearch}
                      onChange={(e) => setResultsSearch(e.target.value)}
                      placeholder="Search competition..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#121212] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition-colors"
                    />
                    {resultsSearch && (
                      <button
                        type="button"
                        onClick={() => setResultsSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setIsAllResultsOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Grid of Posters */}
              <div className="p-4 sm:p-6 overflow-y-auto max-h-[70vh] scrollbar-thin">
                {filteredPublishedPosters.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                    <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
                    <p>No published result posters found matching &ldquo;{resultsSearch}&rdquo;.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {filteredPublishedPosters.map((poster: PosterCardItem, idx: number) => {
                      const pid = poster.competition_id || poster.id || idx;
                      const isCurrentDownloading = downloadingId === pid;

                      return (
                        <div
                          key={`${pid}-${idx}`}
                          className="rounded-2xl bg-[#111111] border border-white/[0.08] hover:border-amber-400/40 p-2.5 flex flex-col justify-between transition-all group shadow-md"
                        >
                          {/* Poster Thumbnail (Click to open in large viewer) */}
                          <div
                            onClick={() => setSelectedPoster(poster)}
                            className="relative w-full rounded-xl overflow-hidden cursor-pointer shadow-inner"
                          >
                            <OfficialResultPosterCard poster={poster} />
                          </div>

                          {/* Card Footer: Download Button */}
                          <div className="pt-2.5 mt-auto">
                            <button
                              type="button"
                              onClick={() => handleDownload(poster)}
                              disabled={isCurrentDownloading}
                              className="w-full py-2 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 hover:border-amber-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
                              title="Download official result poster image"
                            >
                              {isCurrentDownloading ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Downloading...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download Poster</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-3.5 sm:p-4 border-t border-white/[0.08] bg-white/[0.02] text-xs">
                <span className="text-slate-400">
                  Showing <strong className="text-white">{filteredPublishedPosters.length}</strong> of{' '}
                  <strong className="text-amber-400">{basePosters.length}</strong> result posters
                </span>
                <button
                  type="button"
                  onClick={() => setIsAllResultsOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
