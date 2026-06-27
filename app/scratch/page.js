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
  const [preRolledPrize, setPreRolledPrize] = useState(null);

  const preRolledRef = useRef(null);
  preRolledRef.current = preRolledPrize;

  const userRef = useRef(null);
  userRef.current = user;

  const profileRef = useRef(null);
  profileRef.current = profile;

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

      const loadPreRolledPrize = async (activeUser) => {
        try {
          const { data: prizes } = await supabase.from('scratch_prizes').select('*').eq('is_active', true);
          const winRoll = Math.random() > 0.3;
          let preRolled = { win: false };
          
          if (winRoll && prizes && prizes.length > 0) {
            const randomCat = prizes[Math.floor(Math.random() * prizes.length)];
            const { data: codeRow } = await supabase
              .from('manual_code_bank')
              .select('*')
              .eq('prize_type', randomCat.id)
              .eq('is_claimed', false)
              .limit(1)
              .single();

            if (codeRow) {
              preRolled = {
                win: true,
                title: randomCat.title,
                code: codeRow.code,
                prizeId: randomCat.id,
                codeRowId: codeRow.id
              };
            }
          }
          setPreRolledPrize(preRolled);
        } catch (e) {
          console.error("Error pre-rolling prize:", e);
          setPreRolledPrize({ win: false });
        }
      };

      if (lastScratch < lastSunday && prof?.scratch_count > 0) {
        await supabase.from('profiles').update({ scratch_count: 0, bonus_unlocked: false }).eq('id', activeUser.id);
        setStatus('can_scratch');
        setIsRevealed(false);
        await loadPreRolledPrize(activeUser);
        return;
      }

      if (prof?.scratch_count === 0) { 
        setStatus('can_scratch'); 
        setIsRevealed(false);
        await loadPreRolledPrize(activeUser);
      } else if (prof?.scratch_count === 1) {
        if (prof?.bonus_unlocked) { 
          setStatus('can_scratch'); 
          setIsRevealed(false);
          await loadPreRolledPrize(activeUser);
        } else { 
          setStatus('locked_need_points'); 
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
    const curPrize = preRolledRef.current;
    const curUser = userRef.current;
    const curProfile = profileRef.current;

    if (isRevealed || !curUser || !curPrize) return;
    setIsRevealed(true);

    if (curPrize.win) {
      setPrizeResult({ title: curPrize.title, code: curPrize.code });
      confetti();
      await supabase.from('manual_code_bank').update({ is_claimed: true, claimed_by: curUser.id }).eq('id', curPrize.codeRowId);
      await supabase.from('rewards').insert({ user_id: curUser.id, prize_title: curPrize.title, prize_code: curPrize.code });
    } else {
      setPrizeResult(null);
    }

    const nextCount = (curProfile?.scratch_count || 0) + 1;
    await supabase.from('profiles').update({ 
        scratch_count: nextCount,
        last_scratch_date: new Date().toISOString()
    }).eq('id', curUser.id);
    setProfile(prev => prev ? { ...prev, scratch_count: nextCount } : null);
  };

  // 3. CANVAS ENGINE
  useEffect(() => {
    if (!mounted || !canvasRef.current || status !== 'can_scratch' || isRevealed) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!isInitialized) {
      canvas.width = 320; canvas.height = 320;
      ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#444';
      for(let i=0; i<9; i++) { ctx.fillText('PICNIC AT HOME • PICNIC AT HOME', 160, 42 + (i*32)); }
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
      // Calculate scale to properly map mouse coordinates if canvas is resized by CSS
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      if (e.buttons === 1 || e.touches) {
          scratch((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
      }
    };
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    return () => { canvas.removeEventListener('mousemove', handleMove); canvas.removeEventListener('touchmove', handleMove); };
  }, [mounted, isInitialized, status, isRevealed]);

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] bg-[#E55937] flex flex-col items-center p-4 sm:p-6 font-sans overflow-hidden overscroll-none justify-between">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-4 sm:mb-6 pt-2 px-2 max-w-[320px] shrink-0">
        <Link href="/"><ArrowLeft size={32} className="text-[#FFE974]" /></Link>
        <h1 className="text-xl sm:text-2xl font-bold uppercase text-[#FFE974] italic">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-4 sm:mb-6 px-4 shrink-0">
        <h2 className="text-[10vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter text-[#FFE974]">
            {status === 'loading' ? 'LOADING...' : status === 'no_auth' ? 'Log In' : status === 'bonus_used' ? 'All Done' : 'Scratch To Win'}
        </h2>
      </div>

      {/* THE TICKET DESIGN */}
      <div className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square bg-[#FFE974] border-[6px] sm:border-8 border-black rounded-[2rem] sm:rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden shrink-0">
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 sm:p-8 text-center select-none text-[#E55937]">
            {status === 'loading' ? (
                <Loader2 className="animate-spin opacity-20" size={40} />
            ) : status === 'no_auth' ? (
              <div className="flex flex-col items-center w-full px-4">
                <UserCircle2 size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 opacity-40" />
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight leading-none italic mb-4">
                    Sign in to use your daily scratch card
                </h3>
              </div>
            ) : status === 'locked_need_points' ? (
              <>
                <Lock size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 animate-bounce" />
                <h3 className="text-lg sm:text-xl font-bold uppercase italic leading-tight px-4">Score 25 points in the game to unlock your next scratch!</h3>
              </>
            ) : status === 'bonus_used' ? (
              <div className="flex flex-col items-center w-full px-4">
                <Ticket size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 opacity-20 rotate-[10deg]" />
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tighter leading-none mb-3 sm:mb-4 italic text-center">No More Scratches To Redeem This Week</h3>
                <div className="bg-[#E55937] text-white px-4 sm:px-6 py-2 rounded-full font-black uppercase text-[8px] sm:text-[10px] tracking-widest shadow-lg">
                    Renews Every Sunday
                </div>
              </div>
            ) : isRevealed ? (
              prizeResult ? (
                <div className="flex flex-col items-center w-full px-4 text-center">
                  <Ticket size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 animate-bounce rotate-[-10deg]" />
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-1">WINNER!</h3>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-tight opacity-75 mb-3">{prizeResult.title}</p>
                  <p className="text-sm sm:text-lg font-mono bg-white text-black px-4 py-2 rounded-xl border border-black font-black uppercase select-text tracking-widest shadow-inner leading-none">{prizeResult.code}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full px-4 text-center">
                  <XCircle size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 opacity-20" />
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none mb-2 opacity-60">Better Luck Next Time</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Play Burger Slinger for more chances</p>
                </div>
              )
            ) : status === 'can_scratch' ? (
              !preRolledPrize ? (
                <Loader2 className="animate-spin opacity-20" size={40} />
              ) : preRolledPrize.win ? (
                <div className="flex flex-col items-center w-full px-4 text-center">
                  <Ticket size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 animate-bounce rotate-[-10deg]" />
                  <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter leading-none mb-1">WINNER!</h3>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-tight opacity-75 mb-3">{preRolledPrize.title}</p>
                  <p className="text-sm sm:text-lg font-mono bg-white text-black px-4 py-2 rounded-xl border border-black font-black uppercase select-text tracking-widest shadow-inner leading-none">{preRolledPrize.code}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center w-full px-4 text-center">
                  <XCircle size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 opacity-20" />
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tighter leading-none mb-2 opacity-60">Better Luck Next Time</h3>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Play Burger Slinger for more chances</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center w-full px-4">
                <Ticket size={50} className="sm:w-16 sm:h-16 mb-2 sm:mb-4 opacity-20 rotate-[-10deg]" />
                <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight leading-none mb-3 sm:mb-4 italic text-center">
                  Play Burger Slinger to win another scratch card
                </h3>
                <div className="bg-[#E55937] text-white px-4 sm:px-6 py-2 rounded-full font-black uppercase text-[8px] sm:text-[10px] tracking-widest shadow-lg">
                    Renews Every Sunday
                </div>
              </div>
            )}

            {/* Ticket Cutouts */}
            <div className="absolute -left-5 sm:-left-6 top-1/2 -translate-y-1/2 w-8 sm:w-10 h-8 sm:h-10 bg-[#E55937] border-r-4 sm:border-r-8 border-black rounded-full" />
            <div className="absolute -right-5 sm:-right-6 top-1/2 -translate-y-1/2 w-8 sm:w-10 h-8 sm:h-10 bg-[#E55937] border-l-4 sm:border-l-8 border-black rounded-full" />
        </div>

        {/* SCRATCH LAYER - Hidden if no_auth */}
        {status === 'can_scratch' && !isRevealed && (
          <canvas ref={canvasRef} style={{ touchAction: 'none', width: '100%', height: '100%' }} className="absolute inset-0 cursor-crosshair z-20" />
        )}
      </div>

      {/* DYNAMIC ACTION BUTTON */}
      <div className="mt-4 sm:mt-auto w-full max-w-[320px] pb-2 sm:pb-4 shrink-0">
        {status === 'no_auth' ? (
            <div className="space-y-4 sm:space-y-6">
                <div className="p-4 sm:p-5 bg-black/20 border-[3px] sm:border-4 border-black border-dashed rounded-2xl sm:rounded-3xl flex gap-3 sm:gap-4 items-center">
                    <UserCircle2 size={24} className="sm:w-7 sm:h-7 text-[#FFE974]" />
                    <p className="text-[9px] sm:text-[10px] font-bold uppercase text-white tracking-widest leading-tight">Sign in to save reward</p>
                </div>
                <Link href="/login" className="block w-full bg-[#FFE974] text-black p-4 sm:p-5 rounded-2xl font-bold uppercase italic text-lg sm:text-xl text-center border-4 border-black shadow-lg active:scale-95 transition-all">
                    Sign In to Play
                </Link>
            </div>
        ) : (isRevealed || status !== 'can_scratch') ? (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
              <Link href="/game" className="block w-full bg-black text-[#FFE974] p-4 sm:p-5 rounded-2xl font-bold uppercase italic text-center border-[3px] sm:border-4 border-black active:translate-y-1 transition-all leading-tight shadow-lg text-sm sm:text-lg px-2">
                  {profile?.scratch_count >= 1 ? "Weekly Bonus Already Claimed" : "Play Burger Slinger To Win Another Scratch Card"}
              </Link>
            </motion.div>
        ) : (
            <div className="p-4 sm:p-5 bg-black/20 border-[3px] sm:border-4 border-black border-dashed rounded-2xl sm:rounded-3xl flex gap-3 sm:gap-4 items-center">
                <Sparkles size={24} className="sm:w-7 sm:h-7 text-[#FFE974]" />
                <p className="text-[9px] sm:text-[10px] font-bold uppercase text-white tracking-widest leading-tight">Use your finger to scratch and reveal your prize!</p>
            </div>
        )}
      </div>
    </div>
  ); 
}
