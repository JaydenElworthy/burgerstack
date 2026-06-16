'use client'
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, Trophy, Trash2, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [allUsers, setUsers] = useState([]);
  const [scratchPrizes, setScratchPrizes] = useState([]);
  
  // App Settings State
  const [strategy, setStrategy] = useState('manual');
  const [pType, setPType] = useState('FREE_PRODUCT');
  const [pScope, setPScope] = useState('PRODUCT');
  const [pValue, setPValue] = useState(100);
  const [pId, setPId] = useState('');
  const [pTitle, setPTitle] = useState('Weekly Prize');

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user?.id).single();
      if (!prof?.is_admin) { window.location.href = "/"; return; }

      const prodRes = await fetch('/api/squarespace/products');
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

      const { data: sp } = await supabase.from('scratch_prizes').select('*');
      setScratchPrizes(sp || []);
      
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
    alert("Weekly Prize Updated!");
  };

  const addScratchPrize = async () => {
    const title = prompt("Prize Title (e.g. 20% Off Fries)");
    const val = prompt("Discount Value (e.g. 20)");
    if (title && val) {
      await supabase.from('scratch_prizes').insert({ title, discount_type: 'RATE', discount_value: parseFloat(val) });
      window.location.reload();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#E55937] text-[#FFE974] font-bold italic">LOADING...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-gray-50 text-black font-sans pb-20">
      <div className="flex justify-between items-center mb-10 text-black">
        <Link href="/" className="flex items-center gap-2 font-bold uppercase text-xs opacity-50"><ArrowLeft size={16} /> Back</Link>
        <h1 className="text-4xl font-bold uppercase italic">Super Admin</h1>
        <div className="w-10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: WEEKLY CHAMPION SETTINGS */}
        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-2xl font-bold uppercase italic mb-6 text-red-600">Weekly Champion Prize</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase opacity-40">Prize Display Name</label>
              <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40">Discount Type</label>
                <select value={pType} onChange={(e) => setPType(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs">
                  <option value="FREE_PRODUCT">Free Product</option>
                  <option value="RATE">% Discount</option>
                  <option value="AMOUNT">Fixed £ Discount</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase opacity-40">Apply To...</label>
                <select value={pScope} onChange={(e) => setPScope(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs">
                  <option value="PRODUCT">Single Product</option>
                  <option value="ORDER">Entire Order</option>
                </select>
              </div>
            </div>

            {pScope === 'PRODUCT' && (
              <div>
                <label className="text-[10px] font-black uppercase opacity-40">Select Product</label>
                <select value={pId} onChange={(e) => setPId(e.target.value)} className="w-full border-4 border-black p-3 rounded-xl font-bold uppercase text-xs">
                  <option value="">-- Choose Item --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {pType !== 'FREE_PRODUCT' && (
              <div>
                <label className="text-[10px] font-black uppercase opacity-40">Discount Value</label>
                <input type="number" value={pValue} onChange={(e) => setPValue(parseFloat(e.target.value))} className="w-full border-4 border-black p-3 rounded-xl font-bold" />
              </div>
            )}

            <button onClick={saveGlobalSettings} className="w-full bg-black text-[#FFE974] py-4 rounded-xl font-black uppercase italic shadow-lg">Save Weekly Configuration</button>
          </div>
        </div>

        {/* RIGHT COLUMN: SCRATCH PRIZE POOL */}
        <div className="bg-white p-8 rounded-[2.5rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-bold uppercase italic text-blue-600">Scratch Prize Pool</h2>
             <button onClick={addScratchPrize} className="bg-blue-600 text-white p-2 rounded-full"><Plus size={20}/></button>
          </div>

          <div className="space-y-3">
            {scratchPrizes.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-4 border-2 border-black rounded-xl">
                <div>
                  <p className="font-bold uppercase text-sm">{p.title}</p>
                  <p className="text-[10px] opacity-50 uppercase font-black">{p.discount_value}% Off</p>
                </div>
                <button className="text-red-500 opacity-30 hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
