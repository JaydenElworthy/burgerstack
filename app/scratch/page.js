'use client'
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Ticket, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ScratchCard() {
  const canvasRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [prize, setPrize] = useState({ title: 'FREE SIDE', code: 'NBHD-772' });
  const [isScratching, setIsScratching] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 1. Setup Canvas Size
    canvas.width = 320;
    canvas.height = 320;

    // 2. Draw the "Scratch Layer" (The top)
    ctx.fillStyle = '#222'; // Dark Grey
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some "Brand Texture" to the top
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#444';
    for(let i=0; i<5; i++) {
        ctx.fillText('SCRATCH HERE', 60, 60 + (i*60));
    }

    // 3. Scratching Logic
    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      checkScratchPercentage();
    };

    const checkScratchPercentage = () => {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let clearPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) clearPixels++;
      }
      if (clearPixels > (pixels.length / 4) * 0.5) {
        if (!isRevealed) {
            setIsRevealed(true);
            confetti();
        }
      }
    };

    const handleMove = (e) => {
      if (!isScratching) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.pageX || e.touches[0].pageX) - rect.left;
      const y = (e.pageY || e.touches[0].pageY) - rect.top;
      scratch(x, y);
    };

    canvas.addEventListener('mousedown', () => setIsScratching(true));
    canvas.addEventListener('touchstart', () => setIsScratching(true));
    window.addEventListener('mouseup', () => setIsScratching(false));
    window.addEventListener('touchend', () => setIsScratching(false));
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove);

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [isScratching, isRevealed]);

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center p-6 font-sans">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10">
        <Link href="/"><ArrowLeft size={30} /></Link>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter italic">Daily Drop</h1>
        <div className="w-8" />
      </div>

      <div className="text-center mb-8">
        <p className="font-black uppercase text-xs tracking-widest text-red-600 mb-1">One go per day</p>
        <h2 className="text-4xl font-black italic uppercase leading-none">Scratch<br/>to Win</h2>
      </div>

      {/* The Scratch Card Container */}
      <div className="relative w-80 h-80 bg-white border-8 border-black rounded-[2rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Underneath Layer (The Prize) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <Ticket size={60} className="mb-4 text-red-600" />
            <p className="text-sm font-bold uppercase opacity-40">You Won!</p>
            <h3 className="text-4xl font-black italic uppercase leading-tight mb-4">{prize.title}</h3>
            <div className="bg-black text-[#E5FF44] px-4 py-2 rounded-lg font-mono font-bold tracking-widest">
                {prize.code}
            </div>
        </div>

        {/* Scratchable Canvas Layer */}
        <canvas 
          ref={canvasRef} 
          className={`absolute inset-0 cursor-crosshair transition-opacity duration-500 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        />
      </div>

      {/* Post-Scratch Actions */}
      {isRevealed && (
        <motion.div 
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="mt-10 text-center space-y-4 w-full"
        >
            <Link href="/wallet" className="block w-full bg-black text-white p-5 rounded-2xl font-black uppercase italic text-xl shadow-xl">
                Add to Wallet
            </Link>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest px-10">
                This prize has been linked to your account. Show the code to staff to redeem.
            </p>
        </motion.div>
      )}

      {/* Fun Fact / Tip */}
      {!isRevealed && (
        <div className="mt-12 p-6 bg-[#E5FF44] border-4 border-black rounded-3xl flex gap-4 items-center">
            <Trophy size={24} className="shrink-0" />
            <p className="text-xs font-black uppercase tracking-tight leading-tight">
                New prizes added every morning! Come back tomorrow for another go.
            </p>
        </div>
      )}
    </div>
  );
}
