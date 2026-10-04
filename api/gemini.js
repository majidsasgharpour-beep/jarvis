export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  try {
    const body = req.body || {};
    if (body.action === 'live_token') {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/authTokens:generate', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({ uses:1 })
      });
      const j = await r.json();
      return res.status(r.status).json(j);
    }
    if (body.action === 'generate_image') {
      const parts = [];
      if (body.image_b64) parts.push({ inlineData:{ mimeType:'image/jpeg', data:body.image_b64 } });
      parts.push({ text:String(body.prompt || '') });
      const model = body.model || 'gemini-3.1-flash-image';
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent', {
        method:'POST',
        headers:{'Content-Type':'application/json','x-goog-api-key':key},
        body:JSON.stringify({
          contents:[{parts}],
          generationConfig:{
            responseModalities:['TEXT','IMAGE'],
            responseFormat:{image:{aspectRatio:body.aspect_ratio || '1:1', imageSize:body.image_size || '1K'}}
          }
        })
      });
      const j = await r.json();
      return res.status(r.status).json(j);
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
