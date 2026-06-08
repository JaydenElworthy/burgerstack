'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Trophy, Flame } from 'lucide-react'

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getLeaders() {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, high_score')
        .order('high_score', { ascending: false })
        .limit(10)
      
      if (!error) setLeaders(data)
      setLoading(false)
    }
    getLeaders()
  }, [])

  return (
    <div className="min-h-screen bg-[#E55937] text-white p-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <Link href="/"><ArrowLeft className="text-[#FFE974] hover:opacity-80 transition-opacity cursor-pointer" size={28} /></Link>
        <h1 className="text-4xl font-black text-[#FFE974]">
          Hall of Fame
        </h1>
      </div>

      {/* Prize Banner */}
      <div className="bg-white/10 p-6 rounded-2xl mb-10 border-2 border-dashed border-white/20">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="text-[#FFE974]" size={28} />
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#FFE974]">Weekly Prize</p>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-tight">Top Score Wins £50 TAB</h2>
        <p className="text-xs text-white/80 mt-2 font-semibold">Winner Selected Every Sunday at Midnight</p>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <p className="text-center opacity-60 uppercase font-bold animate-pulse">Loading Scores...</p>
      ) : (
        <div className="space-y-3">
          {leaders.map((user, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-5 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                i === 0
                  ? 'bg-[#FFE974] text-[#E55937]'
                  : 'bg-white text-[#E55937]'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold italic">
                  {i === 0 ? '👑' : `#${i + 1}`}
                </div>
                <span className="font-bold truncate w-40 uppercase tracking-tight">
                  {user.email ? user.email.split('@')[0] : 'Anonymous'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black">{user.high_score}</span>
                <Trophy size={18} fill="currentColor" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-12 text-center">
        <Link href="/game" className="inline-block px-12 py-5 bg-white text-[#E55937] font-bold uppercase text-sm tracking-widest rounded-full shadow-2xl active:scale-95 transition-transform border-4 border-black">
          Beat the Score
        </Link>
      </div>
    </div>
  )
}
