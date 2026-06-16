import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const apiKey = process.env.SQUARESPACE_API_KEY;

  try {
    const { data: winner } = await supabase.from('profiles').select('*').gt('high_score', 0).order('high_score', { ascending: false }).limit(1).single();
    if (!winner) return Response.json({ error: "No winner found" }, { status: 400 });

    const { data: s } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    const promoCode = `CHAMP-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // --- LOGIC: BUILD THE SQUARESPACE RULE ---
    let discountRule = {};
    
    if (s.weekly_prize_type === 'FREE_PRODUCT') {
      discountRule = { type: 'FREE_PRODUCT', productIds: [s.active_item_id] };
    } else {
      // It's a Percentage or Amount discount
      discountRule = { 
        type: s.weekly_prize_type, // 'RATE' or 'AMOUNT'
        value: s.weekly_prize_value?.toFixed(1)
      };
      // If scoped to a product, add the ID
      if (s.weekly_prize_scope === 'PRODUCT') {
        discountRule.productIds = [s.active_item_id];
      }
    }

    const sqRes = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Weekly Champ: ${winner.email}`,
        promoCode: promoCode,
        discountRule: discountRule,
        usageLimit: 1,
        enabled: true
      })
    });

    if (sqRes.ok) {
      await supabase.from('rewards').insert({ user_id: winner.id, prize_title: `WEEKLY WINNER: ${s.prize_title}`, prize_code: promoCode });
      await supabase.from('profiles').update({ high_score: 0 }).not('id', 'is', null);
      return Response.json({ success: true, winner: winner.email });
    }
    return Response.json({ error: "Squarespace API rejection" }, { status: 500 });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}
