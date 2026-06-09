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
  const [feedback, setFeedback] = useState(null);
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
    setFeedback(null);
    setIsExiting(false);
    setIsProcessing(false);
    
    const startLevel = Math.floor(Math.random() * 4); 
    let initialStack = [];
    if (startLevel >= 1) initialStack.push({ type: 'bottom-bun', id: `base-0-${Date.now()}` });
    if (startLevel >= 2) initialStack.push({ type: 'patty', id: `base-1-${Date.now()}` });
    if (startLevel >= 3) initialStack.push({ type: 'cheese', id: `base-2-${Date.now()}` });
    
    setStack(initialStack);
    setBaseCount(initialStack.length); 
  };

  // --- INPUT LOGIC (REWRITTEN TO FIX ERROR) ---
  const handleInput = (inputType) => {
    if (gameState !== 'playing' || isExiting || isProcessing) return;

    const currentHeight = stack.length;
    let isCorrect = false;
    let pieceToDrop = "";

    if (currentHeight === 0 && inputType === 'bun') { isCorrect = true; pieceToDrop = 'bottom-bun'; } 
    else if (currentHeight === 1 && inputType === 'patty') { isCorrect = true; pieceToDrop = 'patty'; } 
    else if (currentHeight === 2 && inputType === 'cheese') { isCorrect = true; pieceToDrop = 'cheese'; } 
    else if (currentHeight === 3 && inputType === 'bun') { isCorrect = true; pieceToDrop = 'top-bun'; }
    // Determine if input is correct
    if (currentHeight === 0 && inputType === 'bun') pieceToDrop = 'bottom-bun';
    else if (currentHeight === 1 && inputType === 'patty') pieceToDrop = 'patty';
    else if (currentHeight === 2 && inputType === 'cheese') pieceToDrop = 'cheese';
    else if (currentHeight === 3 && inputType === 'bun') pieceToDrop = 'top-bun';

    if (pieceToDrop !== "") {
      // CORRECT MOVE
      setIsProcessing(true);
      setStack(prev => [...prev, { type: pieceToDrop, id: `drop-${Date.now()}` }]);

    if (isCorrect) {
      setIsProcessing(true); 
      const nextType = (inputType === 'patty') ? 'patty' : (inputType === 'cheese') ? 'cheese' : 'top-bun';
      setStack(prev => [...prev, { type: nextType, id: `drop-${Date.now()}` }]);
      if (nextType === 'top-bun') {
      if (pieceToDrop === 'top-bun') {
        const newScore = score + 1;
        setScore(newScore);
        setTimeout(() => setIsExiting(true), 600);
        setTimeout(() => { setIsExiting(true); }, 600);
        setTimeout(() => { setBurgerId(prev => prev + 1); spawnBurger(); }, 1100);
      } else {
        setTimeout(() => setIsProcessing(false), 250);
        setTimeout(() => { setIsProcessing(false); }, 250);
      }
    } else {
      // WRONG MOVE
      setFeedback('wrong');
      setGameState('lost');
      saveHighScore(score);
@@ -87,7 +94,7 @@
  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-300 ${feedback === 'wrong' ? 'bg-red-500' : 'bg-[#E55937]'}`}>

      {/* HUD (Picnic Yellow) */}
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-[#FFE974] border-b-8 border-black z-30 shadow-lg">
        <Link href="/"><ArrowLeft size={32} className="text-[#E55937]" /></Link>
        <div className="flex gap-4 font-bold uppercase tracking-tighter">
@@ -98,10 +105,8 @@
        </div>
      </div>

      {/* STAGE (BBQ Background) */}
      {/* STAGE */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden bg-[url('/images/bbqbackground.jpg')] bg-cover bg-center">
        
        {/* Burger Stacking Logic */}
        <AnimatePresence>
          {!isExiting && (
            <motion.div
@@ -135,23 +140,23 @@
          )}
        </AnimatePresence>

        {/* The Wooden Counter Image */}
        {/* Counter */}
        <div className="w-full z-20 relative pointer-events-none">
            <img src="/images/counter.svg" alt="counter" className="w-full h-auto block translate-y-2" />
        </div>
      </div>

      {/* CONTROLS (Picnic Yellow) */}
      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-[#FFE974] border-t-8 border-black pb-12 z-30 shadow-2xl">
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }} className="bg-[#4B2C20] text-white border-4 border-black py-8 rounded-2xl font-bold text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">PATTY</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }} className="bg-[#FFD700] text-black border-4 border-black py-8 rounded-2xl font-bold text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">CHEESE</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }} className="bg-white text-[#E55937] border-4 border-black py-8 rounded-2xl font-bold text-lg uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none">BUN</button>
      </div>

      {/* OVERLAYS (WIN / LOSS) */}
      {/* OVERLAYS */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-full max-w-sm">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-full max-w-sm font-sans">

            {gameState === 'won' ? (
              <>
@@ -177,9 +182,9 @@
            <div className="space-y-4">
              <button 
                onClick={() => { setGameState('playing'); setScore(0); setBurgerId(0); setTimeLeft(60); spawnBurger(); }}
                className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-bold text-2xl uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-bold text-2xl uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
              >
                {gameState === 'start' ? 'START GAME' : 'TRY AGAIN'}
                {gameState === 'start' ? 'START GAME' : 'PLAY AGAIN'}
              </button>

              {gameState !== 'start' && (
@@ -196,149 +201,4 @@
      )}
    </div>
  );
}      setStack(prev => [...prev, { type: pieceToDrop, id: `drop-${Date.now()}` }]);
      if (pieceToDrop === 'top-bun') {
        const newScore = score + 1;
        setScore(newScore);
        setTimeout(() => { setIsExiting(true); }, 600);
        setTimeout(() => { setBurgerId(prev => prev + 1); spawnBurger(); }, 1100);
      } else {
        setTimeout(() => { setIsProcessing(false); }, 250);
      }
    } else {
      // FAILURE CONDITION: Wrong move
      setFeedback('wrong');
      setGameState('lost');
      saveHighScore(score);
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-300 ${feedback === 'wrong' ? 'bg-red-500' : 'bg-[#FDFCF8]'}`}>

      {/* very back background image */}
      <div className="absolute inset-0 -z-20 bg-[url('/images/bbqbackground.jpg')] bg-cover bg-center" />

      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-[#FFE974] border-b-8 border-black z-30 shadow-lg">
        <Link href="/"><ArrowLeft size={32} className="text-[#E55937]" /></Link>
        <div className="flex gap-4 font-black uppercase tracking-tighter">
          <div className="bg-[#E55937] text-[#FFE974] px-5 py-2 rounded-xl text-2xl border-2 border-black">{timeLeft}s</div>
          <div className="bg-white text-[#E55937] px-5 py-2 rounded-xl text-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {score}
          </div>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`burger-${burgerId}`}
              initial={{ x: -1200 }} animate={{ x: 0 }}
              exit={{ x: 2500, transition: { duration: 0.4, ease: "expoIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.4 } }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[320px] z-10" 
            >
              {stack.map((item, i) => {
                let elevation = 0;
                if (i === 1) elevation = 38; 
                if (i === 2) elevation = 62;
                if (i === 3) elevation = 84;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={i < baseCount ? { x: "-50%" } : { y: -1000, x: "-50%" }}
                    animate={{ y: -elevation, x: "-50%" }}
                    transition={{ y: { type: "tween", ease: "circIn", duration: 0.25 } }}
                    style={{ zIndex: i }}
                    className="absolute bottom-1/2 left-1/2"
                  >
                    <img src={`/images/${item.type}.svg`} alt={item.type} className="w-80 h-auto block max-w-none" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS & COUNTER CONTAINER */}
      <div className="relative z-0">
        {/* Counter positioned absolutely, bottom anchored to top of controls */}
        <div 
          className="absolute bottom-full left-0 w-full"
          ref={(el) => el && setCounterHeight(el.offsetHeight)}
        >
          <img 
            src="/images/counter.svg" 
            alt="wooden counter" 
            className="w-full h-auto block"
          />
        </div>

        {/* Control buttons */}
        <div className="p-6 grid grid-cols-3 gap-4 border-t-8 border-black pb-12 shadow-2xl bg-transparent">
          <button onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }} className="bg-[#4B2C20] text-white border-4 border-black py-8 rounded-2xl font-bold text-xl uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            PATTY
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }} className="bg-[#FFD700] text-black border-4 border-black py-8 rounded-2xl font-bold text-xl uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            CHEESE
          </button>
          <button onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }} className="bg-white text-[#E55937] border-4 border-black py-8 rounded-2xl font-bold text-xl uppercase shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            BUN
          </button>
        </div>
      </div>

      {/* OVERLAYS (WIN / LOSS) */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-full max-w-sm">
            
            {gameState === 'won' ? (
              <>
                <Trophy size={80} className="text-[#FFE974] mx-auto mb-4" />
                <h1 className="text-7xl font-black italic uppercase leading-none mb-2 tracking-tighter text-[#FFE974]">YOU WIN!</h1>
                <p className="text-xl font-bold uppercase mb-8 text-white">Shift Completed Successfully</p>
              </>
            ) : gameState === 'lost' ? (
              <>
                <AlertCircle size={80} className="text-[#E55937] mx-auto mb-4" />
                <h1 className="text-6xl font-black italic uppercase leading-none mb-2 tracking-tighter text-[#FFE974]">GAME OVER</h1>
                <p className="text-xl font-bold uppercase mb-8 text-white opacity-80">The Kitchen Exploded!</p>
              </>
            ) : (
              <h1 className="text-7xl font-black italic uppercase leading-none mb-10 tracking-tighter text-[#FFE974]">BURGER<br/>STACKER</h1>
            )}

            <div className="mb-10">
              <p className="text-white/60 font-black uppercase text-xs tracking-widest mb-1 italic">Your Score</p>
              <p className="text-8xl font-black italic leading-none text-[#FFE974]">{score}</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => { setGameState('playing'); setScore(0); setBurgerId(0); setTimeLeft(60); spawnBurger(); }}
                className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-black text-2xl uppercase italic shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-transform"
              >
                {gameState === 'start' ? 'START SHIFT' : 'PLAY AGAIN'}
              </button>
              
              {gameState !== 'start' && (
                <Link 
                  href="/"
                  className="w-full flex items-center justify-center gap-2 bg-[#E55937] border-4 border-black text-white py-4 rounded-full font-bold uppercase text-xs tracking-widest shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                >
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
