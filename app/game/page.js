'use client'
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Trophy, Home, Lock, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
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
  const [bonusResult, setBonusResult] = useState(""); 
  
  // --- NEW: MUTE STATE ---
  const [isMuted, setIsMuted] = useState(false);

  // --- AUDIO REFS ---
  const musicRef = useRef(null);
  const currentSong = useRef(1); 
  const sfxPlace = useRef(null);
  const sfxWrong = useRef(null);
  const sfxWin = useRef(null);

  // Initialize Audio
  useEffect(() => {
    sfxPlace.current = new Audio('/sounds/place.mp3');
    sfxWrong.current = new Audio('/sounds/wrong.mp3');
    sfxWin.current = new Audio('/sounds/win.mp3');
    
    sfxPlace.current.volume = 0.6;
    sfxWrong.current.volume = 0.5;
    sfxWin.current.volume = 0.8;

    // --- FIX: STOP MUSIC WHEN LEAVING PAGE ---
    return () => {
        stopMusic();
    };
  }, []);

  // --- MUSIC ENGINE ---
  const startMusic = () => {
    if (isMuted) return; // Don't play if muted
    if (musicRef.current) musicRef.current.pause();
    
    const songPath = `/sounds/song${currentSong.current}.mp3`;
    musicRef.current = new Audio(songPath);
    musicRef.current.volume = 0.2; 
    
    musicRef.current.onended = () => {
      currentSong.current = currentSong.current === 1 ? 2 : 1; 
      startMusic();
    };
    
    musicRef.current.play().catch(e => console.log("Audio play blocked"));
  };

  const stopMusic = () => {
    if (musicRef.current) {
      musicRef.current.pause();
      musicRef.current = null;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (gameState === 'playing') startMusic();
    } else {
      setIsMuted(true);
      stopMusic();
    }
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      endGame('won');
    }
  }, [gameState, timeLeft]);

  const saveHighScore = async (finalScore) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (finalScore >= 25) await supabase.from('profiles').update({ bonus_unlocked: true }).eq('id', user.id);
      const { data: profile } = await supabase.from('profiles').select('high_score').eq('id', user.id).single();
      if (finalScore > (profile?.high_score || 0)) {
        await supabase.from('profiles').update({ high_score: finalScore }).eq('id', user.id);
      }
    } catch (err) { console.error(err); }
  };

  const endGame = async (status) => {
    stopMusic(); 
    setGameState(status);
    
    if (!isMuted) {
        if (status === 'won') { sfxWin.current?.play(); confetti(); }
        else { sfxWrong.current?.play(); }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const hadBonus = profile?.bonus_unlocked || false;
        if (status === 'lost') setBonusResult("lost");
        else {
          if (score >= 25) setBonusResult(hadBonus ? "already_had_high" : "new_unlock");
          else setBonusResult(hadBonus ? "already_had_low" : "missed_bonus");
        }
        saveHighScore(score);
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

    if (nextPiece === "") { endGame('lost'); return; }

    if (!isMuted) sfxPlace.current?.cloneNode(true).play(); 

    setIsProcessing(true);
    setStack(prev => [...prev, { type: nextPiece, id: `d-${Date.now()}` }]);

    if (nextPiece === 'top-bun') {
      setScore(prev => prev + 1);
      setTimeout(() => { setIsExiting(true); }, 600);
      setTimeout(() => { setBurgerId(prev => prev + 1); spawnBurger(); }, 1100);
    } else {
      setTimeout(() => { setIsProcessing(false); }, 250);
    }
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-y-auto overflow-x-hidden overscroll-none select-none font-sans bg-[#E55937] relative text-[#FFE974]">
      
      {/* HUD WITH MUTE BUTTON */}
      <div className="p-4 md:p-6 grid grid-cols-[auto_1fr_auto] items-center bg-[#FFE974] border-b-4 md:border-b-8 border-black z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <Link href="/"><ArrowLeft size={32} className="text-[#E55937]" /></Link>
          {/* MUSIC TOGGLE */}
          <button onClick={toggleMute} className="bg-[#E55937] p-2 rounded-lg border-2 border-black text-[#FFE974] active:scale-90 transition-transform">
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
       <div className="flex justify-center text-center leading-none">
  <span className="text-[#E55937] font-black text-lg uppercase italic">PICNIC<br/>AT HOME</span>
</div>
        <div className="flex gap-2 md:gap-4">
          <div className="bg-[#E55937] text-[#FFE974] px-3 py-2 rounded-xl text-xl border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">{timeLeft}s</div>
          <div className="bg-white text-[#E55937] px-3 py-2 rounded-xl text-xl border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold">{score}</div>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden">
        <img src="/images/bbqbackground.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`round-${burgerId}`}
              initial={{ x: "-150%" }} animate={{ x: "-50%" }}
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
      <div className="p-4 pb-6 md:p-6 md:pb-12 grid grid-cols-3 gap-2 md:gap-4 bg-[#FFE974] border-t-4 md:border-t-8 border-black z-50 mt-auto">
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }} className="bg-[#4B2C20] text-white border-4 border-black py-4 md:py-8 rounded-xl md:rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">PATTY</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }} className="bg-[#FFD700] text-black border-4 border-black py-4 md:py-8 rounded-xl md:rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">CHEESE</button>
        <button onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }} className="bg-[#E55937] text-white border-4 border-black py-4 md:py-8 rounded-xl md:rounded-2xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1">BUN</button>
      </div>

      {/* DYNAMIC RESULTS OVERLAY */}
      {gameState !== 'playing' && (
        <div className="absolute inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-8 text-center text-white">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm font-sans">
            
            <div className="mb-6 flex flex-col items-center">
              {bonusResult === "lost" && (
                <>
                  <AlertCircle size={80} className="text-[#E55937] mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#E55937]">86 THAT!</h1>
                  <p className="text-xl uppercase font-bold opacity-70">Customer Refund Issued</p>
                </>
              )}

              {(bonusResult === "new_unlock") && (
                <>
                  <Trophy size={80} className="text-[#FFE974] mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFE974]">BONUS UNLOCKED!</h1>
                  <p className="text-lg font-bold uppercase mb-4 bg-white text-black px-4 py-1 rounded-full text-center">Score: {score}</p>
                </>
              )}

              {bonusResult === "missed_bonus" && (
                <>
                  <Trophy size={80} className="text-white/20 mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFE974]">SHIFT COMPLETE!</h1>
                  <p className="text-xl font-bold uppercase mb-4 text-center">Score: {score}</p>
                </>
              )}

              {(bonusResult.includes("already_had")) && (
                <>
                  <CheckCircle2 size={80} className="text-[#FFE974] mb-4" />
                  <h1 className="text-5xl font-black tracking-tighter text-[#FFE974]">SHIFT COMPLETE!</h1>
                  <p className="text-xl font-bold uppercase mb-4 text-center">Score: {score}</p>
                </>
              )}

              {gameState === 'start' && (
                <>
                  <h1 className="text-6xl font-black tracking-tighter text-[#FFE974] mb-4 leading-none">BURGER SLINGER</h1>
                  <p className="text-sm opacity-70 uppercase tracking-widest leading-relaxed">Stack 25 burgers in order to win a weekly bonus scratch card</p>
                </>
              )}
            </div>

            <div className="space-y-4 w-full">
              <button 
                onClick={() => { 
                  setScore(0); setTimeLeft(60); setGameState('playing'); spawnBurger(); setBonusResult("");
                  startMusic(); 
                }} 
                className="w-full bg-[#FFE974] border-4 border-black text-black py-5 rounded-full font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
              >
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
