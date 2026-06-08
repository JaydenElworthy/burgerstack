export async function POST(request) {
  const { email, firstName } = await request.json();
  const apiKey = process.env.SQUARESPACE_API_KEY;

  try {
    // This adds the user to your Squarespace "Profiles" list
    const response = await fetch('https://api.squarespace.com/1.0/profiles', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'NBHD-Club-App'
      },
      body: JSON.stringify({
        email: email,
        firstName: firstName || 'Club Member',
        acceptsMarketing: true
      })
    });

    const data = await response.json();
    return Response.json({ success: true, squarespaceProfile: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
