import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';
import { THEME } from '../../theme/theme.js';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
  });

  const isIos =
    typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos && !isStandalone) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  // Do not show if already in standalone app mode, or dismissed, or neither Android prompt nor iOS available
  if (isInstalled || isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  return (
    <>
      {/* Floating Bottom-Right App Install Pill */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-40 animate-in fade-in slide-in-from-bottom-3 duration-300 select-none">
        <div className="flex items-center gap-2 p-1.5 pl-3 rounded-full bg-[#121212]/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl text-white">
          <img
            src="/icons/icon-192x192.png"
            alt="Esperanza Icon"
            className="w-6 h-6 rounded-lg object-contain shadow-xs shrink-0"
          />

          <button
            onClick={handleInstallClick}
            className="text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer pr-1"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Install App</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* iOS "Add to Home Screen" Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowIosGuide(false)}
          />
          <div className="relative w-full max-w-sm bg-[#0A0A0A] rounded-3xl border border-white/[0.12] p-6 text-center space-y-4 z-10 shadow-2xl">
            <img
              src="/icons/icon-192x192.png"
              alt="Esperanza"
              className="w-14 h-14 rounded-2xl mx-auto shadow-lg"
            />
            <div>
              <h3 className="text-base font-black text-white">
                Install Esperanza 9.0
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Install on your iPhone or iPad for a full-screen app experience.
              </p>
            </div>

            <div className="space-y-2.5 text-left bg-[#121212] p-3.5 rounded-2xl border border-white/[0.08] text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span className="flex items-center gap-1.5">
                  Tap the <Share2 className="w-4 h-4 text-amber-400 inline" />{' '}
                  <strong>Share</strong> button in Safari.
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-amber-400/20 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span className="flex items-center gap-1.5">
                  Scroll down & select{' '}
                  <PlusSquare className="w-4 h-4 text-amber-400 inline" />{' '}
                  <strong>Add to Home Screen</strong>.
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className={`w-full py-2.5 rounded-xl ${THEME.classes.primaryBtn} text-xs font-black cursor-pointer shadow-md`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
