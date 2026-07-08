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
    // 1. Delete all rewards from the rewards table
    const { error: deleteRewardsError } = await supabase
      .from('rewards')
      .delete()
      .not('id', 'is', null);

    if (deleteRewardsError) {
      return Response.json({ error: deleteRewardsError.message }, { status: 500 });
    }

    // 2. Reset scores and scratch statuses for all profiles
    const { error: updateProfilesError } = await supabase
      .from('profiles')
      .update({ 
        high_score: 0, 
        scratch_count: 0, 
        bonus_unlocked: false 
      })
      .not('id', 'is', null);

    if (updateProfilesError) {
      return Response.json({ error: updateProfilesError.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
