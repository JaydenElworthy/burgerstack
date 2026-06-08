'use client'
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Ticket, Wallet, Trophy, ShoppingBag, Star, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // No need for window.location.href anymore because the listener above 
    // will detect the sign-out and clear the screen automatically!
  };

  return (
    <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col bg-[#FDFCF8] overflow-x-hidden text-black font-sans">
      <header className="py-10 text-center relative">
        <h2 className="text-[12vw] sm:text-6xl font-black italic uppercase tracking-tighter leading-[0.8] mb-2">
          NEIGHBOURHOOD<br/><span className="text-red-600">CLUB</span>
        </h2>
        <p className="font-bold uppercase text-[10px] tracking-[0.2em] text-black/40 italic">
          {user ? `Logged in as ${user.email.split('@')[0]}` : "The Daily Drop & Rewards"}
        </p>
      </header>

      {/* Points Card */}
      <div className="bg-black text-[#E5FF44] p-6 rounded-[2.5rem] mb-6 shadow-2xl flex justify-between items-center border-4 border-black">
        <div>
          <p className="text-[10px] uppercase font-black opacity-60 tracking-widest">Personal Best</p>
          <p className="text-5xl font-black italic tracking-tighter leading-none">
            {profile ? profile.high_score : '0'}
          </p>
        </div>
        <div className="bg-[#E5FF44] text-black p-4 rounded-full shadow-lg">
          <Star size={32} fill="currentColor" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/game" className="bg-[#E5FF44] border-4 border-black p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
          <Gamepad2 size={40} />
          <span className="font-black uppercase text-xs text-black">Stack Game</span>
        </Link>
        <Link href="/scratch" className="bg-white border-4 border-black p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
          <Ticket size={40} />
          <span className="font-black uppercase text-xs text-black">Scratch</span>
        </Link>
      </div>

      <div className="space-y-4 mb-10">
        <Link href="/wallet" className="w-full bg-white border-4 border-black p-5 rounded-2xl flex justify-between items-center font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all">
          <span className="flex items-center gap-3"><Wallet size={24}/> My Wallet</span>
          <span>→</span>
        </Link>
        <Link href="/leaderboard" className="w-full bg-white border-4 border-black p-5 rounded-2xl flex justify-between items-center font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all">
          <span className="flex items-center gap-3"><Trophy size={24}/> Leaderboard</span>
          <span>→</span>
        </Link>
      </div>

      <div className="mt-auto space-y-4">
        <a href="#" className="w-full bg-black text-white p-6 rounded-2xl flex justify-center items-center gap-4 font-black uppercase italic text-2xl shadow-xl hover:bg-red-600 transition-colors">
          <ShoppingBag size={28} /> Order Food
        </a>

        {user ? (
          <button onClick={handleSignOut} className="w-full py-4 flex justify-center items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-30 hover:opacity-100 transition-opacity text-black">
            <LogOut size={14} /> Sign Out
          </button>
        ) : (
          <Link href="/login" className="w-full py-4 flex justify-center items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-60 hover:opacity-100 transition-opacity text-black">
            <User size={14} /> Sign In to Save Progress
          </Link>
        )}

        {/* ADMIN SHORTCUT (Visible only to you) */}
        {profile?.is_admin && (
          <Link href="/admin/super" className="w-full border-2 border-dashed border-black/20 p-2 text-center text-[8px] uppercase font-black opacity-20 hover:opacity-100 transition-opacity text-black">
            Access Admin Panel
          </Link>
        )}
      </div>
    </div>
  );
}
