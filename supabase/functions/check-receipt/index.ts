import { corsHeaders } from '@supabase/supabase-js/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { receipt_path, expected_amount } = await req.json();
    if (!receipt_path || !expected_amount) {
      return new Response(JSON.stringify({ error: 'Missing params' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
    const SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY missing');

    const supa = createClient(SUPA_URL, SRV);
    const { data: signed, error: sErr } = await supa.storage.from('receipts').createSignedUrl(receipt_path, 300);
    if (sErr || !signed?.signedUrl) throw new Error(sErr?.message || 'Cannot read receipt');

    const imgRes = await fetch(signed.signedUrl);
    const buf = await imgRes.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    const mime = imgRes.headers.get('content-type') || 'image/jpeg';

    const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `Bu to'lov cheki rasmi. Undagi to'langan summa (UZS) raqamini aniqlang. Faqat JSON qaytaring: {"amount": <son>, "currency": "UZS", "confidence": "high|medium|low"}. Agar summa topilmasa amount=0.` },
              { type: 'image_url', image_url: { url: `data:${mime};base64,${b64}` } },
            ],
          },
        ],
      }),
    });

    if (ai.status === 429) return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (ai.status === 402) return new Response(JSON.stringify({ error: 'no_credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!ai.ok) throw new Error(`AI ${ai.status}`);

    const data = await ai.json();
    const txt: string = data.choices?.[0]?.message?.content ?? '{}';
    const m = txt.match(/\{[\s\S]*\}/);
    let parsed: any = { amount: 0, confidence: 'low' };
    try { parsed = JSON.parse(m?.[0] ?? '{}'); } catch { /* ignore */ }

    const detected = Number(parsed.amount) || 0;
    const expected = Number(expected_amount) || 0;
    const diff = Math.abs(detected - expected);
    const tolerance = Math.max(expected * 0.02, 500);
    const matches = detected > 0 && diff <= tolerance;

    return new Response(JSON.stringify({
      detected_amount: detected,
      expected_amount: expected,
      matches,
      confidence: parsed.confidence ?? 'low',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('check-receipt error', e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
