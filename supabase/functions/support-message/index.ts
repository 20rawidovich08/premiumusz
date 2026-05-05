import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { name, contact, message } = await req.json();
    if (!message || message.length < 2 || message.length > 2000) {
      return new Response(JSON.stringify({ error: 'invalid_message' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const safeName = String(name ?? 'Anonim').slice(0, 100);
    const safeContact = String(contact ?? '').slice(0, 100);
    const safeMsg = String(message).slice(0, 2000);

    const TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN missing');

    // Build admin id list
    const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
    const SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supa = createClient(SUPA_URL, SRV);
    const { data: s } = await supa.from('settings').select('value').eq('key', 'admin_telegram_ids').maybeSingle();
    const single = Deno.env.get('TELEGRAM_ADMIN_CHAT_ID');
    const raw = s?.value;
    const ids = new Set<string>();
    if (single) ids.add(String(single));
    if (typeof raw === 'string') raw.split(/[,\s]+/).filter(Boolean).forEach((x) => ids.add(x));
    if (Array.isArray(raw)) raw.forEach((x: any) => ids.add(String(x)));

    const text = `💬 <b>Yangi support xabar</b>\n\n👤 <b>${safeName}</b>\n📞 ${safeContact || '—'}\n\n<i>${safeMsg.replace(/[<>]/g, '')}</i>`;

    let sent = 0;
    for (const id of ids) {
      const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: id, text, parse_mode: 'HTML' }),
      });
      if (r.ok) sent++;
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
