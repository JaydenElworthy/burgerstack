'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { Ticket, ArrowLeft, ShoppingBag, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Wallet() {
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [activeCode, setActiveCode] = useState('')

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
    setActiveCode(code);
    setShowModal(true);
  };

  const handleRedirect = () => {
    setShowModal(false);
    window.location.href = `https://picnicathome.com/shop?promo=${activeCode}`;
  };

  return (
    <div className="h-[100dvh] p-4 sm:p-6 bg-[#E55937] font-sans text-[#FFE974] flex flex-col overflow-hidden overscroll-none relative">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8 pt-2 shrink-0">
        <Link href="/"><ArrowLeft className="text-[#FFE974]" size={28} /></Link>
        <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tighter italic">Wallet</h1>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50 flex-1">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-bold uppercase text-xs tracking-widest">Checking your prizes...</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6 flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-4">
          {rewards.length > 0 ? rewards.map((r, i) => (
            <motion.div
              key={i}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#FFE974] border-[3px] sm:border-4 border-black p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden text-[#E55937]"
            >
              <Ticket size={32} className="sm:w-10 sm:h-10 mb-3 sm:mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold uppercase leading-tight mb-1">{r.prize_title}</h2>
              <p className="text-[9px] sm:text-[10px] font-bold opacity-60 mb-4 sm:mb-6 uppercase tracking-widest italic">One-time use champion code</p>

              <div className="bg-white border-2 border-black p-4 sm:p-5 rounded-2xl text-center mb-4 sm:mb-6 shadow-inner">
                <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest italic">{r.prize_code}</span>
              </div>

              <button
                onClick={() => handleOrderNow(r.prize_code)}
                className="w-full bg-black text-[#FFE974] py-4 sm:py-5 rounded-2xl font-bold uppercase italic text-lg sm:text-xl flex items-center justify-center gap-2 sm:gap-3 active:scale-95 transition-transform"
              >
                {copied === r.prize_code ? <Check size={20} /> : <ShoppingBag size={20} />}
                {copied === r.prize_code ? "Code Copied!" : "Copy & Order"}
              </button>

              {/* Decorative Ticket Cutouts */}
              <div className="absolute -left-5 sm:-left-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 bg-[#E55937] border-r-4 border-black rounded-full" />
              <div className="absolute -right-5 sm:-right-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 bg-[#E55937] border-l-4 border-black rounded-full" />
            </motion.div>
          )) : (
            <div className="text-center py-10 sm:py-20 border-4 border-dashed border-white/20 rounded-[2.5rem] sm:rounded-[3rem]">
              <p className="text-white font-bold uppercase opacity-40 italic mb-4 sm:mb-6 tracking-widest text-sm">No prizes won yet...</p>
              <Link href="/game" className="bg-[#FFE974] text-[#E55937] px-8 sm:px-10 py-3 sm:py-4 rounded-full font-black uppercase italic shadow-lg inline-block border-2 border-black text-sm sm:text-base">
                Play to Win
              </Link>
            </div>
          )}
        </div>
      )}

      <footer className="mt-2 sm:mt-auto text-center px-4 sm:px-10 pb-2 sm:pb-4 shrink-0">
        <p className="text-white/40 text-[8px] sm:text-[10px] uppercase font-bold tracking-widest leading-relaxed">
          Prizes are awarded every Sunday to the top player. Keep stacking to stay #1!
        </p>
      </footer>

      {/* Checkout Instructions Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FFE974] border-4 border-black p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-[340px] text-[#E55937] text-center relative"
            >
              <h3 className="text-3xl font-black uppercase tracking-tighter italic mb-4">Code Copied!</h3>
              
              <div className="bg-white border-2 border-black p-4 rounded-2xl text-center mb-6 shadow-inner font-mono text-xl font-black tracking-widest italic select-all text-black">
                {activeCode}
              </div>

              <div className="text-left text-[11px] text-black space-y-3 font-semibold mb-6 bg-white/50 p-4 border-2 border-dashed border-black rounded-2xl">
                <p className="flex items-start gap-2">
                  <span className="bg-[#E55937] text-[#FFE974] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                  <span>Promo code has been copied to your clipboard.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-[#E55937] text-[#FFE974] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                  <span>Add items to your cart on the Picnic At Home shop.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="bg-[#E55937] text-[#FFE974] rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                  <span>Paste this code in the <span className="font-bold underline">Promo Code</span> box on the checkout page.</span>
                </p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={handleRedirect}
                  className="w-full bg-black text-[#FFE974] py-4 rounded-xl font-black uppercase italic text-sm border-4 border-black active:translate-y-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  Go to Shop & Order
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full bg-transparent text-[#E55937] py-2 font-black uppercase text-[10px] hover:underline"
                >
                  Back to Wallet
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
