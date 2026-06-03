'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BurgerGame() {
  const [stack, setStack] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('start');

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setGameState('end');
      if (score > 10) confetti();
    }
  }, [gameState, timeLeft]);

  const addIngredient = (type) => {
    if (gameState !== 'playing') return;
    const currentStep = stack.length;
    if ((currentStep === 0 && type === 'bun') || (currentStep === 1 && type === 'patty') || (currentStep === 2 && type === 'bun')) {
      const newStack = [...stack, type];
      setStack(newStack);
      if (newStack.length === 3) {
        setScore(s => s + 1);
        setTimeout(() => setStack(Math.random() > 0.5 ? ['bun'] : []), 100);
      }
    }
  };

  return (
    <div className="h-screen bg-[#FDFCF8] flex flex-col overflow-hidden select-none">
      <div className="p-6 flex justify-between items-center bg-white border-b-4 border-black z-10">
        <Link href="/"><ArrowLeft className="text-black" /></Link>
        <div className="flex gap-3 font-black uppercase text-sm italic tracking-tighter">
          <span className="bg-black text-white px-4 py-1 rounded-full">{timeLeft}s Left</span>
          <span className="bg-red-600 text-white px-4 py-1 rounded-full">Score: {score}</span>
        </div>
      </div>
      <div className="flex-1 relative flex flex-col-reverse items-center pb-32">
        <div className="w-64 h-6 bg-black/5 rounded-full blur-xl absolute bottom-24" />
        <div className="flex flex-col-reverse items-center mb-4">
          <AnimatePresence>
            {stack.map((item, i) => (
              <motion.div key={i} initial={{ y: -300, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`w-48 border-4 border-black ${item === 'bun' ? (i === 0 ? 'rounded-b-3xl rounded-t-xl h-12 bg-[#F3A344]' : 'rounded-t-3xl rounded-b-xl h-14 bg-[#F3A344]') : 'h-8 bg-[#4B2C20] rounded-2xl w-44'}`} style={{ marginBottom: '-10px', zIndex: i }} />
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div className="p-6 grid grid-cols-2 gap-4 bg-white border-t-4 border-black pb-12 z-10">
        <button onPointerDown={() => addIngredient('bun')} className="bg-[#F3A344] border-4 border-black py-10 rounded-2xl font-black text-3xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Bun</button>
        <button onPointerDown={() => addIngredient('patty')} className="bg-[#4B2C20] text-white border-4 border-black py-10 rounded-2xl font-black text-3xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">Patty</button>
      </div>
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center">
          <h1 className="text-7xl font-black italic text-white uppercase leading-none mb-2">{gameState === 'start' ? 'BURGER' : 'TIME UP'}</h1>
          <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10">{gameState === 'start' ? 'STACKER' : `SCORE: ${score}`}</h1>
          <button onClick={() => { setGameState('playing'); setScore(0); setTimeLeft(60); setStack([]); }} className="bg-[#E5FF44] border-4 border-white text-black px-12 py-6 rounded-full font-black text-3xl uppercase italic shadow-2xl hover:scale-105 transition-transform">
            {gameState === 'start' ? 'START GAME' : 'PLAY AGAIN'}
          </button>
          <Link href="/" className="mt-10 text-white/40 uppercase text-xs font-black tracking-widest hover:text-white transition-colors">Exit to Club Dashboard</Link>
        </div>
      )}
    </div>
  );
}