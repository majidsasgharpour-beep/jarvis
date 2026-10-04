export async function onRequestPost(context) {
  const { request, env } = context;
  const key = env.GEMINI_API_KEY;
  const corsOrigin = env.JARVIS_ALLOWED_ORIGIN || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store'
  };

  if (!key) return new Response(JSON.stringify({error:'GEMINI_API_KEY is not configured'}), {status:500, headers});

  try {
    const body = await request.json();

    if (body.action === 'live_token') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({
          uses:1,
          expireTime:new Date(Date.now()+30*60*1000).toISOString(),
          newSessionExpireTime:new Date(Date.now()+60*1000).toISOString()
        })
      });
      const j = await r.json();
      return new Response(JSON.stringify(r.ok ? {token:j.name} : j), {status:r.status,headers});
    }

    if (body.action === 'generate_image') {
      if (!body.prompt || String(body.prompt).length > 12000)
        return new Response(JSON.stringify({error:'Prompt is missing or too long'}), {status:400,headers});
      if (body.image_b64 && String(body.image_b64).length > 10*1024*1024)
        return new Response(JSON.stringify({error:'Image is too large'}), {status:413,headers});

      const input = [{type:'text', text:String(body.prompt)}];
      if (body.image_b64) input.push({type:'image', mime_type:'image/jpeg', data:body.image_b64});

      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
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
        return new Response(JSON.stringify({image_b64:out.data,mimeType:out.mime_type || 'image/jpeg'}), {status:200,headers});
      return new Response(JSON.stringify(j), {status:r.status,headers});
    }

    if (body.action === 'web_search') {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(body.model || 'gemini-3.8-flash')+':generateContent',
        {
          method:'POST',
          headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify({
            contents:[{role:'user',parts:[{text:String(body.query||'')}]}],
            tools:[{googleSearch:{}}]
          })
        }
      );
      return new Response(JSON.stringify(await r.json()), {status:r.status,headers});
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
          headers:{'Content-Type':'application/json','x-goog-api-key':key},
          body:JSON.stringify(payload)
        }
      );
      return new Response(JSON.stringify(await r.json()), {status:r.status,headers});
    }

    return new Response(JSON.stringify({error:'Unknown action'}), {status:400,headers});
  } catch (e) {
    return new Response(JSON.stringify({error:String(e.message || e)}), {status:500,headers});
  }
}

export function onRequestOptions(context) {
  const origin = context.env.JARVIS_ALLOWED_ORIGIN || '*';
  return new Response(null, {
    status:204,
    headers:{
      'Access-Control-Allow-Origin':origin,
      'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Allow-Methods':'POST, OPTIONS'
    }
  });
}
