import type { Context } from '@netlify/functions';

// Yahoo Fantasy REST API CORS proxy — fetches user leagues, teams, and rosters
const YAHOO_BASE_URL = 'https://fantasysports.yahooapis.com';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Yahoo-Endpoint',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export default async function handler(req: Request, _context: Context): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Authorization header required' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get('endpoint') || req.headers.get('X-Yahoo-Endpoint');

  if (!endpoint) {
    return new Response(JSON.stringify({ error: 'endpoint query param or X-Yahoo-Endpoint header required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Ensure full URL
  const targetUrl = endpoint.startsWith('http') ? endpoint : `${YAHOO_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const yahooRes = await fetch(targetUrl, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    const responseText = await yahooRes.text();
    return new Response(responseText, {
      status: yahooRes.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': yahooRes.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Yahoo proxy error: ${err.message}` }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
}
