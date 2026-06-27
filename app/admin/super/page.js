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

  // Code Bank Inventory state
  const [codeBankInventory, setCodeBankInventory] = useState([]);

  // Accordion/toggle states for code loaders
  const [showHighScoreAddCodes, setShowHighScoreAddCodes] = useState(false);
  const [activeAddCodesPrizeId, setActiveAddCodesPrizeId] = useState(null);

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

    // Load Code Bank Inventory
    const { data: codes } = await supabase.from('manual_code_bank').select('*').order('created_at', { ascending: false });
    setCodeBankInventory(codes || []);
    
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
      alert(`Added ${newCodes.length} codes to ${codeBucket === 'GRAND' ? 'High Score Prize' : 'Scratch Pool'}!`);
      setManualCodes('');
      loadData();
    } else {
      alert("Error: " + error.message);
    }
  };

  const deleteCodeFromBank = async (id) => {
    if (confirm("Remove this code from the bank?")) {
      const { error } = await supabase.from('manual_code_bank').delete().eq('id', id);
      if (!error) {
        loadData();
        loadSquarespaceDiscounts();
      } else {
        alert("Error deleting code: " + error.message);
      }
    }
  };

  const uploadToBucketDirect = async (targetBucket) => {
    if (!manualCodes) return alert("Paste codes first");
    const list = manualCodes.split(/[\n,]+/).map(c => c.trim()).filter(c => c !== '');
    
    const { data: existing } = await supabase.from('manual_code_bank').select('code');
    const existingStrings = existing?.map(x => x.code) || [];
    const newCodes = list.filter(c => !existingStrings.includes(c));

    if (newCodes.length === 0) return alert("All codes already exist in bank.");

    setIsSaving(true);
    const { error } = await supabase.from('manual_code_bank').insert(
      newCodes.map(code => ({ 
        code, 
        prize_type: targetBucket, 
        is_claimed: false 
      }))
    );
    setIsSaving(false);

    if (!error) {
      alert(`Added ${newCodes.length} codes!`);
      setManualCodes('');
      loadData();
    } else {
      alert("Error: " + error.message);
    }
  };

  const renderInlineCodeLoader = (targetBucket) => {
    return (
      <div className="border-2 border-black rounded-2xl p-4 bg-gray-50 mt-3 space-y-3 text-black">
        <div className="flex border-b-2 border-black mb-3">
          <button
            type="button"
            onClick={() => setCodeBankTab('sync')}
            className={`flex-1 py-1.5 font-bold uppercase text-[10px] text-center border-r-2 border-black last:border-r-0 ${codeBankTab === 'sync' ? 'bg-[#FFE974] text-black font-black' : 'bg-white text-gray-500 font-bold'}`}
          >
            Sync Squarespace
          </button>
          <button
            type="button"
            onClick={() => setCodeBankTab('manual')}
            className={`flex-1 py-1.5 font-bold uppercase text-[10px] text-center ${codeBankTab === 'manual' ? 'bg-[#FFE974] text-black font-black' : 'bg-white text-gray-500 font-bold'}`}
          >
            Manual Paste
          </button>
        </div>

        {codeBankTab === 'sync' ? (
          <div className="space-y-3">
            {isLoadingDiscounts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="animate-spin text-blue-600 w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-wider ml-2">Syncing...</span>
              </div>
            ) : squarespaceDiscounts.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase italic leading-tight">No new Squarespace codes found.</p>
                <button
                  type="button"
                  onClick={loadSquarespaceDiscounts}
                  className="bg-black text-[#FFE974] px-4 py-2 rounded-xl text-[9px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-transform"
                >
                  Pull Codes from Squarespace
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-black uppercase text-gray-400">Select codes:</span>
                  <button
                    type="button"
                    onClick={loadSquarespaceDiscounts}
                    className="text-[9px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} className={`${isLoadingDiscounts ? 'animate-spin' : ''}`} /> Sync Squarespace
                  </button>
                </div>
                
                <div className="space-y-2 max-h-36 overflow-y-auto border-2 border-black p-2 rounded-lg bg-white">
                  {squarespaceDiscounts.map(d => (
                    <label key={d.promoCode} className="flex items-center gap-2 text-[10px] cursor-pointer py-1 border-b border-gray-100 last:border-0">
                      <input
                        type="checkbox"
                        checked={selectedImportCodes[d.promoCode]?.selected || false}
                        onChange={(e) => {
                          setSelectedImportCodes(prev => ({
                            ...prev,
                            [d.promoCode]: { selected: e.target.checked, bucket: targetBucket }
                          }));
                        }}
                        className="w-3.5 h-3.5 accent-blue-600"
                      />
                      <span className="font-mono font-bold truncate pr-1 text-black">{d.promoCode}</span>
                      <span className="text-[8px] text-gray-400 truncate flex-1">({d.name})</span>
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleImportDiscounts}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold uppercase italic text-[10px] border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                >
                  Import Selected ({Object.values(selectedImportCodes).filter(v => v.selected && v.bucket === targetBucket).length})
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={manualCodes}
              onChange={(e) => setManualCodes(e.target.value)}
              className="w-full h-24 border-2 border-black p-2 rounded-lg font-mono text-[10px] bg-white text-black"
              placeholder="Paste codes here (one per line)..."
            />
            <button
              type="button"
              onClick={() => uploadToBucketDirect(targetBucket)}
              className="w-full bg-blue-600 text-[#FFE974] py-2 rounded-lg font-bold uppercase italic text-[10px] border border-black active:translate-y-0.5"
            >
              Upload Codes
            </button>
          </div>
        )}
      </div>
    );
  };

  const getGroupedCodes = () => {
    const groups = {
      GRAND: { title: "High Score Winner Prize", unclaimed: [], claimed: [] }
    };
    
    scratchPrizes.forEach(p => {
      groups[p.id] = { title: p.title, unclaimed: [], claimed: [] };
    });

    codeBankInventory.forEach(c => {
      if (!groups[c.prize_type]) {
        groups[c.prize_type] = { title: `Deleted/Unknown Prize Category (${c.prize_type})`, unclaimed: [], claimed: [] };
      }
      if (c.is_claimed) {
        groups[c.prize_type].claimed.push(c);
      } else {
        groups[c.prize_type].unclaimed.push(c);
      }
    });

    return groups;
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
        
        {/* LEFT: HIGH SCORE CHAMPION */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-black text-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(229,255,68,1)] sm:shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-6 -top-6 text-white/10 w-48 h-48 rotate-12" />
            <h2 className="text-[#FFE974] font-bold uppercase italic text-xl sm:text-2xl mb-4 sm:mb-8 flex items-center gap-2"><Star fill="#FFE974" /> High Score Champion</h2>
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
              {scratchPrizes.map((p) => {
                const pCodes = codeBankInventory.filter(c => c.prize_type === p.id);
                const unclaimedCount = pCodes.filter(c => !c.is_claimed).length;
                const isAddingCodes = activeAddCodesPrizeId === p.id;
                
                return (
                  <div key={p.id} className="p-4 sm:p-5 border-4 border-black rounded-2xl bg-gray-50 flex flex-col gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-1 pr-3">
                        <p className="font-bold uppercase text-sm leading-tight">{p.title}</p>
                        <p className="text-[10px] opacity-50 font-black uppercase my-1">
                          {p.discount_value}% Off • {p.apply_to_item_id ? `Product: ${products.find(prod => prod.id === p.apply_to_item_id)?.name || 'Specific Item'}` : "Total Order"}
                        </p>
                        <p className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-block leading-none">
                          {unclaimedCount} codes available
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleScratchPrizeActive(p.id, p.is_active)}
                          className={`px-3 py-1 rounded-full border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all ${p.is_active ? 'bg-green-400 text-black' : 'bg-gray-300 text-gray-600'}`}
                        >
                          {p.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <button onClick={() => deleteScratchPrize(p.id)} className="text-red-500 hover:scale-125 transition-transform p-2"><Trash2 size={18} /></button>
                      </div>
                    </div>

                    {/* Loader trigger */}
                    <div className="w-full border-t border-dashed border-gray-300 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAddCodesPrizeId(isAddingCodes ? null : p.id);
                          setCodeBucket(p.id);
                        }}
                        className="text-[9px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {isAddingCodes ? "Close Loader" : "+ Load Promo Codes"}
                      </button>
                    </div>

                    {/* Collapsible loader drawer */}
                    {isAddingCodes && renderInlineCodeLoader(p.id)}
                  </div>
                );
              })}
              {scratchPrizes.length === 0 && <p className="col-span-2 text-center opacity-30 uppercase font-bold italic">No scratch prizes created yet.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT: CONFIG & CODE BANK */}
        <div className="space-y-6 sm:space-y-8">
          {/* WEEKLY SETTINGS */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-lg sm:text-xl font-bold uppercase mb-6 sm:mb-8 flex items-center gap-2 underline underline-offset-8 decoration-red-500"><Settings size={20} /> High Score Setup</h2>
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
                {isSaving ? <Loader2 className="animate-spin" /> : "Save High Score Prize"}
              </button>

              {/* High Score Code Bank details */}
              <div className="border-t-2 border-black pt-4 mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold uppercase text-xs">High Score Code Bank</h3>
                    <p className="text-[9px] text-gray-500 font-bold uppercase leading-none mt-1">
                      {codeBankInventory.filter(c => c.prize_type === 'GRAND' && !c.is_claimed).length} codes available in bank
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHighScoreAddCodes(!showHighScoreAddCodes)}
                    className="bg-black text-[#FFE974] px-3 py-1.5 rounded-xl border-2 border-black text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none"
                  >
                    {showHighScoreAddCodes ? "Hide Loader" : "+ Load Codes"}
                  </button>
                </div>

                {showHighScoreAddCodes && renderInlineCodeLoader('GRAND')}
              </div>
            </div>
          </div>



          {/* CODE BANK INVENTORY */}
          <div className="bg-white p-5 sm:p-6 rounded-[1.75rem] sm:rounded-[2.5rem] border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mt-6 sm:mt-8">
            <h2 className="font-bold uppercase text-sm mb-4 flex items-center gap-2"><Trophy size={16}/> Code Bank Inventory</h2>
            <div className="space-y-3">
              {Object.entries(getGroupedCodes()).map(([key, group]) => {
                const total = group.unclaimed.length + group.claimed.length;
                if (total === 0) return null;
                return (
                  <details key={key} className="border-2 border-black rounded-xl p-3 bg-gray-50 group">
                    <summary className="font-bold uppercase text-[10px] sm:text-xs flex justify-between items-center cursor-pointer list-none select-none">
                      <span className="truncate pr-2">{group.title}</span>
                      <span className="bg-black text-white px-2 py-0.5 rounded-full text-[8px] font-black shrink-0">
                        {group.unclaimed.length} Available / {total} Total
                      </span>
                    </summary>
                    <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 max-h-48 overflow-y-auto">
                      {group.unclaimed.map(c => (
                        <div key={c.id} className="flex justify-between items-center text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded">
                          <span className="text-green-600 font-bold">{c.code}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black uppercase text-green-700 bg-green-100 px-1 rounded">Unclaimed</span>
                            <button onClick={() => deleteCodeFromBank(c.id)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                          </div>
                        </div>
                      ))}
                      {group.claimed.map(c => {
                        const claimer = allUsers.find(u => u.id === c.claimed_by);
                        return (
                          <div key={c.id} className="flex justify-between items-center text-[10px] font-mono bg-white border border-gray-200 px-2 py-1 rounded opacity-60">
                            <span className="text-gray-600 line-through">{c.code}</span>
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[8px] font-black uppercase text-gray-500 bg-gray-100 px-1 rounded">Claimed</span>
                              {claimer && <span className="text-[8px] text-gray-400 truncate max-w-[120px] font-sans">{claimer.email}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
              {codeBankInventory.length === 0 && (
                <p className="text-center py-6 text-xs text-gray-400 font-bold uppercase italic leading-tight">No codes loaded in the bank yet.</p>
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
