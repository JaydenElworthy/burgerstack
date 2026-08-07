import { createClient } from '@supabase/supabase-js';
import { updateCronScheduler, CRON_SCHEDULE_PRESETS } from '../../../../lib/cronScheduler';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return Response.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      enabled: settings?.auto_reset_enabled ?? false,
      schedule: settings?.auto_reset_schedule ?? 'every_monday_0000',
      action: settings?.auto_reset_action ?? 'reset_all',
      lastRun: settings?.auto_reset_last_run ?? null,
      presets: CRON_SCHEDULE_PRESETS,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

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
    const body = await request.json();
    const { enabled, schedule, action } = body;

    const enabledBool = Boolean(enabled);
    const scheduleStr = schedule || 'every_monday_0000';
    const actionStr = action || 'reset_all';

    // Update DB app_settings
    const { error: updateError } = await supabase
      .from('app_settings')
      .update({
        auto_reset_enabled: enabledBool,
        auto_reset_schedule: scheduleStr,
        auto_reset_action: actionStr,
      })
      .eq('id', 1);

    if (updateError) {
      // If table columns don't exist yet, we attempt to handle gracefully or report error
      console.warn('[AutoReset API] Note: Database update returned:', updateError.message);
    }

    // Update in-memory background cron runner
    const cronResult = updateCronScheduler(enabledBool, scheduleStr, actionStr);

    return Response.json({
      success: true,
      enabled: enabledBool,
      schedule: scheduleStr,
      action: actionStr,
      cronResult,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
