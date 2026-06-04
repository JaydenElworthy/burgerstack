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
  const [gameState, setGameState] = useState('start'); // start, playing, lost
  const [isExiting, setIsExiting] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

  // Spawn first burger
  const spawnBurger = () => {
    setIsExiting(false);
    setFeedback(null);
    const type = Math.random() > 0.5 ? ['bottom-bun'] : ['bottom-bun', 'patty'];
    setStack(type);
  };

  const handleInput = (input) => {
    if (gameState !== 'playing' || isExiting) return;

    const currentStep = stack.length;
    let isCorrect = false;

    if (currentStep === 1 && stack[0] === 'bottom-bun' && input === 'patty') isCorrect = true;
    if (currentStep === 2 && stack[1] === 'patty' && input === 'bun') isCorrect = true;

    if (isCorrect) {
      const nextItem = input === 'bun' ? 'top-bun' : 'patty';
      setStack([...stack, nextItem]);
      
      if (nextItem === 'top-bun') {
        // BURGER COMPLETE
        setScore(s => s + 1);
        setIsExiting(true);
        setTimeout(() => {
          spawnBurger();
        }, 400); // Time for the slide-out animation
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
            initial={{ scale: 1.5, color: '#ff0000' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
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
          className="bg-[#F3A344] border-[6px] border-black py-10 rounded-[2.5rem] font-black text-3xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all"
        >
          BUN
        </button>
        <button 
          onPointerDown={() => handleInput('patty')}
          className="bg-[#4B2C20] text-white border-[6px] border-black py-10 rounded-[2.5rem] font-black text-3xl uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all"
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
}    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('touchmove', handleMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('touchmove', handleMove);
    };
  }, [mounted, isInitialized, isRevealed]);

  // --- THE SAFETY SHIELD ---
  // If we are on the Vercel Build Server, render nothing. 
  // This stops ALL Prerender and Reference errors.
  if (!mounted) {
    return <div className="min-h-screen bg-[#FDFCF8]" />;
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center p-6 font-sans overflow-hidden">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-10 pt-4 px-2">
        <Link href="/"><ArrowLeft size={32} className="text-black" /></Link>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter">Daily Drop</h1>
        <div className="w-8" />
      </div>

      {/* Hero Text */}
      <div className="text-center mb-8 px-4">
        <p className="font-black uppercase text-[10px] tracking-widest text-red-600 mb-1 leading-none">One go per day</p>
        <h2 className="text-[12vw] sm:text-5xl font-black italic uppercase leading-[0.8] tracking-tighter">Scratch<br/>to Win</h2>
      </div>

      {/* Card Container */}
      <div className="relative w-80 h-80 bg-white border-8 border-black rounded-[2.5rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Under Layer (Prize) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <Ticket size={64} className="mb-4 text-red-600" />
            <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Prize Unlocked</p>
            <h3 className="text-4xl font-black italic uppercase leading-tight mb-4 tracking-tighter">{prize.title}</h3>
            <div className="bg-black text-[#E5FF44] px-6 py-2 rounded-xl font-mono font-bold tracking-[0.2em] shadow-lg">
                {prize.code}
            </div>
        </div>

        {/* Scratch Layer */}
        <canvas 
          ref={canvasRef} 
          style={{ touchAction: 'none' }} 
          className={`absolute inset-0 cursor-crosshair transition-opacity duration-700 ${isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        />
      </div>

      {/* Reveal Actions */}
      <AnimatePresence>
        {isRevealed && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              className="mt-10 text-center space-y-4 w-full px-4"
            >
                <Link href="/wallet" className="block w-full bg-black text-white p-5 rounded-2xl font-black uppercase italic text-2xl shadow-xl hover:bg-red-600 transition-colors">
                    Add to Wallet
                </Link>
                <p className="text-[10px] font-black uppercase opacity-30 tracking-[0.1em] px-8 leading-relaxed">
                    This reward is now saved in your wallet. Show it to the team at the counter to redeem.
                </p>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Instruction Tip */}
      {!isRevealed && (
        <div className="mt-12 p-5 bg-[#E5FF44] border-4 border-black rounded-3xl flex gap-4 items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-4">
            <Trophy size={28} className="shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight leading-tight text-left">
                Scratch off 50% of the card to reveal your daily prize!
            </p>
        </div>
      )}
    </div>
  );
}      {/* Play Area */}
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
