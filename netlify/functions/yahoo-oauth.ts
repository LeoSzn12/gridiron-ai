import type { Context } from '@netlify/functions';

// Yahoo Fantasy OAuth proxy — handles token exchange server-side to avoid CORS restrictions.
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export default async function handler(req: Request, _context: Context): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS_HEADERS });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: CORS_HEADERS });
  }

  const { clientId, clientSecret, code, redirectUri, refreshToken, grantType = 'authorization_code' } = body;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'clientId and clientSecret are required' }), { status: 400, headers: CORS_HEADERS });
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const params = new URLSearchParams();

  if (grantType === 'refresh_token') {
    if (!refreshToken) return new Response(JSON.stringify({ error: 'refreshToken required' }), { status: 400, headers: CORS_HEADERS });
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);
  } else {
    if (!code || !redirectUri) return new Response(JSON.stringify({ error: 'code and redirectUri required' }), { status: 400, headers: CORS_HEADERS });
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', redirectUri);
  }

  try {
    const tokenRes = await fetch(YAHOO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const responseText = await tokenRes.text();
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: `Yahoo token exchange failed (${tokenRes.status}): ${responseText}` }), { status: tokenRes.status, headers: CORS_HEADERS });
    }
    const tokenData = JSON.parse(responseText);
    return new Response(JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
      xoauth_yahoo_guid: tokenData.xoauth_yahoo_guid,
    }), { status: 200, headers: CORS_HEADERS });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Server error: ${err.message}` }), { status: 500, headers: CORS_HEADERS });
  }
}
