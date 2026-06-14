import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  // 1. Initialize Supabase with SERVICE ROLE KEY (to bypass security and reset scores)
  // You need to add SUPABASE_SERVICE_ROLE_KEY to Vercel env variables
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY 
  );

  const apiKey = process.env.SQUARESPACE_API_KEY;

  try {
    // 2. Find the #1 player on the leaderboard
    const { data: winner, error: winnerError } = await supabase
      .from('profiles')
      .select('id, email, high_score')
      .order('high_score', { ascending: false })
      .limit(1)
      .single();

    if (winnerError || !winner || winner.high_score === 0) {
      return Response.json({ error: "No winner found with a score above 0" }, { status: 400 });
    }

    // 3. Get the Prize Settings (What burger are we giving away?)
    const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();

    // 4. Generate a unique Champion Code
    const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
    const promoCode = `CHAMP-${shortId}`;

    // 5. Call Squarespace to create the 100% discount
    const sqResponse = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Picnic-At-Home-App'
      },
      body: JSON.stringify({
        name: `Weekly Champ: ${winner.email}`,
        promoCode: promoCode,
        discountRule: {
          type: 'FREE_PRODUCT',
          productIds: [settings.active_item_id] // Uses the ID you selected in Super Admin
        },
        usageLimit: 1,
        enabled: true
      })
    });

    if (!sqResponse.ok) {
      const errorData = await sqResponse.json();
      throw new Error(`Squarespace API Error: ${JSON.stringify(errorData)}`);
    }

    // 6. Put the code in the winner's Wallet (Rewards table)
    await supabase.from('rewards').insert({
      user_id: winner.id,
      prize_title: `WEEKLY CHAMPION: ${settings.prize_title}`,
      prize_code: promoCode
    });

    // 7. RESET THE BOARD: Set all high scores to 0 for the new week
    // We use .neq('id', '0000...') just to satisfy the filter requirement
    await supabase
      .from('profiles')
      .update({ high_score: 0, bonus_unlocked: false, scratch_count: 0 })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    return Response.json({ 
        success: true, 
        winner: winner.email, 
        score: winner.high_score,
        code: promoCode 
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
