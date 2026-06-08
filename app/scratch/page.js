'use client'
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Ticket, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ScratchCard() {
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!isInitialized) {
      canvas.width = 320;
      canvas.height = 320;
      ctx.fillStyle = '#222'; // Dark charcoal scratch layer
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#444';
      for(let i=0; i<6; i++) { ctx.fillText('PICNIC • PICNIC • PICNIC', -20, 40 + (i*60)); }
      setIsInitialized(true);
    }

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, 35, 0, Math.PI * 2); ctx.fill();
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0;
      for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) clear++; }
      if (clear > (pixels.length / 4) * 0.5 && !isRevealed) {
        setIsRevealed(true);
        confetti();
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
  }, [mounted, isInitialized, isRevealed]);

  if (!mounted) return <div className="min-h-screen bg-[#E55937]" />;

  return (
    <div className="min-h-screen bg-[#E55937] flex flex-col items-center p-6 font-sans overflow-hidden">
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} className="text-[#FFE974]" /></Link>
        <h1 className="text-2xl font-bold uppercase tracking-tighter text-[#FFE974]">Daily Drop</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8 px-4">
        <p className="font-bold uppercase text-[10px] tracking-widest text-white mb-1">One go per day</p>
        <h2 className="text-[12vw] sm:text-5xl font-bold uppercase leading-[0.8] tracking-tighter text-[#FFE974]">Scratch<br/>to Win</h2>
      </div>

      <div className="relative w-80 h-80 bg-[#FFE974] border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <Ticket size={64} className="mb-4 text-[#E55937]" />
            <p className="text-[10px] font-black uppercase text-[#E55937] opacity-60 tracking-widest">Prize Unlocked</p>
            <h3 className="text-3xl font-bold uppercase leading-tight mb-4 text-[#E55937]">Check the Leaders page</h3>
            <p className="text-white bg-[#E55937] px-4 py-1 rounded-full text-[10px] font-bold uppercase">Come back tomorrow</p>
        </div>

        <canvas ref={canvasRef} style={{ touchAction: 'none' }} className={`absolute inset-0 cursor-crosshair transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} />
      </div>

      {isRevealed && (
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-10 text-center w-full px-4">
          <Link href="/" className="block w-full bg-black text-[#FFE974] p-5 rounded-2xl font-bold uppercase italic text-2xl shadow-xl">
            Keep Playing
          </Link>
        </motion.div>
      )}
    </div>
  );
}    };

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
    return <div className="min-h-screen bg-[#FDFCF8]" />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center p-6 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} className="text-black" /></Link>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">Daily Drop</h1>
        <div className="w-8" />
      </div>

      {/* Hero Text */}
      <div className="text-center mb-8 px-4">
        <p className="font-black uppercase text-[10px] tracking-widest text-red-600 mb-1 leading-none">One go per day</p>
        <h2 className="text-[12vw] sm:text-5xl font-black italic uppercase leading-[0.8] tracking-tighter">Scratch<br/>to Win</h2>
      </div>

      {/* Card Container */}
      <div className="relative w-80 h-80 bg-white border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Under Layer (Prize) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <Ticket size={64} className="mb-4 text-red-600" />
            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Prize Unlocked</p>
            <h3 className="text-4xl font-black italic uppercase leading-tight mb-4 tracking-tighter">{prize.title}</h3>
            <div className="bg-black text-[#E5FF44] px-6 py-2 rounded-xl font-mono font-bold tracking-[0.2em] shadow-lg">
                {prize.code}
            </div>
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
              className="mt-10 text-center space-y-4 w-full px-4"
            >
                <Link href="/wallet" className="block w-full bg-black text-white p-5 rounded-2xl font-black uppercase italic text-2xl shadow-xl hover:bg-red-600 transition-colors">
                    Add to Wallet
                </Link>
                <p className="text-[10px] font-black uppercase opacity-30 tracking-[0.1em] px-8 leading-relaxed">
                    This reward is now saved in your wallet. Show it to the team at the counter to redeem.
                </p>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Instruction Tip */}
      {!isRevealed && (
        <div className="mt-12 p-5 bg-[#E5FF44] border-4 border-black rounded-3xl flex gap-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-4">
            <Trophy size={28} className="shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight leading-tight text-left">
                Scratch the card to reveal your daily prize!
            </p>
        </div>
      )}
    </div>
  );
}
