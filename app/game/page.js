'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function BurgerGame() {
  const [stack, setStack] = useState([]); 
  const [score, setScore] = useState(0);
  const [burgerId, setBurgerId] = useState(0); // NEW: Track rounds separately from score
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
    // Reset stack to just the bottom bun base
    setStack([{ type: 'bottom-bun', id: `base-${Date.now()}` }]);
  };

  const handleInput = (inputType) => {
    if (gameState !== 'playing' || isExiting || isProcessing) return;

    const currentHeight = stack.length;
    let isCorrect = false;

    // 1. Logic Check
    if (currentHeight === 1 && inputType === 'patty') isCorrect = true;
    if (currentHeight === 2 && inputType === 'bun') isCorrect = true;

    if (isCorrect) {
      setIsProcessing(true); 
      const nextPieceType = (currentHeight === 2) ? 'top-bun' : 'patty';
      const newPiece = { type: nextPieceType, id: `piece-${Date.now()}` };
      
      setStack(prev => [...prev, newPiece]);

      if (nextPieceType === 'top-bun') {
        // --- THE FIX SEQUENCE ---
        // 1. Increment score (HUD updates, but burger stays)
        setScore(s => s + 1);

        // 2. Wait for the Bun to land (600ms)
        setTimeout(() => {
          setIsExiting(true);
        }, 600);

        // 3. After it flies off, change the Burger ID and Spawn New
        setTimeout(() => {
          setBurgerId(prev => prev + 1); // This triggers the exit of the OLD and entry of NEW
          spawnBurger();
        }, 1100); 
      } else {
        // Patty landed, unlock buttons after 400ms
        setTimeout(() => setIsProcessing(false), 400);
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
        <div className="flex gap-4 font-black uppercase italic tracking-tighter">
          <div className="bg-black text-white px-5 py-2 rounded-xl text-2xl tracking-tighter shadow-lg">{timeLeft}s</div>
          <div className="bg-red-600 text-white px-5 py-2 rounded-xl text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black">
            {score}
          </div>
        </div>
      </div>

      {/* PLAY AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden pb-[32%]">
        <div className="absolute bottom-[32%] w-full h-16 bg-[#EFEFEF] border-t-8 border-black z-0 shadow-2xl" />
        
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`burger-round-${burgerId}`} // FIXED: Key linked to round, not score
              initial={{ x: -1200 }}
              animate={{ x: 0 }}
              exit={{ x: 2500, transition: { duration: 0.4, ease: "expoIn" } }}
              transition={{ x: { type: "spring", damping: 25, stiffness: 120 } }}
              className="flex flex-col-reverse items-center relative z-10 origin-bottom" 
            >
              {stack.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={i !== 0 ? { y: -1000 } : {}}
                  animate={{ y: 0 }}
                  transition={{ y: { type: "spring", damping: 12, stiffness: 200 } }}
                  style={{ zIndex: i }}
                  className={`border-[6px] border-black shadow-xl relative flex-shrink-0 ${
                    item.type === 'bottom-bun' ? 'w-64 h-16 bg-[#F3A344] rounded-b-[2.5rem] rounded-t-xl mb-0' :
                    item.type === 'patty' ? 'w-60 h-12 bg-[#4B2C20] rounded-2xl -mb-4' :
                    'w-64 h-28 bg-[#F3A344] rounded-t-[6rem] rounded-b-2xl -mb-12 overflow-hidden'
                  }`}
                >
                  {item.type === 'top-bun' && (
                    <div className="absolute top-4 left-0 w-full h-full flex flex-wrap justify-center gap-4 px-8 opacity-40">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-2 h-3 bg-white rounded-full rotate-45" />
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-8 grid grid-cols-2 gap-8 bg-white border-t-8 border-black pb-16 z-30">
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }}
          className={`bg-[#F3A344] border-[8px] border-black py-12 rounded-[2.5rem] font-black text-4xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all text-black ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
        >
          BUN
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }}
          className={`bg-[#4B2C20] text-white border-[8px] border-black py-12 rounded-[2.5rem] font-black text-4xl uppercase italic shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
        >
          PATTY
        </button>
      </div>

      {/* OVERLAYS */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2 tracking-tighter italic">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10 tracking-tighter italic">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            
            {gameState === 'lost' && (
              <div className="mb-12">
                <p className="text-white/40 font-black uppercase text-xs tracking-widest mb-2 italic">Burgers Made</p>
                <p className="text-9xl font-black italic text-[#E5FF44] leading-none tracking-tighter">{score}</p>
              </div>
            )}

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
