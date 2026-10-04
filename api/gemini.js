export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  try {
    const body = req.body || {};
    if (body.action === 'live_token') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({ uses:1, expireTime:new Date(Date.now()+30*60*1000).toISOString(), newSessionExpireTime:new Date(Date.now()+60*1000).toISOString() })
      });
      const j = await r.json();
      return res.status(r.status).json(r.ok ? {token:j.name} : j);
    }
    if (body.action === 'generate_image') {
      const input = [];
      if (body.prompt) input.push({ type:'text', text:String(body.prompt) });
      if (body.image_b64) input.push({ type:'image', mime_type:'image/jpeg', data:body.image_b64 });
      const model = body.model || 'gemini-3.1-flash-image';
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({
          model,
          input,
          response_format:{type:'image', mime_type:'image/jpeg', aspect_ratio:body.aspect_ratio || '1:1', image_size:body.image_size || '1K'}
        })
      });
      const j = await r.json();
      const out = j.output_image;
      if(r.ok && out && out.data) return res.status(200).json({ image_b64:out.data, mimeType:out.mime_type || 'image/jpeg' });
      return res.status(r.status).json(j);
    }
    if (body.action === 'web_search') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(body.model || 'gemini-3.8-flash')+':generateContent', {method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{role:'user',parts:[{text:String(body.query||'')}]}],tools:[{googleSearch:{}}]})});
      const j = await r.json(); return res.status(r.status).json(j);
    }
    if (body.action === 'chat') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(body.model || 'gemini-3.8-flash')+':generateContent', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({systemInstruction:{parts:[{text:body.systemPrompt || ''}]},contents:body.contents || [],tools:body.tools ? [{functionDeclarations:body.tools}] : undefined})
      });
      const j = await r.json();
      return res.status(r.status).json(j);
    }
    return res.status(400).json({ error:'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error:String(e.message || e) });
  }
}
