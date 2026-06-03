'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BurgerGame() {
  const [stack, setStack] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('start'); // start, playing, lost
  const [feedback, setFeedback] = useState(null); // 'correct' or 'wrong'

  // Game Loop
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('lost');
      confetti();
    }
  }, [gameState, timeLeft]);

  // Start a new burger round
  const spawnBurger = () => {
    setFeedback(null);
    // Randomly spawn: 1 = Just Bottom Bun, 2 = Bottom Bun + Patty
    const type = Math.random() > 0.5 ? ['bottom-bun'] : ['bottom-bun', 'patty'];
    setStack(type);
  };

  const handleInput = (input) => {
    if (gameState !== 'playing') return;

    const currentStep = stack.length;
    let isCorrect = false;

    // Logic Check
    if (currentStep === 1 && stack[0] === 'bottom-bun' && input === 'patty') isCorrect = true;
    if (currentStep === 2 && stack[1] === 'patty' && input === 'bun') isCorrect = true;

    if (isCorrect) {
      const newStack = [...stack, input === 'bun' ? 'top-bun' : 'patty'];
      setStack(newStack);
      
      // If burger is finished (has 3 parts)
      if (newStack.length === 3) {
        setScore(s => s + 1);
        setFeedback('correct');
        setTimeout(() => spawnBurger(), 200);
      }
    } else {
      // WRONG MOVE = GAME OVER
      setFeedback('wrong');
      setGameState('lost');
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-200 ${feedback === 'wrong' ? 'bg-red-500' : 'bg-[#FDFCF8]'}`}>
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-white border-b-8 border-black z-20">
        <Link href="/"><ArrowLeft size={32} className="text-black" /></Link>
        <div className="flex gap-4 font-black uppercase italic tracking-tighter">
          <div className="bg-black text-white px-4 py-2 rounded-xl text-xl">{timeLeft}s</div>
          <div className="bg-red-600 text-white px-4 py-2 rounded-xl text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">Score: {score}</div>
        </div>
      </div>

      {/* Play Area */}
      <div className="flex-1 relative flex flex-col-reverse items-center pb-40">
        {/* Table/Shadow */}
        <div className="w-72 h-8 bg-black/10 rounded-full blur-2xl absolute bottom-32" />
        
        {/* The Burger Stack */}
        <div className="flex flex-col-reverse items-center mb-4 relative z-10">
          <AnimatePresence mode="popLayout">
            {stack.map((item, i) => (
              <motion.div
                key={`${gameState}-${score}-${i}`}
                initial={{ y: -600, rotate: i === 0 ? 0 : (Math.random() * 10 - 5) }}
                animate={{ y: 0 }}
                exit={{ x: feedback === 'wrong' ? 500 : 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                className={`border-[6px] border-black shadow-xl ${
                  item === 'bottom-bun' ? 'w-56 h-14 bg-[#F3A344] rounded-b-[3rem] rounded-t-xl' :
                  item === 'patty' ? 'w-52 h-10 bg-[#4B2C20] rounded-2xl mt-[-8px]' :
                  'w-56 h-16 bg-[#F3A344] rounded-t-[4rem] rounded-b-xl mt-[-10px]'
                }`}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Visual Prompt */}
        {gameState === 'playing' && (
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute top-20 bg-white border-4 border-black px-6 py-2 rounded-full font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Next: {stack.length === 1 ? 'Patty' : 'Top Bun'}?
          </motion.div>
        )}
      </div>

      {/* Mobile Controls */}
      <div className="p-8 grid grid-cols-2 gap-6 bg-white border-t-8 border-black pb-16 z-20">
        <button 
          onPointerDown={() => handleInput('bun')}
          className="bg-[#F3A344] border-[6px] border-black py-10 rounded-[2.5rem] font-black text-3xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex flex-col items-center gap-2"
        >
          BUN
          <div className="w-12 h-2 bg-black/20 rounded-full" />
        </button>
        <button 
          onPointerDown={() => handleInput('patty')}
          className="bg-[#4B2C20] text-white border-[6px] border-black py-10 rounded-[2.5rem] font-black text-3xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex flex-col items-center gap-2"
        >
          PATTY
          <div className="w-12 h-2 bg-white/10 rounded-full" />
        </button>
      </div>

      {/* Overlays */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {gameState === 'lost' && <AlertCircle size={80} className="text-red-500 mx-auto mb-4" />}
            <h1 className="text-6xl font-black italic text-white uppercase leading-none mb-2">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-6xl font-black italic text-[#E5FF44] uppercase leading-none mb-10">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            
            {gameState === 'lost' && (
              <div className="mb-10">
                <p className="text-white font-bold uppercase tracking-widest text-sm opacity-60">Final Score</p>
                <p className="text-7xl font-black text-white italic leading-none">{score}</p>
              </div>
            )}

            <button 
              onClick={() => { setGameState('playing'); setScore(0); setTimeLeft(60); spawnBurger(); }}
              className="bg-[#E5FF44] border-4 border-white text-black px-12 py-6 rounded-full font-black text-3xl uppercase italic shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              {gameState === 'start' ? 'START GAME' : 'TRY AGAIN'}
            </button>
            
            <div className="mt-12 flex flex-col gap-4">
               <Link href="/leaderboard" className="text-[#E5FF44] font-black uppercase text-sm italic tracking-widest flex items-center justify-center gap-2">
                 <Trophy size={18}/> View Leaderboard
               </Link>
               <Link href="/" className="text-white/30 font-bold uppercase text-xs tracking-widest underline">Exit to Club</Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
