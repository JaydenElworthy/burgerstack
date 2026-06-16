'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Settings, Trophy, Trash2, Plus, Crown, Star, RefreshCw, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [allUsers, setUsers] = useState([]);
  const [scratchPrizes, setScratchPrizes] = useState([]);
  const [currentTopScorer, setCurrentTopScorer] = useState(null);
  const [manualCodes, setManualCodes] = useState('');
  
  // App Settings State
  const [strategy, setStrategy] = useState('manual');
  const [pType, setPType] = useState('FREE_PRODUCT');
  const [pScope, setPScope] = useState('PRODUCT');
  const [pValue, setPValue] = useState(100);
  const [pId, setPId] = useState('');
  const [pTitle, setPTitle] = useState('Weekly Prize');

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user?.id).single();
    if (!prof?.is_admin) { window.location.href = "/"; return; }

    const prodRes = await fetch('/api/squarespace/products', { cache: 'no-store' });
    const prodData = await prodRes.json();
    setProducts(prodData || []);

    const { data: sett } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (sett) {
      setStrategy(sett.redemption_strategy); setPType(sett.weekly_prize_type);
      setPScope(sett.weekly_prize_scope); setPValue(sett.weekly_prize_value);
      setPId(sett.active_item_id); setPTitle(sett.prize_title);
    }

    const { data: u } = await supabase.from('profiles').select('*').order('high_score', { ascending: false });
    setUsers(u || []);
    if (u && u.length > 0) setCurrentTopScorer(u[0]);

    const { data: sp } = await supabase.from('scratch_prizes').select('*');
    if (sp) {
      const sorted = [...sp].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setScratchPrizes(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const refreshProducts = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    alert("Products refreshed from Squarespace!");
  };

  const uploadCodes = async () => {
    const codeList = manualCodes.split(/[\n,]+/).map(c => c.trim()).filter(c => c !== '');
    const { data: existing } = await supabase.from('prize_pool').select('code');
    const existingStrings = existing?.map(x => x.code) || [];
    
    const newCodes = codeList.filter(c => !existingStrings.includes(c));
    
    if (newCodes.length === 0) return alert("All codes already exist in database.");

    const { error } = await supabase.from('prize_pool').insert(
      newCodes.map(code => ({ code, is_claimed: false }))
    );

    if (!error) {
      alert(`Added ${newCodes.length} codes! Skipped ${codeList.length - newCodes.length} duplicates.`);
      setManualCodes('');
    }
  };

  const saveGlobalSettings = async () => {
    setIsSaving(true);
    await supabase.from('app_settings').update({
      redemption_strategy: strategy, weekly_prize_type: pType,
      weekly_prize_scope: pScope, weekly_prize_value: pValue,
      active_item_id: pId, prize_title: pTitle
    }).eq('id', 1);
    setIsSaving(false);
    alert("Settings Saved!");
  };

  const finalizeWeek = async () => {
    if (!currentTopScorer || currentTopScorer.high_score === 0) return alert("No winner yet.");
    if (!confirm(`Award prize to ${currentTopScorer.email}?`)) return;
    const res = await fetch('/api/admin/finalize-week', { method: 'POST' });
    if (res.ok) { alert("WEEK FINALIZED!"); window.location.reload(); }
    else { const err = await res.json(); alert("Error: " + err.error); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#E55937] text-[#FFE974] font-black italic uppercase">Loading Kitchen...</div>;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen bg-gray-50 text-black font-sans pb-20">
      <div className="flex justify-between items-center mb-10">
        <Link href="/" className="bg-black text-white p-3 rounded-xl shadow-lg"><ArrowLeft /></Link>
        <h1 className="text-4xl font-bold uppercase italic">Super Admin</h1>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* WINNER SECTION */}
          <div className="bg-black text-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-6 -top-6 text-white/10 w-48 h-48 rotate-12" />
            <h2 className="text-[#FFE974] font-bold uppercase italic text-2xl mb-8 flex items-center gap-2"><Star fill="#FFE974" /> Weekly Champion</h2>
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div>
                  <p className="text-xs font-black opacity-40 uppercase tracking-widest mb-1">Rank #1</p>
                  <p className="text-2xl font-bold mb-1">{currentTopScorer.email}</p>
                  <p className="text-7xl font-bold text-[#FFE974] italic tracking-tighter">{currentTopScorer.high_score}</p>
                </div>
                <button onClick={finalizeWeek} className="bg-[#FFE974] text-black px-12 py-6 rounded-2xl font-bold uppercase italic text-xl shadow-xl hover:scale-105 transition-transform">Award & Reset</button>
              </div>
            ) : <p className="opacity-40 font-bold uppercase tracking-widest text-center py-10">No scores yet.</p>}
          </div>

          {/* SCRATCH PRIZES */}
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-2xl font-bold uppercase italic text-blue-600 mb-6">Scratch Prize Pool</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scratchPrizes.map((p) => (
                <div key={p.id} className="p-5 border-4 border-black rounded-2xl bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase text-sm">{p.title}</p>
                    <p className="text-[10px] opacity-50 font-black">{p.discount_value}% {p.apply_to_item_id ? "Specific Item" : "Total Order"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR CONFIG */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold uppercase mb-8 flex items-center gap-2 underline underline-offset-8 decoration-red-500"><Settings size={20} /> Settings</h2>
            <div className="space-y-4">
              <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs" placeholder="Prize Name" />
              <div className="flex gap-2">
                <select value={pId} onChange={(e) => setPId(e.target.value)} className="flex-1 border-4 border-black p-3 rounded-xl font-bold uppercase text-[10px]">
                  <option value="">-- Choose Product --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={refreshProducts} className={`p-3 border-4 border-black rounded-xl ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18}/></button>
              </div>
              <button onClick={saveGlobalSettings} disabled={isSaving} className="w-full bg-black text-[#FFE974] py-4 rounded-xl font-bold uppercase italic shadow-lg flex justify-center items-center gap-2">
                {isSaving ? <Loader2 className="animate-spin" /> : "Save Config"}
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-bold uppercase text-sm mb-4">Manual Code Pool</h2>
            <textarea value={manualCodes} onChange={(e) => setManualCodes(e.target.value)} className="w-full h-32 border-4 border-black p-3 rounded-xl font-mono text-xs mb-4" placeholder="Paste codes here..." />
            <button onClick={uploadCodes} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase italic shadow-md">Inject Codes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
