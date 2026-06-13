'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Ticket, ArrowLeft, ShoppingBag, Check, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Wallet() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    async function getRewards() {
      // 1. Get the current logged in user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 2. Fetch rewards only for this user
        const { data, error } = await supabase
          .from('rewards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (!error) setRewards(data || [])
      }
      setLoading(false)
    }
    getRewards()
  }, [])

  const handleOrderNow = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => {
      // Direct link to your Squarespace checkout with the promo applied
      window.location.href = `https://picnicathome.com/shop?promo=${code}`;
    }, 800);
  };

  return (
    <div className="min-h-screen p-6 bg-[#E55937] font-sans text-[#FFE974]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 pt-4">
        <Link href="/"><ArrowLeft className="text-[#FFE974]" size={32}/></Link>
        <h1 className="text-4xl font-bold uppercase tracking-tighter italic">My Wallet</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-bold uppercase text-xs tracking-widest">Checking your prizes...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rewards.length > 0 ? rewards.map((r, i) => (
            <motion.div 
              key={i} 
              initial={{ x: -20, opacity: 0 }} 
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#FFE974] border-4 border-black p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden text-[#E55937]"
            >
              <Ticket size={40} className="mb-4" />
              <h2 className="text-3xl font-bold uppercase leading-tight mb-1">{r.prize_title}</h2>
              <p className="text-[10px] font-bold opacity-60 mb-6 uppercase tracking-widest italic">One-time use champion code</p>
              
              <div className="bg-white border-2 border-black p-5 rounded-2xl text-center mb-6 shadow-inner">
                 <span className="font-mono text-3xl font-black tracking-widest italic">{r.prize_code}</span>
              </div>

              <button 
                onClick={() => handleOrderNow(r.prize_code)}
                className="w-full bg-black text-[#FFE974] py-5 rounded-2xl font-bold uppercase italic text-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                {copied === r.prize_code ? <Check size={24} /> : <ShoppingBag size={24} />}
                {copied === r.prize_code ? "Code Copied!" : "Copy & Order"}
              </button>

              {/* Decorative Ticket Cutouts */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#E55937] border-r-4 border-black rounded-full" />
              <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#E55937] border-l-4 border-black rounded-full" />
            </motion.div>
          )) : (
            <div className="text-center py-20 border-4 border-dashed border-white/20 rounded-[3rem]">
              <p className="text-white font-bold uppercase opacity-40 italic mb-6 tracking-widest">No prizes won yet...</p>
              <Link href="/game" className="bg-[#FFE974] text-[#E55937] px-10 py-4 rounded-full font-black uppercase italic shadow-lg inline-block border-2 border-black">
                Play to Win
              </Link>
            </div>
          )}
        </div>
      )}

      <footer className="mt-12 text-center px-10">
        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest leading-relaxed">
          Prizes are awarded every Sunday to the top player. Keep stacking to stay #1!
        </p>
      </footer>
    </div>
  )
}
