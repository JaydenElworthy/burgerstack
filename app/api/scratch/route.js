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

  // 1. Verify User session
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return Response.json({ error: "Invalid user session token" }, { status: 401 });
  }

  try {
    // 2. Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Process Sunday renewal check
    const now = new Date();
    const lastSunday = new Date();
    lastSunday.setDate(now.getDate() - now.getDay());
    lastSunday.setHours(0, 1, 0, 0);
    const lastScratch = profile.last_scratch_date ? new Date(profile.last_scratch_date) : new Date(0);

    let scratchCount = profile.scratch_count || 0;
    let bonusUnlocked = profile.bonus_unlocked || false;

    if (lastScratch < lastSunday && scratchCount > 0) {
      // Reset count for a new week
      scratchCount = 0;
      bonusUnlocked = false;
      const { error: resetErr } = await supabase
        .from('profiles')
        .update({ scratch_count: 0, bonus_unlocked: false })
        .eq('id', user.id);
      
      if (resetErr) {
        return Response.json({ error: resetErr.message }, { status: 500 });
      }
    }

    // 4. Verify eligibility
    let isEligible = false;
    if (scratchCount === 0) {
      isEligible = true;
    } else if (scratchCount === 1 && bonusUnlocked) {
      isEligible = true;
    }

    if (!isEligible) {
      return Response.json({ error: "Not eligible to scratch at this time." }, { status: 400 });
    }

    // 5. Roll win chance (70% win rate: Math.random() > 0.3)
    const rolledWin = Math.random() > 0.3;
    let rollResult = { win: false };

    if (rolledWin) {
      // Get all active scratch prizes
      const { data: activePrizes, error: prizesError } = await supabase
        .from('scratch_prizes')
        .select('*')
        .eq('is_active', true);

      if (!prizesError && activePrizes && activePrizes.length > 0) {
        // Shuffle active prizes
        const shuffledPrizes = [...activePrizes].sort(() => Math.random() - 0.5);

        let codeRow = null;
        let selectedPrize = null;

        // Find a prize that has available codes in the bank
        for (const prize of shuffledPrizes) {
          const { data, error: codeError } = await supabase
            .from('manual_code_bank')
            .select('*')
            .eq('prize_type', prize.id)
            .eq('is_claimed', false)
            .limit(1);

          if (!codeError && data && data.length > 0) {
            codeRow = data[0];
            selectedPrize = prize;
            break;
          }
        }

        if (codeRow && selectedPrize) {
          rollResult = {
            win: true,
            title: selectedPrize.title,
            code: codeRow.code,
            codeRowId: codeRow.id
          };
        }
      }
    }

    // 6. DB Updates & Transaction Commit
    const nextCount = scratchCount + 1;
    const nowStr = new Date().toISOString();

    if (rollResult.win) {
      // Mark code as claimed in bank
      const { error: claimErr } = await supabase
        .from('manual_code_bank')
        .update({ is_claimed: true, claimed_by: user.id })
        .eq('id', rollResult.codeRowId);

      if (claimErr) throw new Error("Failed to claim promo code: " + claimErr.message);

      // Insert reward record
      const { error: rewardErr } = await supabase
        .from('rewards')
        .insert({
          user_id: user.id,
          prize_title: rollResult.title,
          prize_code: rollResult.code
        });

      if (rewardErr) throw new Error("Failed to insert reward: " + rewardErr.message);
    }

    // Update user profile scratch count and date
    const { error: profileUpdateErr } = await supabase
      .from('profiles')
      .update({
        scratch_count: nextCount,
        last_scratch_date: nowStr
      })
      .eq('id', user.id);

    if (profileUpdateErr) throw new Error("Failed to update profile: " + profileUpdateErr.message);

    return Response.json({
      win: rollResult.win,
      title: rollResult.title || null,
      code: rollResult.code || null
    });

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
