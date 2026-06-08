import { supabase } from '@/lib/supabase';

export async function POST(request) {
  const { winnerId, winnerEmail } = await request.json();
  const apiKey = process.env.SQUARESPACE_API_KEY;

  // 1. Get current weekly prize settings
  const { data: settings } = await supabase.from('app_settings').select('*').single();

  // 2. Create the Squarespace Code
  const promoCode = `CHAMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  
  const sqRes = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Weekly Champion: ${winnerEmail}`,
      promoCode: promoCode,
      discountRule: { type: 'FREE_PRODUCT', productIds: [settings.active_item_id] },
      usageLimit: 1,
      enabled: true
    })
  });

  if (sqRes.ok) {
    // 3. Insert into Winner's Wallet
    await supabase.from('rewards').insert({
      user_id: winnerId,
      prize_title: `WEEKLY CHAMPION: ${settings.prize_title}`,
      prize_code: promoCode
    });

    // 4. RESET BOARD (Set all high scores back to 0)
    await supabase.from('profiles').update({ high_score: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    
    return Response.json({ success: true });
  }

  return Response.json({ error: "Failed to create code" }, { status: 500 });
}
