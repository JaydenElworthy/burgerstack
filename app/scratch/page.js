'use client'
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ticket, Trophy, Lock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

export default function ScratchCard() {
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [status, setStatus] = useState('loading'); // 'can_scratch', 'locked_need_points', 'locked_until_sunday'
  const [profile, setProfile] = useState(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;

    async function checkEligibility() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus('no_auth'); return; }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // 1. CHECK SUNDAY RESET (12:01 AM)
      const now = new Date();
      const lastScratch = prof.last_scratch_date ? new Date(prof.last_scratch_date) : new Date(0);
      
      // Get the most recent Sunday at 00:01
      const lastSunday = new Date();
      lastSunday.setDate(now.getDate() - now.getDay());
      lastSunday.setHours(0, 1, 0, 0);

      // If they haven't scratched since last Sunday, reset their counts in DB
      if (lastScratch < lastSunday) {
        await supabase.from('profiles').update({ scratch_count: 0, bonus_unlocked: false }).eq('id', user.id);
        setStatus('can_scratch');
        return;
      }

      // 2. LOGIC: Is it scratchable?
      if (prof.scratch_count === 0) {
        setStatus('can_scratch');
      } else if (prof.scratch_count === 1 && prof.bonus_unlocked) {
        setStatus('can_scratch');
      } else if (prof.scratch_count === 1 && !prof.bonus_unlocked) {
        setStatus('locked_need_points');
      } else {
        setStatus('locked_until_sunday');
      }
    }
    checkEligibility();
  }, [mounted]);

  // Canvas Drawing Logic (Only if status is 'can_scratch')
  useEffect(() => {
    if (status !== 'can_scratch' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 320; canvas.height = 320;
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#444';
    for(let i=0; i<8; i++) { ctx.fillText('PICNIC AT HOME • PICNIC', 10, 30 + (i*45)); }

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2); ctx.fill();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) clear++; }
      if (clear > (pixels.length / 4) * 0.5 && !isRevealed) {
        handleReveal();
      }
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
  }, [status, isRevealed]);

  const handleReveal = async () => {
    setIsRevealed(true);
    confetti();
    // Update DB: Increment count and set last scratch date
    const newCount = (profile?.scratch_count || 0) + 1;
    await supabase.from('profiles').update({ 
      scratch_count: newCount,
      last_scratch_date: new Date().toISOString()
    }).eq('id', profile.id);
  };

  if (!mounted) return <div className="min-h-screen bg-[#E55937]" />;

  return (
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-hidden text-[#FFE974]">
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} /></Link>
        <h1 className="text-2xl font-bold uppercase tracking-tighter">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-[12vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter">
            {status === 'locked_need_points' ? 'Bonus Locked' : 'Daily Drop'}
        </h2>
      </div>

      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* UNDER LAYER */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none">
            {status === 'locked_need_points' ? (
                <>
                  <Lock size={64} className="mb-4 text-[#E55937] animate-bounce" />
                  <p className="font-bold uppercase text-[#E55937]">Score 25 points in the game to unlock your bonus scratch!</p>
                </>
            ) : status === 'locked_until_sunday' ? (
                <>
                  <Clock size={64} className="mb-4 text-[#E55937]" />
                  <p className="font-bold uppercase text-[#E55937]">You're all scratched out! Come back Sunday at 12:01 AM.</p>
                </>
            ) : (
                <>
                  <Trophy size={64} className="mb-4 text-[#E55937]" />
                  <h3 className="text-2xl font-bold uppercase leading-tight mb-4 text-[#E55937]">Nice! Check the Leaders page to see your prize rank</h3>
                  <p className="text-white bg-[#E55937] px-4 py-1 rounded-full text-[10px] font-bold uppercase">Reward Logged</p>
                </>
            )}
        </div>

        {/* CANVAS LAYER (Hidden if locked) */}
        {status === 'can_scratch' && (
           <canvas ref={canvasRef} style={{ touchAction: 'none' }} className={`absolute inset-0 cursor-crosshair transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="mt-10 w-full px-4">
        {status === 'locked_need_points' ? (
            <Link href="/game" className="flex items-center justify-center gap-3 w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-xl shadow-xl">
               <Zap size={24} fill="#FFE974" /> Play Game
            </Link>
        ) : (
            <Link href="/" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-xl shadow-xl text-center">
                Back to Club
            </Link>
        )}
      </div>
    </div>
  );
}
