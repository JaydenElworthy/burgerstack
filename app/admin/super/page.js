'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Users, Star, Crown, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState([]);
  
  // Separate states to prevent collisions
  const [redemptionMethod, setRedemptionMethod] = useState('manual');
  const [prizeType, setPrizeType] = useState('FREE_PRODUCT');
  const [prizeValue, setPrizeValue] = useState(10);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [winnerCount, setWinnerCount] = useState(10);
  
  const [currentTopScorer, setCurrentTopScorer] = useState(null);
  const [allUsers, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function initAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!profile || !profile.is_admin) { router.push('/'); return; }

      try {
        const prodRes = await fetch('/api/squarespace/products');
        const prodData = await prodRes.json();
        setProducts(prodData || []);
      } catch (e) { console.error("Could not load products"); }

      const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();
      if (settings) {
        setRedemptionMethod(settings.redemption_strategy || 'manual');
        setPrizeType(settings.weekly_prize_type || 'FREE_PRODUCT');
        setPrizeValue(settings.weekly_prize_value || 10);
        setSelectedProduct(settings.active_item_id || '');
        setWinnerCount(settings.weekly_winner_limit || 1);
      }

      const { data: usersData } = await supabase.from('profiles').select('*').order('high_score', { ascending: false });
      setUsers(usersData || []);
      if (usersData && usersData.length > 0) setCurrentTopScorer(usersData[0]);

      setLoading(false);
    }
    initAdmin();
  }, [router]);

  const saveSettings = async () => {
    setIsSaving(true);
    const item = products.find(p => p.id === selectedProduct);
    
    const { error } = await supabase.from('app_settings').update({
      redemption_strategy: redemptionMethod,
      weekly_prize_type: prizeType,
      weekly_prize_value: prizeValue,
      active_item_id: selectedProduct,
      prize_title: item?.name || (prizeType === 'RATE' ? `${prizeValue}% Off` : 'Weekly Prize'),
      weekly_winner_limit: winnerCount
    }).eq('id', 1);

    setIsSaving(false);
    if (!error) alert("Settings Saved!");
    else alert("Error saving: " + error.message);
  };

  const finalizeWeek = async () => {
    if (!currentTopScorer || currentTopScorer.high_score === 0) {
      alert("No valid winner with a score > 0.");
      return;
    }
    if (!confirm(`Award prize to ${currentTopScorer.email} and RESET all scores?`)) return;

    try {
      const res = await fetch('/api/admin/finalize-week', { method: 'POST' });
      const result = await res.json();

      if (res.ok) {
        alert("SUCCESS: Week finalized and board reset.");
        window.location.reload();
      } else {
        alert("ERROR: " + result.error);
      }
    } catch (e) {
      alert("Critical Connection Error");
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase italic bg-[#E55937] text-[#FFE974]">Verifying Admin...</div>;

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
        
        {/* COLUMN 1: THE WEEKLY CHAMPION */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-black text-white p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(229,255,68,1)] relative overflow-hidden">
            <Crown className="absolute -right-4 -top-4 text-white/10 w-40 h-40 rotate-12" />
            <h2 className="text-[#E5FF44] font-black uppercase italic text-2xl mb-6">Weekly Champion</h2>
            
            {currentTopScorer && currentTopScorer.high_score > 0 ? (
              <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <p className="text-xs uppercase font-black opacity-50 mb-1">Current #1 Seed</p>
                  <p className="text-2xl font-bold mb-1">{currentTopScorer.email}</p>
                  <p className="text-6xl font-black text-[#E5FF44] italic tracking-tighter">{currentTopScorer.high_score} <span className="text-sm not-italic uppercase">Burgers</span></p>
                </div>
                <button 
                  onClick={finalizeWeek}
                  className="bg-[#E5FF44] text-black px-10 py-6 rounded-2xl font-black uppercase italic text-xl shadow-lg hover:scale-105 transition-transform"
                >
                  End Week & Award
                </button>
              </div>
            ) : (
              <p className="opacity-50 font-bold uppercase">No qualified players yet.</p>
            )}
          </div>

          {/* USER TABLE */}
          <div className="bg-white border-4 border-black rounded-[2rem] overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <div className="bg-black p-4 text-white font-black uppercase text-xs italic">User Rankings</div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 text-[10px] uppercase font-black border-b-2 border-black">
                  <th className="p-4">Customer</th>
                  <th className="p-4 text-center">Best Score</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u) => (
                  <tr key={u.id} className="border-b-2 border-gray-100">
                    <td className="p-4 font-bold text-sm">{u.email}</td>
                    <td className="p-4 text-center font-black text-red-600 italic text-xl">{u.high_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* COLUMN 2: CONFIGURATION */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="font-black uppercase text-sm mb-6 flex items-center gap-2">
              <Settings size={16} /> Global Config
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block font-black uppercase text-[10px] opacity-40 mb-2">Redemption Method</label>
                <select 
                  value={redemptionMethod} 
                  onChange={(e) => setRedemptionMethod(e.target.value)}
                  className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs"
                >
                  <option value="manual">Manual Pool</option>
                  <option value="api">Automated API</option>
                  <option value="in-app">Staff Check</option>
                </select>
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] opacity-40 mb-2">Prize Type</label>
                <select 
                  value={prizeType} 
                  onChange={(e) => setPrizeType(e.target.value)}
                  className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs"
                >
                  <option value="FREE_PRODUCT">Free Specific Product</option>
                  <option value="RATE">% Discount</option>
                  <option value="AMOUNT">Fixed £ Discount</option>
                </select>
              </div>

              {prizeType === 'FREE_PRODUCT' ? (
                <div>
                  <label className="block font-black uppercase text-[10px] opacity-40 mb-2">Select Product</label>
                  <select 
                    value={selectedProduct} 
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full border-4 border-black p-3 rounded-xl font-bold text-xs"
                  >
                    <option value="">-- Choose Burger --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-black uppercase text-[10px] opacity-40 mb-2">Discount Value</label>
                  <input 
                    type="number" 
                    value={prizeValue}
                    onChange={(e) => setPrizeValue(parseFloat(e.target.value))}
                    className="w-full border-4 border-black p-3 rounded-xl font-bold"
                  />
                </div>
              )}

              <button 
                onClick={saveSettings}
                disabled={isSaving}
                className="w-full bg-black text-white py-4 rounded-xl font-black uppercase italic hover:bg-green-600 transition-colors flex justify-center items-center gap-2"
              >
                {isSaving && <Loader2 className="animate-spin" size={18} />}
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
