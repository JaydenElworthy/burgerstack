import { createClient } from '@supabase/supabase-js';
import { executeAutoReset } from '../../../../lib/cronScheduler';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  // Allow trigger via GET (e.g. from Vercel Cron or external service)
  const authHeader = request.headers.get('Authorization');
  const secretKey = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify authorization header match
  if (secretKey && authHeader !== `Bearer ${secretKey}`) {
    return Response.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settings && settings.auto_reset_enabled === false) {
      return Response.json({ message: "Automated reset is currently disabled in app settings" });
    }

    const action = settings?.auto_reset_action || 'reset_all';
    const result = await executeAutoReset(action);

    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
