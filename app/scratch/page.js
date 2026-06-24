'use client'

import { useEffect, useRef, useState } from 'react'; 
import Link from 'next/link'; 
import { ArrowLeft, Ticket, Trophy, Lock, Clock, Sparkles, XCircle, Loader2, UserCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

export default function ScratchCard() { 
  const canvasRef = useRef(null); 
  const [mounted, setMounted] = useState(false); 
  const [isRevealed, setIsRevealed] = useState(false); 
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('loading'); 
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [prizeResult, setPrizeResult] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // 1. AUTH & ELIGIBILITY LOGIC
  useEffect(() => {
    if (!mounted) return;
    async function checkStatus() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      setUser(activeUser);
      
      // GUEST LOGIC: If no user, show locked state immediately
      if (!activeUser) {
        setStatus('no_auth');
        setIsRevealed(true); // Removes gray layer so it "doesn't scratch"
        return;
      }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', activeUser.id).single();
      setProfile(prof);

      const now = new Date();
      const lastSunday = new Date();
      lastSunday.setDate(now.getDate() - now.getDay());
      lastSunday.setHours(0, 1, 0, 0);
      const lastScratch = prof?.last_scratch_date ? new Date(prof.last_scratch_date) : new Date(0);

      if (lastScratch < lastSunday && prof?.scratch_count > 0) {
        await supabase.from('profiles').update({ scratch_count: 0, bonus_unlocked: false }).eq('id', activeUser.id);
        setStatus('can_scratch');
        setIsRevealed(false);
        return;
      }

      if (prof?.scratch_count === 0) { 
        setStatus('can_scratch'); 
        setIsRevealed(false);
      } else if (prof?.scratch_count === 1) {
        if (prof?.bonus_unlocked) { 
          setStatus('can_scratch'); 
          setIsRevealed(false);
        } else { 
          setStatus('locked_points'); 
          setIsRevealed(true); 
        }
      } else { 
        setStatus('bonus_used'); 
        setIsRevealed(true); 
      }
    }
    checkStatus();
  }, [mounted]);

  // 2. REVEAL ENGINE (Only for Logged In)
  const handleReveal = async () => {
    if (isRevealed || !user) return;
    setIsRevealed(true);
    const winRoll = Math.random() > 0.3; 

    if (winRoll) {
      const { data: prizes } = await supabase.from('scratch_prizes').select('*').eq('is_active', true);
      const randomCat = prizes?.[Math.floor(Math.random() * prizes.length)];
      if (randomCat) {
        const { data: codeRow } = await supabase.from('manual_code_bank').select('*').eq('prize_type', randomCat.id).eq('is_claimed', false).limit(1).single();
        if (codeRow) {
          setPrizeResult({ title: randomCat.title, code: codeRow.code });
          confetti();
          await supabase.from('manual_code_bank').update({ is_claimed: true, claimed_by: user.id }).eq('id', codeRow.id);
          await supabase.from('rewards').insert({ user_id: user.id, prize_title: randomCat.title, prize_code: codeRow.code });
        } else { setPrizeResult(null); }
      }
    } else { setPrizeResult(null); }

    const nextCount = (profile?.scratch_count || 0) + 1;
    await supabase.from('profiles').update({ 
        scratch_count: nextCount,
        last_scratch_date: new Date().toISOString()
    }).eq('id', user.id);
  };

  // 3. CANVAS ENGINE
  useEffect(() => {
    if (!mounted || !canvasRef.current || status !== 'can_scratch' || isRevealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!isInitialized) {
      canvas.width = 320; canvas.height = 320;
      ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#444';
      for(let i=0; i<9; i++) { ctx.fillText('PICNIC • PICNIC • PICNIC', 160, 40 + (i*35)); }
      setIsInitialized(true);
    }
    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2); ctx.fill();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) clear++; }
      if (clear > (pixels.length / 4) * 0.45) handleReveal();
    };
    const handleMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (e.buttons === 1 || e.touches) scratch(clientX - rect.left, clientY - rect.top);
    };
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    return () => { canvas.removeEventListener('mousemove', handleMove); canvas.removeEventListener('touchmove', handleMove); };
  }, [mounted, isInitialized, status, isRevealed]);

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-y-auto overflow-x-hidden overscroll-none">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2 max-w-[320px]">
        <Link href="/"><ArrowLeft size={32} className="text-[#FFE974]" /></Link>
        <h1 className="text-2xl font-bold uppercase text-[#FFE974] italic">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-[10vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter text-[#FFE974]">
            {status === 'loading' ? 'LOADING...' : status === 'no_auth' ? 'Log In' : status === 'bonus_used' ? 'All Done' : 'Daily Drop'}
        </h2>
      </div>

      {/* THE TICKET DESIGN */}
      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none text-[#E55937]">
            {status === 'loading' ? (
                <Loader2 className="animate-spin opacity-20" size={40} />
            ) : status === 'no_auth' ? (
              <div className="flex flex-col items-center w-full px-4">
                <UserCircle2 size={64} className="mb-4 opacity-40" />
                <h3 className="text-xl font-bold uppercase tracking-tight leading-none italic mb-4">
                    Sign in to use your daily scratch card
                </h3>
              </div>
            ) : status === 'locked_need_points' ? (
              <>
                <Lock size={64} className="mb-4 animate-bounce" />
                <h3 className="text-xl font-bold uppercase italic leading-tight px-4">Score 25 points in the game to unlock your next scratch!</h3>
              </>
            ) : status === 'bonus_used' ? (
              <div className="flex flex-col items-center w-full px-4">
                <Ticket size={64} className="mb-4 opacity-20 rotate-[10deg]" />
                <h3 className="text-xl font-bold uppercase tracking-tighter leading-none mb-4 italic text-center">No More Scratches To Redeem This Week</h3>
                <div className="bg-[#E55937] text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg">
                    Renews Every Sunday
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full px-4">
                <Ticket size={64} className="mb-4 opacity-20 rotate-[-10deg]" />
                <h3 className="text-xl font-bold uppercase tracking-tight leading-none mb-4 italic">
                    Play Burger Slinger to win another scratch card
                </h3>
                <div className="bg-[#E55937] text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg">
                    Renews Every Sunday
                </div>
              </div>
            )}

            {/* Ticket Cutouts */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#E55937] border-r-8 border-black rounded-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#E55937] border-l-8 border-black rounded-full" />
        </div>

        {/* SCRATCH LAYER - Hidden if no_auth */}
        {status === 'can_scratch' && !isRevealed && (
          <canvas ref={canvasRef} style={{ touchAction: 'none' }} className="absolute inset-0 cursor-crosshair z-20" />
        )}
      </div>

      {/* DYNAMIC ACTION BUTTON */}
      <div className="mt-10 w-full max-w-[320px]">
        {status === 'no_auth' ? (
            <div className="space-y-6">
                <div className="p-5 bg-black/20 border-4 border-black border-dashed rounded-3xl flex gap-4 items-center">
                    <UserCircle2 size={28} className="text-[#FFE974]" />
                    <p className="text-[10px] font-bold uppercase text-white tracking-widest leading-tight">Sign in to save reward</p>
                </div>
                <Link href="/login" className="block w-full bg-[#FFE974] text-black p-5 rounded-2xl font-bold uppercase italic text-xl text-center border-4 border-black shadow-lg active:scale-95 transition-all">
                    Sign In to Play
                </Link>
            </div>
        ) : (isRevealed || status !== 'can_scratch') ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Link href="/game" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-center border-4 border-black active:translate-y-1 transition-all leading-tight shadow-lg text-lg px-2">
                  Play Burger Slinger To Win Another Scratch Card
              </Link>
            </motion.div>
        ) : (
            <div className="p-5 bg-black/20 border-4 border-black border-dashed rounded-3xl flex gap-4 items-center">
                <Sparkles size={28} className="text-[#FFE974]" />
                <p className="text-[10px] font-bold uppercase text-white tracking-widest leading-tight">Use your finger to scratch and reveal your prize!</p>
            </div>
        )}
      </div>
    </div>
  ); 
}
