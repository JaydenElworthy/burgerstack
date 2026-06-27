'use client'
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Ticket, Wallet, Trophy, ShoppingBag, Star, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // --- PWA INSTALL STATE ---
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // --- UPDATED LOGIC START ---
  useEffect(() => {
    // 1. Function to fetch profile data from Supabase
    const fetchProfile = async (currentUser) => {
      if (!currentUser) return;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (data) setProfile(data);
    };

    // 2. Check initial session on load
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchProfile(user);
      }
    });

    // 3. Listen for Auth Changes (Magic Link clicks, Sign Outs, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // 4. Cleanup listener when user leaves the page
    return () => subscription.unsubscribe();
  }, []);
  // --- UPDATED LOGIC END ---

  // --- PWA INSTALL LOGIC ---
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (localStorage.getItem('pwa_install_dismissed') !== 'true') {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS & Standalone
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    const isInStandaloneMode = ('standalone' in window.navigator) || (window.navigator.standalone);
    setIsIOS(isIosDevice);
    setIsStandalone(isInStandaloneMode);

    if (isIosDevice && !isInStandaloneMode && localStorage.getItem('pwa_install_dismissed') !== 'true') {
      setShowInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (isIOS) {
      alert("To install this app on your iPhone:\n1. Tap the Share button in Safari (at the bottom of the screen)\n2. Select 'Add to Home Screen'.");
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismissPWA = () => {
    localStorage.setItem('pwa_install_dismissed', 'true');
    setShowInstallPrompt(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // No need for window.location.href anymore because the listener above 
    // will detect the sign-out and clear the screen automatically!
  };

  return (
    <div className="p-3 sm:p-6 max-w-md mx-auto h-[100dvh] flex flex-col justify-between bg-[#E55937] text-[#FFE974] font-Gopher-Bold.otf overflow-hidden overscroll-none">
      <header className="py-2 sm:py-6 text-center relative px-2 shrink-0">
        <h2 className="text-[10vw] sm:text-6xl leading-none tracking-tighter text-[#FFE974] font-bold">
          Picnic At Home
        </h2>
        <p className="text-[8px] sm:text-[10px] uppercase font-bold tracking-[0.2em] text-white opacity-80 mt-2">
          Scratch To Win Weekly Prizes <br /> Play & Score 25 Points To Win A Second Scratch Card
        </p>
      </header>

      {/* Points Card */}
      <div className="bg-[#FFE974] text-[#E55937] p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shrink-0 flex justify-between items-center border-4 border-black">
        <div>
          <p className="text-[8px] sm:text-[10px] uppercase font-black opacity-60 tracking-widest text-[#E55937]">My All Time High Score</p>
          <p className="text-4xl sm:text-6xl font-bold italic tracking-tighter leading-none">
            {profile ? profile.high_score : '0'}
          </p>
        </div>
        <div className="bg-[#E55937] text-[#FFE974] p-3 sm:p-4 rounded-full shadow-lg border-2 border-black">
          <Star size={24} className="sm:w-8 sm:h-8" fill="currentColor" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 shrink-0">
        <Link href="/game" className="bg-[#FFE974] border-[3px] sm:border-4 border-black p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col items-center gap-1 sm:gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
          <Gamepad2 size={32} className="sm:w-10 sm:h-10 text-[#E55937]" />
          <span className="font-bold uppercase text-[10px] sm:text-xs text-[#E55937]"> Play To Win</span>
        </Link>
        <Link href="/scratch" className="bg-white border-[3px] sm:border-4 border-black p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] flex flex-col items-center gap-1 sm:gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
          <Ticket size={32} className="sm:w-10 sm:h-10 text-[#E55937]" />
          <span className="font-bold uppercase text-[10px] sm:text-xs text-[#E55937]"> Scratch To Win</span>
        </Link>
      </div>

      <div className="space-y-2 sm:space-y-4 shrink-0">
        <Link href="/wallet" className="w-full bg-[#FFE974] border-[3px] sm:border-4 border-black p-3 sm:p-5 rounded-2xl flex justify-between items-center font-bold uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-[#E55937]">
          <span className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base"><Wallet size={20} />Wallet</span>
          <span>→</span>
        </Link>

        <Link href="/leaderboard" className="w-full bg-[#FFE974] border-[3px] sm:border-4 border-black p-3 sm:p-5 rounded-2xl flex justify-between items-center font-bold uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-[#E55937]">
          <span className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base"><Trophy size={20} /> Leaderboard</span>
          <span>→</span>
        </Link>
      </div>

      <div className="space-y-2 sm:space-y-4 shrink-0 pb-2 sm:pb-0 mt-2 sm:mt-0">
        <a href="https://picnicathome.com" className="w-full bg-black text-[#FFE974] p-4 sm:p-6 rounded-2xl flex justify-center items-center gap-2 sm:gap-4 font-bold uppercase italic text-lg sm:text-2xl shadow-xl">
          <ShoppingBag size={24} /> Order Online
        </a>

        {user ? (
          <button onClick={handleSignOut} className="w-full py-2 sm:py-4 flex justify-center items-center gap-2 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest opacity-40 text-white hover:opacity-100 transition-opacity">
            <LogOut size={14} /> Sign Out
          </button>
        ) : (
          <Link href="/login" className="w-full py-2 sm:py-4 flex justify-center items-center gap-2 font-bold uppercase text-[8px] sm:text-[10px] tracking-widest opacity-80 text-white underline underline-offset-4 hover:opacity-100 transition-opacity">
            <User size={14} /> Sign In To Save Your Wallet
          </Link>
        )}

        {/* ADMIN SHORTCUT (Visible only to admins) */}
        {profile?.is_admin && (
          <Link href="/admin/super" className="w-full border-2 border-dashed border-white/20 p-2 text-center text-[8px] uppercase font-black opacity-20 hover:opacity-100 transition-opacity text-white block mt-2">
            Access Admin Panel
          </Link>
        )}
      </div>

      {/* PWA INSTALL BANNER */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: "-50%" }}
            animate={{ y: 0, opacity: 1, x: "-50%" }}
            exit={{ y: 100, opacity: 0, x: "-50%" }}
            className="fixed bottom-6 left-1/2 w-[90%] max-w-sm bg-[#FFE974] border-4 border-black p-5 rounded-[2rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-[9999] text-[#E55937] flex flex-col gap-3 font-sans"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-2">
                <h3 className="text-lg font-black uppercase italic tracking-tight leading-none mb-1">Add to Home Screen</h3>
                <p className="text-[10px] font-bold text-black/60 uppercase tracking-wider leading-snug">
                  {isIOS 
                    ? 'Tap the Share button ⎋ and select "Add to Home Screen" to install.'
                    : 'Install our mobile app to save your wallet and stack burgers instantly!'}
                </p>
              </div>
              <button onClick={handleDismissPWA} className="text-black/40 hover:text-black font-bold text-xl leading-none p-1">&times;</button>
            </div>
            {!isIOS && (
              <button
                onClick={handleInstallPWA}
                className="w-full bg-black text-[#FFE974] py-3 rounded-xl font-bold uppercase italic text-sm border-2 border-black active:scale-95 transition-transform"
              >
                Install App
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
