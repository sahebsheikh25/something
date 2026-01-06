// Vercel serverless function to proxy requests to OpenRouter
export default async function handler(req, res){
  const KEY = process.env.OPENROUTER_API_KEY;
  if(!KEY){
    // Keep frontend friendly if not configured
    res.status(200).json({ reply: 'SN: Chat is not configured. Please set OPENROUTER_API_KEY in the deployment.' });
    return;
  }

  if(req.method !== 'POST'){
    res.status(200).json({ info: 'Send a POST with JSON { messages: [...] }' });
    return;
  }

  let body;
  try{ body = await req.json(); }catch(e){ body = {}; }

  const incoming = Array.isArray(body.messages) ? body.messages : (body.message ? [ {role:'user', content: String(body.message) } ] : []);

  // keep a short history to be friendly and small
  const recent = incoming.slice(-8);

  // system prompt to guide the model
  const system = { role: 'system', content: 'You are SN Security, a helpful cybersecurity assistant focused on ethical hacking, defensive techniques, safe tool usage, and awareness. Provide concise, polite, safe guidance. If the user requests illegal or harmful action, refuse and offer high-level defensive guidance.' };

  const messages = [system, ...recent];

  const payload = {
    model: 'meta-llama/llama-3-8b-instruct:free',
    messages,
    temperature: 0.2,
    max_new_tokens: 512
  };

  try{
    const r = await fetch('https://api.openrouter.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    if(!r.ok){
      // Rate-limit / quota cases
      if(r.status === 429){
        res.status(429).json({ error: 'SN: Free quota reached or rate limit hit. Please try again later.' });
        return;
      }
      // forward friendly message
      res.status(r.status).json({ error: 'SN: The AI backend returned an error. Please try again later.' });
      return;
    }

    // parse JSON response and extract reply when possible
    let json;
    try{ json = JSON.parse(text); }catch(e){ json = null; }

    let reply = null;
    if(json){
      // openrouter often follows OpenAI shape
      reply = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.message || json?.output?.[0]?.content || JSON.stringify(json);
    } else {
      reply = text;
    }

    res.status(200).json({ reply });

  }catch(err){
    res.status(502).json({ error: 'SN: Network error when contacting AI backend. Try again shortly.' });
  }
}
