'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: { emailRedirectTo: window.location.origin }
    })
    if (!error) setSent(true)
    else alert(error.message)
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] p-8 flex flex-col justify-center items-center font-sans">
      <h1 className="text-5xl font-black italic uppercase tracking-tighter mb-2">Join the</h1>
      <h1 className="text-6xl font-black italic uppercase tracking-tighter text-red-600 mb-10">Club</h1>
      
      {!sent ? (
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <input 
            type="email" placeholder="email@example.com"
            className="w-full border-4 border-black p-5 rounded-2xl font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          <button className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic text-xl shadow-[4px_4px_0px_0px_rgba(229,255,68,1)]">
            Send Magic Link
          </button>
        </form>
      ) : (
        <div className="text-center bg-[#E5FF44] border-4 border-black p-8 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <p className="font-black uppercase text-xl">Check your inbox!</p>
          <p className="font-bold opacity-70">We sent a login link to {email}</p>
        </div>
      )}
      <Link href="/" className="mt-10 font-bold uppercase text-xs opacity-40 underline">Back to Home</Link>
    </div>
  )
}
