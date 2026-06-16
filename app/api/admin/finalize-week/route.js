import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const sqKey = process.env.SQUARESPACE_API_KEY;

  try {
    const { data: winner } = await supabase.from('profiles').select('*').gt('high_score', 0).order('high_score', { ascending: false }).limit(1).single();
    if (!winner) return Response.json({ error: "No player with score > 0 found." }, { status: 400 });

    const { data: s } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (!s || !s.active_item_id) return Response.json({ error: "Product not selected in Admin." }, { status: 400 });

    const promoCode = `WIN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // --- NEW: DATES FOR SQUARESPACE ---
    const now = new Date();
    const start = now.toISOString(); // Current time
    const expiry = new Date(now.setMonth(now.getMonth() + 1)).toISOString(); // 1 month from now

    const payload = {
      name: `Champ: ${winner.email}`,
      promoCode: promoCode,
      enabled: true,
      startDateTime: start, // REQUIRED
      expirationDateTime: expiry, // RECOMMENDED
      usageLimit: 1,
      discountRule: {
        type: s.weekly_prize_type || 'FREE_PRODUCT',
        productIds: [s.active_item_id]
      }
    };

    const sqRes = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sqKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PicnicApp/1.0'
      },
      body: JSON.stringify(payload)
    });

    if (!sqRes.ok) {
      const err = await sqRes.json();
      // If Squarespace still fails, we now catch the specific JSON error
      return Response.json({ error: `Squarespace Logic Error: ${JSON.stringify(err)}` }, { status: 500 });
    }

    // AWARD AND RESET
    await supabase.from('rewards').insert({
      user_id: winner.id,
      prize_title: `GRAND PRIZE: ${s.prize_title}`,
      prize_code: promoCode
    });

    await supabase.from('profiles').update({ high_score: 0, scratch_count: 0, bonus_unlocked: false }).not('id', 'is', null);

    return Response.json({ success: true, winner: winner.email });

  } catch (err) {
    return Response.json({ error: `Server Crash: ${err.message}` }, { status: 500 });
  }
}
