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
      let buyerName = order.contact_full_name || "";
      if (order.bot_user_id) {
        const { data: bu } = await admin.from("bot_users").select("telegram_id,full_name,username").eq("id", order.bot_user_id).maybeSingle();
        chatId = bu?.telegram_id ?? null;
        buyerName = bu?.full_name || (bu?.username ? "@" + bu.username : buyerName);
      }

      const product = order.product_type === "stars"
        ? `⭐ ${order.stars_amount} Stars`
        : `👑 Premium ${order.duration_months} oy`;
      const target = order.telegram_target || order.contact_telegram || "";

      if (chatId) {
        const text = approved
          ? `✅ <b>Buyurtmangiz tasdiqlandi!</b>\n\nSizning xarid qilgan ${product} ${target ? target + " ga " : ""}jo'natildi.\n\nNº <code>${order.order_number}</code>\nRahmat! 🙏${note ? "\n\n📝 " + note : ""}`
          : `❌ <b>Buyurtmangiz rad etildi</b>\n\nNº <code>${order.order_number}</code>\n${product}\n\n${order.payment_method === "balance" ? `Pul balansingizga qaytarildi: ${fmt(order.amount_uzs || 0)} UZS\n` : ""}${note ? "\n📝 Sabab: " + note : ""}`;
        await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
      }

      if (approved) {
        // Fragment-API.uz auto-delivery (X-API-Key, /stars/buy or /premium/buy)
        try {
          const { data: rows } = await admin.from("settings").select("key,value").in("key", [
            "fragment_enabled", "fragment_api_key", "fragment_api_url",
          ]);
          const cfg: Record<string, any> = {};
          (rows ?? []).forEach((r: any) => { cfg[r.key] = r.value; });
          const envKey = Deno.env.get("FRAGMENT_API_KEY") || "";
          const apiKey = String(cfg.fragment_api_key || envKey || "");
          if (cfg.fragment_enabled && apiKey) {
            const baseUrl = String(cfg.fragment_api_url || "https://fragment-api.uz/api/v1").replace(/\/+$/, "");
            const target = String(order.telegram_target || order.contact_telegram || "").replace(/^@/, "").trim();
            const isStars = order.product_type === "stars";
            const path = isStars ? "/stars/buy" : "/premium/buy";
            const payload: Record<string, any> = { username: target };
            if (isStars) payload.amount = Number(order.stars_amount || 0);
            else payload.duration = Number(order.duration_months || 0);
            if (target) {
              const fr = await fetch(`${baseUrl}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
                body: JSON.stringify(payload),
              });
              const txt = await fr.text();
              let json: any = null;
              try { json = JSON.parse(txt); } catch { /* raw */ }
              const ok = fr.ok && (!json || json.ok !== false);
              const tag = ok
                ? `[Fragment ✓ ${json?.result?.cost || ""} ${json?.result?.payment_method || ""}]`.trim()
                : `[Fragment ✗ ${json?.message || json?.code || txt.slice(0, 160)}]`;
              await admin.from("orders").update({
                admin_note: `${order.admin_note || ""} ${tag}`.trim(),
              }).eq("id", order.id);
            }
          }
        } catch (e) { console.error("fragment delivery error", e); }


        // Post to public channel if configured
        const { data: chRow } = await admin.from("settings").select("value").eq("key", "post_channel_id").maybeSingle();
        const channel = chRow?.value ? String(chRow.value).trim() : "";
        if (channel) {
          const { data: tplRow } = await admin.from("settings").select("value").eq("key", "channel_post_template").maybeSingle();
          const { data: botRow } = await admin.from("settings").select("value").eq("key", "bot_username").maybeSingle();
          const botUsername = botRow?.value ? String(botRow.value).replace(/^@/, "") : "";
          const isStars = order.product_type === "stars";
          const productLine = isStars
            ? `⭐️ Stars: <b>${order.stars_amount}</b>`
            : `👑 Premium: <b>${order.duration_months} oy</b>`;
          const key = `${isStars ? "stars" : "premium"}-${String(order.id).replace(/-/g, "").slice(0, 8)}`;
          const DEFAULT_TPL =
            `📥 Yangi {product_kind} Xarid <code>{order_number}</code>\n\n` +
            `👤 Mijoz: <b>{buyer}</b>\n` +
            `{product_line}\n` +
            `💸 Paid: <b>{amount} UZS</b> ({payment_method})\n` +
            `🆔 Key: <code>{key}</code>\n\n` +
            `@{bot_username}`;
          const tpl = (tplRow?.value && String(tplRow.value)) || DEFAULT_TPL;
          const vars: Record<string, string> = {
            product_kind: isStars ? "Stars" : "Premium",
            product_type: order.product_type || "",
            order_number: order.order_number || "",
            buyer: buyerName || "-",
            product_line: productLine,
            stars: String(order.stars_amount ?? ""),
            duration_months: String(order.duration_months ?? ""),
            amount: fmt(order.amount_uzs || 0),
            payment_method: order.payment_method || "",
            key,
            bot_username: botUsername,
          };
          const channelText = tpl.replace(/\{(\w+)\}/g, (_: string, k: string) => vars[k] ?? "");
          await tg("sendMessage", { chat_id: channel, text: channelText, parse_mode: "HTML", disable_web_page_preview: true });
        }
      }
    } else if (kind === "topup") {
      const { data: tx } = await admin.from("balance_transactions").select("*").eq("id", id).maybeSingle();
      if (!tx) return new Response(JSON.stringify({ ok: true, skipped: "no_tx" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      let chatId: number | null = null;
      if (tx.bot_user_id) {
        const { data: bu } = await admin.from("bot_users").select("telegram_id").eq("id", tx.bot_user_id).maybeSingle();
        chatId = bu?.telegram_id ?? null;
      } else if (tx.admin_note?.startsWith("BOT:")) {
        chatId = Number(tx.admin_note.split(":")[1]) || null;
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
