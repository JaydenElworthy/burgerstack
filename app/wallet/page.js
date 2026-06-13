'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Ticket, ArrowLeft, ShoppingBag, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion';


export default function Wallet() {
  const [rewards, setRewards] = useState([])
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    async function getRewards() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('rewards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        setRewards(data || [])
      }
    }
    getRewards()
  }, [])

  const handleOrderNow = (code) => {
    // 1. Copy the code to the user's clipboard
    navigator.clipboard.writeText(code);
    setCopied(code);
    
    // 2. Alert the user
    setTimeout(() => {
      // 3. Redirect to your Squarespace Store
      // Replace with your actual Squarespace product page URL
      window.location.href = `https://picnicathome.com/shop?promo=${code}`;
    }, 800);
  };

  return (
    <div className="min-h-screen p-6 bg-[#E55937] font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/"><ArrowLeft className="text-[#FFE974]" size={32}/></Link>
        <h1 className="text-4xl font-bold uppercase tracking-tighter text-[#FFE974]">My Basket</h1>
      </div>

      <div className="space-y-6">
        {rewards.map((r, i) => (
          <div key={i} className="bg-[#FFE974] border-4 border-black p-6 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden text-[#E55937]">
            <Ticket size={40} className="mb-4" />
            <h2 className="text-3xl font-bold uppercase leading-tight mb-1">{r.prize_title}</h2>
            <p className="text-[10px] font-bold opacity-60 mb-6 uppercase tracking-widest italic text-[#E55937]">One-time use champion code</p>
            
            <div className="bg-white border-2 border-black p-5 rounded-2xl text-center mb-6">
               <span className="font-mono text-3xl font-black tracking-widest">{r.prize_code}</span>
            </div>

            <button 
              onClick={() => handleOrderNow(r.prize_code)}
              className="w-full bg-black text-[#FFE974] py-5 rounded-2xl font-bold uppercase italic text-xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              {copied === r.prize_code ? <Check size={24} /> : <ShoppingBag size={24} />}
              {copied === r.prize_code ? "Code Copied!" : "Copy & Order"}
            </button>

            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#E55937] border-r-4 border-black rounded-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-[#E55937] border-l-4 border-black rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
