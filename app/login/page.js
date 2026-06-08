'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (!error) setSent(true)
    else alert(error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] p-8 flex flex-col justify-center items-center font-sans">
      <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-10 text-center">
        NEIGHBOURHOOD<br/><span className="text-red-600 text-6xl">CLUB</span>
      </h1>
      
      {!sent ? (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <p className="text-center font-bold uppercase text-[10px] tracking-widest opacity-40">Enter email for magic login link</p>
          <input 
            type="email" placeholder="email@example.com"
            className="w-full border-4 border-black p-5 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <button disabled={loading} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic text-xl shadow-[4px_4px_0px_0px_rgba(229,255,68,1)] active:scale-95 transition-transform">
            {loading ? 'Sending...' : 'Join the Club'}
          </button>
        </form>
      ) : (
        <div className="text-center bg-[#E5FF44] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black uppercase text-xl mb-2">Check your inbox!</p>
          <p className="font-bold opacity-70">A login link has been sent to <span className="block underline">{email}</span></p>
        </div>
      )}
    </div>
  )
}
