// Send a Telegram message to a user when admin approves/rejects their order or topup.
// Called from the admin panel after a decision is taken.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const fmt = (n: number | string) => Number(n).toLocaleString("ru-RU");

async function tg(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin-only
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (!claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: roleRow } = await userClient.from("user_roles")
    .select("role").eq("user_id", claims.claims.sub).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response("bad", { status: 400 }); }
  const { kind, id, approved, note } = body || {};
  if (!kind || !id || typeof approved !== "boolean") {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    if (kind === "order") {
      const { data: order } = await admin.from("orders").select("*").eq("id", id).maybeSingle();
      if (!order) return new Response(JSON.stringify({ ok: true, skipped: "no_order" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      let chatId: number | null = null;
      if (order.bot_user_id) {
        const { data: bu } = await admin.from("bot_users").select("telegram_id").eq("id", order.bot_user_id).maybeSingle();
        chatId = bu?.telegram_id ?? null;
      }
      if (!chatId) return new Response(JSON.stringify({ ok: true, skipped: "no_chat" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

      const product = order.product_type === "stars"
        ? `⭐ ${order.stars_amount} Stars`
        : `👑 Premium ${order.duration_months} oy`;
      const text = approved
        ? `✅ <b>Buyurtmangiz tasdiqlandi!</b>\n\nNº <code>${order.order_number}</code>\n${product}\n🎯 ${order.telegram_target || "-"}\n\nTez orada yetkaziladi. Rahmat! 🙏${note ? "\n\n📝 " + note : ""}`
        : `❌ <b>Buyurtmangiz rad etildi</b>\n\nNº <code>${order.order_number}</code>\n${product}\n\n${order.payment_method === "balance" ? `Pul balansingizga qaytarildi: ${fmt(order.amount_uzs || 0)} UZS\n` : ""}${note ? "\n📝 Sabab: " + note : ""}`;
      await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
    } else if (kind === "topup") {
      const { data: tx } = await admin.from("balance_transactions").select("*").eq("id", id).maybeSingle();
      if (!tx) return new Response(JSON.stringify({ ok: true, skipped: "no_tx" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      // Bot top-ups encode telegram_id in admin_note as "BOT:<id>:<name>"
      let chatId: number | null = null;
      if (tx.admin_note?.startsWith("BOT:")) {
        const parts = tx.admin_note.split(":");
        chatId = Number(parts[1]) || null;
        // For bot top-ups, the user_id is bot_users.id, not profile id — credit the bot wallet.
        if (approved) {
          const { data: bu } = await admin.from("bot_users").select("balance,telegram_id").eq("id", tx.user_id).maybeSingle();
          if (bu) {
            await admin.from("bot_users").update({ balance: Number(bu.balance) + Number(tx.amount_uzs) }).eq("id", tx.user_id);
            chatId = bu.telegram_id;
          }
        }
      }
      if (!chatId) return new Response(JSON.stringify({ ok: true, skipped: "no_chat" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const text = approved
        ? `✅ <b>Balans to'ldirildi!</b>\n\n+${fmt(tx.amount_uzs)} UZS hisobingizga qo'shildi.${note ? "\n\n📝 " + note : ""}`
        : `❌ <b>To'ldirish rad etildi</b>\n\n${fmt(tx.amount_uzs)} UZS\n${note ? "📝 Sabab: " + note : ""}`;
      await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-user error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
