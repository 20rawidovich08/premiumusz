import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const fmt = (n: number | string) => Number(n || 0).toLocaleString("ru-RU");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function tgJson(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) console.error("Telegram notify failed", method, data);
  return data;
}

async function tgSendPhotoBytes(chatId: string, bytes: Uint8Array, filename: string, caption: string) {
  const fd = new FormData();
  fd.append("chat_id", chatId);
  fd.append("caption", caption);
  fd.append("parse_mode", "HTML");
  fd.append("photo", new Blob([bytes]), filename);
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendPhoto`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!data?.ok) console.error("sendPhoto bytes failed", data);
  return data;
}

function parseIds(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "number") return [String(value)];
  return [];
}

async function getRecipients(admin: ReturnType<typeof createClient>): Promise<string[]> {
  const ids = new Set<string>();
  if (ADMIN_CHAT_ID) ids.add(ADMIN_CHAT_ID);
  const { data } = await admin.from("settings").select("value").eq("key", "admin_telegram_ids").maybeSingle();
  for (const id of parseIds(data?.value)) ids.add(id);
  return Array.from(ids);
}

async function downloadReceiptBytes(admin: ReturnType<typeof createClient>, path: string): Promise<{ bytes: Uint8Array; filename: string } | null> {
  try {
    const { data, error } = await admin.storage.from("receipts").download(path);
    if (error || !data) {
      console.error("Receipt download failed", error);
      return null;
    }
    const buf = new Uint8Array(await data.arrayBuffer());
    const filename = path.split("/").pop() || "receipt.jpg";
    return { bytes: buf, filename };
  } catch (e) {
    console.error("Receipt download exception", e);
    return null;
  }
}

async function broadcast(recipients: string[], text: string, receipt: { bytes: Uint8Array; filename: string } | null) {
  for (const chatId of recipients) {
    let sent = false;
    if (receipt) {
      const r = await tgSendPhotoBytes(chatId, receipt.bytes, receipt.filename, text);
      sent = !!r?.ok;
    }
    if (!sent) {
      await tgJson("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!TG_TOKEN) return json({ error: "Telegram token missing" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const recipients = await getRecipients(admin);
  if (recipients.length === 0) return json({ ok: true, skipped: "no_recipients" });

  const orderId = String(body?.order_id || "");
  const topupId = String(body?.topup_id || "");

  if (orderId) {
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
    if (!order) return json({ ok: true, skipped: "no_order" });

    const product = order.product_type === "stars"
      ? `⭐ ${order.stars_amount} Stars`
      : `👑 Premium ${order.duration_months} oy`;
    const text =
      `🆕 <b>Yangi buyurtma</b>\n\n` +
      `№ <code>${order.order_number}</code>\n` +
      `👤 ${order.contact_full_name || "-"}\n` +
      `📞 ${order.contact_phone || "-"}\n` +
      `📦 ${product}\n` +
      `🎯 ${order.telegram_target || order.contact_telegram || "-"}\n` +
      `💵 ${fmt(order.amount_uzs)} UZS · ${order.payment_method}\n` +
      `🌐 ${order.source}`;

    const receipt = order.receipt_url ? await downloadReceiptBytes(admin, order.receipt_url) : null;
    await broadcast(recipients, text, receipt);
    return json({ ok: true, kind: "order", recipients: recipients.length, hadReceipt: !!receipt });
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

    const receipt = tx.receipt_url ? await downloadReceiptBytes(admin, tx.receipt_url) : null;
    await broadcast(recipients, text, receipt);
    return json({ ok: true, kind: "topup", recipients: recipients.length, hadReceipt: !!receipt });
  }

  return json({ error: "order_id or topup_id required" }, 400);
});
