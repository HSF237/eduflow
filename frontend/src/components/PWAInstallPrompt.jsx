import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, MoreHorizontal } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSChrome, setIsIOSChrome] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed as PWA)
    const isInStandaloneMode = () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isInStandaloneMode()) {
      setIsStandalone(true);
      return;
    }

    // Check for iOS and browser variant (Safari vs Chrome for iOS)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isIosChromeBrowser = isIosDevice && /crios/.test(userAgent);

    setIsIOS(isIosDevice);
    setIsIOSChrome(isIosChromeBrowser);

    // Don't show again if dismissed within the last 24 hours
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed');
    if (dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000) {
      return;
    }

    // Handle beforeinstallprompt for Android/Chrome/Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt for iOS users if not dismissed
    if (isIosDevice && !dismissedTime) {
      setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString());
  };

  // Do not render anything if already installed as standalone app or prompt not ready
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          title="Dismiss"
          aria-label="Dismiss installation prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/30">
            <Smartphone className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 pr-4">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              Install EduSphere App
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] uppercase font-extrabold rounded-full tracking-wider border border-indigo-500/30">
                Recommended
              </span>
            </h3>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              Add EduSphere to your Home Screen for faster access, instant updates, and full app capabilities!
            </p>

            {isIOS ? (
              <div className="mt-3 p-3 bg-slate-800/80 rounded-xl text-xs text-slate-200 space-y-2 border border-slate-700">
                {isIOSChrome ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-400">1.</span> Tap the <strong className="text-white">Share</strong> <Share className="w-3.5 h-3.5 inline text-blue-400" /> or <strong className="text-white">Menu</strong> <MoreHorizontal className="w-3.5 h-3.5 inline text-slate-300" /> icon in Chrome.
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-400">2.</span> Tap <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-400" />.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-400">1.</span> Tap the <strong className="text-white">Share</strong> button <Share className="w-3.5 h-3.5 inline text-blue-400" /> below in Safari.
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-indigo-400">2.</span> Select <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-400" />.
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/40"
                >
                  <Download className="w-4 h-4" />
                  Install App Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2.5 text-xs text-slate-400 hover:text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Later
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
