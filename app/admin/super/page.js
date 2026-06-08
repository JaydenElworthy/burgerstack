'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function SuperAdmin() {
  const [settings, setSettings] = useState(null)
  const [users, setUsers] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: s } = await supabase.from('app_settings').select('*').single()
    const { data: u } = await supabase.from('profiles').select('*').order('high_score', { ascending: false })
    setSettings(s); setUsers(u)
  }

  async function updateMethod(method) {
    await supabase.from('app_settings').update({ discount_method: method }).eq('id', 1)
    fetchData()
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans text-black">
      <h1 className="text-4xl font-black uppercase mb-10 italic">Super Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {['manual', 'auto', 'loyalty'].map((m) => (
          <button 
            key={m} onClick={() => updateMethod(m)}
            className={`p-6 border-4 rounded-2xl font-black uppercase italic text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${settings?.discount_method === m ? 'bg-[#E5FF44]' : 'bg-white opacity-50'}`}
          >
            Method: {m}
          </button>
        ))}
      </div>

      <div className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
        <table className="w-full text-left">
          <thead className="bg-black text-white uppercase text-[10px] tracking-widest font-black">
            <tr>
              <th className="p-5">Customer Email</th>
              <th className="p-5 text-center">Best Score</th>
              <th className="p-5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b-2 border-gray-100 font-bold">
                <td className="p-5 text-sm">{u.email}</td>
                <td className="p-5 text-center text-red-600 font-black text-xl italic">{u.high_score}</td>
                <td className="p-5 text-center text-[10px] uppercase opacity-40">{u.is_admin ? 'Admin' : 'Player'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
