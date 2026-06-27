export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.SQUARESPACE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing SQUARESPACE_API_KEY environment variable" }, { status: 500 });
  }

  try {
    let allDiscounts = [];
    let nextUrl = 'https://api.squarespace.com/1.0/commerce/discounts';
    let hasNextPage = true;

    while (hasNextPage && nextUrl) {
      const res = await fetch(nextUrl, {
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
      const pageDiscounts = data.discounts || [];
      allDiscounts = allDiscounts.concat(pageDiscounts);

      hasNextPage = data.pagination?.hasNextPage || false;
      nextUrl = data.pagination?.nextPageUrl || null;
    }

    return Response.json(allDiscounts);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
