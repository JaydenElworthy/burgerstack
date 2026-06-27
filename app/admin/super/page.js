'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ArrowLeft, Settings, Trophy, Trash2, Plus, Crown, Star, RefreshCw, Loader2, Tag, Ticket } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Squarespace sync states
  const [squarespaceDiscounts, setSquarespaceDiscounts] = useState([]);
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false);
  const [codeBankTab, setCodeBankTab] = useState('sync'); // 'sync' or 'manual'

  // Scratch prize form modal states
  const [showAddScratchModal, setShowAddScratchModal] = useState(false);
  const [scratchFormTitle, setScratchFormTitle] = useState('');
  const [scratchFormValue, setScratchFormValue] = useState('');
  const [scratchFormProductId, setScratchFormProductId] = useState('');

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

  const loadSquarespaceDiscounts = async () => {
    setIsLoadingDiscounts(true);
    try {
      const res = await fetch('/api/squarespace/discounts');
      const discounts = await res.json();
      
      if (Array.isArray(discounts)) {
        const { data: existing } = await supabase.from('manual_code_bank').select('code');
        const bankCodes = new Set(existing?.map(x => x.code) || []);
        
        const available = discounts.filter(d => d.promoCode && !bankCodes.has(d.promoCode));
        setSquarespaceDiscounts(available);
        
        const initialSelections = {};
        available.forEach(d => {
          initialSelections[d.promoCode] = { selected: false, bucket: 'GRAND' };
        });
        setSelectedImportCodes(initialSelections);
      }
    } catch (e) {
      console.error("Failed to load Squarespace discounts:", e);
    } finally {
      setIsLoadingDiscounts(false);
    }
  };

  const handleImportDiscounts = async () => {
    const toImport = Object.entries(selectedImportCodes)
      .filter(([_, value]) => value.selected)
      .map(([code, value]) => ({
        code,
        prize_type: value.bucket,
        is_claimed: false
      }));

    if (toImport.length === 0) return alert("Select at least one discount code to import");

    setIsSaving(true);
    const { error } = await supabase.from('manual_code_bank').insert(toImport);
    setIsSaving(false);

    if (!error) {
      alert(`Successfully imported ${toImport.length} codes into the Code Bank!`);
      loadData();
      loadSquarespaceDiscounts();
    } else {
      alert("Error importing codes: " + error.message);
    }
  };

  useEffect(() => { 
    loadData(); 
    loadSquarespaceDiscounts();
  }, []);

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

  const toggleScratchPrizeActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('scratch_prizes')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) {
      loadData();
    } else {
      alert("Error updating status: " + error.message);
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
      redemption_strategy: strategy, 
      weekly_prize_type: pType,
      weekly_prize_scope: pScope, 
      weekly_prize_value: pValue,
      active_item_id: pType === 'FREE_PRODUCT' ? pId : null, 
      prize_title: pType === 'FREE_PRODUCT' ? (item?.name || pTitle) : pTitle
    }).eq('id', 1);
    setIsSaving(false);
    alert("Weekly Prize Updated!");
  };

  const handleCreateScratchPrize = async (e) => {
    e.preventDefault();
    if (!scratchFormTitle || !scratchFormValue) return alert("Title and discount value are required.");
    
    setIsSaving(true);
    const { error } = await supabase.from('scratch_prizes').insert({
      title: scratchFormTitle,
      discount_type: 'RATE',
      discount_value: parseFloat(scratchFormValue),
      apply_to_item_id: scratchFormProductId || null,
      is_active: true
    });
    setIsSaving(false);

    if (!error) {
      alert("Scratch prize added successfully!");
      setScratchFormTitle('');
      setScratchFormValue('');
      setScratchFormProductId('');
      setShowAddScratchModal(false);
      loadData();
    } else {
      alert("Error adding scratch prize: " + error.message);
    }
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
    <div className="p-3 sm:p-6 md:p-10 max-w-7xl mx-auto min-h-screen bg-gray-100 text-black font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 md:mb-10 gap-2">
        <Link href="/" className="bg-black text-white p-2.5 sm:p-3 rounded-xl shadow-lg hover:scale-110 transition-transform"><ArrowLeft size={20} className="sm:w-6 sm:h-6" /></Link>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold uppercase italic tracking-tighter text-center">Super <span className="text-red-600">Admin</span></h1>
        <div className="w-10 sm:w-12" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* LEFT: WEEKLY WINNER */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-black text-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(229,255,68,1)] sm:shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-6 -top-6 text-white/10 w-48 h-48 rotate-12" />
            <h2 className="text-[#FFE974] font-bold uppercase italic text-xl sm:text-2xl mb-4 sm:mb-8 flex items-center gap-2"><Star fill="#FFE974" /> Weekly Champion</h2>
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 relative z-10 w-full text-center md:text-left">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black opacity-40 uppercase tracking-widest mb-1">Rank #1 Current</p>
                  <p className="text-lg sm:text-2xl font-bold mb-1 break-all">{currentTopScorer.email}</p>
                  <p className="text-6xl sm:text-8xl font-bold text-[#FFE974] italic tracking-tighter leading-none my-2">{currentTopScorer.high_score}</p>
                </div>
                <button onClick={finalizeWeek} className="w-full md:w-auto bg-[#FFE974] text-black px-8 py-4 sm:px-12 sm:py-6 rounded-2xl font-bold uppercase italic text-lg sm:text-xl shadow-xl hover:scale-105 transition-transform active:translate-y-1">Award & Reset</button>
              </div>
            ) : <p className="opacity-40 font-bold uppercase tracking-widest text-center py-10">Waiting for players to build burgers...</p>}
          </div>

          {/* SCRATCH PRIZE MANAGEMENT */}
          <div className="bg-white border-4 border-black rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex justify-between items-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-2xl font-bold uppercase italic text-blue-600 flex items-center gap-2"><Ticket /> Scratch Prizes</h2>
              <button 
                onClick={() => setShowAddScratchModal(true)} 
                className="bg-blue-600 text-white p-2.5 sm:p-3 rounded-full shadow-lg active:scale-90 transition-all hover:bg-blue-700"
              >
                <Plus size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scratchPrizes.map((p) => (
                <div key={p.id} className="p-4 sm:p-5 border-4 border-black rounded-2xl bg-gray-50 flex justify-between items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex-1 pr-3">
                    <p className="font-bold uppercase text-sm">{p.title}</p>
                    <p className="text-[10px] opacity-50 font-black uppercase">
                      {p.discount_value}% Off • {p.apply_to_item_id ? `Product: ${products.find(prod => prod.id === p.apply_to_item_id)?.name || 'Specific Item'}` : "Total Order"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleScratchPrizeActive(p.id, p.is_active)}
                      className={`px-3 py-1 rounded-full border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all ${p.is_active ? 'bg-green-400 text-black' : 'bg-gray-300 text-gray-600'}`}
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => deleteScratchPrize(p.id)} className="text-red-500 hover:scale-125 transition-transform p-2"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
              {scratchPrizes.length === 0 && <p className="col-span-2 text-center opacity-30 uppercase font-bold italic">No scratch prizes created yet.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT: CONFIG & CODE BANK */}
        <div className="space-y-6 sm:space-y-8">
          {/* WEEKLY SETTINGS */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg sm:text-xl font-bold uppercase mb-6 sm:mb-8 flex items-center gap-2 underline underline-offset-8 decoration-red-500"><Settings size={20} /> Weekly Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40">Prize Title (Display Name)</label>
                <input 
                  type="text" 
                  value={pTitle} 
                  onChange={(e) => setPTitle(e.target.value)} 
                  placeholder="e.g. Free Loaded Fries or 50% Off Order" 
                  className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs bg-white text-black mt-1"
                />
              </div>

               <div>
                <label className="text-[10px] font-black uppercase opacity-40">Prize Type</label>
                <select value={pType} onChange={(e) => setPType(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs mt-1">
                  <option value="FREE_PRODUCT">Free Item</option>
                  <option value="RATE">% Off Order</option>
                </select>
              </div>
              
              {pType === 'FREE_PRODUCT' ? (
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40">Choose Squarespace Product</label>
                  <div className="flex gap-2 mt-1">
                    <select value={pId} onChange={(e) => setPId(e.target.value)} className="flex-1 border-4 border-black p-3 rounded-xl font-bold uppercase text-[10px] bg-white text-black">
                      <option value="">-- Choose Product --</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={refreshProducts} className={`p-3 border-4 border-black rounded-xl bg-white ${isRefreshing ? 'animate-spin' : ''}`}><RefreshCw size={18}/></button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40">Discount Percentage (%)</label>
                  <input 
                    type="number" 
                    value={pValue} 
                    onChange={(e) => setPValue(parseFloat(e.target.value) || 0)} 
                    placeholder="e.g. 50" 
                    className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs bg-white text-black mt-1"
                  />
                </div>
              )}

              <button onClick={saveWeeklyConfig} disabled={isSaving} className="w-full bg-black text-[#FFE974] py-4 rounded-xl font-black uppercase italic shadow-lg flex justify-center items-center gap-2 active:translate-y-1">
                {isSaving ? <Loader2 className="animate-spin" /> : "Save Weekly Prize"}
              </button>
            </div>
          </div>

          {/* CODE BANK (THE BUCKET) */}
          <div className="bg-white p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2.5rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-bold uppercase text-sm mb-4 flex items-center gap-2"><Tag size={16}/> Load Code Bank</h2>
            
            {/* Tabs */}
            <div className="flex border-b-2 border-black mb-4">
              <button
                type="button"
                onClick={() => setCodeBankTab('sync')}
                className={`flex-1 py-2 font-bold uppercase text-xs text-center border-r-2 border-black last:border-r-0 ${codeBankTab === 'sync' ? 'bg-[#FFE974] text-black font-black' : 'bg-white text-gray-500 font-bold'}`}
              >
                Sync Squarespace
              </button>
              <button
                type="button"
                onClick={() => setCodeBankTab('manual')}
                className={`flex-1 py-2 font-bold uppercase text-xs text-center ${codeBankTab === 'manual' ? 'bg-[#FFE974] text-black font-black' : 'bg-white text-gray-500 font-bold'}`}
              >
                Manual Paste
              </button>
            </div>

            <div className="space-y-4">
              {codeBankTab === 'sync' ? (
                <>
                  {isLoadingDiscounts ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="animate-spin text-blue-600" size={24} />
                      <span className="text-xs uppercase font-bold tracking-wider ml-2">Loading active codes...</span>
                    </div>
                  ) : squarespaceDiscounts.length === 0 ? (
                    <p className="text-center py-6 text-xs text-gray-400 font-bold uppercase italic leading-tight">All active Squarespace codes are already loaded in the bank.</p>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-56 overflow-y-auto border-2 border-black p-3 rounded-xl bg-gray-50">
                        {squarespaceDiscounts.map(d => (
                          <div key={d.promoCode} className="flex items-center justify-between gap-3 text-xs border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedImportCodes[d.promoCode]?.selected || false}
                                onChange={(e) => {
                                  setSelectedImportCodes(prev => ({
                                    ...prev,
                                    [d.promoCode]: { ...prev[d.promoCode], selected: e.target.checked }
                                  }));
                                }}
                                className="w-4 h-4 accent-blue-600 cursor-pointer"
                              />
                              <div className="truncate min-w-0">
                                <p className="font-bold text-black truncate">{d.promoCode}</p>
                                <p className="text-[9px] text-gray-500 truncate leading-none">{d.name}</p>
                              </div>
                            </div>
                            <select
                              value={selectedImportCodes[d.promoCode]?.bucket || 'GRAND'}
                              onChange={(e) => {
                                setSelectedImportCodes(prev => ({
                                  ...prev,
                                  [d.promoCode]: { ...prev[d.promoCode], bucket: e.target.value }
                                }));
                              }}
                              className="border-2 border-black rounded-lg p-1 font-black uppercase text-[8px] bg-white cursor-pointer"
                            >
                              <option value="GRAND">Grand Prize</option>
                              {scratchPrizes.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      <button onClick={handleImportDiscounts} disabled={isSaving} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold uppercase italic shadow-md active:translate-y-0.5 text-xs">
                        Import Selected ({Object.values(selectedImportCodes).filter(v => v.selected).length})
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <select value={codeBucket} onChange={(e) => setCodeBucket(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-black uppercase text-[10px]">
                    <option value="GRAND">Bucket: Weekly Grand Prize</option>
                    {scratchPrizes.map(p => (
                      <option key={p.id} value={p.id}>Bucket: {p.title}</option>
                    ))}
                  </select>
                  <textarea value={manualCodes} onChange={(e) => setManualCodes(e.target.value)} className="w-full h-32 border-4 border-black p-3 rounded-xl font-mono text-xs" placeholder="Paste Squarespace codes here (one per line)..." />
                  <button onClick={uploadToBucket} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase italic shadow-md active:translate-y-1">Load Bucket</button>
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* DANGER ZONE / RESET SECTION */}
      <div className="mt-8 sm:mt-12 bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(229,89,55,1)] sm:shadow-[8px_8px_0px_0px_rgba(229,89,55,1)]">
        <h2 className="text-xl sm:text-2xl font-bold uppercase italic text-red-600 flex items-center gap-2 mb-3 sm:mb-4">
          <Trash2 size={24} /> Danger Zone
        </h2>
        <p className="text-sm text-gray-600 mb-6 font-medium">
          Resetting the system will set all player high scores to 0, reset scratch card counts, lock bonus scratches, and permanently delete all rewards from players' wallets. This action is irreversible.
        </p>
        <button
          onClick={handleResetAll}
          disabled={isResetting}
          className="w-full sm:w-auto bg-red-600 text-white border-4 border-black px-6 py-4 rounded-2xl font-bold uppercase italic text-base sm:text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none hover:bg-red-700 transition-all flex items-center justify-center gap-2"
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

      {/* ADD SCRATCH PRIZE MODAL */}
      <AnimatePresence>
        {showAddScratchModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999] font-sans">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-4 border-black p-6 rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md text-black relative mx-auto my-auto"
            >
              <button 
                onClick={() => setShowAddScratchModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold text-2xl leading-none"
              >
                &times;
              </button>
              
              <h3 className="text-xl font-black uppercase italic tracking-tight mb-6 flex items-center gap-2 text-blue-600">
                <Ticket /> Add Scratch Prize
              </h3>

              <form onSubmit={handleCreateScratchPrize} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40">Prize Title (Display Name)</label>
                  <input
                    type="text"
                    required
                    value={scratchFormTitle}
                    onChange={(e) => setScratchFormTitle(e.target.value)}
                    placeholder="e.g. 50% Off Loaded Fries"
                    className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs bg-white text-black mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40">Discount Value (%)</label>
                  <input
                    type="number"
                    required
                    value={scratchFormValue}
                    onChange={(e) => setScratchFormValue(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs bg-white text-black mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40">Applies To Product (Optional)</label>
                  <select
                    value={scratchFormProductId}
                    onChange={(e) => setScratchFormProductId(e.target.value)}
                    className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-[10px] bg-white text-black mt-1"
                  >
                    <option value="">Apply to Total Order (No Specific Item)</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddScratchModal(false)}
                    className="flex-1 bg-gray-200 border-2 border-black py-3 rounded-xl font-bold uppercase text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-[#FFE974] border-2 border-black py-3 rounded-xl font-bold uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                  >
                    Create Prize
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
