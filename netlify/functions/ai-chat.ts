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
      model = 'deepseek-ai/deepseek-v4-flash-0731',
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

    // Use passed API key or environment variable or fallback key
    const activeApiKey = (
      apiKey || 
      process.env.NVIDIA_API_KEY || 
      process.env.VITE_NVIDIA_API_KEY || 
      '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'
    ).trim();

    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const nvidiaUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    const nvidiaPayload = {
      model,
      messages,
      temperature,
      top_p: 0.95,
      max_tokens: maxTokens,
      chat_template_kwargs: { thinking: true, reasoning_effort: 'high' },
      extra_body: { chat_template_kwargs: { thinking: true, reasoning_effort: 'high' } },
      stream: false,
    };

    const nvidiaResponse = await fetch(nvidiaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeApiKey}`,
      },
      body: JSON.stringify(nvidiaPayload),
    });

    if (!nvidiaResponse.ok) {
      const errText = await nvidiaResponse.text();
      return new Response(JSON.stringify({ 
        error: `NVIDIA API error (${nvidiaResponse.status}): ${errText}`,
        status: nvidiaResponse.status 
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await nvidiaResponse.json();
    const choice = data.choices?.[0];
    const message = choice?.message;
    const content = message?.content || '';
    const reasoning = message?.reasoning || message?.reasoning_content || '';

    return new Response(JSON.stringify({
      text: content,
      reasoning: reasoning || null,
      model,
      provider: 'nvidia-nim',
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
