// Telegram bot webhook handler
// Handles: /start (with optional referral payload), registration (contact),
// plan selection, card payment flow (with receipt forwarding to admin),
// Stars invoice + successful_payment, balance, referrals.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID")!;
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

async function tg(method: string, body: unknown) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function getSetting(key: string, fallback: any = null) {
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? fallback;
}

async function getOrCreateUser(from: any, startPayload?: string) {
  const { data: existing } = await supabase
    .from("bot_users")
    .select("*")
    .eq("telegram_id", from.id)
    .maybeSingle();
  if (existing) return existing;

  let referrerId: string | null = null;
  if (startPayload) {
    const { data: refUser } = await supabase
      .from("bot_users")
      .select("id")
      .eq("referral_code", startPayload)
      .maybeSingle();
    if (refUser) referrerId = refUser.id;
  }

  const { data: created } = await supabase
    .from("bot_users")
    .insert({
      telegram_id: from.id,
      username: from.username ?? null,
      full_name: [from.first_name, from.last_name].filter(Boolean).join(" ") || null,
      referred_by: referrerId,
    })
    .select()
    .single();

  // referral reward
  if (referrerId) {
    const reward = Number(await getSetting("referral_reward", 0));
    if (reward > 0) {
      await supabase.rpc("increment_balance", { p_user_id: referrerId, p_delta: reward }).catch(async () => {
        const { data: r } = await supabase.from("bot_users").select("balance").eq("id", referrerId!).single();
        await supabase.from("bot_users").update({ balance: Number(r?.balance || 0) + reward }).eq("id", referrerId!);
      });
      await supabase.from("referral_events").insert({
        referrer_id: referrerId,
        referred_id: created!.id,
        reward,
      });
      await tg("sendMessage", {
        chat_id: (await supabase.from("bot_users").select("telegram_id").eq("id", referrerId).single()).data?.telegram_id,
        text: `🎉 Yangi taklif! +${reward.toLocaleString("ru-RU")} UZS hisobingizga qo'shildi.`,
      }).catch(() => {});
    }
  }
  return created;
}

function plansKeyboard(plans: any[]) {
  return {
    inline_keyboard: plans.map((p) => [
      {
        text: `${p.duration_months} oy — ${Number(p.price_uzs).toLocaleString("ru-RU")} UZS / ⭐ ${p.price_stars}`,
        callback_data: `plan:${p.id}`,
      },
    ]),
  };
}

function paymentMethodKeyboard(planId: string, cardEnabled: boolean, starsEnabled: boolean, balance: number, price: number) {
  const rows: any[] = [];
  if (cardEnabled) rows.push([{ text: "💳 Karta orqali", callback_data: `pay_card:${planId}` }]);
  if (starsEnabled) rows.push([{ text: "⭐ Telegram Stars", callback_data: `pay_stars:${planId}` }]);
  if (balance >= price) rows.push([{ text: `👛 Balansdan to'lash (${balance.toLocaleString("ru-RU")} UZS)`, callback_data: `pay_balance:${planId}` }]);
  rows.push([{ text: "« Orqaga", callback_data: "menu:plans" }]);
  return { inline_keyboard: rows };
}

function mainMenu() {
  return {
    keyboard: [
      [{ text: "🛒 Premium sotib olish" }, { text: "💰 Balans" }],
      [{ text: "👥 Referal" }, { text: "📋 Mening buyurtmalarim" }],
      [{ text: "ℹ️ Yordam" }],
    ],
    resize_keyboard: true,
  };
}

async function sendPlans(chatId: number) {
  const { data: plans } = await supabase.from("plans").select("*").eq("active", true).order("duration_months");
  await tg("sendMessage", {
    chat_id: chatId,
    text: "📦 Tarifni tanlang:",
    reply_markup: plansKeyboard(plans ?? []),
  });
}

async function notifyAdminNewOrder(order: any, user: any, photoFileId?: string) {
  if (!ADMIN_CHAT_ID) return;
  const text =
    `🆕 <b>Yangi buyurtma</b>\n\n` +
    `№ <code>${order.order_number}</code>\n` +
    `👤 ${user.full_name || "-"} (@${user.username || "-"})\n` +
    `📞 ${user.phone || "-"}\n` +
    `🆔 <code>${user.telegram_id}</code>\n` +
    `📦 ${order.duration_months} oy\n` +
    `💵 ${order.amount_uzs ? Number(order.amount_uzs).toLocaleString("ru-RU") + " UZS" : "⭐ " + order.amount_stars}\n` +
    `💳 ${order.payment_method}`;
  if (photoFileId) {
    await tg("sendPhoto", { chat_id: ADMIN_CHAT_ID, photo: photoFileId, caption: text, parse_mode: "HTML" });
  } else {
    await tg("sendMessage", { chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" });
  }
}

// In-memory ephemeral state: which order each user is uploading a receipt for.
// (Stateless across deploys is fine; user can always restart the flow.)
const pendingReceipts = new Map<number, string>(); // telegram_id -> order_id

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Verify webhook secret (Telegram sends X-Telegram-Bot-Api-Secret-Token header)
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: any;
  try { update = await req.json(); } catch { return new Response("bad", { status: 400 }); }

  try {
    if (update.pre_checkout_query) {
      await tg("answerPreCheckoutQuery", { pre_checkout_query_id: update.pre_checkout_query.id, ok: true });
      return new Response("ok");
    }

    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data: string = cb.data || "";
      const user = await getOrCreateUser(cb.from);
      await tg("answerCallbackQuery", { callback_query_id: cb.id });

      if (data === "menu:plans") {
        await sendPlans(chatId);
      } else if (data.startsWith("plan:")) {
        const planId = data.split(":")[1];
        const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
        if (!plan) return new Response("ok");
        const cardEnabled = (await getSetting("card_enabled", true)) !== false;
        const starsEnabled = (await getSetting("stars_enabled", true)) !== false;
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `📦 <b>${plan.duration_months} oylik Premium</b>\n\n` +
            `💵 Karta: <b>${Number(plan.price_uzs).toLocaleString("ru-RU")} UZS</b>\n` +
            `⭐ Stars: <b>${plan.price_stars}</b>\n\n` +
            `To'lov usulini tanlang:`,
          parse_mode: "HTML",
          reply_markup: paymentMethodKeyboard(planId, cardEnabled, starsEnabled, Number(user.balance), Number(plan.price_uzs)),
        });
      } else if (data.startsWith("pay_card:")) {
        const planId = data.split(":")[1];
        const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
        const cardNum = await getSetting("card_number", "");
        const cardHolder = await getSetting("card_holder", "");
        const cardBank = await getSetting("card_bank", "");
        // Create pending order
        const { data: order } = await supabase.from("orders").insert({
          bot_user_id: user.id,
          plan_id: planId,
          duration_months: plan.duration_months,
          amount_uzs: plan.price_uzs,
          payment_method: "card",
          status: "pending",
          source: "bot",
        }).select().single();
        pendingReceipts.set(user.telegram_id, order!.id);
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `💳 <b>Karta orqali to'lov</b>\n\n` +
            `Karta raqami:\n<code>${cardNum}</code>\n` +
            `Egasi: <b>${cardHolder}</b>\n` +
            `Bank: ${cardBank}\n\n` +
            `💰 To'lov summasi: <b>${Number(plan.price_uzs).toLocaleString("ru-RU")} UZS</b>\n\n` +
            `To'lovni amalga oshirgach, <b>chek rasmini shu yerga yuboring</b>.\n\n` +
            `Buyurtma raqami: <code>${order!.order_number}</code>`,
          parse_mode: "HTML",
        });
      } else if (data.startsWith("pay_stars:")) {
        const planId = data.split(":")[1];
        const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
        await tg("sendInvoice", {
          chat_id: chatId,
          title: `Telegram Premium — ${plan.duration_months} oy`,
          description: `${plan.duration_months} oylik Telegram Premium obunasi`,
          payload: `plan:${plan.id}:${user.id}`,
          provider_token: "", // empty = Telegram Stars
          currency: "XTR",
          prices: [{ label: `${plan.duration_months} months`, amount: plan.price_stars }],
        });
      } else if (data.startsWith("pay_balance:")) {
        const planId = data.split(":")[1];
        const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
        if (Number(user.balance) < Number(plan.price_uzs)) {
          await tg("sendMessage", { chat_id: chatId, text: "❌ Balansda yetarli mablag' yo'q." });
        } else {
          const newBal = Number(user.balance) - Number(plan.price_uzs);
          await supabase.from("bot_users").update({ balance: newBal }).eq("id", user.id);
          const { data: order } = await supabase.from("orders").insert({
            bot_user_id: user.id,
            plan_id: planId,
            duration_months: plan.duration_months,
            amount_uzs: plan.price_uzs,
            payment_method: "balance",
            status: "approved",
            source: "bot",
          }).select().single();
          await tg("sendMessage", {
            chat_id: chatId,
            text: `✅ Buyurtma yaratildi va balansdan to'landi.\n№ <code>${order!.order_number}</code>`,
            parse_mode: "HTML",
          });
          await notifyAdminNewOrder(order, user);
        }
      }
      return new Response("ok");
    }

    const msg = update.message;
    if (!msg) return new Response("ok");
    const chatId = msg.chat.id;
    const from = msg.from;

    // Successful Stars payment
    if (msg.successful_payment) {
      const sp = msg.successful_payment;
      const [, planId, userId] = (sp.invoice_payload || "").split(":");
      const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
      const user = await getOrCreateUser(from);
      const { data: order } = await supabase.from("orders").insert({
        bot_user_id: user.id,
        plan_id: planId,
        duration_months: plan?.duration_months ?? 1,
        amount_stars: sp.total_amount,
        payment_method: "stars",
        status: "paid",
        source: "bot",
        stars_charge_id: sp.telegram_payment_charge_id,
      }).select().single();
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ To'lov qabul qilindi!\n№ <code>${order!.order_number}</code>\n\nTez orada Premium faollashtiriladi.`,
        parse_mode: "HTML",
      });
      await notifyAdminNewOrder(order, user);
      return new Response("ok");
    }

    const user = await getOrCreateUser(from, msg.text?.startsWith("/start ") ? msg.text.split(" ")[1] : undefined);
    if (user.banned) {
      await tg("sendMessage", { chat_id: chatId, text: "Sizning hisobingiz bloklangan." });
      return new Response("ok");
    }

    // Contact (phone) shared
    if (msg.contact) {
      await supabase.from("bot_users").update({
        phone: msg.contact.phone_number,
        full_name: user.full_name || [msg.contact.first_name, msg.contact.last_name].filter(Boolean).join(" "),
      }).eq("id", user.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text: "✅ Ro'yxatdan o'tdingiz! Xush kelibsiz.",
        reply_markup: mainMenu(),
      });
      return new Response("ok");
    }

    // Photo (receipt)
    if (msg.photo && pendingReceipts.has(from.id)) {
      const orderId = pendingReceipts.get(from.id)!;
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      // Download from Telegram and upload to storage
      const fileInfo = await tg("getFile", { file_id: fileId });
      const filePath = fileInfo?.result?.file_path;
      if (filePath) {
        const fileRes = await fetch(`https://api.telegram.org/file/bot${TG_TOKEN}/${filePath}`);
        const bytes = new Uint8Array(await fileRes.arrayBuffer());
        const ext = filePath.split(".").pop() || "jpg";
        const objPath = `${orderId}-${Date.now()}.${ext}`;
        await supabase.storage.from("receipts").upload(objPath, bytes, { contentType: "image/jpeg", upsert: false });
        await supabase.from("orders").update({ receipt_url: objPath }).eq("id", orderId);
      }
      const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
      pendingReceipts.delete(from.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Chek qabul qilindi! Admin tez orada tekshirib chiqadi.\n№ <code>${order!.order_number}</code>`,
        parse_mode: "HTML",
        reply_markup: mainMenu(),
      });
      await notifyAdminNewOrder(order, user, fileId);
      return new Response("ok");
    }

    const text: string = msg.text || "";

    if (text.startsWith("/start")) {
      if (!user.phone) {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            "👋 Assalomu alaykum!\n\nTelegram Premium do'koniga xush kelibsiz.\n\n" +
            "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring 👇",
          reply_markup: {
            keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
      } else {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `👋 Xush kelibsiz, ${user.full_name || ""}!\n\nQuyidagi menyudan foydalaning 👇`,
          reply_markup: mainMenu(),
        });
      }
      return new Response("ok");
    }

    if (text === "🛒 Premium sotib olish" || text === "/buy") {
      if (!user.phone) {
        await tg("sendMessage", { chat_id: chatId, text: "Avval telefon raqamingizni ulashing. /start" });
      } else {
        await sendPlans(chatId);
      }
    } else if (text === "💰 Balans" || text === "/balance") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `💰 Sizning balansingiz: <b>${Number(user.balance).toLocaleString("ru-RU")} UZS</b>`,
        parse_mode: "HTML",
      });
    } else if (text === "👥 Referal" || text === "/ref") {
      const me = await tg("getMe", {});
      const username = me?.result?.username;
      const link = `https://t.me/${username}?start=${user.referral_code}`;
      const reward = await getSetting("referral_reward", 0);
      const { count } = await supabase
        .from("referral_events")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          `👥 <b>Referal dasturi</b>\n\n` +
          `Har bir taklif uchun: <b>${Number(reward).toLocaleString("ru-RU")} UZS</b>\n` +
          `Sizning takliflaringiz: <b>${count ?? 0}</b>\n\n` +
          `Sizning havolangiz:\n${link}`,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    } else if (text === "📋 Mening buyurtmalarim" || text === "/orders") {
      const { data: orders } = await supabase
        .from("orders")
        .select("order_number,duration_months,status,amount_uzs,amount_stars,created_at")
        .eq("bot_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (!orders?.length) {
        await tg("sendMessage", { chat_id: chatId, text: "Sizda hali buyurtmalar yo'q." });
      } else {
        const lines = orders.map(
          (o: any) =>
            `<code>${o.order_number}</code> · ${o.duration_months}oy · ${
              o.amount_uzs ? Number(o.amount_uzs).toLocaleString("ru-RU") + " UZS" : "⭐" + o.amount_stars
            } · <i>${o.status}</i>`
        );
        await tg("sendMessage", { chat_id: chatId, text: lines.join("\n"), parse_mode: "HTML" });
      }
    } else if (text === "ℹ️ Yordam" || text === "/help") {
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          "ℹ️ <b>Yordam</b>\n\n" +
          "🛒 Premium sotib olish — tarif tanlash\n" +
          "💰 Balans — joriy balansingiz\n" +
          "👥 Referal — do'stlarni taklif qilib bonus oling\n" +
          "📋 Mening buyurtmalarim — buyurtmalar tarixi\n\n" +
          "Savollar bo'lsa adminga yozing.",
        parse_mode: "HTML",
      });
    } else {
      // Unknown text
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Iltimos, menyudan tanlang yoki /start bosing.",
        reply_markup: mainMenu(),
      });
    }

    return new Response("ok");
  } catch (e) {
    console.error("Bot error:", e);
    return new Response("ok"); // always 200 so Telegram doesn't retry-storm
  }
});
