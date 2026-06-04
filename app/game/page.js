'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Trophy, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BurgerGame() {
  const [stack, setStack] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('start'); 
  const [isExiting, setIsExiting] = useState(false);
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
    setIsExiting(false);
    setFeedback(null);
    // Spawns either a bottom bun OR a bottom bun with a patty already on it
    const type = Math.random() > 0.5 ? ['bottom-bun'] : ['bottom-bun', 'patty'];
    setStack(type);
  };

  const handleInput = (input) => {
    if (gameState !== 'playing' || isExiting) return;

    const currentStep = stack.length;
    let isCorrect = false;

    // Logic: If 1 item (bun), need patty. If 2 items (bun+patty), need bun.
    if (currentStep === 1 && stack[0] === 'bottom-bun' && input === 'patty') isCorrect = true;
    if (currentStep === 2 && stack[1] === 'patty' && input === 'bun') isCorrect = true;

    if (isCorrect) {
      const nextItem = (currentStep === 2) ? 'top-bun' : 'patty';
      const newStack = [...stack, nextItem];
      setStack(newStack);
      
      if (nextItem === 'top-bun') {
        setScore(s => s + 1);
        // Small delay to let the top bun "land" before flying off
        setTimeout(() => setIsExiting(true), 250);
        setTimeout(() => spawnBurger(), 600);
      }
    } else {
      setFeedback('wrong');
      setGameState('lost');
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-200 ${feedback === 'wrong' ? 'bg-red-600' : 'bg-[#FDFCF8]'}`}>
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-white border-b-8 border-black z-30">
        <Link href="/"><ArrowLeft size={32} className="text-black" /></Link>
        <div className="flex gap-4 font-black uppercase italic tracking-tighter">
          <div className="bg-black text-white px-4 py-2 rounded-xl text-xl tracking-tighter">{timeLeft}s</div>
          <motion.div 
            key={score}
            initial={{ scale: 1.8 }} animate={{ scale: 1 }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
          >
            {score}
          </motion.div>
        </div>
      </div>

      {/* Play Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        
        {/* The Kitchen Counter */}
        <div className="absolute bottom-[35%] w-full h-10 bg-black/10 border-t-8 border-black/5 z-0" />
        
        <AnimatePresence mode="wait">
          {!isExiting && (
            <motion.div
              key={`burger-container-${score}`}
              initial={{ x: -1000 }}
              animate={{ x: 0 }}
              exit={{ x: 2000, rotate: 10 }}
              transition={{ 
                x: { type: "spring", damping: 20, stiffness: 120 },
                exit: { duration: 0.3, ease: "circIn" } 
              }}
              className="flex flex-col-reverse items-center relative z-10 pt-40" 
            >
              {stack.map((item, i) => (
                <motion.div
                  key={`${item}-${i}`}
                  initial={i === stack.length - 1 && i !== 0 ? { y: -700 } : {}}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 150 }}
                  style={{ zIndex: i }}
                  className={`border-[6px] border-black shadow-2xl relative ${
                    item === 'bottom-bun' ? 'w-56 h-14 bg-[#F3A344] rounded-b-[3rem] rounded-t-xl mb-0' :
                    item === 'patty' ? 'w-52 h-10 bg-[#4B2C20] rounded-2xl -mb-4' :
                    'w-58 h-20 bg-[#F3A344] rounded-t-[4rem] rounded-b-xl -mb-6'
                  }`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === 'playing' && !isExiting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-20 bg-[#E5FF44] border-4 border-black px-6 py-2 rounded-full font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20"
          >
            {stack.length === 1 ? 'DROP PATTY' : 'TOP BUN!'}
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 grid grid-cols-2 gap-6 bg-white border-t-8 border-black pb-16 z-30">
        <button 
          onPointerDown={() => handleInput('bun')}
          className="bg-[#F3A344] border-[8px] border-black py-10 rounded-[2.5rem] font-black text-4xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all"
        >
          BUN
        </button>
        <button 
          onPointerDown={() => handleInput('patty')}
          className="bg-[#4B2C20] text-white border-[8px] border-black py-10 rounded-[2.5rem] font-black text-4xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all"
        >
          PATTY
        </button>
      </div>

      {/* Game Over Overlay */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white font-sans">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            {gameState === 'lost' && <AlertCircle size={100} className="text-red-600 mx-auto mb-6" />}
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            
            {gameState === 'lost' && (
              <div className="mb-12">
                <p className="text-white/40 font-black uppercase text-sm tracking-widest mb-2">Orders Completed</p>
                <p className="text-9xl font-black italic text-[#E5FF44] leading-none">{score}</p>
              </div>
            )}

            <button 
              onClick={() => { setGameState('playing'); setScore(0); setTimeLeft(60); spawnBurger(); }}
              className="bg-[#E5FF44] border-4 border-white text-black px-12 py-6 rounded-full font-black text-3xl uppercase italic shadow-2xl active:scale-95 transition-all"
            >
              {gameState === 'start' ? 'START KITCHEN' : 'RETRY'}
            </button>
            
            <div className="mt-12 flex flex-col gap-6">
               <Link href="/leaderboard" className="text-[#E5FF44] font-black uppercase text-xs italic tracking-[0.2em] underline decoration-2 underline-offset-8">
                 Leaderboard
               </Link>
               <Link href="/" className="text-white/30 font-bold uppercase text-[10px] tracking-widest">Dashboard</Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}          >
            Score: {score}
          </motion.div>
        </div>
      </div>

      {/* Play Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        
        {/* The Counter Top */}
        <div className="absolute bottom-40 w-full h-8 bg-black/10 border-t-4 border-black/5 z-0" />
        
        {/* Burger Slide Logic */}
        <AnimatePresence mode="wait">
          {!isExiting && (
            <motion.div
              key={score} // Forces a re-mount for the slide-in
              initial={{ x: -600 }}
              animate={{ x: 0 }}
              exit={{ x: 800 }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              className="flex flex-col-reverse items-center relative z-10"
            >
              {stack.map((item, i) => (
                <motion.div
                  key={i}
                  initial={i === stack.length - 1 && i !== 0 ? { y: -500 } : {}}
                  animate={{ y: 0 }}
                  className={`border-[6px] border-black shadow-lg ${
                    item === 'bottom-bun' ? 'w-52 h-14 bg-[#F3A344] rounded-b-[3rem] rounded-t-xl' :
                    item === 'patty' ? 'w-48 h-10 bg-[#4B2C20] rounded-2xl mt-[-8px]' :
                    'w-52 h-16 bg-[#F3A344] rounded-t-[4rem] rounded-b-xl mt-[-10px]'
                  }`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Prompt */}
        {gameState === 'playing' && !isExiting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute top-20 bg-white border-4 border-black px-6 py-2 rounded-full font-black uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-20"
          >
            Add {stack.length === 1 ? 'Patty' : 'Top Bun'}!
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="p-8 grid grid-cols-2 gap-6 bg-white border-t-8 border-black pb-16 z-30">
        <button 
          onPointerDown={() => handleInput('bun')}
          className="bg-[#F3A344] border-[6px] border-black py-10 rounded-[2.5rem] font-black text-3xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none"
        >
          BUN
        </button>
        <button 
          onPointerDown={() => handleInput('patty')}
          className="bg-[#4B2C20] text-white border-[6px] border-black py-10 rounded-[2.5rem] font-black text-3xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none"
        >
          PATTY
        </button>
      </div>

      {/* Overlays */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            {gameState === 'lost' && <AlertCircle size={80} className="text-red-500 mx-auto mb-4" />}
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            
            {gameState === 'lost' && (
              <div className="mb-10">
                <p className="text-white/40 font-black uppercase tracking-widest text-xs">Final Score</p>
                <p className="text-8xl font-black italic text-[#E5FF44]">{score}</p>
              </div>
            )}

            <button 
              onClick={() => { setGameState('playing'); setScore(0); setTimeLeft(60); spawnBurger(); }}
              className="bg-[#E5FF44] border-4 border-white text-black px-12 py-6 rounded-full font-black text-3xl uppercase italic shadow-2xl active:scale-95 transition-all"
            >
              {gameState === 'start' ? 'START GAME' : 'PLAY AGAIN'}
            </button>
            
            <div className="mt-12 flex flex-col gap-4">
               <Link href="/leaderboard" className="text-[#E5FF44] font-black uppercase text-sm italic tracking-widest flex items-center justify-center gap-2 underline">
                 <Trophy size={18}/> Hall of Fame
               </Link>
               <Link href="/" className="text-white/20 font-bold uppercase text-xs tracking-widest">Back to Club</Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
