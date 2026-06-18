'use client'

import { useEffect, useRef, useState } from 'react'; 
import Link from 'next/link'; 
import { ArrowLeft, Ticket, Trophy, Lock, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

export default function ScratchCard() { 
  const canvasRef = useRef(null); 
  const [mounted, setMounted] = useState(false); 
  const [isRevealed, setIsRevealed] = useState(false); 
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('loading'); 
  const [profile, setProfile] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // 1. GATEKEEPER LOGIC
  useEffect(() => {
    if (!mounted) return;

    async function checkEligibility() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // --- SUNDAY RESET ---
      const now = new Date();
      const lastSunday = new Date();
      lastSunday.setDate(now.getDate() - now.getDay());
      lastSunday.setHours(0, 1, 0, 0);
      const lastScratch = prof.last_scratch_date ? new Date(prof.last_scratch_date) : new Date(0);

      if (lastScratch < lastSunday && prof.scratch_count > 0) {
        await supabase.from('profiles').update({ scratch_count: 0, bonus_unlocked: false }).eq('id', user.id);
        setStatus('can_scratch');
        return;
      }

      // --- STATUS BRANCHING ---
      if (prof.scratch_count === 0) {
        setStatus('can_scratch');
      } else if (prof.scratch_count === 1) {
        if (prof.bonus_unlocked) {
          setStatus('can_scratch'); // Allowed to scratch the bonus!
        } else {
          setStatus('locked_points'); // Need 25 points
        }
      } else {
        setStatus('bonus_used'); // Both scratches done for the week
      }
    }
    checkEligibility();
  }, [mounted]);

  // 2. REVEAL LOGIC
  const handleReveal = async () => {
    if (isRevealed) return;
    setIsRevealed(true);
    confetti();

    // Increment count in DB immediately
    const nextCount = (profile?.scratch_count || 0) + 1;
    await supabase.from('profiles').update({ 
        scratch_count: nextCount,
        last_scratch_date: new Date().toISOString()
    }).eq('id', profile.id);
  };

  // 3. CANVAS ENGINE
  useEffect(() => {
    if (!mounted || !canvasRef.current || status !== 'can_scratch') return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!isInitialized) {
      canvas.width = 320; canvas.height = 320;
      ctx.fillStyle = '#222'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
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
  }, [mounted, isInitialized, status, profile]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-hidden text-[#FFE974]">
      
      {/* HEADER */}
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} /></Link>
        <h1 className="text-2xl font-bold uppercase tracking-tighter italic text-[#FFE974]">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-[10vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter">
            {status === 'locked_points' ? 'BONUS LOCKED' : status === 'bonus_used' ? 'ALL DONE' : 'Daily Drop'}
        </h2>
      </div>

      {/* THE TICKET DESIGN */}
      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Ticket Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none text-[#E55937]">
            {status === 'locked_points' ? (
              <>
                <Lock size={64} className="mb-4 animate-bounce" />
                <h3 className="text-xl font-bold uppercase italic leading-tight">Score 25 points in the game to unlock your next scratch!</h3>
              </>
            ) : status === 'bonus_used' ? (
              <>
                <CheckCircle2 size={64} className="mb-4 text-[#E55937]" />
                <h3 className="text-xl font-bold uppercase italic leading-tight px-4">Weekly bonus already used!<br/>Come back Sunday.</h3>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <Ticket size={64} className="mb-2 rotate-[-10deg]" />
                <div className="w-16 h-1 bg-[#E55937]/20 rounded-full mb-4" />
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">WINNER!</h3>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Prize logged to basket</p>
              </div>
            )}

            {/* Old Ticket Cutouts (The half circles on sides) */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#E55937] border-r-8 border-black rounded-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#E55937] border-l-8 border-black rounded-full" />
            
            {/* Dashed line effect */}
            <div className="absolute top-[20%] left-0 w-full border-t-4 border-dashed border-black/10" />
            <div className="absolute bottom-[20%] left-0 w-full border-t-4 border-dashed border-black/10" />
        </div>

        {/* SCRATCH LAYER */}
        {status === 'can_scratch' && !isRevealed && (
          <canvas 
            ref={canvasRef} 
            style={{ touchAction: 'none' }} 
            className="absolute inset-0 cursor-crosshair z-20"
          />
        )}
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="mt-10 w-full px-4">
        <AnimatePresence>
            {(isRevealed || status !== 'can_scratch') ? (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <Link href={status === 'locked_points' ? "/game" : "/"} className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-xl shadow-xl text-center border-4 border-black active:translate-y-1 transition-all">
                        {status === 'locked_points' ? "Play Game (Need 25pts)" : "Back to Dashboard"}
                    </Link>
                </motion.div>
            ) : (
                <div className="p-5 bg-[#FFE974]/20 border-4 border-black border-dashed rounded-3xl flex gap-4 items-center">
                    <Sparkles size={28} className="text-[#FFE974]" />
                    <p className="text-[10px] font-bold uppercase text-white tracking-widest">Scratch the card to reveal your picnic prize!</p>
                </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  ); 
}
