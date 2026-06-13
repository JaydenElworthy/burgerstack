'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Trophy, Flame, Star } from 'lucide-react'

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
    <div className="min-h-screen bg-[#E55937] text-white p-6 font-sans overflow-x-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-12 pt-4">
        <Link href="/"><ArrowLeft className="text-[#FFE974]" size={32} /></Link>
        <h1 className="text-[10vw] sm:text-5xl font-bold uppercase tracking-tighter text-[#FFE974] leading-none">
          Hall of <br/> Fame
        </h1>
      </div>

      {/* DYNAMIC PRIZE BANNER */}
      <div className="bg-[#FFE974] p-8 rounded-[2.5rem] mb-10 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-[#E55937]">
        <div className="flex items-center gap-2 mb-2">
          <Star fill="#E55937" size={20} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Weekly Reward</p>
        </div>
        
        {/* This header is now weighted 700 Gopher and dynamic */}
        <h2 className="text-3xl font-bold uppercase leading-none tracking-tighter mb-4">
          WIN {prize}
        </h2>
        
        <div className="bg-[#E55937] h-1 w-12 rounded-full mb-4" />
        
        <p className="text-[10px] text-[#E55937] font-bold uppercase tracking-widest leading-relaxed">
          The player in the #1 spot this Sunday at 12:01 AM wins the drop.
        </p>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="text-center py-10 animate-pulse font-bold uppercase text-[#FFE974]">Loading Rankings...</div>
      ) : (
        <div className="space-y-4">
          {leaders.map((user, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                i === 0 ? 'bg-white text-[#E55937]' : 'bg-transparent text-white border-white/20 shadow-none'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold italic">
                  {i === 0 ? '👑' : `#${i + 1}`}
                </div>
                <span className="font-bold truncate w-40 uppercase tracking-tighter text-lg">
                  {user.email ? user.email.split('@')[0] : 'Guest'}
                </span>
              </div>
              <div className="flex items-center gap-3 font-bold">
                <span className="text-3xl tracking-tighter">{user.high_score}</span>
                <Trophy size={18} className={i === 0 ? "text-[#E55937]" : "text-[#FFE974]"} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-12 mb-10 text-center">
        <Link href="/game" className="block w-full py-6 bg-black text-[#FFE974] font-bold uppercase italic text-xl rounded-2xl shadow-xl border-4 border-black active:scale-95 transition-transform">
          Beat the High Score
        </Link>
        <p className="mt-4 text-[10px] font-bold uppercase opacity-40 tracking-widest text-white">Only top score builds are eligible</p>
      </div>
    </div>
  )
}
