'use client'

import { useEffect, useRef, useState } from 'react'; 
import Link from 'next/link'; 
import { ArrowLeft, Ticket, Trophy, Lock, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

export default function ScratchCard() { 
  const canvasRef = useRef(null); 
  const [mounted, setMounted] = useState(false); 
  const [isRevealed, setIsRevealed] = useState(false); 
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('loading'); 
  const [userProfile, setProfile] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // 1. CHECK ELIGIBILITY ON LOAD
  useEffect(() => {
    if (!mounted) return;

    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch the absolute latest data from DB
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // --- SUNDAY RESET LOGIC (12:01 AM) ---
      const now = new Date();
      const lastScratch = prof.last_scratch_date ? new Date(prof.last_scratch_date) : new Date(0);
      const lastSunday = new Date();
      lastSunday.setDate(now.getDate() - now.getDay()); 
      lastSunday.setHours(0, 1, 0, 0); 

      if (lastScratch < lastSunday && prof.scratch_count > 0) {
        const { data: updated } = await supabase.from('profiles')
          .update({ scratch_count: 0, bonus_unlocked: false })
          .eq('id', user.id)
          .select().single();
        setProfile(updated);
        setStatus('can_scratch');
        setIsRevealed(false);
        return;
      }

      // --- PERSISTENCE CHECK ---
      // If they are on scratch 0, they can scratch.
      if (prof.scratch_count === 0) {
        setStatus('can_scratch');
        setIsRevealed(false);
      } 
      // If they are on scratch 1, they only scratch IF they won the bonus.
      else if (prof.scratch_count === 1) {
        if (prof.bonus_unlocked) {
          setStatus('can_scratch');
          setIsRevealed(false);
        } else {
          setStatus('locked_need_points');
          setIsRevealed(true); // FORCE HIDE CANVAS
        }
      } 
      // If they are on scratch 2, they are totally done.
      else {
        setStatus('locked_until_sunday');
        setIsRevealed(true); // FORCE HIDE CANVAS
      }
    }
    checkStatus();
  }, [mounted]);

  // 2. REVEAL & DATABASE UPDATE
  const handleReveal = async () => {
    if (isRevealed) return; // Prevent double triggers
    setIsRevealed(true);
    confetti();

    const { data: { user } } = await supabase.auth.getUser();
    
    // A. Pick Prize
    const { data: prizes } = await supabase.from('scratch_prizes').select('*').eq('is_active', true);
    if (!prizes || prizes.length === 0) return;
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];

    // B. Get Code
    const { data: codeRow } = await supabase.from('manual_code_bank')
      .select('*').eq('prize_type', randomPrize.id).eq('is_claimed', false).limit(1).single();

    if (codeRow) {
      await supabase.from('manual_code_bank').update({ is_claimed: true, claimed_by: user.id }).eq('id', codeRow.id);
      await supabase.from('rewards').insert({
        user_id: user.id,
        prize_title: randomPrize.title,
        prize_code: codeRow.code
      });
    }

    // C. UPDATE SCRATCH COUNT IMMEDIATELY
    const nextCount = (userProfile?.scratch_count || 0) + 1;
    await supabase.from('profiles').update({ 
      scratch_count: nextCount, 
      last_scratch_date: new Date().toISOString() 
    }).eq('id', user.id);
  };

  // 3. CANVAS DRAWING
  useEffect(() => {
    if (!mounted || !canvasRef.current || status !== 'can_scratch' || isRevealed) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!isInitialized) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.fillStyle = '#222';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#444';

      for (let i = 0; i < 9; i++) {
        ctx.fillText('PICNIC • PICNIC • PICNIC', 160, 40 + (i * 30));
      }
      setIsInitialized(true);
    }

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2); ctx.fill();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) clear++; }
      if (clear > (pixels.length / 4) * 0.4) { handleReveal(); }
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
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [mounted, isInitialized, isRevealed, status]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-hidden text-[#FFE974]">
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} /></Link>
        <h1 className="text-2xl font-bold uppercase tracking-tighter italic">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-[10vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter">
          {status === 'loading' ? 'Checking...' : status === 'can_scratch' ? 'Scratch to Win' : 'Locked'}
        </h2>
      </div>

      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none text-[#E55937]">
            {status === 'locked_need_points' ? (
              <>
                <Lock size={64} className="mb-4 animate-bounce" />
                <h3 className="text-xl font-bold uppercase italic">Score 25 points in the game to unlock your next scratch!</h3>
              </>
            ) : status === 'locked_until_sunday' ? (
              <>
                <Clock size={64} className="mb-4" />
                <h3 className="text-xl font-bold uppercase italic">No Scratches Left!<br/>Resetting Sunday.</h3>
              </>
            ) : (
              <>
                <Ticket size={64} className="mb-4" />
                <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none mb-4">Winner!</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest bg-[#E55937] text-white px-4 py-1 rounded-full">Reward Added to Wallet</p>
              </>
            )}
        </div>

        {/* This is the gray layer - it ONLY mounts if you have an active turn */}
        {status === 'can_scratch' && !isRevealed && (
          <canvas 
            ref={canvasRef} 
            style={{ touchAction: 'none' }} 
            className="absolute inset-0 cursor-crosshair z-20"
          />
        )}
      </div>

      <div className="mt-10 w-full px-4">
        {status === 'can_scratch' && !isRevealed ? (
            <div className="p-5 bg-[#FFE974] border-4 border-black rounded-3xl flex gap-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               <Trophy size={28} className="text-[#E55937]" />
               <p className="text-[10px] font-bold uppercase text-[#E55937]">Use your finger to scratch and reveal!</p>
            </div>
        ) : (
            <Link href={status === 'locked_need_points' ? "/game" : "/"} className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-xl shadow-xl text-center border-4 border-black">
                {status === 'locked_need_points' ? "Play Game (Need 25pts)" : "Back to Dashboard"}
            </Link>
        )}
      </div>
    </div>
  ); 
}
