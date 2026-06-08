'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase' // Using relative path for safety
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getLeaders() {
      // Pull top 10 scores from Supabase
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
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/"><ArrowLeft className="text-[#E5FF44]" /></Link>
        <h1 className="text-3xl font-black italic uppercase italic tracking-tighter">Hall of Fame</h1>
      </div>

      {loading ? (
        <p className="text-center opacity-50 uppercase font-bold animate-pulse">Loading Scores...</p>
      ) : (
        <div className="space-y-4">
          {leaders.map((user, i) => (
            <div key={i} className={`flex items-center justify-between p-5 rounded-2xl border-2 ${i === 0 ? 'bg-[#E5FF44] border-black text-black' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-black italic">#{i + 1}</span>
                {/* This line hides the full email for privacy (e.g. alex@gmail.com becomes alex) */}
                <span className="font-bold truncate w-32 uppercase tracking-tighter">
                  {user.email ? user.email.split('@')[0] : 'Anonymous'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black">{user.high_score}</span>
                <Trophy size={16} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
