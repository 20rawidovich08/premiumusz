import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const fmt = (n: number | string) => Number(n || 0).toLocaleString("ru-RU");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function tg(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data?.ok) console.error("Telegram admin notify failed", method, data);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!TG_TOKEN || !ADMIN_CHAT_ID) return json({ error: "Telegram secrets missing" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const orderId = String(body?.order_id || "");
  const topupId = String(body?.topup_id || "");

  if (orderId) {
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ ok: true, skipped: "no_order" });

    const product = order.product_type === "stars" ? `⭐ ${order.stars_amount} Stars` : `👑 Premium ${order.duration_months} oy`;
    const text =
      `🆕 <b>Yangi buyurtma</b>\n\n` +
      `№ <code>${order.order_number}</code>\n` +
      `👤 ${order.contact_full_name || "-"}\n` +
      `📞 ${order.contact_phone || "-"}\n` +
      `📦 ${product}\n` +
      `🎯 ${order.telegram_target || order.contact_telegram || "-"}\n` +
      `💵 ${fmt(order.amount_uzs)} UZS · ${order.payment_method}\n` +
      `🌐 ${order.source}`;

    if (order.receipt_url) {
      const { data: signed } = await admin.storage.from("receipts").createSignedUrl(order.receipt_url, 3600);
      if (signed?.signedUrl) await tg("sendPhoto", { chat_id: ADMIN_CHAT_ID, photo: signed.signedUrl, caption: text, parse_mode: "HTML" });
      else await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" });
    } else {
      await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" });
    }
    return json({ ok: true, kind: "order" });
  }

  if (topupId) {
    const { data: tx } = await admin.from("balance_transactions").select("*").eq("id", topupId).maybeSingle();
    if (!tx) return json({ ok: true, skipped: "no_topup" });

    let person: any = null;
    if (tx.bot_user_id) {
      const { data } = await admin.from("bot_users").select("full_name,phone,username,telegram_id").eq("id", tx.bot_user_id).maybeSingle();
      person = data;
    } else if (tx.user_id) {
      const { data } = await admin.from("profiles").select("full_name,phone,telegram_username").eq("id", tx.user_id).maybeSingle();
      person = data;
    }

    const telegram = person?.telegram_username || (person?.username ? `@${person.username}` : "-");
    const text =
      `💳 <b>Yangi balans to'ldirish</b>\n\n` +
      `👤 ${person?.full_name || "-"}\n` +
      `📞 ${person?.phone || "-"}\n` +
      `Telegram: ${telegram}\n` +
      (person?.telegram_id ? `🆔 <code>${person.telegram_id}</code>\n` : "") +
      `💵 <b>${fmt(tx.amount_uzs)} UZS</b>\n` +
      `🌐 ${tx.bot_user_id ? "bot" : "website"}`;

    if (tx.receipt_url) {
      const { data: signed } = await admin.storage.from("receipts").createSignedUrl(tx.receipt_url, 3600);
      if (signed?.signedUrl) await tg("sendPhoto", { chat_id: ADMIN_CHAT_ID, photo: signed.signedUrl, caption: text, parse_mode: "HTML" });
      else await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" });
    } else {
      await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" });
    }
    return json({ ok: true, kind: "topup" });
  }

  return json({ error: "order_id or topup_id required" }, 400);
});
