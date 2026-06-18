'use client'

import { useEffect, useRef, useState } from 'react'; 
import Link from 'next/link'; 
import { ArrowLeft, Ticket, Trophy, Lock, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

export default function ScratchCard() { 
  const canvasRef = useRef(null); 
  const [mounted, setMounted] = useState(false); 
  const [isRevealed, setIsRevealed] = useState(false); 
  const [isInitialized, setIsInitialized] = useState(false);
  const [status, setStatus] = useState('loading'); // loading, can_scratch, locked_points, locked_sunday
  const [profile, setProfile] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  // 1. GATEKEEPER LOGIC: Checks if the user is actually allowed to see the gray layer
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

      // --- THE 5-SCENARIO LOGIC ---
      if (prof.scratch_count === 0) {
        setStatus('can_scratch'); // Show gray layer
      } else if (prof.scratch_count === 1) {
        if (prof.bonus_unlocked) {
          setStatus('can_scratch'); // Unlocked via game! Show gray layer again
        } else {
          setStatus('locked_points'); // HIDE gray layer, show Lock
        }
      } else {
        setStatus('locked_sunday'); // HIDE gray layer, show Sunday message
      }
    }
    checkEligibility();
  }, [mounted]);

  // 2. SCRATCH FINISHED LOGIC
  const handleReveal = async () => {
    if (isRevealed) return;
    setIsRevealed(true);
    confetti();

    // Update database immediately so refresh doesn't reset it
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
        <h1 className="text-2xl font-bold uppercase tracking-tighter italic">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-[10vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter">
            {status === 'locked_points' ? 'Bonus Locked' : 'Daily Drop'}
        </h2>
      </div>

      {/* THE CARD DESIGN */}
      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* UNDER-LAYER DESIGN (Restored Winnings Design) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none text-[#E55937]">
            {status === 'locked_points' ? (
              <>
                <Lock size={64} className="mb-4 animate-bounce" />
                <h3 className="text-xl font-bold uppercase italic leading-tight">Score 25 points in the game to unlock your next scratch!</h3>
              </>
            ) : status === 'locked_sunday' ? (
              <>
                <Clock size={64} className="mb-4" />
                <h3 className="text-xl font-bold uppercase italic leading-tight">No Scratches Left!<br/>Resetting Sunday at 12:01AM</h3>
              </>
            ) : (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
                <Ticket size={64} className="mb-4 mx-auto rotate-[-10deg]" />
                <h3 className="text-3xl font-bold uppercase tracking-tighter leading-none mb-2">Winner!</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-4 text-black">Weekly Prize Slot Secured</p>
                <div className="bg-[#E55937] text-white px-4 py-2 rounded-xl font-black uppercase text-xs shadow-lg">
                    Logged to Leaderboard
                </div>
              </motion.div>
            )}
        </div>

        {/* SCRATCH LAYER: Only exists if they have a turn and haven't revealed yet */}
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
            {isRevealed || status !== 'can_scratch' ? (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <Link href={status === 'locked_points' ? "/game" : "/"} className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-xl shadow-xl text-center border-4 border-black active:translate-y-1 transition-all">
                        {status === 'locked_points' ? "Play Game (Need 25pts)" : "Back to Dashboard"}
                    </Link>
                </motion.div>
            ) : (
                <div className="p-5 bg-[#FFE974]/20 border-4 border-black border-dashed rounded-3xl flex gap-4 items-center">
                    <Sparkles size={28} className="text-[#FFE974]" />
                    <p className="text-[10px] font-bold uppercase text-white tracking-widest">Scratch the card with your finger to reveal the prize!</p>
                </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  ); 
}
