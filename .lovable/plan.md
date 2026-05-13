## Reja: 15 ta funksiyani qo'shish

Qulaylik uchun **3 ta bosqich**ga ajratdim. Har bir bosqich tugagach, men keyingisiga o'tishim mumkin (yoki siz tartibni o'zgartira olasiz).

---

### 🟢 1-BOSQICH — Foydalanuvchi UX (eng tezkor ta'sir)

**1. Buyurtmani bekor qilish**
- DB: yangi RPC `cancel_pending_order(p_order_id)` — agar `balance` to'lov bo'lsa, summa balansga qaytariladi va `balance_transactions` ga refund yoziladi.
- UI: `Profile.tsx` da har bir `pending` buyurtma yonida "Bekor qilish" tugmasi (tasdiq dialogi bilan).

**2. Tarix filtri va qidiruv**
- `Profile.tsx`: Buyurtmalar va Tranzaksiyalar bo'limlariga sana oralig'i, status (Select), tovar turi va order_number bo'yicha qidiruv qo'shiladi.
- Mijoz tomonida filtrlash (yengil — to'liq qayta yuklash kerak emas).

**3. Sevimli paketlar / Tezkor qayta sotib olish**
- `Profile.tsx` da har bir tugatilgan buyurtma yonida "Avvalgidek sotib olish" tugmasi — to'g'ridan-to'g'ri `BuyPremium` yoki `Stars` ga query bilan o'tadi (plan_id yoki stars_amount oldindan tanlangan).
- Qo'shimcha jadval kerak emas (orders tarixidan foydalanamiz).

**4. Dark/Light mode toggle**
- `next-themes` paketi qo'shiladi.
- `index.css` da light variant tokenlari sozlanadi.
- `SiteHeader.tsx` ga oy/quyosh ikonkali toggle qo'shiladi.

---

### 🟡 2-BOSQICH — SEO va Marketing

**5. Sitemap.xml + structured data**
- `scripts/generate-sitemap.ts` yaratiladi (statik + blog postlar).
- `package.json` ga `predev`/`prebuild` qo'shiladi.
- `index.html` ga `Organization` + `WebSite` JSON-LD qo'shiladi.

**6. Open Graph rasmlar har sahifa uchun**
- `react-helmet-async` paketi.
- Asosiy sahifalar (Index, Pricing, Stars, BuyPremium, Faq, Terms, Privacy, Track, Blog post) uchun har birida o'z `<title>`, `description`, `og:*`, `canonical` va JSON-LD.

**7. Blog / Yangiliklar bo'limi**
- DB: `blog_posts` jadvali (slug, title, excerpt, content_md, cover_url, published, published_at).
- Public sahifalar: `/blog`, `/blog/:slug` — markdown render bilan.
- Admin: `AdminBlog.tsx` — CRUD (yaratish, tahrirlash, nashr qilish).
- Sitemap dynamic generatorga ulanadi.

**8. Sharhlar / Reviews tizimi**
- DB: `reviews` jadvali (user_id, rating, body, approved boolean).
- UI: Index sahifada Hero ostida 4-6 ta sharh karuseli.
- Profile da "Sharh qoldirish" formasi.
- Admin: `AdminReviews.tsx` — moderatsiya (approve/delete).

---

### 🔵 3-BOSQICH — Admin Power Tools

**9. Eksport CSV (orders / users / revenue)**
- `AdminOrders`, `AdminUsers`, `AdminDashboard` ga "CSV eksport" tugmasi.
- Frontend tomonda jadvaldan CSV yasaydi (qo'shimcha edge funksiya kerak emas).

**10. Avtomatik kunlik/haftalik hisobot**
- Yangi edge function: `daily-report` — `admin_analytics()` chaqiradi, Telegram adminlarga formatlangan xabar yuboradi.
- `pg_cron` orqali har kuni 21:00 da ishga tushadi.

**11. Foydalanuvchi segmentatsiyasi (broadcast)**
- `AdminBroadcast.tsx` ga filterlar: "Hammaga", "30 kunda xarid qilmaganlar", "Faqat premium xaridorlar", "Faqat stars xaridorlar".
- Yangi RPC `admin_segment_bot_users(p_filter)` segment bo'yicha ID list qaytaradi.
- `broadcast` edge function shu ID listga yuboradi.

**12. Blacklist / Foydalanuvchi blokirovkasi**
- `profiles` ga `banned boolean default false` qo'shiladi (`bot_users.banned` allaqachon bor).
- Auth edge guard — banned bo'lsa kirgizmaslik (RLS policy + login redirect).
- `AdminUsers.tsx` da "Ban / Unban" tugmasi.

---

### ⚠️ Muhim eslatmalar / o'tkazib yuborilganlar

- **Sessiyalar boshqaruvi (Faol qurilmalar)** — Supabase Auth client SDK aktiv sessiyalar ro'yxatini hech bir foydalanuvchiga ko'rsatmaydi (faqat o'zining current sessionini biladi). Faqat "Hamma qurilmalardan chiqish" (`signOut({ scope: 'global' })`) tugmasi qo'shsam bo'ladi. To'liq qurilmalar ro'yxati uchun maxsus device-tracking jadvali yozish kerak — bu alohida katta vazifa. **Tavsiya:** hozircha "Hamma joydan chiqish" tugmasini qo'shaman, to'liq sessiyalar ro'yxati keyinroq.
- **Rate limiting** — Lovable backend hozirda rate limiting uchun yaxshi primitivlar bermaydi. Bu jiddiy infrastruktura ishi va alohida hal qilinadi (CDN/WAF darajasida). **O'tkazib yuborildi.**
- **A/B narx testi** — bu juda murakkab (variant ajratish, conversion tracking, statistika), va noto'g'ri ishlatilsa daromadga zarar yetkazadi. Buni alohida muhokama qilib, ehtiyotkorlik bilan bosqichma-bosqich qilish kerak. **Hozircha o'tkazib yuborildi**, kelajakda alohida loyiha.

---

### Texnik tafsilotlar

**Yangi jadvallar:** `blog_posts`, `reviews`, `favorites` (ixtiyoriy)
**Yangi RPClar:** `cancel_pending_order`, `admin_segment_bot_users`, `admin_export_*`
**Yangi edge functions:** `daily-report`
**Yangi paketlar:** `next-themes`, `react-helmet-async`, `react-markdown` (blog uchun)
**Cron:** `pg_cron` + `pg_net` extensionlari yoqiladi.
**Yangi sahifalar:** `/blog`, `/blog/:slug`, `/admin/blog`, `/admin/reviews`

---

### Sizdan kerakli javob

1. **Tartib OK mi?** (1 → 2 → 3 bosqich)
2. **Sessiyalar va A/B testlar bo'yicha mening qarorim** (skip qilish) ma'qulmi?
3. Birinchi bosqichdan boshlaymanmi, yoki boshqa tartibda xohlaysizmi?