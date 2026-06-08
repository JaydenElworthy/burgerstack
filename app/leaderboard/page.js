'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])

  useEffect(() => {
    async function getLeaders() {
      const { data } = await supabase
        .from('profiles')
        .select('email, high_score')
        .order('high_score', { ascending: false })
        .limit(10)
      setLeaders(data || [])
    }
    getLeaders()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans">
      <div className="flex items-center gap-4 mb-10">
        <Link href="/"><ArrowLeft /></Link>
        <h1 className="text-3xl font-black italic uppercase italic tracking-tighter">Hall of Fame</h1>
      </div>

      <div className="space-y-4">
        {leaders.map((user, i) => (
          <div key={i} className="flex items-center justify-between bg-white/10 p-5 rounded-2xl border-2 border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-2xl font-black italic text-[#E5FF44]">#{i + 1}</span>
              <span className="font-bold truncate w-40 opacity-80">{user.email.split('@')[0]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black">{user.high_score}</span>
              <Trophy size={16} className="text-[#E5FF44]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
