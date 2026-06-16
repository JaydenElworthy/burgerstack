import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const apiKey = process.env.SQUARESPACE_API_KEY;

  try {
    // 1. Get Winner
    const { data: winner } = await supabase.from('profiles').select('*').gt('high_score', 0).order('high_score', { ascending: false }).limit(1).single();
    if (!winner) return Response.json({ error: "No players have a score yet." }, { status: 400 });

    // 2. Get Settings
    const { data: s } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (!s) return Response.json({ error: "App settings missing." }, { status: 400 });

    const promoCode = `WIN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 3. Build Rule
    let discountRule = { type: s.weekly_prize_type || 'FREE_PRODUCT' };
    if (discountRule.type === 'FREE_PRODUCT') {
      if (!s.active_item_id) return Response.json({ error: "No Product Selected in Admin!" }, { status: 400 });
      discountRule.productIds = [s.active_item_id];
    } else {
      discountRule.value = s.weekly_prize_value?.toFixed(1) || "10.0";
    }

    // 4. Call Squarespace
    const sqRes = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Champ: ${winner.email}`,
        promoCode: promoCode,
        discountRule: discountRule,
        usageLimit: 1,
        enabled: true
      })
    });

    if (sqRes.ok) {
      await supabase.from('rewards').insert({ user_id: winner.id, prize_title: `WINNER: ${s.prize_title}`, prize_code: promoCode });
      await supabase.from('profiles').update({ high_score: 0 }).not('id', 'is', null);
      return Response.json({ success: true, winner: winner.email });
    }
    
    const errText = await sqRes.text();
    return Response.json({ error: `Squarespace rejected: ${errText}` }, { status: 500 });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}
