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

  // --- TIMER LOGIC ---
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

  // --- DATABASE SAVING LOGIC ---
  const saveHighScore = async (finalScore) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('high_score').eq('id', user.id).single();
      if (finalScore > (profile?.high_score || 0)) {
        await supabase.from('profiles').update({ high_score: finalScore }).eq('id', user.id);
      }
    } catch (err) { console.error(err); }
  };

  // --- SPAWN LOGIC ---
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

  // --- INPUT HANDLING ---
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
      const newScore = score + 1;
      setScore(newScore);
      setTimeout(() => setIsExiting(true), 600);
      setTimeout(() => {
        setBurgerId(prev => prev + 1);
        spawnBurger();
      }, 1100);
    } else {
      setTimeout(() => setIsProcessing(false), 250);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden select-none font-sans bg-[#E55937] relative text-[#FFE974]">
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-[#FFE974] border-b-8 border-black z-50 shadow-lg">
        <Link href="/"><ArrowLeft size={32} className="text-[#E55937]" /></Link>
        <div className="flex gap-4 font-bold uppercase tracking-tighter">
          <div className="bg-[#E55937] text-[#FFE974] px-5 py-2 rounded-xl text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{timeLeft}s</div>
          <div className="bg-white text-[#E55937] px-5 py-2 rounded-xl text-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{score}</div>
        </div>
      </div>

      {/* STAGE AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden">
        <img src="/images/bbqbackground.jpg" alt="" className="absolute inset-0 w-full h-full object-cover z-0" />

        {/* BURGER STACK */}
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`round-${burgerId}`}
              initial={{ x: "-150%", opacity: 1 }}
              animate={{ x: "-50%", opacity: 1 }}
              exit={{ x: "250%", transition: { duration: 0.4, ease: "expoIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.5 } }}
              /* Responsive positioning: sits low on mobile, higher on desktop */
              className="absolute bottom-[5.5%] md:bottom-[20%] left-1/2 w-64 md:w-80 h-[350px] z-30 pointer-events-none"
            >
              {stack.map((item, i) => {
                let elev = 0;
                // Mobile heights
                if (i === 1) elev = 28; 
                if (i === 2) elev = 46;
                if (i === 3) elev = 66;

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
                    {/* Responsive image width: smaller on mobile, larger on desktop */}
                    <img src={`/images/${item.type}.svg`} alt="" className="w-44 md:w-72 h-auto block" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* COUNTER: Bigger on mobile, standard on desktop */}
        <div className="w-[140%] md:w-full z-10 relative pointer-events-none mb-[-8px] md:mb-[-10px]">
          <img src="/images/counter.svg" alt="" className="w-full h-auto block scale-110 md:scale-100" />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-[#FFE974] border-t-8 border-black pb-12 z-50 shadow-2xl">
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }} className="bg-[#4B2C20] text-white border-4 border-black py-8 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">PATTY</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }} className="bg-[#FFD700] text-black border-4 border-black py-8 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">CHEESE</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }} className="bg-white text-[#E55937] border-4 border-black py-8 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">BUN</button>
      </div>

      {/* OVERLAYS */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-10 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
            {gameState === 'won' ? (
              <div className="mb-8">
                <Trophy size={80} className="text-[#FFE974] mx-auto mb-4" />
                <h2 className="text-6xl font-bold uppercase text-[#FFE974] tracking-tighter">YOU WIN!</h2>
                <p className="text-lg font-bold uppercase text-white">Picnic Ready!</p>
              </div>
            ) : gameState === 'lost' ? (
              <div className="mb-8">
                <AlertCircle size={80} className="text-[#E55937] mx-auto mb-4" />
                <h2 className="text-6xl font-bold uppercase text-[#FFE974] tracking-tighter leading-none">GAME OVER</h2>
                <p className="text-lg font-bold uppercase text-white opacity-80 uppercase">Kitchen Exploded!</p>
              </div>
            ) : (
              <h2 className="text-7xl font-bold uppercase text-[#FFE974] tracking-tighter mb-10 leading-none">PICNIC<br/>STACKER</h2>
            )}

            <div className="mb-10 text-[#FFE974]">
              <p className="text-white/60 font-bold uppercase text-xs mb-1 tracking-widest italic text-center w-full">Total Burgers</p>
              <p className="text-9xl font-bold leading-none tracking-tighter">{score}</p>
            </div>

            <div className="flex flex-col gap-4">
              <button onClick={() => { setGameState('playing'); setScore(0); setBurgerId(0); setTimeLeft(60); spawnBurger(); }} className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-bold text-2xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-transform">
                {gameState === 'start' ? 'START SHIFT' : 'TRY AGAIN'}
              </button>
              {gameState !== 'start' && (
                <Link href="/" className="w-full flex items-center justify-center gap-2 bg-[#E55937] border-4 border-black text-white py-4 rounded-full font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Home size={16} /> Exit to Menu
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
