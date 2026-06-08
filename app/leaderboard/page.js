'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Trophy, Flame, Zap } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 mb-12">
        <Link href="/"><ArrowLeft className="text-purple-400 hover:text-purple-300 transition-colors cursor-pointer" size={28} /></Link>
        <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
          Leaderboard
        </h1>
      </div>

      {/* Prize Banner */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-2xl mb-10 border border-purple-400/30 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="text-orange-400" size={28} />
          <p className="text-xs font-black uppercase tracking-[0.15em] text-purple-300">Hot Prize</p>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-tight">Top Score Wins £50 TAB</h2>
        <p className="text-xs text-purple-300 mt-2 font-semibold">Winner Selected Every Sunday at Midnight</p>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <p className="text-center opacity-50 uppercase font-bold animate-pulse">Loading Scores...</p>
      ) : (
        <div className="space-y-3">
          {leaders.map((user, i) => (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-xl p-6 border-2 transition-all duration-300 ${
                i === 0
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-400 border-yellow-300 text-slate-900 shadow-lg shadow-yellow-500/50'
                  : 'bg-slate-800/50 border-slate-700 hover:border-purple-500 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-purple-500/20'
              }`}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-lg font-black text-lg ${i === 0 ? 'bg-black/20' : 'bg-purple-500/20'}`}>
                    {i === 0 ? '👑' : `${i + 1}`}
                  </div>
                  <span className="font-bold truncate w-40 uppercase tracking-tight">
                    {user.email ? user.email.split('@')[0] : 'Anonymous'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black">{user.high_score}</span>
                  <Zap size={20} fill="currentColor" />
                </div>
              </div>

              {/* Hover accent */}
              {i !== 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/0 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-12 text-center">
        <Link href="/game" className="inline-block px-12 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black uppercase text-sm tracking-widest rounded-full shadow-lg shadow-purple-500/50 hover:shadow-purple-500/75 hover:scale-105 active:scale-95 transition-all duration-200">
          Play Now
        </Link>
      </div>
    </div>
  )
}
