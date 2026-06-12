'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Trophy, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';

export default function BurgerGame() {
  const [stack, setStack] = useState([]); 
  const [score, setScore] = useState(0);
  const [burgerId, setBurgerId] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState('start'); 
  const [isExiting, setIsExiting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [baseCount, setBaseCount] = useState(0);

  // 1. Database operations
  const saveHighScore = async (finalScore) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('high_score').eq('id', user.id).single();
      if (finalScore > (profile?.high_score || 0)) {
        await supabase.from('profiles').update({ high_score: finalScore }).eq('id', user.id);
      }
    } catch (err) { 
      console.error(err); 
    }
  };

  // 2. Game initialization
  const spawnBurger = () => {
    setIsExiting(false);
    setIsProcessing(false);
    const startLevel = Math.floor(Math.random() * 4); 
    let initialStack = [];
    if (startLevel >= 1) initialStack.push({ type: 'bottom-bun', id: `b0-${Date.now()}` });
    if (startLevel >= 2) initialStack.push({ type: 'patty', id: `b1-${Date.now()}` });
    if (startLevel >= 3) initialStack.push({ type: 'cheese', id: `b2-${Date.now()}` });
    setStack(initialStack);
    setBaseCount(initialStack.length); 
  };

  // 3. Engine timer loop
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('won');
      confetti();
      saveHighScore(score);
    }
  }, [gameState, timeLeft, score]);

  // 4. Input pipeline handler
  const handleInput = (inputType) => {
    if (gameState !== 'playing' || isExiting || isProcessing) return;
    
    const len = stack.length;
    let nextPiece = "";

    if (len === 0 && inputType === 'bun') nextPiece = 'bottom-bun';
    else if (len === 1 && inputType === 'patty') nextPiece = 'patty';
    else if (len === 2 && inputType === 'cheese') nextPiece = 'cheese';
    else if (len === 3 && inputType === 'bun') nextPiece = 'top-bun';

    if (nextPiece === "") {
      setGameState('lost');
      saveHighScore(score);
      return;
    }

    setIsProcessing(true);
    setStack(prev => [...prev, { type: nextPiece, id: `d-${Date.now()}` }]);

    if (nextPiece === 'top-bun') {
      setScore(prev => prev + 1);
      setTimeout(() => {
        setIsExiting(true);
      }, 600);
      setTimeout(() => {
        setBurgerId(prev => prev + 1);
        spawnBurger();
      }, 1100);
    } else {
      setTimeout(() => {
        setIsProcessing(false);
      }, 250);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden select-none font-sans bg-[#E55937] relative text-[#FFE974]">
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-[#FFE974] border-b-8 border-black z-50 shadow-lg font-bold">
        <Link href="/"><ArrowLeft size={32} className="text-[#E55937]" /></Link>
        <div className="flex gap-4 uppercase tracking-tighter">
          <div className="bg-[#E55937] text-[#FFE974] px-5 py-2 rounded-xl text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{timeLeft}s</div>
          <div className="bg-white text-[#E55937] px-5 py-2 rounded-xl text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{score}</div>
        </div>
      </div>

      {/* STAGE AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden">
        <img src="/images/bbqbackground.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover z-0" />

        <div className="relative w-full flex flex-col items-center justify-end">
          
          <AnimatePresence>
            {!isExiting && (
              <motion.div
                key={`round-${burgerId}`}
                initial={{ x: "-150%", opacity: 1 }}
                animate={{ x: "-50%", opacity: 1 }}
                exit={{ x: "250%", transition: { duration: 0.4, ease: "expoIn" } }}
                transition={{ x: { type: "tween", ease: "circOut", duration: 0.5 } }}
                className="absolute bottom-[40px] md:bottom-[60px] left-1/2 w-64 md:w-80 h-[300px] z-30 pointer-events-none"
              >
                {stack.map((item, i) => {
                  let elev = 0;
                  if (i === 1) elev = 22; 
                  if (i === 2) elev = 38;
                  if (i === 3) elev = 58;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={i < baseCount ? false : { y: -1000 }}
                      animate={{ y: -elev }}
                      transition={{ y: { type: "tween", ease: "circIn", duration: 0.25 } }}
                      className="absolute bottom-0 left-0 w-full flex justify-center"
                      style={{ zIndex: i }}
                    >
                      <img src={`/images/${item.type}.svg`} alt="" className="w-44 md:w-64 h-auto block" />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* counter.svg removed. Stage layout adjusted so burger rests properly without it. */}
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-[#FFE974] border-t-8 border-black pb-12 z-50 shadow-2xl">
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }} className="bg-[#4B2C20] text-white border-4 border-black py-8 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">PATTY</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }} className="bg-[#FFD700] text-black border-4 border-black py-8 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">CHEESE</button>
<button
  style={{ fontWeight: 900 }}
  className="bg-white text-[#E55937] border-4 border-black py-8 rounded-2xl text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
>
  BUN
</button>      </div>

      {/* OVERLAYS */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-10 text-center text-white">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm font-sans">
            
            <div className="mb-8">
              {gameState === 'won' ? (
                <div className="flex flex-col items-center gap-2">
                  <Trophy size={64} className="text-[#FFE974]" />
                  <h1 className="text-4xl font-black tracking-wider text-[#FFE974]">SHIFT COMPLETE!</h1>
                  <p className="text-xl">Final Orders Filled: {score}</p>
                </div>
              ) : gameState === 'lost' ? (
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle size={64} className="text-[#E55937]" />
                  <h1 className="text-4xl font-black tracking-wider text-[#E55937]">RUINED ORDER!</h1>
                  <p className="text-xl">You messed up the recipe stack.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <h1 className="text-5xl font-black tracking-widest text-[#FFE974] mb-2">BURGER SLINGER</h1>
                  <p className="text-sm max-w-xs opacity-70">STACK 25 BURGERS IN THE CORRECT ORDER TO WIN A BONUS SCRATCH CARD</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => { setScore(0); setTimeLeft(60); setGameState('playing'); spawnBurger(); }} 
              className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-black text-xl tracking-wide shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-white transition-colors mb-4"
            >
              {gameState === 'start' ? 'START SHIFT' : 'TRY AGAIN'}
            </button>
            
            <h2 className="text-xl font-black uppercase text-[#FFE974] mt-6 mb-2">STACK IN ORDER</h2>
                
            <h3 className="text-s font-white w-full text-center text-xs font-medium uppercase text-white opacity-80 tracking-wider mb-4 leading-relaxed block px-2">
Bun &rarr; Patty &rarr; Cheese &rarr; Bun </h3>


            {gameState !== 'start' && (
              <Link href="/" className="w-full flex items-center justify-center gap-2 bg-[#E55937] border-4 border-black text-white py-4 rounded-full font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-[#ff6e4a] transition-colors">
                <Home size={16} /> Exit to Menu
              </Link>
            )}

          </motion.div>
        </div>
      )}

    </div>
  );
}
