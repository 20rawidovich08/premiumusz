// Telegram bot webhook handler (to'liq saytdagi funksiyalar bilan).
// Reply keyboard (asosiy menyu) + inline tugmalar (tarif tanlash, paket, tasdiq).
// Funksiyalar: /start (referral), ro'yxatdan o'tish (kontakt), Premium 3/6/12, Stars,
// Balans to'ldirish (chek rasmi), Profil, Mening buyurtmalarim, Referal, Yordam.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID")!;
const RAW_WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
const TG_API = `https://api.telegram.org/bot${TG_TOKEN}`;

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };

const fmt = (n: number | string) => Number(n).toLocaleString("ru-RU");
const USERNAME_RE = /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const normalizeWebhookSecret = (value: string) => value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);
const WEBHOOK_SECRET = normalizeWebhookSecret(RAW_WEBHOOK_SECRET);

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
    .from("bot_users").select("*").eq("telegram_id", from.id).maybeSingle();
  if (existing) return existing;

  let referrerId: string | null = null;
  if (startPayload) {
    const { data: refUser } = await supabase
      .from("bot_users").select("id").eq("referral_code", startPayload).maybeSingle();
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
    .select().single();

  if (referrerId) {
    const reward = Number(await getSetting("referral_reward", 0));
    if (reward > 0) {
      const { data: r } = await supabase.from("bot_users").select("balance,telegram_id").eq("id", referrerId).single();
      await supabase.from("bot_users").update({ balance: Number(r?.balance || 0) + reward }).eq("id", referrerId);
      await supabase.from("referral_events").insert({ referrer_id: referrerId, referred_id: created!.id, reward });
      if (r?.telegram_id) {
        await tg("sendMessage", {
          chat_id: r.telegram_id,
          text: `🎉 Yangi taklif! +${fmt(reward)} UZS hisobingizga qo'shildi.`,
        }).catch(() => {});
      }
    }
  }
  return created;
}

// ============ Keyboards ============
function mainMenu(isAdmin = false) {
  const rows: any[] = [
    [{ text: "👑 Premium" }, { text: "⭐ Stars" }],
    [{ text: "💰 Balans" }, { text: "💳 Balansni to'ldirish" }],
    [{ text: "👤 Profil" }, { text: "📋 Buyurtmalarim" }],
    [{ text: "👥 Referal" }, { text: "ℹ️ Yordam" }],
  ];
  if (isAdmin) rows.push([{ text: "🛠 Admin panel" }]);
  return { keyboard: rows, resize_keyboard: true };
}

function cancelKeyboard() {
  return { keyboard: [[{ text: "❌ Bekor qilish" }]], resize_keyboard: true, one_time_keyboard: true };
}

function shareContactKeyboard() {
  return {
    keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

async function premiumPlansInline() {
  const { data: plans } = await supabase.from("plans").select("*").eq("active", true).order("duration_months");
  return {
    inline_keyboard: (plans ?? []).map((p: any) => [{
      text: `${p.duration_months} oy — ${fmt(p.price_uzs)} UZS`,
      callback_data: `premium:${p.id}`,
    }]),
  };
}

async function starsPackagesInline() {
  const { data: pkgs } = await supabase.from("stars_packages").select("*").eq("active", true).order("stars");
  const rate = Number(await getSetting("stars_rate_uzs", 220));
  const rows = (pkgs ?? []).map((p: any) => [{
    text: `⭐ ${p.stars} — ${fmt(p.stars * rate)} UZS`,
    callback_data: `stars:${p.stars}`,
  }]);
  rows.push([{ text: "✏️ Boshqa miqdor", callback_data: "stars:custom" }]);
  return { inline_keyboard: rows };
}

function confirmInline(prefix: string, id: string) {
  return {
    inline_keyboard: [[
      { text: "✅ Tasdiqlash", callback_data: `${prefix}_confirm:${id}` },
      { text: "❌ Bekor", callback_data: "menu:home" },
    ]],
  };
}

// ============ Notify admin (multi-recipient) ============
function parseAdminIds(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((x) => String(x).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
  if (typeof value === "number") return [String(value)];
  return [];
}

async function getAdminRecipients(): Promise<string[]> {
  const ids = new Set<string>();
  if (ADMIN_CHAT_ID) ids.add(ADMIN_CHAT_ID);
  const extra = await getSetting("admin_telegram_ids", null);
  for (const id of parseAdminIds(extra)) ids.add(id);
  return Array.from(ids);
}

async function broadcastToAdmins(text: string, photoFileId?: string) {
  const recipients = await getAdminRecipients();
  for (const chatId of recipients) {
    if (photoFileId) {
      const r = await tg("sendPhoto", { chat_id: chatId, photo: photoFileId, caption: text, parse_mode: "HTML" });
      if (!r?.ok) await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
    } else {
      await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
    }
  }
}

async function notifyAdminNewOrder(order: any, user: any, photoFileId?: string) {
  const product = order.product_type === "stars"
    ? `⭐ ${order.stars_amount} Stars`
    : `👑 Premium ${order.duration_months} oy`;
  const text =
    `🆕 <b>Yangi buyurtma</b>\n\n` +
    `№ <code>${order.order_number}</code>\n` +
    `👤 ${user.full_name || "-"} (@${user.username || "-"})\n` +
    `📞 ${user.phone || "-"}\n` +
    `🆔 <code>${user.telegram_id}</code>\n` +
    `📦 ${product}\n` +
    `🎯 ${order.telegram_target || "-"}\n` +
    `💵 ${fmt(order.amount_uzs || 0)} UZS · ${order.payment_method}`;
  await broadcastToAdmins(text, photoFileId);
}

async function notifyAdminTopup(tx: any, user: any, photoFileId?: string) {
  const text =
    `💳 <b>Yangi balans to'ldirish</b>\n\n` +
    `👤 ${user.full_name || "-"} (@${user.username || "-"})\n` +
    `📞 ${user.phone || "-"}\n` +
    `🆔 <code>${user.telegram_id}</code>\n` +
    `💵 <b>${fmt(tx.amount_uzs)} UZS</b>`;
  await broadcastToAdmins(text, photoFileId);
}

// Check if a bot user is treated as admin (by telegram_id in settings).
async function isBotAdmin(telegramId: number | string): Promise<boolean> {
  const recipients = await getAdminRecipients();
  return recipients.includes(String(telegramId));
}

// ============ Ephemeral state ============
// Multi-step flows: which "wizard" the user is in.
type Step =
  | { kind: "premium_target"; planId: string }
  | { kind: "stars_amount" }
  | { kind: "stars_target"; stars: number }
  | { kind: "topup_amount" }
  | { kind: "topup_receipt"; amount: number }
  | { kind: "edit_phone" }
  | { kind: "edit_username" }
  | { kind: "adm_broadcast" }
  | { kind: "adm_dm_pick" }
  | { kind: "adm_dm_text"; targetTgId: number }
  | { kind: "adm_user_search" }
  | { kind: "adm_user_balance"; targetUserId: string; targetTgId: number };

async function setWizard(userId: string, step: Step) {
  await supabase.from("bot_users").update({ wizard_state: step as any }).eq("id", userId);
}

async function clearWizard(userId: string) {
  await supabase.from("bot_users").update({ wizard_state: {} }).eq("id", userId);
}

function getWizard(user: any): Step | null {
  const state = user?.wizard_state;
  return state && typeof state === "object" && state.kind ? state as Step : null;
}

// ============ Helpers ============
async function showHome(chatId: number, user: any) {
  const adminFlag = await isBotAdmin(user.telegram_id);
  await tg("sendMessage", {
    chat_id: chatId,
    text: `👋 Xush kelibsiz, <b>${user.full_name || "do'stim"}</b>!\n\nBalans: <b>${fmt(user.balance)} UZS</b>\n\nQuyidagi menyudan tanlang 👇`,
    parse_mode: "HTML",
    reply_markup: mainMenu(adminFlag),
  });
}

async function showProfile(chatId: number, user: any) {
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      `👤 <b>Profil</b>\n\n` +
      `Ism: <b>${user.full_name || "-"}</b>\n` +
      `Telefon: <b>${user.phone || "-"}</b>\n` +
      `Username: ${user.username ? "@" + user.username : "-"}\n` +
      `Balans: <b>${fmt(user.balance)} UZS</b>\n` +
      `🆔 <code>${user.telegram_id}</code>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "✏️ Telefon o'zgartirish", callback_data: "profile:phone" }],
        [{ text: "💳 Balansni to'ldirish", callback_data: "menu:topup" }],
      ],
    },
  });
}

async function showOrders(chatId: number, user: any) {
  const { data: orders } = await supabase
    .from("orders")
    .select("order_number,product_type,duration_months,stars_amount,amount_uzs,status,created_at")
    .eq("bot_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (!orders?.length) {
    await tg("sendMessage", { chat_id: chatId, text: "Sizda hali buyurtmalar yo'q." });
    return;
  }
  const statusEmoji: Record<string, string> = {
    pending: "🕐", approved: "✅", rejected: "❌", paid: "💎",
  };
  const lines = orders.map((o: any) => {
    const item = o.product_type === "stars" ? `⭐ ${o.stars_amount}` : `👑 ${o.duration_months}oy`;
    return `${statusEmoji[o.status] || "•"} <code>${o.order_number}</code> · ${item} · ${fmt(o.amount_uzs || 0)} UZS`;
  });
  await tg("sendMessage", {
    chat_id: chatId,
    text: "📋 <b>So'nggi buyurtmalaringiz</b>\n\n" + lines.join("\n"),
    parse_mode: "HTML",
  });
}

async function showReferral(chatId: number, user: any) {
  const me = await tg("getMe", {});
  const username = me?.result?.username;
  const link = `https://t.me/${username}?start=${user.referral_code}`;
  const reward = await getSetting("referral_reward", 0);
  const { count } = await supabase
    .from("referral_events").select("*", { count: "exact", head: true }).eq("referrer_id", user.id);
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      `👥 <b>Referal dasturi</b>\n\n` +
      `Har bir taklif uchun: <b>${fmt(Number(reward))} UZS</b>\n` +
      `Sizning takliflaringiz: <b>${count ?? 0}</b>\n\n` +
      `Sizning havolangiz:\n${link}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

async function showHelp(chatId: number) {
  const cardNum = await getSetting("card_number", "");
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      `ℹ️ <b>Yordam</b>\n\n` +
      `👑 <b>Premium</b> — 3/6/12 oylik Telegram Premium\n` +
      `⭐ <b>Stars</b> — minimum 50 dona\n` +
      `💳 <b>Balansni to'ldirish</b> — karta orqali, chek yuborilgach admin tasdiqlaydi\n` +
      `👥 <b>Referal</b> — do'stlaringizni taklif qilib bonus oling\n\n` +
      (cardNum ? `Karta: <code>${cardNum}</code>\n\n` : "") +
      `Savollar uchun adminga yozing.`,
    parse_mode: "HTML",
  });
}

// ============ Admin panel (in-bot) ============
async function showAdminPanel(chatId: number) {
  const { count: pendingOrders } = await supabase
    .from("orders").select("*", { count: "exact", head: true }).eq("status", "pending");
  const { count: pendingTopups } = await supabase
    .from("balance_transactions").select("*", { count: "exact", head: true }).eq("type", "topup").eq("status", "pending");
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      `🛠 <b>Admin panel</b>\n\n` +
      `🕐 Pending buyurtmalar: <b>${pendingOrders ?? 0}</b>\n` +
      `🕐 Pending to'ldirishlar: <b>${pendingTopups ?? 0}</b>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: `📦 Buyurtmalar (${pendingOrders ?? 0})`, callback_data: "adm:orders" }],
        [{ text: `💳 To'ldirishlar (${pendingTopups ?? 0})`, callback_data: "adm:topups" }],
        [{ text: "📊 Statistika", callback_data: "adm:stats" }],
        [{ text: "👥 Foydalanuvchilar", callback_data: "adm:users" }],
        [{ text: "🔍 Foydalanuvchi qidirish", callback_data: "adm:user_search" }],
        [{ text: "📢 Barchaga xabar", callback_data: "adm:bcast" }],
        [{ text: "✉️ Bitta foydalanuvchiga xabar", callback_data: "adm:dm" }],
      ],
    },
  });
}

async function showAdminUsers(chatId: number, offset = 0) {
  const PAGE = 10;
  const { data: users, count } = await supabase
    .from("bot_users")
    .select("id,telegram_id,full_name,username,phone,balance,banned", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE - 1);
  if (!users?.length) {
    await tg("sendMessage", { chat_id: chatId, text: "Foydalanuvchilar yo'q." });
    return;
  }
  const lines = users.map((u: any, i: number) =>
    `${offset + i + 1}. ${u.banned ? "🚫 " : ""}<b>${u.full_name || "-"}</b> ${u.username ? "@" + u.username : ""}\n` +
    `   🆔 <code>${u.telegram_id}</code> · 💰 ${fmt(u.balance)} UZS · 📞 ${u.phone || "-"}`
  );
  const buttons: any[][] = users.map((u: any) => [
    { text: `⚙️ ${u.full_name || u.telegram_id}`, callback_data: `adm:u:${u.id}` },
  ]);
  const nav: any[] = [];
  if (offset > 0) nav.push({ text: "⬅️", callback_data: `adm:users_p:${Math.max(0, offset - PAGE)}` });
  if ((count ?? 0) > offset + PAGE) nav.push({ text: "➡️", callback_data: `adm:users_p:${offset + PAGE}` });
  if (nav.length) buttons.push(nav);
  await tg("sendMessage", {
    chat_id: chatId,
    text: `👥 <b>Foydalanuvchilar</b> (jami: ${count ?? 0})\n\n` + lines.join("\n\n"),
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: buttons },
  });
}

async function showAdminUserCard(chatId: number, userId: string) {
  const { data: u } = await supabase.from("bot_users").select("*").eq("id", userId).maybeSingle();
  if (!u) {
    await tg("sendMessage", { chat_id: chatId, text: "Foydalanuvchi topilmadi." });
    return;
  }
  const { count: orders } = await supabase
    .from("orders").select("*", { count: "exact", head: true }).eq("bot_user_id", userId);
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      `👤 <b>${u.full_name || "-"}</b> ${u.username ? "@" + u.username : ""}\n\n` +
      `🆔 <code>${u.telegram_id}</code>\n` +
      `📞 ${u.phone || "-"}\n` +
      `💰 Balans: <b>${fmt(u.balance)} UZS</b>\n` +
      `📦 Buyurtmalar: <b>${orders ?? 0}</b>\n` +
      `🎫 Ref kod: <code>${u.referral_code}</code>\n` +
      `Status: ${u.banned ? "🚫 Bloklangan" : "✅ Faol"}`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: "💵 Balansni o'zgartirish", callback_data: `adm:u_bal:${u.id}` }],
        [{ text: "✉️ Xabar yuborish", callback_data: `adm:u_dm:${u.telegram_id}` }],
        [{ text: u.banned ? "✅ Blokdan chiqarish" : "🚫 Bloklash", callback_data: `adm:u_ban:${u.id}` }],
        [{ text: "⬅️ Foydalanuvchilar", callback_data: "adm:users" }],
      ],
    },
  });
}

async function showAdminPendingOrders(chatId: number) {
  const { data: rows } = await supabase
    .from("orders").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(10);
  if (!rows?.length) {
    await tg("sendMessage", { chat_id: chatId, text: "✅ Pending buyurtma yo'q." });
    return;
  }
  for (const o of rows) {
    const product = o.product_type === "stars" ? `⭐ ${o.stars_amount} Stars` : `👑 Premium ${o.duration_months} oy`;
    const text =
      `№ <code>${o.order_number}</code>\n` +
      `👤 ${o.contact_full_name || "-"} · ${o.contact_phone || "-"}\n` +
      `${product} → ${o.telegram_target || o.contact_telegram || "-"}\n` +
      `💵 ${fmt(o.amount_uzs || 0)} UZS · ${o.payment_method} · ${o.source}`;
    await tg("sendMessage", {
      chat_id: chatId, text, parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Tasdiqlash", callback_data: `adm:o_ok:${o.id}` },
          { text: "❌ Rad etish", callback_data: `adm:o_no:${o.id}` },
        ]],
      },
    });
  }
}

async function showAdminPendingTopups(chatId: number) {
  const { data: rows } = await supabase
    .from("balance_transactions").select("*").eq("type", "topup").eq("status", "pending")
    .order("created_at", { ascending: false }).limit(10);
  if (!rows?.length) {
    await tg("sendMessage", { chat_id: chatId, text: "✅ Pending to'ldirish yo'q." });
    return;
  }
  for (const t of rows) {
    let person: any = null;
    if (t.bot_user_id) {
      const { data } = await supabase.from("bot_users").select("full_name,phone,username,telegram_id").eq("id", t.bot_user_id).maybeSingle();
      person = data;
    } else if (t.user_id) {
      const { data } = await supabase.from("profiles").select("full_name,phone,telegram_username").eq("id", t.user_id).maybeSingle();
      person = data;
    }
    const text =
      `💳 <b>${fmt(t.amount_uzs)} UZS</b>\n` +
      `👤 ${person?.full_name || "-"} · ${person?.phone || "-"}\n` +
      `Telegram: ${person?.telegram_username || (person?.username ? "@" + person.username : "-")}\n` +
      `🌐 ${t.bot_user_id ? "bot" : "website"}`;
    let photoUrl: string | null = null;
    if (t.receipt_url) {
      const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(t.receipt_url, 3600);
      photoUrl = signed?.signedUrl ?? null;
    }
    const reply_markup = {
      inline_keyboard: [[
        { text: "✅ Tasdiqlash", callback_data: `adm:t_ok:${t.id}` },
        { text: "❌ Rad etish", callback_data: `adm:t_no:${t.id}` },
      ]],
    };
    if (photoUrl) {
      const r = await tg("sendPhoto", { chat_id: chatId, photo: photoUrl, caption: text, parse_mode: "HTML", reply_markup });
      if (!r?.ok) await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup });
    } else {
      await tg("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", reply_markup });
    }
  }
}

async function showAdminStats(chatId: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count: orders } = await supabase.from("orders").select("*", { count: "exact", head: true });
  const { count: users } = await supabase.from("bot_users").select("*", { count: "exact", head: true });
  const { data: revToday } = await supabase
    .from("orders").select("amount_uzs").eq("status", "approved").gte("created_at", today.toISOString());
  const sumToday = (revToday ?? []).reduce((a: number, r: any) => a + Number(r.amount_uzs || 0), 0);
  await tg("sendMessage", {
    chat_id: chatId,
    text: `📊 <b>Statistika</b>\n\nFoydalanuvchilar: <b>${users ?? 0}</b>\nJami buyurtmalar: <b>${orders ?? 0}</b>\nBugungi tushum: <b>${fmt(sumToday)} UZS</b>`,
    parse_mode: "HTML",
  });
}

async function adminApproveOrder(chatId: number, orderId: string, approve: boolean) {
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.status !== "pending") {
    await tg("sendMessage", { chat_id: chatId, text: "Buyurtma allaqachon ishlangan yoki topilmadi." });
    return;
  }
  if (approve) {
    await supabase.from("orders").update({ status: "approved", admin_note: "Tasdiqlandi (bot admin)" }).eq("id", orderId);
  } else {
    await supabase.from("orders").update({ status: "rejected", admin_note: "Rad etildi (bot admin)" }).eq("id", orderId);
    if (order.payment_method === "balance") {
      if (order.bot_user_id) {
        const { data: bu } = await supabase.from("bot_users").select("balance").eq("id", order.bot_user_id).single();
        await supabase.from("bot_users").update({ balance: Number(bu?.balance || 0) + Number(order.amount_uzs) }).eq("id", order.bot_user_id);
        await supabase.from("balance_transactions").insert({
          bot_user_id: order.bot_user_id, type: "refund", status: "approved",
          amount_uzs: order.amount_uzs, order_id: order.id, admin_note: "Refund: rejected order",
        });
      } else if (order.user_id) {
        const { data: pr } = await supabase.from("profiles").select("balance").eq("id", order.user_id).single();
        await supabase.from("profiles").update({ balance: Number(pr?.balance || 0) + Number(order.amount_uzs) }).eq("id", order.user_id);
        await supabase.from("balance_transactions").insert({
          user_id: order.user_id, type: "refund", status: "approved",
          amount_uzs: order.amount_uzs, order_id: order.id, admin_note: "Refund: rejected order",
        });
      }
    }
  }
  await tg("sendMessage", {
    chat_id: chatId,
    text: approve ? `✅ Buyurtma <code>${order.order_number}</code> tasdiqlandi.` : `❌ Buyurtma <code>${order.order_number}</code> rad etildi.`,
    parse_mode: "HTML",
  });
  // Notify the user
  if (order.bot_user_id) {
    const { data: bu } = await supabase.from("bot_users").select("telegram_id").eq("id", order.bot_user_id).single();
    if (bu?.telegram_id) {
      await tg("sendMessage", {
        chat_id: bu.telegram_id,
        text: approve
          ? `✅ Buyurtmangiz <code>${order.order_number}</code> tasdiqlandi va tez orada yetkaziladi.`
          : `❌ Buyurtmangiz <code>${order.order_number}</code> rad etildi. Mablag' qaytarildi.`,
        parse_mode: "HTML",
      }).catch(() => {});
    }
  }
}

async function adminApproveTopup(chatId: number, txId: string, approve: boolean) {
  const { data: tx } = await supabase.from("balance_transactions").select("*").eq("id", txId).single();
  if (!tx || tx.status !== "pending") {
    await tg("sendMessage", { chat_id: chatId, text: "To'ldirish allaqachon ishlangan yoki topilmadi." });
    return;
  }
  if (approve) {
    if (tx.bot_user_id) {
      const { data: bu } = await supabase.from("bot_users").select("balance,telegram_id").eq("id", tx.bot_user_id).single();
      await supabase.from("bot_users").update({ balance: Number(bu?.balance || 0) + Number(tx.amount_uzs) }).eq("id", tx.bot_user_id);
      if (bu?.telegram_id) {
        await tg("sendMessage", {
          chat_id: bu.telegram_id,
          text: `✅ Balansingiz <b>${fmt(tx.amount_uzs)} UZS</b> ga to'ldirildi.`,
          parse_mode: "HTML",
        }).catch(() => {});
      }
    } else if (tx.user_id) {
      const { data: pr } = await supabase.from("profiles").select("balance").eq("id", tx.user_id).single();
      await supabase.from("profiles").update({ balance: Number(pr?.balance || 0) + Number(tx.amount_uzs) }).eq("id", tx.user_id);
    }
    await supabase.from("balance_transactions").update({ status: "approved", admin_note: "Tasdiqlandi (bot admin)" }).eq("id", txId);
  } else {
    await supabase.from("balance_transactions").update({ status: "rejected", admin_note: "Rad etildi (bot admin)" }).eq("id", txId);
    if (tx.bot_user_id) {
      const { data: bu } = await supabase.from("bot_users").select("telegram_id").eq("id", tx.bot_user_id).single();
      if (bu?.telegram_id) {
        await tg("sendMessage", {
          chat_id: bu.telegram_id,
          text: `❌ To'ldirish so'rovingiz rad etildi. Adminga yozing.`,
        }).catch(() => {});
      }
    }
  }
  await tg("sendMessage", {
    chat_id: chatId,
    text: approve ? "✅ To'ldirish tasdiqlandi va balansga qo'shildi." : "❌ To'ldirish rad etildi.",
  });
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });
  }

  let update: any;
  try { update = await req.json(); } catch { return new Response("bad", { status: 400 }); }

  try {
    // ==================== CALLBACK QUERIES ====================
    if (update.callback_query) {
      const cb = update.callback_query;
      const chatId = cb.message.chat.id;
      const data: string = cb.data || "";
      const user = await getOrCreateUser(cb.from);
      await tg("answerCallbackQuery", { callback_query_id: cb.id });

      // Admin actions (only for whitelisted telegram_ids)
      if (data.startsWith("adm:")) {
        if (!(await isBotAdmin(user.telegram_id))) {
          await tg("sendMessage", { chat_id: chatId, text: "❌ Sizda admin huquqi yo'q." });
          return new Response("ok");
        }
        if (data === "adm:orders") { await showAdminPendingOrders(chatId); return new Response("ok"); }
        if (data === "adm:topups") { await showAdminPendingTopups(chatId); return new Response("ok"); }
        if (data === "adm:stats") { await showAdminStats(chatId); return new Response("ok"); }
        if (data === "adm:users") { await showAdminUsers(chatId, 0); return new Response("ok"); }
        if (data.startsWith("adm:users_p:")) { await showAdminUsers(chatId, Number(data.slice(12)) || 0); return new Response("ok"); }
        if (data.startsWith("adm:u:")) { await showAdminUserCard(chatId, data.slice(6)); return new Response("ok"); }
        if (data.startsWith("adm:u_ban:")) {
          const uid = data.slice(10);
          const { data: bu } = await supabase.from("bot_users").select("banned").eq("id", uid).single();
          await supabase.from("bot_users").update({ banned: !bu?.banned }).eq("id", uid);
          await tg("sendMessage", { chat_id: chatId, text: bu?.banned ? "✅ Blokdan chiqarildi." : "🚫 Bloklandi." });
          await showAdminUserCard(chatId, uid);
          return new Response("ok");
        }
        if (data.startsWith("adm:u_bal:")) {
          const uid = data.slice(10);
          const { data: bu } = await supabase.from("bot_users").select("telegram_id,balance,full_name").eq("id", uid).single();
          if (!bu) return new Response("ok");
          await setWizard(user.id, { kind: "adm_user_balance", targetUserId: uid, targetTgId: bu.telegram_id });
          await tg("sendMessage", {
            chat_id: chatId,
            text:
              `💵 <b>${bu.full_name || bu.telegram_id}</b>\n` +
              `Joriy balans: <b>${fmt(bu.balance)} UZS</b>\n\n` +
              `Qancha o'zgartirmoqchisiz? Misol:\n` +
              `<code>+50000</code> — qo'shish\n<code>-20000</code> — ayirish`,
            parse_mode: "HTML",
            reply_markup: cancelKeyboard(),
          });
          return new Response("ok");
        }
        if (data.startsWith("adm:u_dm:")) {
          const tgId = Number(data.slice(9));
          await setWizard(user.id, { kind: "adm_dm_text", targetTgId: tgId });
          await tg("sendMessage", {
            chat_id: chatId,
            text: `✉️ <code>${tgId}</code> ga yubormoqchi bo'lgan xabaringizni yozing:`,
            parse_mode: "HTML",
            reply_markup: cancelKeyboard(),
          });
          return new Response("ok");
        }
        if (data === "adm:bcast") {
          await setWizard(user.id, { kind: "adm_broadcast" });
          await tg("sendMessage", {
            chat_id: chatId,
            text: "📢 Barcha foydalanuvchilarga yuboriladigan xabar matnini yozing (HTML qo'llab-quvvatlanadi):",
            reply_markup: cancelKeyboard(),
          });
          return new Response("ok");
        }
        if (data === "adm:dm") {
          await setWizard(user.id, { kind: "adm_dm_pick" });
          await tg("sendMessage", {
            chat_id: chatId,
            text: "✉️ Telegram ID yoki @username ni yuboring:",
            reply_markup: cancelKeyboard(),
          });
          return new Response("ok");
        }
        if (data === "adm:user_search") {
          await setWizard(user.id, { kind: "adm_user_search" });
          await tg("sendMessage", {
            chat_id: chatId,
            text: "🔍 Telegram ID, @username yoki ism yuboring:",
            reply_markup: cancelKeyboard(),
          });
          return new Response("ok");
        }
        if (data.startsWith("adm:o_ok:")) { await adminApproveOrder(chatId, data.slice(9), true); return new Response("ok"); }
        if (data.startsWith("adm:o_no:")) { await adminApproveOrder(chatId, data.slice(9), false); return new Response("ok"); }
        if (data.startsWith("adm:t_ok:")) { await adminApproveTopup(chatId, data.slice(9), true); return new Response("ok"); }
        if (data.startsWith("adm:t_no:")) { await adminApproveTopup(chatId, data.slice(9), false); return new Response("ok"); }
        return new Response("ok");
      }

      // Home/menu navigation
      if (data === "menu:home") {
        await clearWizard(user.id);
        await showHome(chatId, user);
        return new Response("ok");
      }
      if (data === "menu:premium") {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "👑 <b>Premium tarifini tanlang:</b>",
          parse_mode: "HTML",
          reply_markup: await premiumPlansInline(),
        });
        return new Response("ok");
      }
      if (data === "menu:stars") {
        const rate = Number(await getSetting("stars_rate_uzs", 220));
        await tg("sendMessage", {
          chat_id: chatId,
          text: `⭐ <b>Stars paketini tanlang:</b>\n\nJoriy kurs: <b>1 ⭐ = ${fmt(rate)} UZS</b>`,
          parse_mode: "HTML",
          reply_markup: await starsPackagesInline(),
        });
        return new Response("ok");
      }
      if (data === "menu:topup") {
        await setWizard(user.id, { kind: "topup_amount" });
        const min = Number(await getSetting("min_topup_uzs", 10000));
        await tg("sendMessage", {
          chat_id: chatId,
          text: `💳 <b>Balansni to'ldirish</b>\n\nQancha summa to'ldirmoqchisiz? (UZS)\nMinimum: <b>${fmt(min)} UZS</b>`,
          parse_mode: "HTML",
          reply_markup: cancelKeyboard(),
        });
        return new Response("ok");
      }

      // Premium plan selected → ask for target username
      if (data.startsWith("premium:")) {
        const planId = data.split(":")[1];
        const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).single();
        if (!plan) return new Response("ok");
        if (Number(user.balance) < Number(plan.price_uzs)) {
          await tg("sendMessage", {
            chat_id: chatId,
            text: `❌ Balansda yetarli mablag' yo'q.\n\nKerak: <b>${fmt(plan.price_uzs)} UZS</b>\nSizda: <b>${fmt(user.balance)} UZS</b>`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "💳 Balansni to'ldirish", callback_data: "menu:topup" }]] },
          });
          return new Response("ok");
        }
        await setWizard(user.id, { kind: "premium_target", planId });
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `👑 <b>Premium ${plan.duration_months} oy</b> — ${fmt(plan.price_uzs)} UZS\n\n` +
            `Premium qaysi akkauntga kerak? Telegram username yuboring (masalan @username).\n\n` +
            `O'zingizga olishni xohlasangiz @${user.username || "username"} yuboring.`,
          parse_mode: "HTML",
          reply_markup: cancelKeyboard(),
        });
        return new Response("ok");
      }

      // Custom stars amount
      if (data === "stars:custom") {
        const min = Number(await getSetting("min_stars", 50));
        const rate = Number(await getSetting("stars_rate_uzs", 220));
        await setWizard(user.id, { kind: "stars_amount" });
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `⭐ <b>Stars miqdorini kiriting</b>\n\n` +
            `Minimum: <b>${min}</b> ⭐\n` +
            `Kurs: <b>1 ⭐ = ${fmt(rate)} UZS</b>\n` +
            `Sizdagi balans: <b>${fmt(user.balance)} UZS</b>\n\n` +
            `Faqat son yuboring (masalan: 120):`,
          parse_mode: "HTML",
          reply_markup: cancelKeyboard(),
        });
        return new Response("ok");
      }

      // Stars package selected → ask for target
      if (data.startsWith("stars:")) {
        const stars = Number(data.split(":")[1]);
        const rate = Number(await getSetting("stars_rate_uzs", 220));
        const price = stars * rate;
        if (Number(user.balance) < price) {
          await tg("sendMessage", {
            chat_id: chatId,
            text: `❌ Balansda yetarli mablag' yo'q.\n\nKerak: <b>${fmt(price)} UZS</b>\nSizda: <b>${fmt(user.balance)} UZS</b>`,
            parse_mode: "HTML",
            reply_markup: { inline_keyboard: [[{ text: "💳 Balansni to'ldirish", callback_data: "menu:topup" }]] },
          });
          return new Response("ok");
        }
        await setWizard(user.id, { kind: "stars_target", stars });
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `⭐ <b>${stars} Stars</b> — ${fmt(price)} UZS\n\n` +
            `Stars qaysi akkauntga kerak? Telegram username yuboring (@username).`,
          parse_mode: "HTML",
          reply_markup: cancelKeyboard(),
        });
        return new Response("ok");
      }

      if (data === "profile:phone") {
        await setWizard(user.id, { kind: "edit_phone" });
        await tg("sendMessage", {
          chat_id: chatId,
          text: "📱 Yangi telefon raqamingizni yuboring:",
          reply_markup: shareContactKeyboard(),
        });
        return new Response("ok");
      }

      return new Response("ok");
    }

    // ==================== MESSAGES ====================
    const msg = update.message;
    if (!msg) return new Response("ok");
    const chatId = msg.chat.id;
    const from = msg.from;

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
      await clearWizard(user.id);
      const updated = { ...user, phone: msg.contact.phone_number };
      await tg("sendMessage", { chat_id: chatId, text: "✅ Telefon raqami saqlandi!", reply_markup: mainMenu(await isBotAdmin(user.telegram_id)) });
      await showHome(chatId, updated);
      return new Response("ok");
    }

    const text: string = msg.text || "";

    // Cancel always wins
    if (text === "❌ Bekor qilish") {
      await clearWizard(user.id);
      await showHome(chatId, user);
      return new Response("ok");
    }

    if (!user.phone && !text.startsWith("/start")) {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `👋 <b>Assalomu alaykum, ${user.full_name || from.first_name || "do'stim"}!</b>\n\nAvval telefon raqamingizni yuboring 👇`,
        parse_mode: "HTML",
        reply_markup: shareContactKeyboard(),
      });
      return new Response("ok");
    }

    // ============ Wizard steps (multi-step flows) ============
    const step = getWizard(user);

    if (step?.kind === "premium_target" && msg.photo === undefined) {
      const tgname = text.trim();
      if (!USERNAME_RE.test(tgname)) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "❌ Username noto'g'ri formatda. @ bilan boshlanishi va 5–32 belgi bo'lishi kerak.\nQayta yuboring:",
        });
        return new Response("ok");
      }
      const { data: plan } = await supabase.from("plans").select("*").eq("id", step.planId).single();
      if (!plan || Number(user.balance) < Number(plan.price_uzs)) {
        await clearWizard(user.id);
        await tg("sendMessage", { chat_id: chatId, text: "❌ Balans yetarli emas.", reply_markup: mainMenu(await isBotAdmin(user.telegram_id)) });
        return new Response("ok");
      }
      const newBal = Number(user.balance) - Number(plan.price_uzs);
      await supabase.from("bot_users").update({ balance: newBal }).eq("id", user.id);
      const { data: order } = await supabase.from("orders").insert({
        bot_user_id: user.id,
        plan_id: step.planId,
        duration_months: plan.duration_months,
        amount_uzs: plan.price_uzs,
        payment_method: "balance",
        status: "pending",
        source: "bot",
        product_type: "premium",
        contact_full_name: user.full_name,
        contact_phone: user.phone,
        contact_telegram: user.username ? "@" + user.username : null,
        telegram_target: tgname,
      }).select().single();
      await clearWizard(user.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          `✅ <b>Buyurtma qabul qilindi!</b>\n\n` +
          `№ <code>${order!.order_number}</code>\n` +
          `Premium ${plan.duration_months} oy → ${tgname}\n` +
          `Yangi balans: <b>${fmt(newBal)} UZS</b>\n\n` +
          `Admin tasdiqlagach Premium faollashtiriladi.`,
        parse_mode: "HTML",
        reply_markup: mainMenu(await isBotAdmin(user.telegram_id)),
      });
      await notifyAdminNewOrder(order, { ...user, balance: newBal });
      return new Response("ok");
    }

    if (step?.kind === "stars_amount") {
      const stars = Math.floor(Number(text.replace(/\s/g, "").replace(/,/g, ".")));
      const min = Number(await getSetting("min_stars", 50));
      const rate = Number(await getSetting("stars_rate_uzs", 220));
      if (!Number.isFinite(stars) || stars < min) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `❌ Noto'g'ri miqdor. Minimum <b>${min}</b> ⭐. Qayta yuboring:`,
          parse_mode: "HTML",
        });
        return new Response("ok");
      }
      const price = stars * rate;
      if (Number(user.balance) < price) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `❌ Balans yetarli emas.\n\nKerak: <b>${fmt(price)} UZS</b>\nSizda: <b>${fmt(user.balance)} UZS</b>`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [[{ text: "💳 Balansni to'ldirish", callback_data: "menu:topup" }]] },
        });
        return new Response("ok");
      }
      await setWizard(user.id, { kind: "stars_target", stars });
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          `⭐ <b>${stars} Stars</b> — ${fmt(price)} UZS\n\n` +
          `Stars qaysi akkauntga kerak? Telegram username yuboring (@username).`,
        parse_mode: "HTML",
        reply_markup: cancelKeyboard(),
      });
      return new Response("ok");
    }

      const tgname = text.trim();
      if (!USERNAME_RE.test(tgname)) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "❌ Username noto'g'ri formatda. Qayta yuboring (masalan @username):",
        });
        return new Response("ok");
      }
      const rate = Number(await getSetting("stars_rate_uzs", 220));
      const price = step.stars * rate;
      if (Number(user.balance) < price) {
        await clearWizard(user.id);
        await tg("sendMessage", { chat_id: chatId, text: "❌ Balans yetarli emas.", reply_markup: mainMenu(await isBotAdmin(user.telegram_id)) });
        return new Response("ok");
      }
      const newBal = Number(user.balance) - price;
      await supabase.from("bot_users").update({ balance: newBal }).eq("id", user.id);
      const { data: order } = await supabase.from("orders").insert({
        bot_user_id: user.id,
        duration_months: 0,
        amount_uzs: price,
        stars_amount: step.stars,
        payment_method: "balance",
        status: "pending",
        source: "bot",
        product_type: "stars",
        contact_full_name: user.full_name,
        contact_phone: user.phone,
        contact_telegram: user.username ? "@" + user.username : null,
        telegram_target: tgname,
      }).select().single();
      await clearWizard(user.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          `✅ <b>Buyurtma qabul qilindi!</b>\n\n` +
          `№ <code>${order!.order_number}</code>\n` +
          `⭐ ${step.stars} Stars → ${tgname}\n` +
          `Yangi balans: <b>${fmt(newBal)} UZS</b>\n\n` +
          `Admin tasdiqlagach yetkaziladi.`,
        parse_mode: "HTML",
        reply_markup: mainMenu(await isBotAdmin(user.telegram_id)),
      });
      await notifyAdminNewOrder(order, { ...user, balance: newBal });
      return new Response("ok");
    }

    if (step?.kind === "topup_amount") {
      const amount = Number(text.replace(/\s/g, "").replace(/,/g, ""));
      const min = Number(await getSetting("min_topup_uzs", 10000));
      if (!amount || amount < min) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: `❌ Summa noto'g'ri yoki minimumdan kam (${fmt(min)} UZS).\nQayta kiriting:`,
          reply_markup: cancelKeyboard(),
        });
        return new Response("ok");
      }
      await setWizard(user.id, { kind: "topup_receipt", amount });
      const cardNum = await getSetting("card_number", "");
      const cardHolder = await getSetting("card_holder", "");
      const cardBank = await getSetting("card_bank", "");
      await tg("sendMessage", {
        chat_id: chatId,
        text:
          `💳 <b>To'lov ma'lumotlari</b>\n\n` +
          `Karta: <code>${cardNum}</code>\n` +
          `Egasi: <b>${cardHolder}</b>\n` +
          (cardBank ? `Bank: ${cardBank}\n` : "") +
          `\n💵 Summa: <b>${fmt(amount)} UZS</b>\n\n` +
          `To'lovni amalga oshirgach <b>chek rasmini yuboring</b> 📸`,
        parse_mode: "HTML",
        reply_markup: cancelKeyboard(),
      });
      return new Response("ok");
    }

    if (step?.kind === "topup_receipt") {
      if (!msg.photo) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "❌ Iltimos chek <b>rasm</b>ini yuboring (matn emas).",
          parse_mode: "HTML",
          reply_markup: cancelKeyboard(),
        });
        return new Response("ok");
      }
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const fileInfo = await tg("getFile", { file_id: fileId });
      const filePath = fileInfo?.result?.file_path;
      let receiptPath: string | null = null;
      if (filePath) {
        const fileRes = await fetch(`https://api.telegram.org/file/bot${TG_TOKEN}/${filePath}`);
        const bytes = new Uint8Array(await fileRes.arrayBuffer());
        const ext = filePath.split(".").pop() || "jpg";
        receiptPath = `bot-topup-${user.id}-${Date.now()}.${ext}`;
        await supabase.storage.from("receipts").upload(receiptPath, bytes, { contentType: "image/jpeg", upsert: false });
      }
      // Bot top-ups bypass profiles RLS — store as bot transaction (use service role).
      // Store linked to bot_user via admin_note for traceability; balance sits on bot_users.
      const { data: tx } = await supabase.from("balance_transactions").insert({
        user_id: null,
        bot_user_id: user.id,
        type: "topup",
        status: "pending",
        amount_uzs: step.amount,
        receipt_url: receiptPath,
        admin_note: `BOT:${user.telegram_id}:${user.full_name || ""}`,
      }).select().single();
      await clearWizard(user.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Chek qabul qilindi!\n\nSumma: <b>${fmt(step.amount)} UZS</b>\nAdmin tekshirgach balansingizga qo'shiladi.`,
        parse_mode: "HTML",
        reply_markup: mainMenu(await isBotAdmin(user.telegram_id)),
      });
      await notifyAdminTopup(tx, user, fileId);
      return new Response("ok");
    }

    if (step?.kind === "edit_phone") {
      const phone = text.trim();
      if (phone.length < 7) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Telefon raqami noto'g'ri. Qayta yuboring:" });
        return new Response("ok");
      }
      await supabase.from("bot_users").update({ phone }).eq("id", user.id);
      await clearWizard(user.id);
      await tg("sendMessage", { chat_id: chatId, text: "✅ Telefon yangilandi!", reply_markup: mainMenu(await isBotAdmin(user.telegram_id)) });
      return new Response("ok");
    }

    // ============ Admin wizard steps ============
    if (step?.kind === "adm_broadcast") {
      if (!(await isBotAdmin(user.telegram_id))) { await clearWizard(user.id); return new Response("ok"); }
      const message = text.trim();
      if (!message) {
        await tg("sendMessage", { chat_id: chatId, text: "Xabar bo'sh." });
        return new Response("ok");
      }
      await clearWizard(user.id);
      await tg("sendMessage", { chat_id: chatId, text: "📤 Yuborilmoqda..." });
      const { data: targets } = await supabase.from("bot_users").select("telegram_id").eq("banned", false);
      let sent = 0, failed = 0;
      for (const u of targets ?? []) {
        const r = await tg("sendMessage", { chat_id: u.telegram_id, text: message, parse_mode: "HTML" });
        if (r?.ok) sent++; else failed++;
      }
      await supabase.from("broadcasts").insert({ message, sent_count: sent, failed_count: failed, status: "done" });
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Yuborildi: <b>${sent}</b>\n❌ Xato: <b>${failed}</b>`,
        parse_mode: "HTML",
        reply_markup: mainMenu(true),
      });
      return new Response("ok");
    }

    if (step?.kind === "adm_dm_pick") {
      if (!(await isBotAdmin(user.telegram_id))) { await clearWizard(user.id); return new Response("ok"); }
      const q = text.trim().replace(/^@/, "");
      let target: any = null;
      if (/^\d+$/.test(q)) {
        const { data } = await supabase.from("bot_users").select("telegram_id,full_name").eq("telegram_id", Number(q)).maybeSingle();
        target = data;
      } else {
        const { data } = await supabase.from("bot_users").select("telegram_id,full_name").ilike("username", q).maybeSingle();
        target = data;
      }
      if (!target) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Foydalanuvchi topilmadi. Qayta urinib ko'ring:", reply_markup: cancelKeyboard() });
        return new Response("ok");
      }
      await setWizard(user.id, { kind: "adm_dm_text", targetTgId: target.telegram_id });
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✉️ <b>${target.full_name || target.telegram_id}</b> ga yubormoqchi bo'lgan xabaringizni yozing:`,
        parse_mode: "HTML",
        reply_markup: cancelKeyboard(),
      });
      return new Response("ok");
    }

    if (step?.kind === "adm_dm_text") {
      if (!(await isBotAdmin(user.telegram_id))) { await clearWizard(user.id); return new Response("ok"); }
      const r = await tg("sendMessage", { chat_id: step.targetTgId, text: text, parse_mode: "HTML" });
      await clearWizard(user.id);
      await tg("sendMessage", {
        chat_id: chatId,
        text: r?.ok ? "✅ Xabar yuborildi." : `❌ Xato: ${r?.description || "yuborilmadi"}`,
        reply_markup: mainMenu(true),
      });
      return new Response("ok");
    }

    if (step?.kind === "adm_user_search") {
      if (!(await isBotAdmin(user.telegram_id))) { await clearWizard(user.id); return new Response("ok"); }
      const q = text.trim().replace(/^@/, "");
      let target: any = null;
      if (/^\d+$/.test(q)) {
        const { data } = await supabase.from("bot_users").select("id").eq("telegram_id", Number(q)).maybeSingle();
        target = data;
      } else {
        const { data } = await supabase.from("bot_users").select("id").or(`username.ilike.%${q}%,full_name.ilike.%${q}%`).limit(1).maybeSingle();
        target = data;
      }
      await clearWizard(user.id);
      if (!target) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Topilmadi.", reply_markup: mainMenu(true) });
        return new Response("ok");
      }
      await showAdminUserCard(chatId, target.id);
      return new Response("ok");
    }

    if (step?.kind === "adm_user_balance") {
      if (!(await isBotAdmin(user.telegram_id))) { await clearWizard(user.id); return new Response("ok"); }
      const raw = text.trim().replace(/\s/g, "").replace(/,/g, "");
      const delta = Number(raw);
      if (!delta || isNaN(delta)) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Noto'g'ri summa. Misol: +50000 yoki -20000", reply_markup: cancelKeyboard() });
        return new Response("ok");
      }
      const { data: bu } = await supabase.from("bot_users").select("balance").eq("id", step.targetUserId).single();
      const newBal = Number(bu?.balance || 0) + delta;
      if (newBal < 0) {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Balans manfiy bo'la olmaydi.", reply_markup: cancelKeyboard() });
        return new Response("ok");
      }
      await supabase.from("bot_users").update({ balance: newBal }).eq("id", step.targetUserId);
      await supabase.from("balance_transactions").insert({
        bot_user_id: step.targetUserId,
        type: "adjustment",
        status: "approved",
        amount_uzs: delta,
        admin_note: `Bot admin: ${user.telegram_id}`,
      });
      await clearWizard(user.id);
      // Notify the user
      await tg("sendMessage", {
        chat_id: step.targetTgId,
        text: delta > 0
          ? `✅ Balansingizga <b>+${fmt(delta)} UZS</b> qo'shildi.\nYangi balans: <b>${fmt(newBal)} UZS</b>`
          : `ℹ️ Balansingizdan <b>${fmt(delta)} UZS</b> ayrildi.\nYangi balans: <b>${fmt(newBal)} UZS</b>`,
        parse_mode: "HTML",
      }).catch(() => {});
      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Balans yangilandi: <b>${fmt(newBal)} UZS</b>`,
        parse_mode: "HTML",
        reply_markup: mainMenu(true),
      });
      await showAdminUserCard(chatId, step.targetUserId);
      return new Response("ok");
    }

    if (text.startsWith("/start")) {
      if (!user.phone) {
        await tg("sendMessage", {
          chat_id: chatId,
          text:
            `👋 <b>Assalomu alaykum, ${user.full_name || from.first_name || "do'stim"}!</b>\n\nTelegram Premium va Stars do'koniga xush kelibsiz.\n\n` +
            "Boshlash uchun telefon raqamingizni yuboring 👇",
          parse_mode: "HTML",
          reply_markup: shareContactKeyboard(),
        });
      } else {
        await showHome(chatId, user);
      }
      return new Response("ok");
    }

    if (text === "👑 Premium" || text === "/premium") {
      if (!user.phone) {
        await tg("sendMessage", { chat_id: chatId, text: "Avval telefon raqamingizni ulashing.", reply_markup: shareContactKeyboard() });
        return new Response("ok");
      }
      await tg("sendMessage", {
        chat_id: chatId,
        text: "👑 <b>Premium tarifini tanlang:</b>",
        parse_mode: "HTML",
        reply_markup: await premiumPlansInline(),
      });
    } else if (text === "⭐ Stars" || text === "/stars") {
      if (!user.phone) {
        await tg("sendMessage", { chat_id: chatId, text: "Avval telefon raqamingizni ulashing.", reply_markup: shareContactKeyboard() });
        return new Response("ok");
      }
      const rate = Number(await getSetting("stars_rate_uzs", 220));
      await tg("sendMessage", {
        chat_id: chatId,
        text: `⭐ <b>Stars paketini tanlang:</b>\n\nJoriy kurs: <b>1 ⭐ = ${fmt(rate)} UZS</b>`,
        parse_mode: "HTML",
        reply_markup: await starsPackagesInline(),
      });
    } else if (text === "💰 Balans" || text === "/balance") {
      await tg("sendMessage", {
        chat_id: chatId,
        text: `💰 Balansingiz: <b>${fmt(user.balance)} UZS</b>`,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "💳 To'ldirish", callback_data: "menu:topup" }]] },
      });
    } else if (text === "💳 Balansni to'ldirish" || text === "/topup") {
      if (!user.phone) {
        await tg("sendMessage", { chat_id: chatId, text: "Avval telefon raqamingizni ulashing.", reply_markup: shareContactKeyboard() });
        return new Response("ok");
      }
      await setWizard(user.id, { kind: "topup_amount" });
      const min = Number(await getSetting("min_topup_uzs", 10000));
      await tg("sendMessage", {
        chat_id: chatId,
        text: `💳 <b>Balansni to'ldirish</b>\n\nQancha summa to'ldirmoqchisiz? (UZS)\nMinimum: <b>${fmt(min)} UZS</b>`,
        parse_mode: "HTML",
        reply_markup: cancelKeyboard(),
      });
    } else if (text === "👤 Profil" || text === "/profile") {
      await showProfile(chatId, user);
    } else if (text === "📋 Buyurtmalarim" || text === "/orders") {
      await showOrders(chatId, user);
    } else if (text === "👥 Referal" || text === "/ref") {
      await showReferral(chatId, user);
    } else if (text === "ℹ️ Yordam" || text === "/help") {
      await showHelp(chatId);
    } else if (text === "🛠 Admin panel" || text === "/admin") {
      if (await isBotAdmin(user.telegram_id)) {
        await showAdminPanel(chatId);
      } else {
        await tg("sendMessage", { chat_id: chatId, text: "❌ Sizda admin huquqi yo'q." });
      }
    } else {
      await tg("sendMessage", {
        chat_id: chatId,
        text: "Iltimos quyidagi menyudan tanlang yoki /start bosing.",
        reply_markup: mainMenu(await isBotAdmin(user.telegram_id)),
      });
    }

    return new Response("ok");
  } catch (e) {
    console.error("Bot error:", e);
    return new Response("ok");
  }
});
