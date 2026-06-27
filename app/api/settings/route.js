import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';
  const supabase = createClient(url, key);
  
  try {
    const { data, error } = await supabase.from('app_settings').select('prize_title').eq('id', 1).single();
    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
