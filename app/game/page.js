'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
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

    // Randomize starting point: 0 (empty) to 3 (cheese ready)
    const startLevel = Math.floor(Math.random() * 4); 
    let initialStack = [];

    if (startLevel >= 1) initialStack.push({ type: 'bottom-bun', id: `base-0-${Date.now()}` });
    if (startLevel >= 2) initialStack.push({ type: 'patty', id: `base-1-${Date.now()}` });
    if (startLevel >= 3) initialStack.push({ type: 'cheese', id: `base-2-${Date.now()}` });

    setStack(initialStack);
    setBaseCount(initialStack.length); 
  };

  const handleInput = (inputType) => {
    if (gameState !== 'playing' || isExiting || isProcessing) return;

    const currentHeight = stack.length;
    let isCorrect = false;
    let pieceToDrop = "";

    // LOGIC: Check missing piece based on current height
    if (currentHeight === 0 && inputType === 'bun') {
      isCorrect = true; pieceToDrop = 'bottom-bun';
    } else if (currentHeight === 1 && inputType === 'patty') {
      isCorrect = true; pieceToDrop = 'patty';
    } else if (currentHeight === 2 && inputType === 'cheese') {
      isCorrect = true; pieceToDrop = 'cheese';
    } else if (currentHeight === 3 && inputType === 'bun') {
      isCorrect = true; pieceToDrop = 'top-bun';
    }

    if (isCorrect) {
      setIsProcessing(true); 
      const nextPiece = { type: pieceToDrop, id: `drop-${Date.now()}` };
      setStack(prev => [...prev, nextPiece]);

      if (pieceToDrop === 'top-bun') {
        const newScore = score + 1;
        setScore(newScore); 
        
        // SAVE TO DATABASE (Only High Scores)
        const saveScore = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase.from('profiles').select('high_score').eq('id', user.id).single();
            if (newScore > (profile?.high_score || 0)) {
              await supabase.from('profiles').update({ high_score: newScore }).eq('id', user.id);
            }
          }
        };
        saveScore();

        setTimeout(() => setIsExiting(true), 600);
        setTimeout(() => { 
          setBurgerId(prev => prev + 1); 
          spawnBurger(); 
        }, 1100);
      } else {
        setTimeout(() => setIsProcessing(false), 250);
      }
    } else {
      setFeedback('wrong');
      setGameState('lost');
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-300 ${feedback === 'wrong' ? 'bg-red-500' : 'bg-[#FDFCF8]'}`}>
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-white border-b-8 border-black z-30 shadow-lg">
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
        <div className="absolute bottom-[25%] w-full h-12 bg-gray-200 border-t-8 border-black z-0 shadow-2xl" />
        
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`burger-container-${burgerId}`}
              initial={{ x: -1200 }}
              animate={{ x: 0 }}
              exit={{ x: 2500, transition: { duration: 0.4, ease: "expoIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.4 } }}
              className="relative w-full h-[320px] z-10" 
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
                    className="absolute bottom-0 left-1/2"
                  >
                    <img src={`/images/${item.type}.svg`} alt={item.type} className="w-80 h-auto block max-w-none" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-white border-t-8 border-black pb-12 z-30">
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }}
          className="bg-[#4B2C20] text-white border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          Patty
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }}
          className="bg-[#FFD700] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          Cheese
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }}
          className="bg-[#F3A344] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          Bun
        </button>
      </div>

      {/* GAME OVER OVERLAY */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white font-sans">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2 tracking-tighter italic">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10 tracking-tighter italic">
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
        // 2. Define the DB Save logic
        const saveWin = async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Get current high score from DB
            const { data: profile } = await supabase
              .from('profiles')
              .select('high_score')
              .eq('id', user.id)
              .single();

            // Only update if the current game score is higher than the record
            if (newScore > (profile?.high_score || 0)) {
              await supabase
                .from('profiles')
                .update({ high_score: newScore })
                .eq('id', user.id);
            }
          }
        };

        // 3. Fire the save
        saveWin();

        // 4. Handle animations
        setTimeout(() => setIsExiting(true), 600);
        setTimeout(() => { 
          setBurgerId(prev => prev + 1); 
          spawnBurger(); 
        }, 1100);

      } else {
        // If it wasn't a top bun, just unlock the buttons for the next piece
        setTimeout(() => setIsProcessing(false), 250);
      }
    }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden select-none font-sans transition-colors duration-300 ${feedback === 'wrong' ? 'bg-red-500' : 'bg-[#FDFCF8]'}`}>
      
      {/* HUD */}
      <div className="p-6 flex justify-between items-center bg-white border-b-8 border-black z-30 shadow-lg">
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
        <div className="absolute bottom-[25%] w-full h-12 bg-gray-200 border-t-8 border-black z-0 shadow-2xl" />
        
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`burger-container-${burgerId}`}
              initial={{ x: -1200 }}
              animate={{ x: 0 }}
              exit={{ x: 2500, transition: { duration: 0.4, ease: "expoIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.4 } }}
              className="relative w-full h-[320px] z-10" 
            >
              {stack.map((item, i) => {
                // 3. ELEVATION LOGIC: Based on stack index 'i'
                // Adjust these numbers to move items UP or DOWN
                let elevation = 0;
                if (i === 1) elevation = 38;  // Patty height
                if (i === 2) elevation = 62;  // Cheese height
                if (i === 3) elevation = 84;  // Top Bun height

                return (
                  <motion.div
                    key={item.id}
                    layout
                    // Only drop if it wasn't part of the base slide-in
                    initial={i < baseCount ? { x: "-50%" } : { y: -1000, x: "-50%" }}
                    animate={{ y: -elevation, x: "-50%" }}
                    transition={{ y: { type: "tween", ease: "circIn", duration: 0.25 } }}
                    style={{ zIndex: i }}
                    className="absolute bottom-0 left-1/2"
                  >
                    <img 
                      src={`/images/${item.type}.svg`} 
                      alt={item.type} 
                      className="w-80 h-auto block max-w-none" 
                    />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-white border-t-8 border-black pb-12 z-30">
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }}
          className="bg-[#4B2C20] text-white border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shad[...]"
        >
          Patty
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }}
          className="bg-[#FFD700] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shad[...]"
        >
          Cheese
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }}
          className="bg-[#F3A344] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shad[...]"
        >
          Bun
        </button>
      </div>

      {/* GAME OVER OVERLAY */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white font-sans">
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
