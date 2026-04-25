// One-shot helper to register the Telegram webhook URL.
// Call from the Admin Settings page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  if (!TG_TOKEN) {
    return json({ error: "TELEGRAM_BOT_TOKEN missing" }, 400);
  }

  // Require admin caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (!claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
  if (!roleRow) return json({ error: "Forbidden" }, 403);

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;

  if (body?.action === "status") {
    const infoRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getWebhookInfo`);
    const info = await infoRes.json();
    return json({ webhook: webhookUrl, telegram: info, registered: info?.result?.url === webhookUrl });
  }

  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: WEBHOOK_SECRET || undefined,
      allowed_updates: ["message", "callback_query", "pre_checkout_query"],
    }),
  });
  const data = await res.json();
  const infoRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getWebhookInfo`);
  const info = await infoRes.json();
  return json({ webhook: webhookUrl, telegram: data, status: info, registered: info?.result?.url === webhookUrl });
});
