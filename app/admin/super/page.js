'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Settings, Trophy, Trash2, Plus, Crown, Star, RefreshCw, Loader2, Tag, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [products, setProducts] = useState([]);
  const [allUsers, setUsers] = useState([]);
  const [scratchPrizes, setScratchPrizes] = useState([]);
  const [currentTopScorer, setCurrentTopScorer] = useState(null);
  const [manualCodes, setManualCodes] = useState('');
  const [codeBucket, setCodeBucket] = useState('GRAND'); // 'GRAND' or a specific Scratch Prize ID
  
  // Weekly Prize Settings State
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

    // Fetch Squarespace Products
    const prodRes = await fetch('/api/squarespace/products', { cache: 'no-store' });
    const prodData = await prodRes.json();
    setProducts(prodData || []);

    // Load App Settings (Weekly Prize)
    const { data: sett } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (sett) {
      setStrategy(sett.redemption_strategy || 'manual'); 
      setPType(sett.weekly_prize_type || 'FREE_PRODUCT');
      setPScope(sett.weekly_prize_scope || 'PRODUCT'); 
      setPValue(sett.weekly_prize_value || 100);
      setPId(sett.active_item_id || ''); 
      setPTitle(sett.prize_title || 'Grand Prize');
    }

    // Load Rankings
    const { data: u } = await supabase.from('profiles').select('*').order('high_score', { ascending: false });
    setUsers(u || []);
    if (u && u.length > 0) setCurrentTopScorer(u[0]);

    // Load Scratch Prize Types
    const { data: sp } = await supabase.from('scratch_prizes').select('*').order('created_at', { ascending: false });
    setScratchPrizes(sp || []);
    
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const refreshProducts = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    alert("Products updated!");
  };

  const uploadToBucket = async () => {
    if (!manualCodes) return alert("Paste codes first");
    const list = manualCodes.split(/[\n,]+/).map(c => c.trim()).filter(c => c !== '');
    
    // Check for duplicates in the bank
    const { data: existing } = await supabase.from('manual_code_bank').select('code');
    const existingStrings = existing?.map(x => x.code) || [];
    const newCodes = list.filter(c => !existingStrings.includes(c));

    if (newCodes.length === 0) return alert("All codes already exist in bank.");

    const { error } = await supabase.from('manual_code_bank').insert(
      newCodes.map(code => ({ 
        code, 
        prize_type: codeBucket, 
        is_claimed: false 
      }))
    );

    if (!error) {
      alert(`Added ${newCodes.length} codes to ${codeBucket === 'GRAND' ? 'Grand Prize' : 'Scratch Pool'}!`);
      setManualCodes('');
    } else {
      alert("Error: " + error.message);
    }
  };

  const addScratchPrizeType = async () => {
    const title = prompt("Prize Name (e.g. 50% Off Loaded Fries)");
    const val = prompt("Discount % (e.g. 50)");
    const itemId = prompt("Specific Squarespace Product ID (Leave blank for Total Order)");
    
    if (title && val) {
      const { error } = await supabase.from('scratch_prizes').insert({
        title,
        discount_type: 'RATE',
        discount_value: parseFloat(val),
        apply_to_item_id: itemId || null
      });
      if (!error) loadData();
    }
  };

  const deleteScratchPrize = async (id) => {
    if (confirm("Delete this prize category?")) {
      await supabase.from('scratch_prizes').delete().eq('id', id);
      loadData();
    }
  };

  const saveWeeklyConfig = async () => {
    setIsSaving(true);
    const item = products.find(p => p.id === pId);
    await supabase.from('app_settings').update({
      redemption_strategy: strategy, weekly_prize_type: pType,
      weekly_prize_scope: pScope, weekly_prize_value: pValue,
      active_item_id: pId, prize_title: item?.name || pTitle
    }).eq('id', 1);
    setIsSaving(false);
    alert("Weekly Prize Updated!");
  };

  const finalizeWeek = async () => {
    if (!currentTopScorer || currentTopScorer.high_score === 0) return alert("No winner yet.");
    if (!confirm(`Finalize Week? Winner: ${currentTopScorer.email}`)) return;
    const res = await fetch('/api/admin/finalize-week', { method: 'POST' });
    const result = await res.json();
    if (res.ok) { alert("WEEK CLOSED: Prize awarded to " + result.winner); window.location.reload(); }
    else { alert("Error: " + result.error); }
  };

  const handleResetAll = async () => {
    const confirmation1 = confirm("⚠️ WARNING: This will permanently delete all rewards from players' wallets and reset all high scores to 0. Are you absolutely sure you want to proceed?");
    if (!confirmation1) return;

    const confirmation2 = confirm("🚨 FINAL WARNING: This action is irreversible. Press OK to confirm you want to delete all rewards and reset all scores.");
    if (!confirmation2) return;

    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset-all', { method: 'POST' });
      if (res.ok) {
        alert("Database reset successfully! All high scores, scratch counts, and wallet rewards have been cleared.");
        window.location.reload();
      } else {
        const result = await res.json();
        alert("Error resetting database: " + result.error);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#E55937] text-[#FFE974] font-bold italic uppercase">Loading Kitchen...</div>;

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen bg-gray-100 text-black font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-10">
        <Link href="/" className="bg-black text-white p-3 rounded-xl shadow-lg hover:scale-110 transition-transform"><ArrowLeft /></Link>
        <h1 className="text-4xl font-bold uppercase italic tracking-tighter">Super <span className="text-red-600">Admin</span></h1>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: WEEKLY WINNER */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-black text-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-6 -top-6 text-white/10 w-48 h-48 rotate-12" />
            <h2 className="text-[#FFE974] font-bold uppercase italic text-2xl mb-8 flex items-center gap-2"><Star fill="#FFE974" /> Weekly Champion</h2>
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                <div>
                  <p className="text-xs font-black opacity-40 uppercase tracking-widest mb-1">Rank #1 Current</p>
                  <p className="text-2xl font-bold mb-1">{currentTopScorer.email}</p>
                  <p className="text-8xl font-bold text-[#FFE974] italic tracking-tighter">{currentTopScorer.high_score}</p>
                </div>
                <button onClick={finalizeWeek} className="bg-[#FFE974] text-black px-12 py-6 rounded-2xl font-bold uppercase italic text-xl shadow-xl hover:scale-105 transition-transform active:translate-y-1">Award & Reset</button>
              </div>
            ) : <p className="opacity-40 font-bold uppercase tracking-widest text-center py-10">Waiting for players to build burgers...</p>}
          </div>

          {/* SCRATCH PRIZE MANAGEMENT */}
          <div className="bg-white border-4 border-black rounded-[3rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold uppercase italic text-blue-600 flex items-center gap-2"><Ticket /> Scratch Prize Types</h2>
              <button onClick={addScratchPrizeType} className="bg-blue-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-all hover:bg-blue-700">
                <Plus size={24} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scratchPrizes.map((p) => (
                <div key={p.id} className="p-5 border-4 border-black rounded-2xl bg-gray-50 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div>
                    <p className="font-bold uppercase text-sm">{p.title}</p>
                    <p className="text-[10px] opacity-50 font-black uppercase">{p.discount_value}% Off • {p.apply_to_item_id ? "Specific Item" : "Total Order"}</p>
                  </div>
                  <button onClick={() => deleteScratchPrize(p.id)} className="text-red-500 hover:scale-125 transition-transform p-2"><Trash2 size={18} /></button>
                </div>
              ))}
              {scratchPrizes.length === 0 && <p className="col-span-2 text-center opacity-30 uppercase font-bold italic">No scratch prizes created yet.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT: CONFIG & CODE BANK */}
        <div className="space-y-8">
          {/* WEEKLY SETTINGS */}
          <div className="bg-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-bold uppercase mb-8 flex items-center gap-2 underline underline-offset-8 decoration-red-500"><Settings size={20} /> Weekly Setup</h2>
            <div className="space-y-4">
               <div>
                <label className="text-[10px] font-black uppercase opacity-40">Prize Type</label>
                <select value={pType} onChange={(e) => setPType(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs">
                  <option value="FREE_PRODUCT">Free Item</option>
                  <option value="RATE">% Off Order</option>
                </select>
              </div>
              
              {pType === 'FREE_PRODUCT' && (
                <div className="flex gap-2">
                  <select value={pId} onChange={(e) => setPId(e.target.value)} className="flex-1 border-4 border-black p-3 rounded-xl font-bold uppercase text-[10px]">
                    <option value="">-- Choose Product --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button onClick={refreshProducts} className={`p-3 border-4 border-black rounded-xl bg-white ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18}/></button>
                </div>
              )}

              <button onClick={saveWeeklyConfig} disabled={isSaving} className="w-full bg-black text-[#FFE974] py-4 rounded-xl font-black uppercase italic shadow-lg flex justify-center items-center gap-2 active:translate-y-1">
                {isSaving ? <Loader2 className="animate-spin" /> : "Save Weekly Prize"}
              </button>
            </div>
          </div>

          {/* CODE BANK (THE BUCKET) */}
          <div className="bg-white p-6 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-bold uppercase text-sm mb-4 flex items-center gap-2"><Tag size={16}/> Load Code Bank</h2>
            <div className="space-y-4">
              <select value={codeBucket} onChange={(e) => setCodeBucket(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-black uppercase text-[10px]">
                <option value="GRAND">Bucket: Weekly Grand Prize</option>
                {scratchPrizes.map(p => (
                  <option key={p.id} value={p.id}>Bucket: {p.title}</option>
                ))}
              </select>
              <textarea value={manualCodes} onChange={(e) => setManualCodes(e.target.value)} className="w-full h-32 border-4 border-black p-3 rounded-xl font-mono text-xs" placeholder="Paste Squarespace codes here (one per line)..." />
              <button onClick={uploadToBucket} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase italic shadow-md active:translate-y-1">Load Bucket</button>
            </div>
          </div>
        </div>

      </div>

      {/* DANGER ZONE / RESET SECTION */}
      <div className="mt-12 bg-white p-8 rounded-[3rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,89,55,1)]">
        <h2 className="text-2xl font-bold uppercase italic text-red-600 flex items-center gap-2 mb-4">
          <Trash2 size={24} /> Danger Zone
        </h2>
        <p className="text-sm text-gray-600 mb-6 font-medium">
          Resetting the system will set all player high scores to 0, reset scratch card counts, lock bonus scratches, and permanently delete all rewards from players' wallets. This action is irreversible.
        </p>
        <button
          onClick={handleResetAll}
          disabled={isResetting}
          className="bg-red-600 text-white border-4 border-black px-8 py-4 rounded-2xl font-bold uppercase italic text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none hover:bg-red-700 transition-all flex items-center gap-2"
        >
          {isResetting ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Resetting Database...
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              Reset All Scores & Wallet Rewards
            </>
          )}
        </button>
      </div>

    </div>
  );
}
