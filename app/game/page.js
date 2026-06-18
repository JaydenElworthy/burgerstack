'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Trophy, Home, Lock, CheckCircle2, Ticket } from 'lucide-react';
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
  
  // NEW: State to handle the 5 dynamic result scenarios
  const [bonusResult, setBonusResult] = useState(""); 

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame('won');
    }
  }, [gameState, timeLeft]);

  // --- UNIFIED END GAME LOGIC ---
  const endGame = async (status) => {
    setGameState(status);
    const finalScore = score;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch current profile status
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const hadBonus = profile?.bonus_unlocked || false;

    if (status === 'lost') {
      // SCENARIO 1: LOST
      setBonusResult("lost");
    } else {
      // SCENARIO 2-5: WON (COMPLETED TIME)
      confetti();
      if (finalScore >= 25) {
        if (!hadBonus) {
          // SCENARIO 3: WIN + NEW UNLOCK
          setBonusResult("new_unlock");
          await supabase.from('profiles').update({ bonus_unlocked: true }).eq('id', user.id);
        } else {
          // SCENARIO 5: WIN + ALREADY HAD
          setBonusResult("already_had_high");
        }
      } else {
        if (!hadBonus) {
          // SCENARIO 2: WIN + UNDER 25
          setBonusResult("missed_bonus");
        } else {
          // SCENARIO 4: WIN + UNDER 25 + ALREADY HAD
          setBonusResult("already_had_low");
        }
      }
    }

    // Always save high score if it's a PB
    if (finalScore > (profile?.high_score || 0)) {
      await supabase.from('profiles').update({ high_score: finalScore }).eq('id', user.id);
    }
  };

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

  const handleInput = (inputType) => {
    if (gameState !== 'playing' || isExiting || isProcessing) return;
    const len = stack.length;
    let nextPiece = "";

    if (len === 0 && inputType === 'bun') nextPiece = 'bottom-bun';
    else if (len === 1 && inputType === 'patty') nextPiece = 'patty';
    else if (len === 2 && inputType === 'cheese') nextPiece = 'cheese';
    else if (len === 3 && inputType === 'bun') nextPiece = 'top-bun';

    if (nextPiece === "") {
      endGame('lost');
      return;
    }

    setIsProcessing(true);
    setStack(prev => [...prev, { type: nextPiece, id: `d-${Date.now()}` }]);

    if (nextPiece === 'top-bun') {
      setScore(prev => prev + 1);
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
      <div className="p-6 grid grid-cols-[auto_1fr_auto] items-center bg-[#FFE974] border-b-8 border-black z-50 shadow-lg">
        <Link href="/"><ArrowLeft size={32} className="text-[#E55937]" /></Link>
        <div className="flex justify-center text-center leading-none">
          <span className="text-[#E55937] font-black text-lg uppercase italic">PICNIC<br/>AT HOME</span>
        </div>
        <div className="flex gap-4">
          <div className="bg-[#E55937] text-[#FFE974] px-4 py-2 rounded-xl text-xl border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{timeLeft}s</div>
          <div className="bg-white text-[#E55937] px-4 py-2 rounded-xl text-xl border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{score}</div>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden">
        <img src="/images/bbqbackground.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`round-${burgerId}`}
              initial={{ x: "-150%" }}
              animate={{ x: "-50%" }}
              exit={{ x: "250%", transition: { duration: 0.4, ease: "expoIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.5 } }}
              className="absolute bottom-[40px] md:bottom-[60px] left-1/2 w-64 md:w-80 h-[300px] z-30 pointer-events-none"
            >
              {stack.map((item, i) => {
                let elev = 0;
                if (i === 1) elev = 22; if (i === 2) elev = 38; if (i === 3) elev = 58;
                return (
                  <motion.div key={item.id} layout initial={i < baseCount ? false : { y: -1000 }} animate={{ y: -elev }} transition={{ y: { type: "tween", ease: "circIn", duration: 0.25 } }} className="absolute bottom-0 left-0 w-full flex justify-center" style={{ zIndex: i }}>
                    <img src={`/images/${item.type}.svg`} alt="" className="w-44 md:w-64 h-auto block" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-[#FFE974] border-t-8 border-black pb-12 z-50">
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }} className="bg-[#4B2C20] text-white border-4 border-black py-8 rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">PATTY</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }} className="bg-[#FFD700] text-black border-4 border-black py-8 rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">CHEESE</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }} className="bg-[#E55937] text-white border-4 border-black py-8 rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">BUN</button>
      </div>

      {/* DYNAMIC RESULTS OVERLAY */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-8 text-center text-white">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm">
            
            <div className="mb-6 flex flex-col items-center">
              {bonusResult === "lost" && (
                <>
                  <AlertCircle size={80} className="text-[#E55937] mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#E55937]">86 THAT!</h1>
                  <p className="text-xl uppercase font-bold opacity-70">The customer wants a refund</p>
                </>
              )}

              {(bonusResult === "new_unlock") && (
                <>
                  <Trophy size={80} className="text-[#FFE974] mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFE974]">BONUS UNLOCKED!</h1>
                  <p className="text-lg font-bold uppercase mb-4 bg-white text-black px-4 py-1 rounded-full">Score: {score}</p>
                  <p className="text-sm opacity-80 uppercase">You've earned a bonus Scratch Card. Claim it in your wallet!</p>
                </>
              )}

              {bonusResult === "missed_bonus" && (
                <>
                  <Trophy size={80} className="text-white/20 mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFE974]">SHIFT COMPLETE!</h1>
                  <p className="text-xl font-bold uppercase mb-4">Score: {score}</p>
                  <div className="flex items-center gap-2 text-xs uppercase bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                    <Lock size={14}/> Need 25+ for Bonus Scratch
                  </div>
                </>
              )}

              {(bonusResult === "already_had_high" || bonusResult === "already_had_low") && (
                <>
                  <CheckCircle2 size={80} className="text-[#FFE974] mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFE974]">SHIFT COMPLETE!</h1>
                  <p className="text-xl font-bold uppercase mb-4">Score: {score}</p>
                  <p className="text-xs opacity-60 uppercase italic">Weekly bonus already claimed!</p>
                </>
              )}

              {gameState === 'start' && (
                <>
                  <h1 className="text-6xl font-black tracking-tighter text-[#FFE974] mb-4">BURGER SLINGER</h1>
                  <p className="text-sm opacity-70 uppercase tracking-widest leading-relaxed">Stack 25 burgers in order to win a weekly bonus scratch card</p>
                </>
              )}
            </div>

            <div className="space-y-4 w-full">
              <button 
                onClick={() => { setScore(0); setTimeLeft(60); setGameState('playing'); spawnBurger(); setBonusResult(""); }} 
                className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
              >
                {gameState === 'start' ? 'START SHIFT' : 'TRY AGAIN'}
              </button>

              {gameState !== 'start' && (
                <Link href="/" className="w-full flex items-center justify-center gap-2 bg-[#E55937] border-4 border-black text-white py-4 rounded-full font-bold uppercase text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all">
                  <Home size={16} /> Exit to Menu
                </Link>
              )}
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
               <h2 className="text-xs font-black uppercase text-[#FFE974] mb-2 tracking-widest">Stack Sequence</h2>
               <p className="text-[10px] font-medium uppercase opacity-50">Bun &rarr; Patty &rarr; Cheese &rarr; Bun</p>
            </div>

          </motion.div>
        </div>
      )}
    </div>
  );
}
