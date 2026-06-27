export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.SQUARESPACE_API_KEY;
  try {
    const res = await fetch('https://api.squarespace.com/1.0/commerce/discounts', {
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'PicnicApp/1.0'
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      const errText = await res.text();
      return Response.json({ error: `Squarespace API error: ${errText}` }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data.discounts || []);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
