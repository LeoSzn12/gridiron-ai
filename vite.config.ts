import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'ai-chat-proxy',
      configureServer(server) {
        const aiChatHandler = async (req: any, res: any) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let bodyStr = '';
          req.on('data', (chunk: any) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { 
                prompt, 
                systemPrompt, 
                provider = 'openrouter',
                model = 'anthropic/claude-3.5-sonnet',
                apiKey,
                temperature = 0.7,
                maxTokens = 4096 
              } = body;

              const messages = [];
              if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
              messages.push({ role: 'user', content: prompt });

              let targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
              let authHeader = '';
              let extraHeaders: Record<string, string> = {};

              if (provider === 'openrouter') {
                targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
                const key = apiKey || process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || '';
                authHeader = `Bearer ${key.trim()}`;
                extraHeaders = {
                  'HTTP-Referer': 'http://localhost:5173/',
                  'X-Title': 'Gridiron AI',
                };
              } else if (provider === 'openai') {
                targetUrl = 'https://api.openai.com/v1/chat/completions';
                const key = apiKey || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
                authHeader = `Bearer ${key.trim()}`;
              } else if (provider === 'nvidia-nim') {
                targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
                const key = apiKey || process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY || '';
                authHeader = `Bearer ${key.trim()}`;
              } else if (provider === 'anthropic') {
                const key = apiKey || process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';
                const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': key.trim(),
                    'anthropic-version': '2023-06-01',
                  },
                  body: JSON.stringify({
                    model: model || 'claude-3-5-sonnet-20241022',
                    system: systemPrompt || undefined,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxTokens,
                    temperature,
                  }),
                });

                if (!anthropicRes.ok) {
                  const errText = await anthropicRes.text();
                  res.writeHead(anthropicRes.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                  res.end(JSON.stringify({ error: `Anthropic API error: ${errText}` }));
                  return;
                }

                const anthropicData: any = await anthropicRes.json();
                const text = anthropicData.content?.[0]?.text || '';
                res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ text, reasoning: null, model, provider: 'anthropic' }));
                return;
              }

              const targetModel = model && !model.includes('v4-flash') 
                ? model 
                : (provider === 'openrouter' ? 'deepseek/deepseek-chat' : model);

              const payload = {
                model: targetModel,
                messages,
                temperature,
                max_tokens: maxTokens,
                ...(provider === 'nvidia-nim' ? {
                  chat_template_kwargs: { thinking: true, reasoning_effort: 'high' },
                  extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort: 'high' } },
                } : {}),
                stream: false,
              };

              const apiRes = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': authHeader,
                  ...extraHeaders,
                },
                body: JSON.stringify(payload),
              });

              if (!apiRes.ok) {
                const errText = await apiRes.text();
                res.writeHead(apiRes.status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                res.end(JSON.stringify({ error: `${provider.toUpperCase()} error: ${errText}` }));
                return;
              }

              const data: any = await apiRes.json();
              const choice = data.choices?.[0];
              const message = choice?.message;
              const content = message?.content || '';
              const reasoning = message?.reasoning || message?.reasoning_content || '';

              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({
                text: content,
                reasoning: reasoning || null,
                model,
                provider
              }));
            } catch (err: any) {
              const causeMsg = err.cause?.message || (err.cause ? String(err.cause) : '');
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error', cause: causeMsg }));
            }
          });
        };

        server.middlewares.use('/api/ai-chat', aiChatHandler);
        server.middlewares.use('/.netlify/functions/ai-chat', aiChatHandler);

        // Yahoo OAuth Token Exchange Middleware
        server.middlewares.use('/api/yahoo-oauth', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            });
            res.end();
            return;
          }

          if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          let bodyStr = '';
          req.on('data', (chunk: any) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { clientId, clientSecret, code, redirectUri, refreshToken, grantType = 'authorization_code' } = body;

              if (!clientId || !clientSecret) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'clientId and clientSecret are required' }));
                return;
              }

              const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
              const params = new URLSearchParams();

              if (grantType === 'refresh_token') {
                if (!refreshToken) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'refreshToken required' }));
                  return;
                }
                params.set('grant_type', 'refresh_token');
                params.set('refresh_token', refreshToken);
              } else {
                if (!code || !redirectUri) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'code and redirectUri required' }));
                  return;
                }
                params.set('grant_type', 'authorization_code');
                params.set('code', code);
                params.set('redirect_uri', redirectUri);
              }

              const tokenRes = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${credentials}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
              });

              const responseText = await tokenRes.text();
              res.writeHead(tokenRes.status, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(responseText);
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: `Server error: ${err.message}` }));
            }
          });
        });

        // Yahoo Fantasy REST API CORS proxy
        server.middlewares.use('/api/yahoo-proxy', async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(204, {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Yahoo-Endpoint',
            });
            res.end();
            return;
          }

          const authHeader = req.headers['authorization'];
          if (!authHeader) {
            res.writeHead(401, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Authorization header required' }));
            return;
          }

          const parsedUrl = new URL(req.url || '', 'http://localhost:5173');
          const endpoint = parsedUrl.searchParams.get('endpoint') || (req.headers['x-yahoo-endpoint'] as string);

          if (!endpoint) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'endpoint query param required' }));
            return;
          }

          const targetUrl = endpoint.startsWith('http') ? endpoint : `https://fantasysports.yahooapis.com${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

          try {
            const yahooRes = await fetch(targetUrl, {
              method: req.method === 'POST' ? 'POST' : 'GET',
              headers: {
                'Authorization': authHeader as string,
                'Accept': 'application/json',
              },
            });

            const responseText = await yahooRes.text();
            res.writeHead(yahooRes.status, {
              'Content-Type': yahooRes.headers.get('content-type') || 'application/json',
              'Access-Control-Allow-Origin': '*',
            });
            res.end(responseText);
          } catch (err: any) {
            res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: `Yahoo proxy error: ${err.message}` }));
          }
        });
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
    cors: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 5173,
    cors: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
})

