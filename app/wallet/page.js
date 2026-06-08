'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Ticket, ArrowLeft, Clock, Info } from 'lucide-react'

export default function Wallet() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getRewards() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('rewards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setRewards(data || [])
      }
      setLoading(false)
    }
    getRewards()
  }, [])

  return (
    <div className="min-h-screen p-6 max-w-md mx-auto bg-[#E55937] font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/"><ArrowLeft size={30} className="text-[#FFE974]"/></Link>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-[#FFE974]">My Wallet</h1>
      </div>

      <div className="space-y-8">
        {rewards.map((r, i) => (
          <div key={i} className="bg-[#FFE974] border-4 border-black p-6 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <Ticket size={40} className="text-[#E55937]" />
              <span className="flex items-center gap-1 text-[10px] font-black bg-black/10 px-3 py-1 rounded-full uppercase tracking-widest text-black"><Clock size={12}/> {r.expiry || 'No expiry'}</span>
            </div>
            <h2 className="text-3xl font-black mb-2 italic uppercase leading-none tracking-tighter text-[#E55937]">{r.prize_title}</h2>
            <p className="text-[10px] uppercase tracking-widest opacity-70 mb-8 font-bold text-black">Redeem at counter</p>
            <div className="bg-black text-[#FFE974] p-5 rounded-2xl text-center font-mono text-3xl font-bold tracking-[0.2em]">{r.prize_code}</div>
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#E55937] border-r-4 border-black rounded-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#E55937] border-l-4 border-black rounded-full" />
          </div>
        ))}
        
        {rewards.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-[#FFE974] font-bold uppercase opacity-80 italic">Your wallet is empty...</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-20">
            <p className="text-[#FFE974] font-bold uppercase opacity-80 italic">Loading rewards...</p>
          </div>
        )}
      </div>

      <div className="mt-12 p-6 bg-black/20 rounded-3xl border-2 border-dashed border-[#FFE974] flex gap-4 items-center">
        <Info className="text-[#FFE974] shrink-0" size={20} />
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#FFE974] leading-relaxed">Prizes expire weekly. Use them or lose them! New drops every Monday morning.</p>
      </div>
    </div>
  );
}
