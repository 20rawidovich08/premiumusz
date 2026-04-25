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

async function tg(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!TG_TOKEN || !ADMIN_CHAT_ID) {
    return new Response(JSON.stringify({ error: "Telegram secrets missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
  const orderId = String(body?.order_id || "");
  if (!orderId) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) return new Response(JSON.stringify({ ok: true, skipped: "no_order" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

  return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});