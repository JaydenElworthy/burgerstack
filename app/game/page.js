'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BurgerGame() {
  const [stack, setStack] = useState([]); 
  const [score, setScore] = useState(0);
  const [burgerId, setBurgerId] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('start'); 
  const [isExiting, setIsExiting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('lost');
      confetti();
    }
  }, [gameState, timeLeft]);

  const spawnBurger = () => {
    setFeedback(null);
    setIsExiting(false);
    setIsProcessing(false);
    // Spawns just the base bun
    setStack([{ type: 'bottom-bun', id: `base-${Date.now()}` }]);
  };

  const handleInput = (inputType) => {
    if (gameState !== 'playing' || isExiting || isProcessing) return;
    const currentHeight = stack.length;
    let isCorrect = false;

    if (currentHeight === 1 && inputType === 'patty') isCorrect = true;
    if (currentHeight === 2 && inputType === 'cheese') isCorrect = true;
    if (currentHeight === 3 && inputType === 'bun') isCorrect = true;

    if (isCorrect) {
      setIsProcessing(true); 
      const nextType = (inputType === 'patty') ? 'patty' : (inputType === 'cheese') ? 'cheese' : 'top-bun';
      setStack(prev => [...prev, { type: nextType, id: `piece-${Date.now()}` }]);

      if (nextType === 'top-bun') {
        setScore(s => s + 1);
        setTimeout(() => setIsExiting(true), 600);
        setTimeout(() => { setBurgerId(prev => prev + 1); spawnBurger(); }, 1100); 
      } else {
        setTimeout(() => setIsProcessing(false), 300);
      }
    } else {
      setFeedback('wrong');
      setGameState('lost');
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-300 ${feedback === 'wrong' ? 'bg-red-600' : 'bg-[#FDFCF8]'}`}>
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-white border-b-8 border-black z-30">
        <Link href="/"><ArrowLeft size={32} className="text-black" /></Link>
        <div className="flex gap-4 font-black uppercase italic tracking-tighter text-black">
          <div className="bg-black text-white px-5 py-2 rounded-xl text-2xl tracking-tighter">{timeLeft}s</div>
          <div className="bg-red-600 text-white px-5 py-2 rounded-xl text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
            {score}
          </div>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden pb-[25%]">
        {/* COUNTER SURFACE */}
        <div className="absolute bottom-[25%] w-full h-12 bg-gray-200 border-t-8 border-black z-0 shadow-2xl" />
        
        <AnimatePresence>
  {!isExiting && (
    <motion.div
      key={`burger-container-${burgerId}`}
      initial={{ x: -1200 }}
      animate={{ x: 0 }}
      exit={{ x: 2500, transition: { duration: 0.4, ease: "expoIn" } }}
      transition={{ x: { type: "tween", ease: "circOut", duration: 0.4 } }}
      className="relative w-full h-[300px] z-10" 
    >
      {stack.map((item, i) => {
        let elevation = 0;
        if (item.type === 'bottom-bun') elevation = 0;
        if (item.type === 'patty')      elevation = 30;
        if (item.type === 'cheese')     elevation = 55;
        if (item.type === 'top-bun')    elevation = 75;

        return (
          <motion.div
            key={item.id}
            initial={i !== 0 ? { y: -1000, x: "-50%" } : { x: "-50%" }}
            animate={{ y: -elevation, x: "-50%" }}
            transition={{ 
              y: { type: "tween", ease: "circIn", duration: 0.25 }
            }}
            style={{ zIndex: i }}
            className="absolute bottom-0 left-1/2"
          >
            <img 
              src={`/images/${item.type}.svg`} 
              alt={item.type} 
              className="w-80 h-auto block max-w-none" 
              style={{ transform: 'translateX(0)' }} 
            />
          </motion.div>
        );
      })}
    </motion.div>
  )}
</AnimatePresence>
      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-white border-t-8 border-black pb-12 z-30 shadow-2xl">
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }}
          className="bg-[#4B2C20] text-white border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
        >
          Patty
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }}
          className="bg-[#FFD700] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
        >
          Cheese
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }}
          className="bg-[#F3A344] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
        >
          Bun
        </button>
      </div>

      {/* OVERLAY */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2 tracking-tighter">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10 tracking-tighter">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            <button 
              onClick={() => { setGameState('playing'); setScore(0); setBurgerId(0); setTimeLeft(60); spawnBurger(); }}
              className="bg-[#E5FF44] border-4 border-white text-black px-14 py-6 rounded-full font-black text-3xl uppercase italic shadow-2xl active:scale-95 transition-all tracking-tighter"
            >
              {gameState === 'start' ? 'START' : 'RETRY'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
