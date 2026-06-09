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
    <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col bg-[#E55937] text-[#FFE974] font-Gopher-Bold.otf overflow-x-hidden">
      <header className="py-12 text-center relative px-4">
  <h2 className="text-[12vw] sm:text-6xl leading-none tracking-tighter text-[#FFE974] font-bold">
    Picnic At Home
  </h2>
  <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white opacity-80 mt-3">
    Weekly Prizes & Perks
  </p>
</header>

      {/* Points Card */}
      <div className="bg-[#FFE974] text-[#E55937] p-6 rounded-[2.5rem] mb-6 shadow-2xl flex justify-between items-center border-4 border-black">
        <div>
          <p className="text-[10px] uppercase font-black opacity-60 tracking-widest text-[#E55937]">High Score</p>
          <p className="text-6xl font-bold italic tracking-tighter leading-none">
            {profile ? profile.high_score : '0'}
          </p>
        </div>
        <div className="bg-[#E55937] text-[#FFE974] p-4 rounded-full shadow-lg border-2 border-black">
          <Star size={32} fill="currentColor" />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/game" className="bg-[#FFE974] border-4 border-black p-6 rounded-[2.5rem] flex flex-col items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
          <Gamepad2 size={40} className="text-[#E55937]" />
          <span className="font-bold uppercase text-xs text-[#E55937]">Play To Win</span>
        </Link>
        <Link href="/scratch" className="bg-white border-4 border-black p-6 rounded-[2.5rem] flex flex-col items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all">
          <Ticket size={40} className="text-[#E55937]" />
          <span className="font-bold uppercase text-xs text-[#E55937]">Scratch To Win</span>
        </Link>
      </div>

      <div className="space-y-4 mb-10">
        <Link href="/wallet" className="w-full bg-[#FFE974] border-4 border-black p-5 rounded-2xl flex justify-between items-center font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[#E55937]">
          <span className="flex items-center gap-3"><Wallet size={24}/> My Wallet</span>
          <span>→</span>
        </Link>
        <Link href="/leaderboard" className="w-full bg-[#FFE974] border-4 border-black p-5 rounded-2xl flex justify-between items-center font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[#E55937]">
          <span className="flex items-center gap-3"><Trophy size={24}/> Leaderboard</span>
          <span>→</span>
        </Link>
      </div>

      <div className="mt-auto space-y-4">
        <a href="#" className="w-full bg-black text-[#FFE974] p-6 rounded-2xl flex justify-center items-center gap-4 font-bold uppercase italic text-2xl shadow-xl">
          <ShoppingBag size={28} /> Order Online
        </a>

        {user ? (
          <button onClick={handleSignOut} className="w-full py-4 flex justify-center items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-40 text-white hover:opacity-100 transition-opacity">
            <LogOut size={14} /> Sign Out
          </button>
        ) : (
          <Link href="/login" className="w-full py-4 flex justify-center items-center gap-2 font-bold uppercase text-[10px] tracking-widest opacity-80 text-white underline underline-offset-4 hover:opacity-100 transition-opacity">
            <User size={14} /> Sign In to Win Prizes
          </Link>
        )}

        {/* ADMIN SHORTCUT (Visible only to admins) */}
        {profile?.is_admin && (
          <Link href="/admin/super" className="w-full border-2 border-dashed border-white/20 p-2 text-center text-[8px] uppercase font-black opacity-20 hover:opacity-100 transition-opacity text-white">
            Access Admin Panel
          </Link>
        )}
      </div>
    </div>
  );
}
