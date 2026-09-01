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
        server.middlewares.use('/api/ai-chat', async (req, res) => {
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
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { 
                prompt, 
                systemPrompt, 
                model = 'deepseek-ai/deepseek-v4-flash-0731',
                apiKey = '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',
                temperature = 0.7,
                maxTokens = 4096 
              } = body;

              const messages = [];
              if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
              messages.push({ role: 'user', content: prompt });

              const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey.trim()}`,
                },
                body: JSON.stringify({
                  model,
                  messages,
                  temperature,
                  top_p: 0.95,
                  max_tokens: maxTokens,
                  chat_template_kwargs: { thinking: true, reasoning_effort: 'high' },
                  extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort: 'high' } },
                  stream: false,
                })
              });

              if (!nvidiaRes.ok) {
                const errText = await nvidiaRes.text();
                res.writeHead(nvidiaRes.status, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `NVIDIA error: ${errText}` }));
                return;
              }

              const data: any = await nvidiaRes.json();
              const choice = data.choices?.[0];
              const message = choice?.message;
              const content = message?.content || '';
              const reasoning = message?.reasoning || message?.reasoning_content || '';

              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({
                text: content,
                reasoning: reasoning || null,
                model,
                provider: 'nvidia-nim'
              }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
            }
          });
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

