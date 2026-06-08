'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Settings, Users, Star, Crown } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [method, setMethod] = useState('manual');
  const [selectedProduct, setSelectedItem] = useState('');
  const [winnerCount, setWinnerCount] = useState(10);
  const [currentTopScorer, setCurrentTopScorer] = useState(null);
  const [allUsers, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function initAdmin() {
      // 1. Security Check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile || !profile.is_admin) { router.push('/'); return; }

      // 2. Fetch Data
      try {
        const prodRes = await fetch('/api/squarespace/products');
        const prodData = await prodRes.json();
        setProducts(prodData || []);
      } catch (e) { console.error("Could not load products"); }

      const { data: settings } = await supabase.from('app_settings').select('*').single();
      if (settings) {
        setMethod(settings.redemption_strategy);
        setSelectedItem(settings.active_item_id);
        setWinnerCount(settings.weekly_winner_limit);
      }

      const { data: usersData } = await supabase.from('profiles').select('*').order('high_score', { ascending: false });
      setUsers(usersData || []);
      if (usersData && usersData.length > 0) setCurrentTopScorer(usersData[0]);

      setLoading(false);
    }
    initAdmin();
  }, [router]);

  const saveSettings = async () => {
    const item = products.find(p => p.id === selectedProduct);
    const { error } = await supabase.from('app_settings').update({
      redemption_strategy: method,
      active_item_id: selectedProduct,
      prize_title: item?.name || 'Weekly Special',
      weekly_winner_limit: winnerCount
    }).eq('id', 1);

    if (!error) alert("Settings Saved!");
  };

  const finalizeWeek = async () => {
    if (!currentTopScorer || currentTopScorer.high_score === 0) {
      alert("No winner found.");
      return;
    }
    if (!confirm(`Award prize to ${currentTopScorer.email}?`)) return;

    const res = await fetch('/api/admin/finalize-week', {
      method: 'POST',
      body: JSON.stringify({ winnerId: currentTopScorer.id, winnerEmail: currentTopScorer.email })
    });

    if (res.ok) {
      alert("WEEK FINALIZED!");
      window.location.reload();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase italic">Verifying Admin...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50 text-black font-sans pb-20">
      
      <div className="flex justify-between items-center mb-10">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase text-xs opacity-50">
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Super Admin</h1>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* WINNER SECTION */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-black text-white p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,255,68,1)]">
            <h2 className="text-[#E5FF44] font-black uppercase italic text-2xl mb-6 flex items-center gap-2">
              <Crown size={24} /> Weekly Champion
            </h2>
            
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <p className="text-xs uppercase font-black opacity-50 mb-1">Top Scorer</p>
                  <p className="text-xl font-bold mb-2">{currentTopScorer.email}</p>
                  <p className="text-6xl font-black text-[#E5FF44] italic leading-none">{currentTopScorer.high_score}</p>
                </div>
                <button 
                  onClick={finalizeWeek}
                  className="bg-[#E5FF44] text-black px-10 py-6 rounded-2xl font-black uppercase italic text-xl shadow-lg active:scale-95 transition-all"
                >
                  End Week & Award
                </button>
              </div>
            ) : (
              <p className="opacity-50 font-bold uppercase">No scores yet...</p>
            )}
          </div>

          {/* ACTIVE USERS */}
          <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black p-4 text-white font-black uppercase text-xs italic">
              User Rankings
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 text-[10px] uppercase font-black border-b-2 border-black">
                  <th className="p-4">Customer</th>
                  <th className="p-4 text-center">Best</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u, i) => (
                  <tr key={u.id} className="border-b-2 border-gray-100">
                    <td className="p-4 font-bold text-sm">{u.email}</td>
                    <td className="p-4 text-center font-black text-red-600 italic text-xl">{u.high_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SETTINGS SECTION */}
        <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] self-start">
          <h2 className="font-black uppercase text-sm mb-6 flex items-center gap-2 text-blue-600">
            <Settings size={16} /> Configuration
          </h2>
          
          <div className="space-y-6">
            <div>
              <label className="block font-black uppercase text-[10px] opacity-40 mb-2">Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs">
                <option value="manual">Manual Pool</option>
                <option value="api">Automated API</option>
                <option value="in-app">Staff Check</option>
              </select>
            </div>

            <div>
              <label className="block font-black uppercase text-[10px] opacity-40 mb-2">Grand Prize</label>
              <select value={selectedProduct} onChange={(e) => setSelectedItem(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs">
                <option value="">-- Select Product --</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <button onClick={saveSettings} className="w-full bg-black text-white py-4 rounded-xl font-black uppercase italic hover:bg-green-500 transition-colors">
              Save Config
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}      method: 'POST',
      body: JSON.stringify({ 
        winnerId: currentTopScorer.id, 
        winnerEmail: currentTopScorer.email 
      })
    });

    if (res.ok) {
      alert("WEEK CLOSED: Winner awarded and scores reset.");
      window.location.reload();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase italic">Verifying Admin...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50 text-black font-sans pb-20">
      
      <div className="flex justify-between items-center mb-10">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase text-xs opacity-50 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} /> Dashboard
        </Link>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Super <span className="text-red-600">Admin</span></h1>
        <div className="w-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1: THE WEEKLY CHAMPION (GRAND PRIZE) */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-black text-white p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-4 -top-4 text-white/10 w-40 h-40 rotate-12" />
            <h2 className="text-[#E5FF44] font-black uppercase italic text-2xl mb-6 flex items-center gap-2">
              <Star fill="#E5FF44" /> Weekly Champion
            </h2>
            
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <p className="text-xs uppercase font-black opacity-50 tracking-widest mb-1">Current #1 Seed</p>
                  <p className="text-2xl font-bold mb-1">{currentTopScorer.email}</p>
                  <p className="text-6xl font-black text-[#E5FF44] italic tracking-tighter">{currentTopScorer.high_score} <span className="text-sm not-italic uppercase tracking-normal">Burgers</span></p>
                </div>
                <button 
                  onClick={finalizeWeek}
                  className="bg-[#E5FF44] text-black px-10 py-6 rounded-2xl font-black uppercase italic text-xl shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform whitespace-nowrap"
                >
                  End Week & Award
                </button>
              </div>
            ) : (
              <p className="opacity-50 font-bold uppercase">Waiting for first players...</p>
            )}
          </div>

          {/* USER TABLE */}
          <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black p-4 text-white font-black uppercase text-xs italic flex items-center gap-2">
              <Users size={14} /> Active Players
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-[10px] uppercase font-black border-b-4 border-black">
                  <th className="p-4">Customer</th>
                  <th className="p-4 text-center">Top Score</th>
                  <th className="p-4 text-center">Total Wins</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u, i) => (
                  <tr key={u.id} className="border-b-2 border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-sm">
                        {u.email} {i === 0 && "🥇"}
                    </td>
                    <td className="p-4 text-center font-black text-red-600 italic text-xl">{u.high_score}</td>
                    <td className="p-4 text-center font-bold opacity-40">{u.total_winnings || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 2: GLOBAL CONFIGURATION */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-black uppercase text-sm mb-6 flex items-center gap-2">
              <Settings size={16} /> Global Config
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block font-black uppercase text-[10px] tracking-widest opacity-40 mb-2">Redemption Method</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase text-xs"
                >
                  <option value="manual">Manual Pool (Paste CSV)</option>
                  <option value="api">Automated Squarespace Sync</option>
                  <option value="in-app">In-App Staff Check</option>
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] tracking-widest opacity-40 mb-2">Weekly Prize Product</label>
                <select 
                  value={selectedProduct} 
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase text-xs"
                >
                  <option value="">-- Select from Squarespace --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] tracking-widest opacity-40 mb-2">Winners Per Week</label>
                <input 
                  type="number"
                  value={winnerCount}
                  onChange={(e) => setWinnerCount(parseInt(e.target.value))}
                  className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase text-xs"
                />
              </div>

              <button 
                onClick={saveSettings}
                className="w-full bg-black text-white py-4 rounded-xl font-black uppercase italic hover:bg-red-600 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}      <h1 className="text-4xl font-black uppercase italic mb-10">Super Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-8">
          {/* METHOD SELECTOR */}
          <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-black uppercase text-sm mb-4">1. Winnings Method</h2>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase text-xs">
              <option value="manual">Manual Pool (Paste Codes)</option>
              <option value="api">Automated Squarespace Sync</option>
              <option value="in-app">Staff Redemption (No Codes)</option>
            </select>
          </div>

          {/* PRODUCT PICKER */}
          <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-black uppercase text-sm mb-4 text-red-600">2. Select Squarespace Product</h2>
            <select value={selectedProduct} onChange={(e) => setSelectedItem(e.target.value)} className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase text-xs">
              <option>-- Select Burger --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (£{p.price})</option>
              ))}
            </select>
          </div>

          <button onClick={saveSettings} className="w-full bg-black text-[#E5FF44] py-5 rounded-2xl font-black uppercase italic text-xl shadow-xl">
            Save Weekly Configuration
          </button>
        </div>
// --- In your JSX ---
<div className="bg-black text-white p-8 rounded-3xl border-4 border-black mb-10 shadow-[8px_8px_0px_0px_rgba(229,255,68,1)]">
  <h2 className="text-[#E5FF44] font-black uppercase italic text-2xl mb-2">Grand Prize Control</h2>
  <p className="text-xs uppercase font-bold opacity-60 mb-6">Weekly Winner Selection</p>
  
  {currentTopScorer ? (
    <div className="flex justify-between items-center bg-white/10 p-6 rounded-2xl border-2 border-dashed border-white/20">
      <div>
        <p className="text-[10px] uppercase font-black opacity-40">Current #1 Seed</p>
        <p className="text-xl font-bold">{currentTopScorer.email}</p>
        <p className="text-3xl font-black text-[#E5FF44] italic">Score: {currentTopScorer.high_score}</p>
      </div>
      <button 
        onClick={finalizeWeek}
        className="bg-[#E5FF44] text-black px-8 py-4 rounded-xl font-black uppercase italic hover:scale-105 transition-transform"
      >
        Close Week & Award Prize
      </button>
    </div>
  ) : (
    <p>No players yet this week.</p>
  )}
</div>
        {/* LOGS SECTION */}
        <div className="bg-white border-4 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black p-4 text-white font-black uppercase text-xs italic">User Leaderboard & Winnings</div>
            {/* User table from previous code goes here */}
        </div>
      </div>
    </div>
  );
}
