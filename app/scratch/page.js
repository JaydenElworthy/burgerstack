'use client'

import { useEffect, useRef, useState } from 'react'; 
import Link from 'next/link'; 
import { ArrowLeft, Ticket, Trophy, Lock, Clock, Sparkles, XCircle, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (!mounted) return;
    async function checkStatus() {
      const { data: { user: activeUser } } = await supabase.auth.getUser();
      setUser(activeUser);
      if (!activeUser) { setStatus('can_scratch'); return; }

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
        return;
      }

      if (prof?.scratch_count === 0) { setStatus('can_scratch'); } 
      else if (prof?.scratch_count === 1) {
        if (prof?.bonus_unlocked) { setStatus('can_scratch'); } 
        else { setStatus('locked_points'); setIsRevealed(true); }
      } else { setStatus('bonus_used'); setIsRevealed(true); }
    }
    checkStatus();
  }, [mounted]);

  const handleReveal = async () => {
    if (isRevealed) return;
    setIsRevealed(true);
    
    // Logic: 70% chance to find a prize
    const winRoll = Math.random() > 0.3; 

    if (winRoll) {
      const { data: prizes } = await supabase.from('scratch_prizes').select('*').eq('is_active', true);
      const randomCat = prizes?.[Math.floor(Math.random() * prizes.length)];
      if (randomCat) {
        const { data: codeRow } = await supabase.from('manual_code_bank').select('*').eq('prize_type', randomCat.id).eq('is_claimed', false).limit(1).single();
        if (codeRow) {
          setPrizeResult({ title: randomCat.title, code: codeRow.code });
          confetti();
          if (user) {
            await supabase.from('manual_code_bank').update({ is_claimed: true, claimed_by: user.id }).eq('id', codeRow.id);
            await supabase.from('rewards').insert({ user_id: user.id, prize_title: randomCat.title, prize_code: codeRow.code });
          }
        } else { setPrizeResult(null); }
      }
    } else { setPrizeResult(null); }

    if (user) {
      const nextCount = (profile?.scratch_count || 0) + 1;
      await supabase.from('profiles').update({ scratch_count: nextCount, last_scratch_date: new Date().toISOString() }).eq('id', user.id);
    }
  };

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
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans text-[#FFE974]">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10 pt-4">
        <Link href="/"><ArrowLeft size={32} /></Link>
        <h1 className="text-2xl font-bold uppercase tracking-tighter italic">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      {/* Hero Text */}
      <div className="text-center mb-8 px-4">
        <h2 className="text-[10vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter">
            {status === 'loading' ? 'LOADING...' : status === 'bonus_used' ? 'No Scratches Left' : 'Scratch<br/>to Win'}
        </h2>
      </div>

      {/* THE CARD */}
      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none text-[#E55937]">
            {status === 'loading' ? (
                <Loader2 className="animate-spin" size={40} />
            ) : status === 'bonus_used' ? (
              <h3 className="text-2xl font-bold uppercase tracking-tighter px-4">No More Scratches To Redeem This Week</h3>
            ) : isRevealed && !prizeResult ? (
              <>
                <XCircle size={64} className="mb-4 opacity-40" />
                <h3 className="text-3xl font-bold uppercase tracking-tighter italic">Better Luck Next Time</h3>
              </>
            ) : isRevealed && prizeResult ? (
              <div className="flex flex-col items-center">
                <Trophy size={64} className="mb-4 animate-bounce" />
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">WINNER!</h3>
                <div className="bg-white border-2 border-black p-3 rounded-xl font-mono text-xl font-black tracking-widest text-black mb-2 shadow-inner uppercase">
                    {prizeResult.code}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">Reward added to {user ? 'your basket' : 'local session'}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center w-full px-4">
                <Ticket size={64} className="mb-4 opacity-20" />
                <h3 className="text-xl font-bold uppercase tracking-tight leading-none mb-4 italic">
                    Play Burger Slinger to win another scratch card
                </h3>
                {/* The Orange Div underneath */}
                <div className="bg-[#E55937] text-white px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-lg">
                    Renews Every Sunday
                </div>
              </div>
            )}
        </div>

        {/* SCRATCH LAYER */}
        {status === 'can_scratch' && !isRevealed && (
          <canvas ref={canvasRef} style={{ touchAction: 'none' }} className="absolute inset-0 cursor-crosshair z-20" />
        )}
      </div>

      {/* DYNAMIC ACTION BUTTON */}
      <div className="mt-10 w-full px-4">
        {status === 'loading' ? null : !user && isRevealed ? (
            <Link href="/login" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-xl text-center border-4 border-black shadow-lg">
                Sign In to Save Reward
            </Link>
        ) : (isRevealed || status !== 'can_scratch') ? (
            <Link href="/game" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-center border-4 border-black active:translate-y-1 transition-all leading-tight shadow-lg text-lg px-2">
                Play Burger Slinger To Win Another Scratch Card
            </Link>
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
