import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify the user session token securely
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: "Invalid user session token" }, { status: 401 });
  }

  try {
    const { score } = await request.json();
    if (typeof score !== 'number' || score < 0) {
      return Response.json({ error: "Invalid score value" }, { status: 400 });
    }

    // 1. Fetch current profile
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('high_score, bonus_unlocked')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      return Response.json({ error: fetchError.message }, { status: 500 });
    }

    // 2. Determine updates
    const updates = {};
    if (score >= 25 && !profile.bonus_unlocked) {
      updates.bonus_unlocked = true;
    }
    if (score > (profile.high_score || 0)) {
      updates.high_score = score;
    }

    // 3. Perform update if needed
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) {
        return Response.json({ error: updateError.message }, { status: 500 });
      }
    }

    return Response.json({ success: true, updates });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
