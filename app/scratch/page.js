'use client'

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ticket, Trophy } from 'lucide-react';

// --- CRITICAL IMPORTS ---
// We import these carefully to ensure the build server doesn't crash
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

export default function ScratchCard() {
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. MOUNT GUARD: Prevents Prerender Error
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. CANVAS LOGIC
  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!isInitialized) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.fillStyle = '#222'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#444';
      for(let i=0; i<6; i++) {
          ctx.fillText('PICNIC • PICNIC • PICNIC', -20, 40 + (i*60));
      }
      setIsInitialized(true);
    }

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 35, 0, Math.PI * 2);
      ctx.fill();
      
      // Check percentage
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let clearPixels = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) clearPixels++;
      }
      if (clearPixels > (pixels.length / 4) * 0.5) {
        if (!isRevealed) {
            setIsRevealed(true);
            confetti(); // Safe to call here as it's inside useEffect
        }
      }
    };

    const handleMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (e.buttons === 1 || e.touches) scratch(x, y);
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [mounted, isInitialized, isRevealed]);

  // --- THE SAFETY SHIELD ---
  // If we are on the Vercel Build Server, render nothing. 
  // This stops ALL Prerender and Reference errors.
  if (!mounted) {
    return <div className="min-h-screen bg-[#E55937]" />;
  }

  return (
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} className="text-[#FFE974]" /></Link>
        <h1 className="text-2xl font-bold uppercase text-[#FFE974]">Picnic At Home</h1>
        <div className="w-8" />
      </div>

      {/* Hero Text */}
      <div className="text-center mb-8 px-4">
        <h2 className="text-[12vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter text-[#FFE974]">Scratch<br/>to Win</h2>
      </div>

      {/* Card Container */}
      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Under Layer (Prize) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <Ticket size={64} className="mb-4 text-[#E55937]" />
            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest text-[#E55937]">Prize Unlocked</p>
            <h3 className="text-3xl font-bold uppercase leading-tight mb-4 text-[#E55937]">Check the Leaders page</h3>
            <p className="text-white bg-[#E55937] px-4 py-1 rounded-full text-[10px] font-bold uppercase">Come back tomorrow</p>
        </div>

        {/* Scratch Layer */}
        <canvas 
          ref={canvasRef} 
          style={{ touchAction: 'none' }} 
          className={`absolute inset-0 cursor-crosshair transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        />
      </div>

      {/* Reveal Actions */}
      <AnimatePresence>
        {isRevealed && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="mt-10 text-center w-full px-4"
            >
                <Link href="/" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-2xl shadow-xl hover:bg-[#E55937] transition-colors">
                    Keep Playing
                </Link>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Instruction Tip */}
      {!isRevealed && (
        <div className="mt-12 p-5 bg-[#FFE974] border-4 border-black rounded-3xl flex gap-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-4">
            <Trophy size={28} className="shrink-0 text-[#E55937]" />
            <p className="text-[10px] font-bold uppercase tracking-tight leading-tight text-left text-[#E55937]">
                PLAY BURGER SLINGER TO WIN ANOTHER SCRATCH CARD
            </p>
        </div>
      )}
    </div>
  );
}
