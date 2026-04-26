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

const normalizeWebhookSecret = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const WEBHOOK_SECRET = normalizeWebhookSecret(Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (!TG_TOKEN) {
    return json({ error: "TELEGRAM_BOT_TOKEN missing" }, 400);
  }

  // Require admin caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !authData?.user?.id) return json({ error: "Unauthorized" }, 401);
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: authData.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Forbidden" }, 403);

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-bot`;
  const webhookPayload = {
    url: webhookUrl,
    secret_token: WEBHOOK_SECRET || undefined,
    allowed_updates: ["message", "callback_query", "pre_checkout_query"],
    drop_pending_updates: true,
  };

  if (body?.action === "status") {
    const infoRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getWebhookInfo`);
    const info = await infoRes.json();
    return json({ webhook: webhookUrl, telegram: info, registered: info?.result?.url === webhookUrl, pending_update_count: info?.result?.pending_update_count ?? 0, last_error_message: info?.result?.last_error_message ?? null });
  }

  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload),
  });
  const data = await res.json();
  const infoRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getWebhookInfo`);
  const info = await infoRes.json();
  return json({ webhook: webhookUrl, telegram: data, status: info, registered: info?.result?.url === webhookUrl, pending_update_count: info?.result?.pending_update_count ?? 0, last_error_message: info?.result?.last_error_message ?? null });
});
