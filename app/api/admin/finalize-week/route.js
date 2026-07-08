import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Verify user authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: "Invalid session token" }, { status: 401 });
  }

  // Verify admin permissions
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return Response.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    // 1. Find the #1 winner
    const { data: winner } = await supabase.from('profiles').select('*').gt('high_score', 0).order('high_score', { ascending: false }).limit(1).single();
    if (!winner) return Response.json({ error: "No winner found" }, { status: 400 });

    // 2. Grab a 'GRAND' prize code from the bank
    const { data: codeRow } = await supabase.from('manual_code_bank').select('*').eq('prize_type', 'GRAND').eq('is_claimed', false).limit(1).single();
    if (!codeRow) return Response.json({ error: "No Grand Prize codes left in bank!" }, { status: 400 });

    const { data: settings } = await supabase.from('app_settings').select('*').eq('id', 1).single();

    // 3. Mark code as used and award to winner
    await supabase.from('manual_code_bank').update({ is_claimed: true, claimed_by: winner.id }).eq('id', codeRow.id);
    await supabase.from('rewards').insert({
      user_id: winner.id,
      prize_title: `WEEKLY CHAMPION: ${settings.prize_title}`,
      prize_code: codeRow.code
    });

    // 4. RESET BOARD FOR MONDAY
    await supabase.from('profiles').update({ high_score: 0, scratch_count: 0, bonus_unlocked: false }).not('id', 'is', null);

    return Response.json({ success: true, winner: winner.email, code: codeRow.code });
  } catch (err) { return Response.json({ error: err.message }, { status: 500 }); }
}
