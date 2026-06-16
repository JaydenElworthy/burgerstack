import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  // 1. Validate Environment Variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sqKey = process.env.SQUARESPACE_API_KEY;

  if (!serviceKey) return Response.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY in Vercel" }, { status: 500 });

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 2. Get the #1 Player
    const { data: winner, error: winnerError } = await supabase
      .from('profiles')
      .select('id, email, high_score')
      .gt('high_score', 0)
      .order('high_score', { ascending: false })
      .limit(1)
      .single();

    if (winnerError || !winner) {
      return Response.json({ error: "No players found with a score > 0. Cannot end week." }, { status: 400 });
    }

    // 3. Get Prize Settings
    const { data: s } = await supabase.from('app_settings').select('*').eq('id', 1).single();
    if (!s || !s.active_item_id) {
      return Response.json({ error: "No product selected in Admin Settings." }, { status: 400 });
    }

    // 4. Call Squarespace
    const promoCode = `WIN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const sqRes = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Champ: ${winner.email}`,
        promoCode: promoCode,
        discountRule: {
          type: s.weekly_prize_type || 'FREE_PRODUCT',
          productIds: [s.active_item_id]
        },
        usageLimit: 1,
        enabled: true
      })
    });

    if (!sqRes.ok) {
      const detail = await sqRes.text();
      return Response.json({ error: `Squarespace rejected request: ${detail}` }, { status: 500 });
    }

    // 5. Award Prize
    await supabase.from('rewards').insert({
      user_id: winner.id,
      prize_title: `GRAND PRIZE: ${s.prize_title}`,
      prize_code: promoCode
    });

    // 6. RESET BOARD
    // This resets high_score, scratch count and bonus for EVERYONE
    await supabase
      .from('profiles')
      .update({ high_score: 0, scratch_count: 0, bonus_unlocked: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return Response.json({ success: true, winner: winner.email });

  } catch (err) {
    return Response.json({ error: `Server Crash: ${err.message}` }, { status: 500 });
  }
}
