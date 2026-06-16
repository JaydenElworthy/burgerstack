export const dynamic = 'force-dynamic'; // <--- ADD THIS LINE AT THE TOP

export async function GET() {
  const apiKey = process.env.SQUARESPACE_API_KEY;
  try {
    const res = await fetch('https://api.squarespace.com/1.0/commerce/products', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store' // <--- AND ADD THIS
    });
    const data = await res.json();
    const products = data.products.map(p => ({ id: p.id, name: p.name }));
    return Response.json(products);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
