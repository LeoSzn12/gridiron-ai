export default async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      prompt, 
      systemPrompt, 
      provider = 'openrouter',
      model = 'anthropic/claude-3.5-sonnet',
      apiKey,
      temperature = 0.7,
      maxTokens = 4096
    } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Missing prompt parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    let targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
    let authHeader = '';
    let extraHeaders: Record<string, string> = {};

    if (provider === 'openrouter') {
      targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const key = apiKey || process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || '';
      authHeader = `Bearer ${key.trim()}`;
      extraHeaders = {
        'HTTP-Referer': 'https://fantasy-gridiron-ai.netlify.app/',
        'X-Title': 'Gridiron AI',
      };
    } else if (provider === 'openai') {
      targetUrl = 'https://api.openai.com/v1/chat/completions';
      const key = apiKey || process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
      authHeader = `Bearer ${key.trim()}`;
    } else if (provider === 'nvidia-nim') {
      targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
      const key = apiKey || process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY || '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';
      authHeader = `Bearer ${key.trim()}`;
    } else if (provider === 'anthropic') {
      // Direct Anthropic API
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
        return new Response(JSON.stringify({ error: `Anthropic API error (${anthropicRes.status}): ${errText}` }), {
          status: anthropicRes.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const anthropicData = await anthropicRes.json();
      const text = anthropicData.content?.[0]?.text || '';
      return new Response(JSON.stringify({
        text,
        reasoning: null,
        model,
        provider: 'anthropic',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Standard OpenAI-compatible format (OpenRouter, OpenAI, NVIDIA NIM)
    const payload = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(provider === 'nvidia-nim' ? {
        chat_template_kwargs: { thinking: true, reasoning_effort: 'high' },
        extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort: 'high' } },
      } : {}),
      stream: false,
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        ...extraHeaders,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ 
        error: `${provider.toUpperCase()} API error (${res.status}): ${errText}`,
        status: res.status 
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const message = choice?.message;
    const content = message?.content || '';
    const reasoning = message?.reasoning || message?.reasoning_content || '';

    return new Response(JSON.stringify({
      text: content,
      reasoning: reasoning || null,
      model,
      provider,
      usage: data.usage || null,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: err.message || 'Internal Server Error' 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};
