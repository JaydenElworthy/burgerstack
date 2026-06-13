'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Mail, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="min-h-screen bg-[#E55937] p-8 flex flex-col justify-center items-center font-sans text-[#FFE974]">
      
      {/* BRANDING */}
      <header className="mb-12 text-center">
        <h1 className="text-[12vw] sm:text-6xl font-bold uppercase leading-[0.85] tracking-tighter mb-2">
          PICNIC AT<br/><span className="text-white text-6xl">HOME</span>
        </h1>
        <div className="h-2 w-20 bg-[#FFE974] mx-auto rounded-full mt-4" />
      </header>
      
      {!sent ? (
        <div className="w-full max-w-sm">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <p className="text-center font-bold uppercase text-[10px] tracking-[0.2em] text-white">
                Enter your email to join the club
              </p>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E55937] z-10" size={20} />
                <input 
                  type="email" 
                  placeholder="you@example.com"
                  className="w-full border-4 border-black p-5 pl-12 rounded-2xl font-bold text-lg text-black placeholder:opacity-30 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 ring-[#FFE974]/20"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                />
              </div>
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-[#FFE974] text-[#E55937] py-6 rounded-2xl font-bold uppercase italic text-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-3"
            >
              {loading ? 'Sending...' : (
                <>
                  <Sparkles size={24} />
                  Join the Club
                </>
              )}
            </button>
          </form>
          
          <p className="mt-8 text-center text-white/40 text-[10px] uppercase font-bold tracking-widest px-8">
            By signing in, you agree to receive magic links and game updates.
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          className="text-center bg-[#FFE974] border-4 border-black p-10 rounded-[2.5rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm"
        >
          <div className="bg-[#E55937] w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-black shadow-lg">
            <Mail className="text-white" size={30} />
          </div>
          <h2 className="text-3xl font-bold uppercase text-[#E55937] mb-2 leading-none">Check your email!</h2>
          <p className="font-bold text-[#E55937] opacity-80 mb-8">We just sent a magic login link to:</p>
          <div className="bg-white border-2 border-black p-3 rounded-xl font-mono text-sm text-[#E55937] mb-8 overflow-hidden truncate">
            {email}
          </div>
          <button 
            onClick={() => setSent(false)}
            className="text-[10px] font-black uppercase tracking-widest text-[#E55937] underline decoration-2 underline-offset-4"
          >
            Wrong email? Try again
          </button>
        </motion.div>
      )}

      {/* FOOTER NAV */}
      {!sent && (
        <Link href="/" className="mt-12 flex items-center gap-2 text-white/60 font-bold uppercase text-[10px] tracking-widest hover:text-[#FFE974] transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      )}
    </div>
  )
}
