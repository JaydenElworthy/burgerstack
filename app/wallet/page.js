'use client'
import Link from 'next/link';
import { Ticket, ArrowLeft, Clock, Info } from 'lucide-react';

export default function Wallet() {
  const rewards = [
    { title: 'FREE SIDE', code: 'NBHD-XJ92', expiry: '2 DAYS LEFT', color: 'bg-[#E5FF44]' },
    { title: '10% OFF TOTAL', code: 'SQUARE-10', expiry: '6 DAYS LEFT', color: 'bg-white' },
  ];

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto bg-[#FDFCF8] font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/"><ArrowLeft size={30}/></Link>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter italic">My Wallet</h1>
      </div>

      <div className="space-y-8">
        {rewards.map((r, i) => (
          <div key={i} className={`${r.color} border-4 border-black p-6 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden`}>
            <div className="flex justify-between items-start mb-6">
              <Ticket size={40} />
              <span className="flex items-center gap-1 text-[10px] font-black bg-black/10 px-3 py-1 rounded-full uppercase tracking-widest"><Clock size={12}/> {r.expiry}</span>
            </div>
            <h2 className="text-3xl font-black mb-2 italic uppercase leading-none tracking-tighter">{r.title}</h2>
            <p className="text-[10px] uppercase tracking-widest opacity-60 mb-8 font-bold">Redeem at counter</p>
            <div className="bg-black text-white p-5 rounded-2xl text-center font-mono text-3xl font-bold tracking-[0.2em]">{r.code}</div>
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#FDFCF8] border-r-4 border-black rounded-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#FDFCF8] border-l-4 border-black rounded-full" />
          </div>
        ))}
      </div>
      <div className="mt-12 p-6 bg-black/5 rounded-3xl border-2 border-dashed border-black/20 flex gap-4 items-center">
        <Info className="text-black/40 shrink-0" />
        <p className="text-[10px] font-bold uppercase tracking-wide opacity-40 leading-relaxed">Prizes expire weekly. Use them or lose them! New drops every Monday morning.</p>
      </div>
    </div>
  );
}