import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
