// One-shot helper to register the Telegram webhook URL.
// Call from the Admin Settings page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  if (!TG_TOKEN) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN missing" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require admin caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (!claims?.claims?.sub) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
  if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
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
  return new Response(JSON.stringify({ webhook: webhookUrl, telegram: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
