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
  const [activeKey, setActiveKey] = useState(null);

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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      await fetch('/api/game/submit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: finalScore })
      });
    } catch (err) { console.error(err); }
  };

  const endGame = async (status) => {
    stopMusic();
    setGameState(status);

    if (!isMuted) {
      if (status === 'won') { sfxWin.current?.play(); confetti(); }
      else { sfxWrong.current?.play(); }
    }

    if (status === 'lost') {
      setBonusResult("lost");
    } else {
      setBonusResult(score >= 25 ? "new_unlock" : "missed_bonus");
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const hadBonus = profile?.bonus_unlocked || false;

        if (status !== 'lost') {
          if (score >= 25) setBonusResult(hadBonus ? "already_had_high" : "new_unlock");
          else setBonusResult(hadBonus ? "already_had_low" : "missed_bonus");
        }
        saveHighScore(score);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const spawnBurger = () => {
    setIsExiting(false);
    setIsProcessing(false);
    const startLevel = Math.floor(Math.random() * 4);
    let initialStack = [];
    if (startLevel >= 1) initialStack.push({ type: 'bottom-bun', id: `b0-${Date.now()}`, duration: 0.15 });
    if (startLevel >= 2) initialStack.push({ type: 'patty', id: `b1-${Date.now()}`, duration: 0.15 });
    if (startLevel >= 3) initialStack.push({ type: 'cheese', id: `b2-${Date.now()}`, duration: 0.15 });
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

        // Speed up all existing animating items, and add the new item with 0.08s (lightning fast default drop)
        setStack(prev => {
            const updated = prev.map(item => ({
                ...item,
                duration: 0.04 // snap existing items to destination
            }));
            return [...updated, { type: nextPiece, id: `d-${Date.now()}-${Math.random()}`, duration: 0.08 }];
        });

    if (nextPiece === 'top-bun') {
      setIsProcessing(true); // block further inputs while exiting
      setScore(prev => prev + 1);
      setTimeout(() => { setIsExiting(true); }, 60);
      setTimeout(() => { setBurgerId(prev => prev + 1); spawnBurger(); }, 200);
    }
  };

  // --- KEYBOARD CONTROLS ---
  const handleInputRef = useRef(null);
  handleInputRef.current = handleInput;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return; // Prevent key repeat events
      const key = e.key.toLowerCase();
      if (key === 'p') {
        setActiveKey('patty');
        handleInputRef.current?.('patty');
      } else if (key === 'c') {
        setActiveKey('cheese');
        handleInputRef.current?.('cheese');
      } else if (key === 'b') {
        handleInputRef.current?.('bun');
        setActiveKey('bun');
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'p' || key === 'c' || key === 'b') {
        setActiveKey(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden overscroll-none select-none font-sans bg-[#E55937] relative text-[#FFE974]">

      {/* HUD WITH MUTE BUTTON */}
      <div className="p-3 sm:p-6 grid grid-cols-3 items-center bg-[#FFE974] border-b-4 sm:border-b-8 border-black z-50 shadow-lg shrink-0">
        <div className="flex items-center justify-start gap-2 sm:gap-4">
          <Link href="/" className="bg-[#E55937] p-1.5 sm:p-2 rounded-lg border-2 border-black text-[#FFE974] active:scale-90 transition-transform flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 shrink-0">
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
          </Link>
          {/* MUSIC TOGGLE */}
          <button onClick={toggleMute} className="bg-[#E55937] p-1.5 sm:p-2 rounded-lg border-2 border-black text-[#FFE974] active:scale-90 transition-transform flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 shrink-0">
            {isMuted ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
          </button>
        </div>
        <div className="flex justify-center text-center leading-none">
          <span className="text-[#E55937] font-black text-sm sm:text-lg uppercase italic">PICNIC<br />AT HOME</span>
        </div>
        <div className="flex justify-end gap-2.5 sm:gap-4">
          <div className="bg-[#E55937] text-[#FFE974] px-3.5 sm:px-6 py-2 sm:py-3 rounded-2xl text-xl sm:text-3xl border-[3.5px] sm:border-[5px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black tracking-tight leading-none flex items-center justify-center min-w-[75px] sm:min-w-[105px]">{timeLeft}S</div>
          <div className="bg-white text-[#E55937] px-3.5 sm:px-6 py-2 sm:py-3 rounded-2xl text-xl sm:text-3xl border-[3.5px] sm:border-[5px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-black tracking-tight leading-none flex items-center justify-center min-w-[55px] sm:min-w-[85px]">{score}</div>
        </div>
      </div>

      {/* STAGE */}
      <div className="flex-1 relative flex flex-col items-center justify-end overflow-hidden min-h-0">
        <img src="/images/bbqbackground.jpeg" alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
        <AnimatePresence>
          {!isExiting && (
            <motion.div
              key={`round-${burgerId}`}
              initial={{ x: "-150%" }} animate={{ x: "-50%" }}
              exit={{ x: "250%", transition: { duration: 0.18, ease: "easeIn" } }}
              transition={{ x: { type: "tween", ease: "circOut", duration: 0.25 } }}
              className="absolute bottom-[20px] sm:bottom-[60px] left-1/2 w-48 sm:w-80 h-[250px] sm:h-[300px] z-30 pointer-events-none"
            >
              {stack.map((item, i) => {
                let elev = 0;
                if (i === 1) elev = 22; if (i === 2) elev = 38; if (i === 3) elev = 58;
                return (
                  <motion.div key={item.id} layout initial={i < baseCount ? false : { y: -1000 }} animate={{ y: -elev }} transition={{ y: { type: "tween", ease: "circIn", duration: item.duration || 0.15 } }} className="absolute bottom-0 left-0 w-full flex justify-center" style={{ zIndex: i }}>
                    <img src={`/images/${item.type}.svg`} alt="" className="w-40 sm:w-64 h-auto block" />
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CONTROLS */}
      <div className="p-3 sm:p-6 grid grid-cols-3 gap-2 sm:gap-4 bg-[#FFE974] border-t-4 sm:border-t-8 border-black pb-6 sm:pb-12 z-50 shrink-0">
        <button
          onPointerDown={(e) => { e.preventDefault(); handleInput('patty'); }}
          className={`bg-[#4B2C20] text-white border-[4px] sm:border-[6px] border-black py-7 sm:py-12 rounded-[20px] sm:rounded-[2rem] font-black text-base sm:text-2xl tracking-wider transition-all ${activeKey === 'patty'
            ? 'translate-y-[4px] translate-x-[4px] sm:translate-y-[6px] sm:translate-x-[6px] shadow-none'
            : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] sm:active:translate-y-[6px] sm:active:translate-x-[6px] active:shadow-none'
            }`}
        >
          PATTY
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleInput('cheese'); }}
          className={`bg-[#FFD700] text-black border-[4px] sm:border-[6px] border-black py-7 sm:py-12 rounded-[20px] sm:rounded-[2rem] font-black text-base sm:text-2xl tracking-wider transition-all ${activeKey === 'cheese'
            ? 'translate-y-[4px] translate-x-[4px] sm:translate-y-[6px] sm:translate-x-[6px] shadow-none'
            : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] sm:active:translate-y-[6px] sm:active:translate-x-[6px] active:shadow-none'
            }`}
        >
          CHEESE
        </button>
        <button
          onPointerDown={(e) => { e.preventDefault(); handleInput('bun'); }}
          className={`bg-[#E55937] text-white border-[4px] sm:border-[6px] border-black py-7 sm:py-12 rounded-[20px] sm:rounded-[2rem] font-black text-base sm:text-2xl tracking-wider transition-all ${activeKey === 'bun'
            ? 'translate-y-[4px] translate-x-[4px] sm:translate-y-[6px] sm:translate-x-[6px] shadow-none'
            : 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] sm:active:translate-y-[6px] sm:active:translate-x-[6px] active:shadow-none'
            }`}
        >
          BUN
        </button>
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
                  <p className="text-xs opacity-60 uppercase italic mb-4">Weekly bonus already claimed!</p>
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

              <div className="pt-2">
                <h2 className="text-xl font-black uppercase text-[#FFE974] mb-2">STACK IN ORDER</h2>
                <h3 className="text-xs font-medium uppercase text-white opacity-80 tracking-wider">
                  BUN -&gt; PATTY -&gt; CHEESE -&gt; BUN
                </h3>
              </div>

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
