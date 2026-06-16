'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Settings, Trophy, Trash2, Plus, Crown, Star, ShoppingBag, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [allUsers, setUsers] = useState([]);
  const [scratchPrizes, setScratchPrizes] = useState([]);
  const [currentTopScorer, setCurrentTopScorer] = useState(null);
  
  // Weekly Prize Settings State
  const [strategy, setStrategy] = useState('manual');
  const [pType, setPType] = useState('FREE_PRODUCT');
  const [pScope, setPScope] = useState('PRODUCT');
  const [pValue, setPValue] = useState(100);
  const [pId, setPId] = useState('');
  const [pTitle, setPTitle] = useState('Weekly Prize');

  // 1. Add this state at the top of SuperAdmin
const [manualCodes, setManualCodes] = useState('');

// 2. Add this function to handle the upload
const uploadCodes = async () => {
  const codeArray = manualCodes.split('\n').filter(c => c.trim() !== '');
  const formatted = codeArray.map(c => ({ code: c.trim(), is_claimed: false }));
  
  const { error } = await supabase.from('prize_pool').insert(formatted);
  if (!error) {
    alert(`Successfully added ${codeArray.length} codes!`);
    setManualCodes('');
  } else {
    alert("Error: Duplicate codes found.");
  }
};

 useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user?.id).single();
      
      if (!prof?.is_admin) { 
        window.location.href = "/"; 
        return; 
      }

      // Fetch Squarespace Products
      try {
        const prodRes = await fetch('/api/squarespace/products');
        const prodData = await prodRes.json();
        setProducts(prodData || []);
      } catch (e) {
        console.error("Product fetch failed");
      }

      // Load App Settings
      const { data: sett } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      if (sett) {
        setStrategy(sett.redemption_strategy); 
        setPType(sett.weekly_prize_type);
        setPScope(sett.weekly_prize_scope); 
        setPValue(sett.weekly_prize_value);
        setPId(sett.active_item_id); 
        setPTitle(sett.prize_title);
      }

      // Load Rankings
      const { data: u } = await supabase.from('profiles').select('*').order('high_score', { ascending: false });
      setUsers(u || []);
      if (u && u.length > 0) setCurrentTopScorer(u[0]);

      // --- FIXED SCRATCH POOL LOGIC ---
      const { data: sp, error: spError } = await supabase
        .from('scratch_prizes')
        .select('*');

      if (spError) {
        console.error("Scratch Prizes load error:", spError.message);
        setScratchPrizes([]);
      } else if (sp) {
        // Sort in Javascript to prevent the 400 DB error
        const sortedPrizes = [...sp].sort((a, b) => 
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        setScratchPrizes(sortedPrizes);
      }
      // -------------------------------
      
      setLoading(false);
    }
    loadData();
  }, []);

  const saveGlobalSettings = async () => {
    setIsSaving(true);
    await supabase.from('app_settings').update({
      redemption_strategy: strategy,
      weekly_prize_type: pType,
      weekly_prize_scope: pScope,
      weekly_prize_value: pValue,
      active_item_id: pId,
      prize_title: pTitle
    }).eq('id', 1);
    setIsSaving(false);
    alert("Weekly Settings Saved!");
  };

  const finalizeWeek = async () => {
    if (!currentTopScorer || currentTopScorer.high_score === 0) {
      alert("No one has a score yet!");
      return;
    }
    
    if (!confirm(`Award prize to ${currentTopScorer.email}?`)) return;

    try {
      const res = await fetch('/api/admin/finalize-week', { method: 'POST' });
      const result = await res.json();

      if (res.ok) {
        alert("WEEK FINALIZED: Winner awarded and scores reset!");
        window.location.reload();
      } else {
        // This will now show the REAL error (e.g. Squarespace permissions)
        alert("FAILED: " + result.error);
      }
    } catch (err) {
      alert("Critical Error: Connection lost.");
    }
  };
  
  const addScratchPrize = async () => {
    const title = prompt("Prize Name (e.g. 50% Off Chips)");
    const value = prompt("Value (e.g. 50)");
    const scope = confirm("Apply to a specific item? (Cancel for Entire Order)") ? 'PRODUCT' : 'ORDER';
    let itemId = null;
    
    if (scope === 'PRODUCT') {
      alert("After clicking OK, select the product from your browser log or enter the ID.");
      itemId = prompt("Paste the Squarespace Product ID here:");
    }

    if (title && value) {
      const { error } = await supabase.from('scratch_prizes').insert({ 
        title, 
        discount_type: 'RATE', 
        discount_value: parseFloat(value),
        apply_to_item_id: itemId 
      });
      if (!error) window.location.reload();
    }
  };

  const deleteScratchPrize = async (id) => {
    if (confirm("Delete this prize?")) {
      await supabase.from('scratch_prizes').delete().eq('id', id);
      window.location.reload();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#E55937] text-[#FFE974] font-black uppercase italic">Kitchen Loading...</div>;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen bg-gray-50 text-black font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <Link href="/" className="bg-black text-white p-3 rounded-xl shadow-lg"><ArrowLeft /></Link>
        <h1 className="text-4xl font-black uppercase italic text-center">Super <span className="text-red-600">Admin</span></h1>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: WEEKLY CHAMPION & FINALIZER */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-black text-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-6 -top-6 text-white/10 w-48 h-48 rotate-12" />
            <h2 className="text-[#E5FF44] font-black uppercase italic text-2xl mb-8 flex items-center gap-2">
              <Star fill="#E5FF44" /> The Weekly Champion
            </h2>
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div>
                  <p className="text-xs uppercase font-black opacity-40 mb-1 tracking-widest">Rank #1</p>
                  <p className="text-2xl font-bold mb-1">{currentTopScorer.email}</p>
                  <p className="text-7xl font-black text-[#E5FF44] italic tracking-tighter">{currentTopScorer.high_score}</p>
                </div>
                <button onClick={finalizeWeek} className="bg-[#E5FF44] text-black px-12 py-6 rounded-2xl font-black uppercase italic text-xl shadow-xl hover:scale-105 transition-transform">
                  Award & Reset Board
                </button>
              </div>
            ) : <p className="opacity-40 font-bold uppercase tracking-widest">No scores built this week yet.</p>}
          </div>

          {/* SCRATCH PRIZE POOL LIST */}
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black uppercase italic text-blue-600">Scratch Prize Pool</h2>
              <button onClick={addScratchPrize} className="bg-blue-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-all">
                <Plus size={24} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scratchPrizes.map((p) => (
                <div key={p.id} className="flex justify-between items-center p-5 border-4 border-black rounded-2xl bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div>
                    <p className="font-black uppercase text-sm">{p.title}</p>
                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">
                      {p.discount_value}% {p.apply_to_item_id ? "(Specific Item)" : "(Total Order)"}
                    </p>
                  </div>
                  <button onClick={() => deleteScratchPrize(p.id)} className="text-red-500 hover:scale-125 transition-transform"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COL 2: GLOBAL CONFIGURATION */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase mb-8 flex items-center gap-2 underline underline-offset-8 decoration-red-500">
              <Settings size={20} /> App Settings
            </h2>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40">Prize Display Name</label>
                <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={pType} onChange={(e) => setPType(e.target.value)} className="border-4 border-black p-3 rounded-xl font-black text-[10px] uppercase">
                  <option value="FREE_PRODUCT">Free Item</option>
                  <option value="RATE">% Off</option>
                  <option value="AMOUNT">£ Off</option>
                </select>
                <select value={pScope} onChange={(e) => setPScope(e.target.value)} className="border-4 border-black p-3 rounded-xl font-black text-[10px] uppercase">
                  <option value="PRODUCT">Specific Product</option>
                  <option value="ORDER">Total Order</option>
                </select>
              </div>
              {pScope === 'PRODUCT' && (
                <select value={pId} onChange={(e) => setPId(e.target.value)} className="w-full border-4 border-black p-4 rounded-xl font-bold uppercase text-xs">
                  <option value="">-- Select Burger --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {pType !== 'FREE_PRODUCT' && (
                <input type="number" value={pValue} onChange={(e) => setPValue(parseFloat(e.target.value))} className="w-full border-4 border-black p-4 rounded-xl font-bold" placeholder="Discount Amount" />
              )}
              <button onClick={saveGlobalSettings} disabled={isSaving} className="w-full bg-black text-[#FFE974] py-5 rounded-2xl font-black uppercase italic text-xl flex justify-center items-center gap-3 active:scale-95 transition-all shadow-xl">
                {isSaving ? <Loader2 className="animate-spin" /> : "Save Settings"}
              </button>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-8">
  <h2 className="font-black uppercase text-sm mb-4">Manual Code Pool</h2>
  <textarea 
    placeholder="Paste codes here (one per line)..."
    value={manualCodes}
    onChange={(e) => setManualCodes(e.target.value)}
    className="w-full h-32 border-4 border-black p-3 rounded-xl font-mono text-xs mb-4"
  />
  <button onClick={uploadCodes} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase italic">
    Inject Codes into App
  </button>
</div>
          <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-lg">
             <div className="bg-black text-white p-4 font-black uppercase text-[10px] tracking-[0.2em] text-center">Live Rankings</div>
             {allUsers.slice(0, 5).map(u => (
               <div key={u.id} className="p-4 border-b-2 border-gray-100 flex justify-between items-center font-bold text-xs">
                 <span className="truncate w-32">{u.email}</span>
                 <span className="text-red-600">{u.high_score}</span>
               </div>
             ))}
          </div>
        </div>

      </div>
    </div>
  );
}
