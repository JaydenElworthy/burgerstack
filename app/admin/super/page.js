'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

export default function SuperAdmin() {
  const [products, setProducts] = useState([]);
  const [method, setMethod] = useState('manual');
  const [selectedProduct, setSelectedItem] = useState('');
  const [winnerCount, setWinnerCount] = useState(10);
  // Add this to your SuperAdmin component
const [currentTopScorer, setCurrentTopScorer] = useState(null);

useEffect(() => {
  // Fetch the #1 player
  const getTopPlayer = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, high_score')
      .order('high_score', { ascending: false })
      .limit(1)
      .single();
    setCurrentTopScorer(data);
  };
  getTopPlayer();
}, []);

const finalizeWeek = async () => {
  if (!confirm(`Are you sure? This will award the prize to ${currentTopScorer.email} and reset the board.`)) return;

  // 1. Call your API to create the Squarespace code and notify the winner
  const res = await fetch('/api/admin/finalize-week', {
    method: 'POST',
    body: JSON.stringify({ 
      winnerId: currentTopScorer.id, 
      winnerEmail: currentTopScorer.email 
    })
  });

  if (res.ok) {
    alert("Winner Awarded! Board Reset.");
    window.location.reload();
  }
};

  useEffect(() => {
    // 1. Fetch Products from Squarespace API
    fetch('/api/squarespace/products').then(res => res.json()).then(setProducts);
    
    // 2. Load current settings from Supabase
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').single();
      if (data) {
        setMethod(data.redemption_strategy);
        setSelectedItem(data.active_item_id);
      }
    };
    loadSettings();
  }, []);

  const saveSettings = async () => {
    const item = products.find(p => p.id === selectedProduct);
    await supabase.from('app_settings').update({
      redemption_strategy: method,
      active_item_id: selectedProduct,
      prize_title: item?.name || 'Free Burger',
      weekly_winner_limit: winnerCount
    }).eq('id', 1);
    alert("Settings Updated!");
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen font-sans text-black">
      <h1 className="text-4xl font-black uppercase italic mb-10">Super Admin</h1>

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
