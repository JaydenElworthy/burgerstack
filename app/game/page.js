'use client'
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
// 1. IMPORT YOUR NEW ICONS
import { TopBun, Cheese, Patty, BottomBun } from './burgericons';

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
      const nextPieceType = (inputType === 'patty') ? 'patty' : (inputType === 'cheese') ? 'cheese' : 'top-bun';
      const newPiece = { type: nextPieceType, id: `piece-${Date.now()}` };
      
      setStack(prev => [...prev, newPiece]);

      if (nextPieceType === 'top-bun') {
        setScore(s => s + 1);
        setTimeout(() => setIsExiting(true), 500); 
        setTimeout(() => {
          setBurgerId(prev => prev + 1);
          spawnBurger();
        }, 1100); 
      } else {
        setTimeout(() => setIsProcessing(false), 200);
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

      {/* PLAY AREA */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden pb-[30%]">
        <div className="absolute bottom-[30%] w-full h-16 bg-[#EFEFEF] border-t-8 border-black z-0 shadow-2xl" />
        
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`round-${burgerId}`}
              initial={{ x: -1200 }}
              animate={{ x: 0 }}
              exit={{ x: 2500, transition: { duration: 0.4, ease: "circIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.3 } }}
              className="flex flex-col-reverse items-center relative z-10 origin-bottom" 
            >
              {stack.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={i !== 0 ? { y: -1000 } : {}}
                  animate={{ y: 0 }}
                  transition={{ 
                    y: { type: "tween", ease: "circIn", duration: 0.2 },
                    layout: { duration: 0 } 
                  }}
                  style={{ zIndex: i }}
                  className={`relative flex-shrink-0 ${
                    item.type === 'bottom-bun' ? 'mb-0' :
                    item.type === 'patty' ? '-mb-12' :
                    item.type === 'cheese' ? '-mb-10' :
                    '-mb-16'
                  }`}
                >
                  {/* 3. USE THE NEW COMPONENTS */}
                  {item.type === 'bottom-bun' && <BottomBun />}
                  {item.type === 'patty' && <Patty />}
                  {item.type === 'cheese' && <Cheese />}
                  {item.type === 'top-bun' && <TopBun />}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-6 grid grid-cols-3 gap-4 bg-white border-t-8 border-black pb-12 z-30">
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }}
          className={`bg-[#4B2C20] text-white border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
        >
          Patty
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }}
          className={`bg-[#FFD700] text-black border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
        >
          Cheese
        </button>
        <button 
          onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }}
          className={`bg-[#F3A344] border-[6px] border-black py-8 rounded-2xl font-black text-xl uppercase italic shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all text-black ${isProcessing ? 'opacity-50' : 'opacity-100'}`}
        >
          Bun
        </button>
      </div>

      {/* OVERLAYS */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-10 text-center text-white">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
            <h1 className="text-7xl font-black italic uppercase leading-none mb-2 tracking-tighter">
              {gameState === 'start' ? 'BURGER' : 'GAME'}
            </h1>
            <h1 className="text-7xl font-black italic text-[#E5FF44] uppercase leading-none mb-10 tracking-tighter">
              {gameState === 'start' ? 'STACKER' : 'OVER'}
            </h1>
            
            {gameState === 'lost' && (
              <div className="mb-12 text-center">
                <p className="text-white/40 font-black uppercase text-xs tracking-widest mb-2 italic tracking-tighter">Burgers Built</p>
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
