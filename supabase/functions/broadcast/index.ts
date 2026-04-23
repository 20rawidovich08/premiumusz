// Admin broadcast: sends a message to every registered bot_user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  if (!TG_TOKEN) {
    return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN missing" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (!claims?.claims?.sub) return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
  if (!roleRow) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const message = (body.message || "").toString().trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: corsHeaders });
  }

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: users } = await admin.from("bot_users").select("telegram_id").eq("banned", false);

  let sent = 0, failed = 0;
  for (const u of users ?? []) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: u.telegram_id, text: message, parse_mode: "HTML" }),
      });
      const data = await res.json();
      if (data.ok) sent++; else failed++;
    } catch {
      failed++;
    }
    // tiny throttle to respect Telegram rate limits (~30 msgs/sec)
    await new Promise((r) => setTimeout(r, 40));
  }

  await admin.from("broadcasts").insert({ message, sent_count: sent, failed_count: failed, status: "done" });

  return new Response(JSON.stringify({ sent, failed, total: users?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
