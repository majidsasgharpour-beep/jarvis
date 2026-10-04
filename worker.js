const jsonHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store'
};

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.JARVIS_ALLOWED_ORIGIN || '*';
  return {
    ...jsonHeaders,
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin === allowed ? origin : allowed),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function response(data, status, headers) {
  return new Response(JSON.stringify(data), { status, headers });
}

async function gemini(request, env) {
  const headers = corsHeaders(request, env);
  const origin = request.headers.get('Origin') || '';
  if (env.JARVIS_ALLOWED_ORIGIN && origin && origin !== env.JARVIS_ALLOWED_ORIGIN) {
    return response({error:'Origin not allowed'}, 403, headers);
  }

  if (request.method === 'OPTIONS') return new Response(null, {status:204, headers});
  if (request.method !== 'POST') return response({error:'Method not allowed'}, 405, headers);
  if (!env.GEMINI_API_KEY) return response({error:'GEMINI_API_KEY is not configured'}, 500, headers);

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 12 * 1024 * 1024) return response({error:'Request too large'}, 413, headers);

  try {
    const body = await request.json();

    if (body.action === 'live_token') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
        body:JSON.stringify({
          uses:1,
          expireTime:new Date(Date.now()+30*60*1000).toISOString(),
          newSessionExpireTime:new Date(Date.now()+60*1000).toISOString()
        })
      });
      const j = await r.json();
      return response(r.ok ? {token:j.name} : j, r.status, headers);
    }

    if (body.action === 'generate_image') {
      if (!body.prompt || String(body.prompt).length > 12000)
        return response({error:'Prompt is missing or too long'}, 400, headers);
      if (body.image_b64 && String(body.image_b64).length > 10*1024*1024)
        return response({error:'Image is too large'}, 413, headers);

      const input = [{type:'text', text:String(body.prompt)}];
      if (body.image_b64) input.push({type:'image', mime_type:'image/jpeg', data:body.image_b64});

      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
        body:JSON.stringify({
          model:body.model || 'gemini-3.1-flash-image',
          input,
          response_format:{
            type:'image',
            mime_type:'image/jpeg',
            aspect_ratio:body.aspect_ratio || '1:1',
            image_size:body.image_size || '1K'
          }
        })
      });
      const j = await r.json();
      const out = j.output_image;
      if (r.ok && out && out.data)
        return response({image_b64:out.data,mimeType:out.mime_type || 'image/jpeg'}, 200, headers);
      return response(j, r.status, headers);
    }

    if (body.action === 'web_search') {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(body.model || 'gemini-3.8-flash')+':generateContent',
        {
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
          body:JSON.stringify({
            contents:[{role:'user',parts:[{text:String(body.query||'')}]}],
            tools:[{googleSearch:{}}]
          })
        }
      );
      return response(await r.json(), r.status, headers);
    }

    if (body.action === 'chat') {
      const payload = {
        systemInstruction:{parts:[{text:body.systemPrompt || ''}]},
        contents:body.contents || []
      };
      if (body.tools) payload.tools=[{functionDeclarations:body.tools}];

      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(body.model || 'gemini-3.8-flash')+':generateContent',
        {
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},
          body:JSON.stringify(payload)
        }
      );
      return response(await r.json(), r.status, headers);
    }

    return response({error:'Unknown action'}, 400, headers);
  } catch (e) {
    return response({error:String(e.message || e)}, 500, headers);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/gemini' || url.pathname.startsWith('/api/gemini/')) {
      return gemini(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
