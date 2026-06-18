'use client'

import { useEffect, useRef, useState } from 'react'; 
import Link from 'next/link'; 
import { ArrowLeft, Ticket, Trophy, Lock, Clock } from 'lucide-react';
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

  // 2. CHECK ELIGIBILITY LOGIC
  useEffect(() => {
    if (!mounted) return;

    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      // --- SUNDAY RESET LOGIC ---
      const now = new Date();
      const lastScratch = prof.last_scratch_date ? new Date(prof.last_scratch_date) : new Date(0);
      const lastSunday = new Date();
      lastSunday.setDate(now.getDate() - now.getDay()); 
      lastSunday.setHours(0, 1, 0, 0); 

      if (lastScratch < lastSunday) {
        await supabase.from('profiles').update({ scratch_count: 0, bonus_unlocked: false }).eq('id', user.id);
        setStatus('can_scratch');
        setIsRevealed(false); // Make sure gray layer shows on new week
        return;
      }

      // --- SCRATCH LIMIT LOGIC (FIXED FOR PERSISTENCE) ---
      if (prof.scratch_count === 0) {
        setStatus('can_scratch');
        setIsRevealed(false); // Show the gray card
      } else if (prof.scratch_count === 1) {
        if (prof.bonus_unlocked) {
          setStatus('can_scratch');
          setIsRevealed(false); // Show the gray card for the bonus
        } else {
          setStatus('locked_need_points');
          setIsRevealed(true); // HIDE gray card so they see the Lock icon
        }
      } else {
        setStatus('locked_until_sunday');
        setIsRevealed(true); // HIDE gray card so they see the Sunday message
      }
    }
    checkStatus();
  }, [mounted]);

  // Moved handleReveal outside to prevent stale state issues
  const handleReveal = async () => {
    setIsRevealed(true);
    confetti();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prizes } = await supabase.from('scratch_prizes').select('*').eq('is_active', true);
    if (!prizes || prizes.length === 0) return;
    
    const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];

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

    const nextCount = (userProfile?.scratch_count || 0) + 1;
    await supabase.from('profiles').update({ 
      scratch_count: nextCount, 
      last_scratch_date: new Date().toISOString() 
    }).eq('id', user.id);
  };

  // 3. CANVAS LOGIC
  useEffect(() => {
    if (!mounted || !canvasRef.current || status !== 'can_scratch' || isRevealed) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!isInitialized) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.fillStyle = '#222';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const line = 'PICNIC • PICNIC • PICNIC • PICNIC • PICNIC';
      const lines = 9;                
      const fontSize = 20;            
      const lineHeight = fontSize * 1.6;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#444';

      const totalHeight = (lines - 1) * lineHeight;
      const startY = canvas.height / 2 - totalHeight / 2;

      for (let i = 0; i < lines; i++) {
        const y = startY + i * lineHeight;
        ctx.fillText(line, canvas.width / 2, y);
      }
      setIsInitialized(true);
    }

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fill();
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let clearPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) clearPixels++;
      }
      if (clearPixels > (pixels.length / 4) * 0.5) {
        if (!isRevealed) {
            handleReveal();
        }
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

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [mounted, isInitialized, isRevealed, status, userProfile]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-hidden">
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} className="text-[#FFE974]" /></Link>
        <h1 className="text-2xl font-bold uppercase text-[#FFE974]">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <h2 className="text-[12vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter text-[#FFE974]">
          {status === 'loading' && 'Loading...'}
          {status === 'can_scratch' && 'Scratch to Win'}
          {status === 'locked_need_points' && 'BONUS LOCKED'}
          {status === 'locked_until_sunday' && 'No Scratches Left'}
        </h2>
      </div>

      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center select-none">
            {status === 'locked_need_points' ? (
              <>
                <Lock size={64} className="mb-4 text-[#E55937]" />
                <h3 className="text-xl font-bold uppercase text-[#E55937]">Score 25 points in the game to unlock your next scratch!</h3>
              </>
            ) : status === 'locked_until_sunday' ? (
              <>
                <Clock size={64} className="mb-4 text-[#E55937]" />
                <h3 className="text-xl font-bold uppercase text-[#E55937]">Max scratches reached! Resetting Sunday at 12:01 AM.</h3>
              </>
            ) : (
              <>
                <Ticket size={64} className="mb-4 text-[#E55937]" />
                <p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-[#E55937]">Picnic At Home</p>
                <h3 className="text-3xl font-bold uppercase text-center leading-tight mb-4 text-[#E55937]">Play Burger Slinger To Win Another Scratch Card</h3>
                <p className="text-white bg-[#E55937] px-4 py-1 rounded-full text-[10px] font-bold uppercase">Refreshes Every Sunday</p>
              </>
            )}
        </div>

        {status === 'can_scratch' && (
          <canvas 
            ref={canvasRef} 
            style={{ touchAction: 'none' }} 
            className={`absolute inset-0 cursor-crosshair transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          />
        )}
      </div>

      <AnimatePresence>
        {isRevealed && (
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-10 text-center w-full px-4">
                <Link href="/game" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-2xl shadow-xl hover:bg-[#E55937] transition-colors">
                    Win Another Scratch Card
                </Link>
            </motion.div>
        )}
      </AnimatePresence>

      {!isRevealed && (
        <Link href="/game" className="mt-12 block mx-4">
          <div className="p-5 bg-[#FFE974] border-4 border-black rounded-3xl flex gap-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
            {status === 'locked_need_points' ? <Lock size={28} className="text-[#E55937]" /> : <Trophy size={28} className="shrink-0 text-[#E55937]" />}
            <p className="text-[10px] font-bold uppercase tracking-tight leading-tight text-left text-[#E55937]">
              {status === 'locked_need_points' ? 'GET 25 POINTS IN THE GAME TO UNLOCK' : 'PLAY BURGER SLINGER TO WIN ANOTHER SCRATCH CARD'}
            </p>
          </div>
        </Link>
      )}
    </div>
  ); 
}
