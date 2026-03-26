// Vercel Edge Middleware — injects dynamic OG meta tags for crawlers on /plan/:id
// Browsers get the normal SPA. Crawlers (WhatsApp, Twitter, etc.) get static HTML with correct meta.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Real browsers that should get the SPA (not the meta-tag HTML)
const BROWSERS = /mozilla.*applewebkit|chrome|safari|firefox|edg|opera|vivaldi/i;

export const config = {
  matcher: '/plan/:path*',
};

export default async function middleware(request) {
  const ua = request.headers.get('user-agent') || '';

  // Real browsers get the SPA — everything else (crawlers, bots, validators) gets meta tags
  if (BROWSERS.test(ua) && !/bot|crawl|spider|preview|fetch|curl/i.test(ua)) {
    return; // Let the SPA handle it
  }

  // Extract plan code from URL
  const url = new URL(request.url);
  const code = url.pathname.split('/plan/')[1]?.split('/')[0]?.split('?')[0];
  if (!code) return;

  // Fetch plan from Supabase
  let plan = null;
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/plans?id=eq.${code}&select=data`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
        }
      );
      const rows = await res.json();
      if (rows?.[0]?.data) plan = rows[0].data;
    } catch {}
  }

  // Build meta tags
  const place = plan?.place?.name || plan?.stops?.[0]?.options?.[0]?.name || '';
  const title = plan
    ? `${plan.name || 'Plan'} — queda. More plans, less chaos`
    : 'queda. — More plans, less chaos';
  const desc = plan
    ? `${plan.organizer || 'Someone'} invites you${plan.name ? ' to ' + plan.name : ''}. ${plan.date ? '📅 ' + plan.date : ''} ${plan.time ? '🕐 ' + plan.time : ''} ${place ? '📍 ' + place : ''}. Vote now on queda!`.trim()
    : 'One date, one time, one place — everyone votes. Organize group plans without the chaos. Free.';
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

</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(desc)}</p>
  <p><a href="${planUrl}">Open plan on queda.</a></p>
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
