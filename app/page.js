'use client'
import Link from 'next/link';
import { Gamepad2, Ticket, Wallet, Trophy, ShoppingBag, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="p-6 max-w-md mx-auto min-h-screen flex flex-col bg-[#FDFCF8]">
      <header className="py-10 text-center">
        <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.75] mb-2">
          NEIGHBOURHOOD<br/><span className="text-red-600">CLUB</span>
        </h1>
        <p className="font-bold uppercase text-[10px] tracking-[0.2em] text-black/40">The Daily Drop & Rewards</p>
      </header>

      <div className="bg-black text-[#E5FF44] p-6 rounded-[2.5rem] mb-6 shadow-2xl flex justify-between items-center border-4 border-black">
        <div>
          <p className="text-[10px] uppercase font-black opacity-60 tracking-widest">Points Balance</p>
          <p className="text-5xl font-black italic tracking-tighter leading-none">1,250</p>
        </div>
        <div className="bg-[#E5FF44] text-black p-4 rounded-full shadow-lg">
          <Star size={32} fill="currentColor" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/game" className="bg-[#E5FF44] border-4 border-black p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
          <Gamepad2 size={40} />
          <span className="font-black uppercase text-xs">Stack Game</span>
        </Link>
        <button className="bg-white border-4 border-black p-6 rounded-[2rem] flex flex-col items-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all opacity-40 cursor-not-allowed">
          <Ticket size={40} />
          <span className="font-black uppercase text-xs">Scratch Card</span>
        </button>
      </div>

      <div className="space-y-4 mb-10">
        <Link href="/wallet" className="w-full bg-white border-4 border-black p-5 rounded-2xl flex justify-between items-center font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
          <span className="flex items-center gap-3"><Wallet size={24}/> My Rewards</span>
          <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs animate-pulse">2</span>
        </Link>
        <Link href="/leaderboard" className="w-full bg-white border-4 border-black p-5 rounded-2xl flex justify-between items-center font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
          <span className="flex items-center gap-3"><Trophy size={24}/> Top Scorers</span>
          <span>→</span>
        </Link>
      </div>

      <a href="https://squareup.com" target="_blank" className="mt-auto w-full bg-black text-white p-6 rounded-2xl flex justify-center items-center gap-4 font-black uppercase italic text-2xl shadow-xl hover:bg-red-600 transition-colors">
        <ShoppingBag size={28} /> Order Food
      </a>
    </div>
  );
}