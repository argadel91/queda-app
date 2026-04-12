// Vercel Edge Middleware — dynamic OG meta tags for /plan/:id
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const config = {
  matcher: '/plan/:path*',
};

export default async function middleware(request) {
  const cookies = request.headers.get('cookie') || '';
  if (cookies.includes('_q=1')) return;

  const url = new URL(request.url);
  const code = url.pathname.split('/plan/')[1]?.split('/')[0]?.split('?')[0];
  if (!code || !/^[A-Za-z0-9]{6,12}$/.test(code)) return;

  let plan = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/plans?id=eq.${code}&select=title,category,place_name,date,time`,
        { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await res.json();
      if (rows?.[0]) plan = rows[0];
    } catch {}
  }

  const title = plan
    ? `${plan.title} — queda.`
    : 'queda. — Meet new people. Hang out with anyone.';
  const desc = plan
    ? `${plan.title}. ${plan.date ? '📅 ' + plan.date : ''} ${plan.time ? '🕐 ' + plan.time.slice(0,5) : ''} ${plan.place_name ? '📍 ' + plan.place_name : ''}. Join on queda!`.trim()
    : 'Create spontaneous plans, discover hangouts near you, and meet people who share your interests.';
  const planUrl = `https://www.queda.xyz/plan/${code}`;
  const image = 'https://www.queda.xyz/og.png';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${planUrl}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${image}">
  <link rel="canonical" href="${planUrl}">
  <script>document.cookie='_q=1;path=/;max-age=60';window.location.replace('${planUrl}');</script>
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(desc)}</p>
  <noscript><a href="${planUrl}">Open plan on queda.</a></noscript>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
