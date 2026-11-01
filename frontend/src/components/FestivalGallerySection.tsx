'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Sparkles } from 'lucide-react';

export interface GalleryPhoto {
  id: number;
  imageUrl: string;
  title: string;
}

// -----------------------------------------------------------------------------
// Official Esperanza 9.0 Gallery Photography (5 Authentic Festival Frames)
// Exact Native Image Resolution: 1024 x 576 (16:9 Widescreen Ratio)
// -----------------------------------------------------------------------------
export const GALLERY_PHOTOS: GalleryPhoto[] = [
  { id: 1, imageUrl: '/gallery/photo-1.jpg', title: 'Written Competitions in Session' },
  { id: 2, imageUrl: '/gallery/photo-2.jpg', title: 'Calligraphy & Fine Arts In Session' },
  { id: 3, imageUrl: '/gallery/photo-3.jpg', title: 'Nocturnal Majlis & Rehearsals' },
  { id: 4, imageUrl: '/gallery/photo-4.jpg', title: 'Stage Oratory & Cultural Delivery' },
  { id: 5, imageUrl: '/gallery/photo-5.jpg', title: 'Grand Examination & Writing Hall' },
];

// Backwards-compatible aliases for external imports
export const ALL_PHOTOS = GALLERY_PHOTOS;
export const ROW_1_PHOTOS = GALLERY_PHOTOS.slice(0, 2);
export const ROW_2_PHOTOS = GALLERY_PHOTOS.slice(2, 5);

// -----------------------------------------------------------------------------
// Pure Visual Lightbox Modal (Exact 16:9 Image Proportions • Zero Text Clutter)
// -----------------------------------------------------------------------------
interface PhotoViewerProps {
  photo: GalleryPhoto;
  allPhotos: GalleryPhoto[];
  onClose: () => void;
  onNavigate: (newPhoto: GalleryPhoto) => void;
}

const PhotoViewerModal: React.FC<PhotoViewerProps> = ({
  photo,
  allPhotos,
  onClose,
  onNavigate,
}) => {
  const currentIndex = allPhotos.findIndex((p) => p.id === photo.id);

  // Keyboard controls: Escape, ArrowLeft, ArrowRight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + allPhotos.length) % allPhotos.length;
    onNavigate(allPhotos[prevIdx]);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % allPhotos.length;
    onNavigate(allPhotos[nextIdx]);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = photo.imageUrl;
    link.download = `ESPERANZA-FRAME-${photo.id}.jpg`;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-2xl select-none cursor-pointer"
    >
      {/* Top Floating Action Controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleDownload}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
          title="Download Photo"
        >
          <Download className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main High-Res Image Card in Exact 16:9 Widescreen Native Ratio */}
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative max-w-5xl max-h-[88vh] flex items-center justify-center p-2 cursor-default"
      >
        <img
          src={photo.imageUrl}
          alt={`Esperanza Festival Frame ${photo.id}`}
          className="max-w-full max-h-[85vh] aspect-[16/9] object-contain rounded-2xl border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.35)] bg-black select-none"
        />

        {/* Previous Photo Button */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:-left-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 border border-amber-500/40 hover:border-amber-400 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-95"
          title="Previous (←)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Next Photo Button */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:-right-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 border border-amber-500/40 hover:border-amber-400 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-xl active:scale-95"
          title="Next (→)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </motion.div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Fluid Layout Glide Gallery Section (Automatic Position Swap Every 4.5s)
// -----------------------------------------------------------------------------
export const FestivalGallerySection: React.FC = () => {
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  // Dynamic photo order state that triggers physical layout glide animations
  const [photoOrder, setPhotoOrder] = useState<GalleryPhoto[]>(GALLERY_PHOTOS);
  const [isPaused, setIsPaused] = useState(false);

  // Automatic Fluid Position Rotation (Swaps positions every 4.5s smoothly)
  useEffect(() => {
    if (isPaused || activePhoto) return;

    const interval = setInterval(() => {
      setPhotoOrder((prev) => {
        const next = [...prev];
        const last = next.pop()!;
        next.unshift(last);
        return next;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, activePhoto]);

  const handleCycleNext = () => {
    setPhotoOrder((prev) => {
      const next = [...prev];
      const last = next.pop()!;
      next.unshift(last);
      return next;
    });
  };

  const handleCyclePrev = () => {
    setPhotoOrder((prev) => {
      const next = [...prev];
      const first = next.shift()!;
      next.push(first);
      return next;
    });
  };

  return (
    <section
      id="gallery"
      className="relative w-full h-[100dvh] max-h-[100dvh] min-h-[560px] flex flex-col justify-center items-center py-4 md:py-6 px-3 sm:px-8 pb-20 md:pb-6 bg-[#070503] overflow-hidden select-none snap-start"
      aria-label="Official Festival Photo Archive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Top Seamless Dark Gradient Blend (Connecting Flush with Posters - Behind Content) */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-10 md:h-48 bg-gradient-to-b from-[#070503] via-[#070503]/85 to-transparent z-0" />

      {/* Bottom Seamless Dark Gradient Blend (Connecting Flush with Footer - Behind Content) */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-10 md:h-48 bg-gradient-to-t from-[#070503] via-[#070503]/85 to-transparent z-0" />

      {/* Background Volumetric Gold Glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[350px] bg-gradient-to-b from-amber-500/10 via-yellow-600/5 to-transparent blur-[150px] z-0" />

      <div className="relative z-10 max-w-3xl sm:max-w-4xl lg:max-w-[880px] mx-auto w-full my-2 md:my-auto flex flex-col justify-center items-center space-y-3 sm:space-y-4">
        {/* Minimal Header with Controls & Progress Pulse */}
        <div className="flex flex-col items-center justify-center text-center">
          <h2 className="font-display font-black text-lg sm:text-2xl md:text-2xl tracking-[0.24em] uppercase text-white">
            <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]">GALLERY </span>
            <span className="text-amber-400 drop-shadow-[0_2px_12px_rgba(245,158,11,0.6)]">ARCHIVE</span>
          </h2>

          <div className="flex items-center justify-center gap-2.5 pt-1.5">
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
            <div className="w-2 h-2 rotate-45 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
            <div className="h-[1px] w-10 sm:w-16 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
          </div>
        </div>

        {/* ===================================================================
            MOBILE VIEW (< sm): 3D RISING STACKED CARD DECK (BOTTOM-UP ANIMATION)
        =================================================================== */}
        <div className="sm:hidden w-full flex flex-col items-center py-2 select-none">
          <div className="relative w-[90vw] max-w-[345px] h-[265px] mx-auto flex items-center justify-center">
            {photoOrder.slice(0, 3).reverse().map((photo, reverseIndex) => {
              // reverseIndex 0 = deepest (bottom), 1 = middle, 2 = top active
              const stackPosition = 2 - reverseIndex;
              const isActive = stackPosition === 0;

              return (
                <motion.div
                  key={photo.id}
                  layout
                  initial={false}
                  animate={{
                    y: stackPosition === 0 ? 0 : stackPosition === 1 ? 24 : 46,
                    scale: stackPosition === 0 ? 1 : stackPosition === 1 ? 0.94 : 0.88,
                    opacity: stackPosition === 0 ? 1 : stackPosition === 1 ? 0.6 : 0.28,
                    zIndex: 30 - stackPosition * 10,
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                  drag={isActive ? true : false}
                  dragElastic={0.2}
                  dragSnapToOrigin={true}
                  onDragEnd={(_e, info) => {
                    if (info.offset.y < -30 || info.offset.x < -30) {
                      handleCycleNext();
                    } else if (info.offset.y > 30 || info.offset.x > 30) {
                      handleCyclePrev();
                    }
                  }}
                  onClick={() => {
                    if (isActive) setActivePhoto(photo);
                    else handleCycleNext();
                  }}
                  className={`absolute inset-x-0 top-0 h-[215px] rounded-2xl overflow-hidden cursor-pointer bg-black transition-shadow duration-300 ${
                    isActive
                      ? 'border border-amber-400/90 shadow-[0_8px_32px_rgba(245,158,11,0.35)]'
                      : 'border border-white/10 shadow-lg pointer-events-auto'
                  }`}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || `Festival Moment ${photo.id}`}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Interactive Golden Dots for Mobile */}
          <div className="flex items-center gap-1.5 pt-4">
            {GALLERY_PHOTOS.map((photo) => (
              <button
                key={photo.id}
                onClick={() => {
                  const targetIdx = photoOrder.findIndex((p) => p.id === photo.id);
                  if (targetIdx > 0) {
                    setPhotoOrder((prev) => {
                      const next = [...prev];
                      const moved = next.splice(targetIdx, 1)[0];
                      next.unshift(moved);
                      return next;
                    });
                  }
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  photoOrder[0].id === photo.id
                    ? 'w-6 bg-amber-400 shadow-[0_0_8px_#F59E0B]'
                    : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
                aria-label={`View photo ${photo.id}`}
              />
            ))}
          </div>
        </div>

        {/* ===================================================================
            DESKTOP VIEW (>= sm): FLUID 5-FRAME MOSAIC GLIDE STAGE
        =================================================================== */}
        <LayoutGroup id="festival-gallery-glide-group">
          <div className="hidden sm:flex flex-col gap-2 sm:gap-3 w-full">
            {/* Top Tier: 2 Large 16:9 Spotlight Frames */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full">
              {photoOrder.slice(0, 2).map((photo) => (
                <motion.div
                  layout
                  layoutId={`gallery-frame-${photo.id}`}
                  key={photo.id}
                  transition={{
                    layout: { duration: 0.95, ease: [0.25, 1, 0.5, 1] },
                  }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActivePhoto(photo)}
                  className="relative w-full aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden border border-amber-500/25 hover:border-amber-400 shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-colors duration-300 group cursor-pointer bg-black select-none"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || `Festival Moment ${photo.id}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-104 pointer-events-none select-none"
                  />

                  {/* Subtle Ambient Hover Glow & Glass Sheen */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-25 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
              ))}
            </div>

            {/* Bottom Tier: 3 Balanced 16:9 Satellites Frames */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full">
              {photoOrder.slice(2, 5).map((photo) => (
                <motion.div
                  layout
                  layoutId={`gallery-frame-${photo.id}`}
                  key={photo.id}
                  transition={{
                    layout: { duration: 0.95, ease: [0.25, 1, 0.5, 1] },
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setActivePhoto(photo)}
                  className="relative w-full aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden border border-amber-500/25 hover:border-amber-400 shadow-[0_4px_20px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-colors duration-300 group cursor-pointer bg-black select-none"
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title || `Festival Moment ${photo.id}`}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none select-none"
                  />

                  {/* Subtle Ambient Hover Glow & Glass Sheen */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-25 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
              ))}
            </div>
          </div>
        </LayoutGroup>

        {/* Minimal Navigation & Live Animation Heartbeat Indicator (Desktop View) */}
        <div className="hidden sm:flex items-center justify-between w-full max-w-xs pt-1">
          <button
            onClick={handleCyclePrev}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:border-amber-400 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Previous swap"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-1.5">
            {GALLERY_PHOTOS.map((p, idx) => (
              <span
                key={p.id}
                className={`h-1 rounded-full transition-all duration-500 ${
                  photoOrder[0].id === p.id
                    ? 'w-4 bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]'
                    : 'w-1 bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleCycleNext}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:border-amber-400 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Next swap"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===================================================================
          FULL HIGH-RES 16:9 LIGHTBOX VIEWER MODAL
      =================================================================== */}
      <AnimatePresence>
        {activePhoto && (
          <PhotoViewerModal
            photo={activePhoto}
            allPhotos={GALLERY_PHOTOS}
            onClose={() => setActivePhoto(null)}
            onNavigate={(newPhoto) => setActivePhoto(newPhoto)}
          />
        )}
      </AnimatePresence>
    </section>
  );
};
