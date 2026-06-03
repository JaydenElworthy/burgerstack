'use client'
import Link from 'next/link';
import { ArrowLeft, Trophy, Crown, Star } from 'lucide-react';

export default function Leaderboard() {
  const players = [
    { rank: 1, name: 'BurgerBoss88', score: 98, crown: true },
    { rank: 2, name: 'PattyQueen', score: 85 },
    { rank: 3, name: 'StackMaster', score: 72 },
    { rank: 4, name: 'HungryChef', score: 64 },
    { rank: 5, name: 'SaltyFries', score: 58 },
  ];

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto bg-black text-white font-sans">
      <div className="flex items-center gap-4 mb-10 mt-4">
        <Link href="/"><ArrowLeft size={30} className="text-[#E5FF44]" /></Link>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter italic text-[#E5FF44]">Hall of Fame</h1>
      </div>

      <div className="bg-white/10 p-6 rounded-[2.5rem] mb-10 border-2 border-dashed border-white/20 text-center">
        <Crown className="mx-auto text-[#E5FF44] mb-2" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E5FF44] mb-1">Weekly Prize</p>
        <h2 className="text-xl font-bold uppercase tracking-tight">Top score wins a £50 TAB</h2>
      </div>

      <div className="space-y-4">
        {players.map((p, i) => (
          <div key={i} className={`flex items-center justify-between p-6 rounded-3xl border-2 ${p.crown ? 'bg-[#E5FF44] border-black text-black' : 'bg-white/5 border-white/10'}`}>
            <div className="flex items-center gap-5">
              <span className="text-3xl font-black italic opacity-40 italic leading-none tracking-tighter">#{p.rank}</span>
              <span className="text-xl font-bold uppercase tracking-tight italic">{p.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tighter">{p.score}</span>
              <Star size={16} fill="currentColor" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link href="/game" className="bg-white text-black px-12 py-5 rounded-full font-black uppercase text-sm italic tracking-widest shadow-2xl active:scale-95 transition-transform inline-block">Beat their score</Link>
      </div>
    </div>
  );
}