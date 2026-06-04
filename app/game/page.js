'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BurgerGame() {
  const [stack, setStack] = useState([]); // Array of { type, id }
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

  // Spawns a base (slides in from left)
  const spawnBurger = () => {
    setIsExiting(false);
    setFeedback(null);
    // Base is either just Bottom Bun OR Bun + Patty
    const initialStack = [{ type: 'bottom-bun', id: Date.now() }];
    if (Math.random() > 0.5) {
      initialStack.push({ type: 'patty', id: Date.now() + 1 });
    }
    setStack(initialStack);
  };

  const handleInput = (input) => {
    if (gameState !== 'playing' || isExiting) return;

    const currentStep = stack.length;
    let isCorrect = false;

    // LOGIC: 
    // If table has 1 item (Bun) -> Need PATTY button.
    // If table has 2 items (Bun+Patty) -> Need BUN button (Top Bun).
    if (currentStep === 1 && stack[0].type === 'bottom-bun' && input === 'patty') isCorrect = true;
    if (currentStep === 2 && stack[1].type === 'patty' && input === 'bun') isCorrect = true;

    if (isCorrect) {
      const nextType = (input === 'bun') ? 'top-bun' : 'patty';
      const newItem = { type: nextType, id: Date.now() };
      
      setStack(prev => [...prev, newItem]);
      
      // AUTO-FINISH: If we just added the top bun
      if (nextType === 'top-bun') {
        setScore(s => s + 1);
        
        // 1. Pause for impact
        // 2. Exponentially slide out
        // 3. New burger slides in
        setTimeout(() => setIsExiting(true), 350); 
        setTimeout(() => spawnBurger(), 850); 
      }
    } else {
      // WRONG INGREDIENT = GAME OVER
      setFeedback('wrong');
      setGameState('lost');
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-300 ${feedback === 'wrong' ? 'bg-red-600' : 'bg-[#FDFCF8]'}`}>
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-white border-b-8 border-black z-30">
        <Link href="/"><ArrowLeft size={32} className="text-black" /></Link>
        <div className="flex gap-4 font-black uppercase italic tracking-tighter">
          <div className="bg-black text-white px-5 py-2 rounded-xl text-2xl tracking-tighter">{timeLeft}s</div>
          <motion.div 
            key={score}
            initial={{ scale: 1.5 }} animate={{ scale: 1 }}
            className="bg-red-600 text-white px-5 py-2 rounded-xl text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black"
          >
            {score}
          </motion.div>
        </div>
      </div>

      {/* PLAY AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden pb-[32%]">
        
        {/* COUNTER TOP */}
        <div className="absolute bottom-[32%] w-full h-16 bg-[#F3F3F3] border-t-8 border-black z-0 shadow-2xl">
            <div className="w-full h-3 bg-white/50" /> 
        </div>
        
        <AnimatePresence mode="wait">
          {!isExiting && (
            <motion.div
              key={`kitchen-pass-${score}`}
              initial={{ x: -1200 }}
              animate={{ x: 0 }}
              exit={{ 
                x: 1800, 
                transition: { duration: 0.5, ease: "expoIn" } 
              }}
              transition={{ x: { type: "spring", damping: 22, stiffness: 100 } }}
              className="flex flex-col-reverse items-center relative z-10 origin-bottom" 
            >
              {stack.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={i === stack.length - 1 && i !== 0 ? { y: -800 } : {}}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", damping: 14, stiffness: 200 }}
                  style={{ zIndex: i }}
                  className={`border-[6px] border-black shadow-lg relative flex-shrink-0 ${
                    item.type === 'bottom-bun' ? 'w-60 h-16 bg-[#F3A344] rounded-b-[2.5rem] rounded-t-xl' :
                    item.type === 'patty' ? 'w-56 h-12 bg-[#4B2C20] rounded-2xl -mb-4' :
                    'w-60 h-22 bg-[#F3A344] rounded-t-[4.5rem] rounded-b-xl -mb-8'
                  }`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-8 grid grid-cols-2 gap-8 bg-white border-t-8 border-black pb-16 z-30">
        <button 
          onPointerDown={() => handleInput('bun')}
          className="bg-[#F3A344] border-[8px] border-black py-12 rounded-[2.5rem] font-black text-4xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all"
        >
          BUN
        </button>
        <button 
          onPointerDown={() => handleInput('patty')}
          className="bg-[#4B2C20] text-white border-[8px] border-black py-12 rounded-[2.5rem] font-black text-4xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all"
        >
          PATTY
        </button>
      </div>

      {/* MENU OVERLAYS */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            {gameState === 'lost' && <AlertCircle size={100} className="text-red-600 mx-auto mb-6" />}
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2 tracking-tighter">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10 tracking-tighter">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            
            {gameState === 'lost' && (
              <div className="mb-12">
                <p className="text-white/40 font-black uppercase text-xs tracking-widest mb-2">Orders Completed</p>
                <p className="text-9xl font-black italic text-[#E5FF44] leading-none tracking-tighter">{score}</p>
              </div>
            )}

            <button 
              onClick={() => { setGameState('playing'); setScore(0); setTimeLeft(60); spawnBurger(); }}
              className="bg-[#E5FF44] border-4 border-white text-black px-14 py-6 rounded-full font-black text-3xl uppercase italic shadow-2xl active:scale-95 transition-all"
            >
              {gameState === 'start' ? 'START' : 'RETRY'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
