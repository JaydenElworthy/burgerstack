'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Trophy, Flame, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [prize, setPrize] = useState('Weekly Special') // Default fallback

  useEffect(() => {
    async function fetchData() {
      // 1. Fetch Top 10 Leaders
      const { data: leaderData } = await supabase
        .from('profiles')
        .select('email, high_score')
        .order('high_score', { ascending: false })
        .limit(10)
      
      if (leaderData) setLeaders(leaderData)

      // 2. Fetch the Prize Title set by Super Admin
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('prize_title')
        .eq('id', 1)
        .single()
      
      if (settingsData) setPrize(settingsData.prize_title)

      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="h-[100dvh] bg-[#E55937] text-white p-4 sm:p-6 font-sans flex flex-col overflow-hidden overscroll-none">
      
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8 pt-2 shrink-0">
        <Link href="/"><ArrowLeft className="text-[#FFE974]" size={28} /></Link>
        <h1 className="text-[8vw] sm:text-5xl font-bold uppercase tracking-tighter text-[#FFE974] leading-none">
          Leaderboard
        </h1>
      </div>

      
  {/* Prize Banner */}
      <div className="bg-white/10 p-4 sm:p-6 rounded-2xl mb-4 sm:mb-8 shrink-0 border-2 border-dashed border-white/20">
        <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
          <Flame className="text-[#FFE974]" size={24} />
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-[#FFE974]">Weekly Prize</p>
   </div>
        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">Top Score Wins {prize} </h2>
        <p className="text-[10px] sm:text-xs text-white/80 mt-1 sm:mt-2 font-semibold">Winner Selected Each Week</p>
    </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="text-center py-10 animate-pulse font-bold uppercase text-[#FFE974] flex-1">Loading Rankings...</div>
      ) : (
        <div className="space-y-2 sm:space-y-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-2">
          {leaders.map((user, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-3 sm:p-5 rounded-xl sm:rounded-2xl border-2 sm:border-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                i === 0 ? 'bg-white text-[#E55937]' : 'bg-transparent text-white border-white/20 shadow-none'
              }`}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="text-xl sm:text-2xl font-bold italic">
                  {i === 0 ? '👑' : `#${i + 1}`}
                </div>
                <span className="font-bold truncate w-32 sm:w-40 uppercase tracking-tighter text-sm sm:text-lg">
                  {user.email ? user.email.split('@')[0] : 'Guest'}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 font-bold">
                <span className="text-xl sm:text-3xl tracking-tighter">{user.high_score}</span>
                <Trophy size={16} className={i === 0 ? "text-[#E55937]" : "text-[#FFE974]"} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4 sm:mt-6 mb-2 sm:mb-4 text-center shrink-0">
        <Link href="/game" className="block w-full py-4 sm:py-6 bg-black text-[#FFE974] font-bold uppercase italic text-lg sm:text-xl rounded-2xl shadow-xl border-4 border-black active:scale-95 transition-transform">
          Beat the High Score
        </Link>
      </div>
    </div>
  )
}
