// Shared Gemini proxy logic used by both the Cloudflare Worker (worker.js)
// and the Cloudflare Pages Function (functions/api/gemini.js).

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_B64 = 10 * 1024 * 1024;
const DEFAULT_TEXT_MODEL = 'gemini-3.8-flash';
const DEFAULT_IMAGE_MODEL = 'gemini-3.1-flash-image';

function baseHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.JARVIS_ALLOWED_ORIGIN || '*';
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? origin : allowed),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

// Model names are chosen by the browser, so only accept Gemini model ids.
// Set JARVIS_ALLOWED_MODELS="a,b,c" (comma separated) to pin an exact list.
function modelAllowed(model, env) {
  const m = String(model || '');
  if (env.JARVIS_ALLOWED_MODELS) {
    return env.JARVIS_ALLOWED_MODELS.split(',').map(s => s.trim()).filter(Boolean).includes(m);
  }
  return /^gemini-[a-z0-9][a-z0-9.\-]{0,60}$/i.test(m);
}

async function upstream(path, apiKey, payload) {
  const r = await fetch(GEMINI + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload)
  });
  const j = await r.json().catch(() => ({ error: 'Bad response from Gemini' }));
  return { r, j };
}

export async function handleGemini(request, env) {
  const headers = baseHeaders(request, env);
  const origin = request.headers.get('Origin') || '';

  // When an exact origin is configured, a missing or different Origin is rejected.
  if (env.JARVIS_ALLOWED_ORIGIN && origin !== env.JARVIS_ALLOWED_ORIGIN)
    return json({ error: 'Origin not allowed' }, 403, headers);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, headers);
  if (!env.GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY is not configured' }, 500, headers);

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413, headers);

  try {
    const raw = await request.text();
    // content-length can be absent (chunked uploads), so measure the real body too.
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413, headers);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: 'Invalid JSON' }, 400, headers); }
    if (!body || typeof body !== 'object') return json({ error: 'Invalid body' }, 400, headers);

    const key = env.GEMINI_API_KEY;

    if (body.action === 'live_token') {
      const { r, j } = await upstream('/auth_tokens', key, {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString()
      });
      return json(r.ok ? { token: j.name } : j, r.status, headers);
    }

    if (body.action === 'generate_image') {
      const prompt = String(body.prompt || '');
      if (!prompt || prompt.length > 12000) return json({ error: 'Prompt is missing or too long' }, 400, headers);
      if (body.image_b64 && String(body.image_b64).length > MAX_IMAGE_B64) return json({ error: 'Image is too large' }, 413, headers);
      const model = body.model || DEFAULT_IMAGE_MODEL;
      if (!modelAllowed(model, env)) return json({ error: 'Model not allowed' }, 400, headers);
      const aspect = String(body.aspect_ratio || '1:1');
      const size = String(body.image_size || '1K');
      if (!/^\d{1,2}:\d{1,2}$/.test(aspect) || !/^[1-4]K$/i.test(size)) return json({ error: 'Invalid image options' }, 400, headers);

      const input = [{ type: 'text', text: prompt }];
      if (body.image_b64) input.push({ type: 'image', mime_type: 'image/jpeg', data: String(body.image_b64) });

      const { r, j } = await upstream('/interactions', key, {
        model,
        input,
        response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: aspect, image_size: size }
      });
      const out = j.output_image;
      if (r.ok && out && out.data) return json({ image_b64: out.data, mimeType: out.mime_type || 'image/jpeg' }, 200, headers);
      return json(j, r.status, headers);
    }

    if (body.action === 'web_search') {
      const query = String(body.query || '');
      if (!query || query.length > 4000) return json({ error: 'Query is missing or too long' }, 400, headers);
      const model = body.model || DEFAULT_TEXT_MODEL;
      if (!modelAllowed(model, env)) return json({ error: 'Model not allowed' }, 400, headers);
      const { r, j } = await upstream('/models/' + encodeURIComponent(model) + ':generateContent', key, {
        contents: [{ role: 'user', parts: [{ text: query }] }],
        tools: [{ googleSearch: {} }]
      });
      return json(j, r.status, headers);
    }

    if (body.action === 'chat') {
      const model = body.model || DEFAULT_TEXT_MODEL;
      if (!modelAllowed(model, env)) return json({ error: 'Model not allowed' }, 400, headers);
      if (!Array.isArray(body.contents) || body.contents.length > 400) return json({ error: 'Invalid contents' }, 400, headers);
      if (body.tools != null && (!Array.isArray(body.tools) || body.tools.length > 64)) return json({ error: 'Invalid tools' }, 400, headers);
      const systemPrompt = String(body.systemPrompt || '');
      if (systemPrompt.length > 60000) return json({ error: 'System prompt too long' }, 413, headers);

      const payload = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: body.contents
      };
      if (body.tools) payload.tools = [{ functionDeclarations: body.tools }];
      const { r, j } = await upstream('/models/' + encodeURIComponent(model) + ':generateContent', key, payload);
      return json(j, r.status, headers);
    }

    return json({ error: 'Unknown action' }, 400, headers);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500, headers);
  }
}
