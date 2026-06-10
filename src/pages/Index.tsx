import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, ShieldCheck, Zap, Star, Crown, Users, ShoppingBag,
  Clock, LifeBuoy, CheckCircle2, Sparkles, MessageCircle, TrendingUp, Gift, ExternalLink,
} from "lucide-react";

interface NftGift { id: string; title: string; image_url: string | null; price: number | null; price_ton: number | null; telegram_link: string | null; badge: string | null; }

interface Plan { id: string; duration_months: number; price_uzs: number; }

const STAR_PACKS = [50, 100, 250, 500, 1000];

const Index = () => {
  const { t } = useI18n();
  const [rate, setRate] = useState(220);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [gifts, setGifts] = useState<NftGift[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("settings").select("key,value").eq("key", "stars_rate_uzs").maybeSingle(),
      supabase.from("plans").select("id,duration_months,price_uzs").eq("active", true).order("duration_months"),
      supabase.from("orders").select("order_number,product_type,duration_months,stars_amount,amount_uzs,status,created_at")
        .eq("status", "approved").order("created_at", { ascending: false }).limit(5),
      supabase.from("nft_gifts").select("id,title,image_url,price,price_ton,telegram_link,badge")
        .eq("is_active", true).order("sort_order").limit(4),
    ]).then(([s, p, o, g]) => {
      if (s.data?.value) setRate(Number(s.data.value));
      setPlans((p.data as Plan[]) ?? []);
      setRecent(o.data ?? []);
      setGifts((g.data as NftGift[]) ?? []);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="Premium Usz Store — Telegram Stars va Premium"
        description="O'zbekistondagi eng tezkor Telegram Stars va Premium marketplace. Karta orqali xarid qiling — 5 daqiqada faollashadi."
        path="/"
      />
      <SiteHeader />
      <main className="flex-1">
        {/* HERO */}
        <section className="container pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Premium Usz Store — 24/7 onlayn
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
                Telegram <span className="text-primary">Stars</span> va Premium —<br className="hidden md:block" />
                <span className="text-gradient">daqiqalarda</span> kelib tushadi
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
                O'zbekistondagi eng ishonchli rasmiy marketplace. Karta orqali to'lang —
                Telegram Stars yoki Premium akkauntingizga 5 daqiqada faollashadi.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90">
                  <Link to="/stars"><Star className="h-4 w-4 fill-current" /> Stars sotib olish</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-border px-6 text-base font-semibold hover:border-primary hover:text-primary">
                  <Link to="/pricing"><Crown className="h-4 w-4" /> Premium tariflar</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Rasmiy Fragment API</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Karta to'lovi xavfsiz</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> 24/7 yordam</span>
              </div>
            </div>

            {/* Showcase card */}
            <div className="relative">
              <div className="absolute -inset-6 -z-10 bg-gradient-hero blur-2xl" />
              <div className="surface-lg overflow-hidden p-6 md:p-7">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Crown className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Premium Usz</div>
                      <div className="font-display text-sm font-bold">Premium Showcase</div>
                    </div>
                  </div>
                  <span className="pill pill-completed">LIVE</span>
                </div>

                {/* Animated stars */}
                <div className="mt-5 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
                  <div className="flex items-center justify-center gap-1">
                    {[...Array(7)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-7 w-7 fill-warning text-warning"
                        style={{ animation: `float 3s ease-in-out ${i * 0.15}s infinite` }}
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-center">
                    <div className="font-display text-3xl font-bold tracking-tight">
                      1 ⭐ = <span className="text-primary">{rate}</span> <span className="text-base text-muted-foreground">UZS</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Joriy bozor kursida</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {STAR_PACKS.slice(0, 3).map((s) => (
                    <Link key={s} to="/stars" className="rounded-lg border border-border bg-secondary/40 p-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <div className="font-display text-lg font-bold">{s}</div>
                      <div className="text-[10px] text-muted-foreground">{(s * rate).toLocaleString("ru-RU")} UZS</div>
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/60 p-3 text-xs">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Rasmiy yetkazib berish</span>
                  <span className="font-semibold text-primary">5 daqiqa</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="container">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Users, label: "Foydalanuvchilar", value: "12,000+", color: "text-primary" },
              { icon: ShoppingBag, label: "Muvaffaqiyatli buyurtmalar", value: "50,000+", color: "text-success" },
              { icon: Zap, label: "O'rtacha yetkazib berish", value: "5 daqiqa", color: "text-warning" },
              { icon: LifeBuoy, label: "Yordam", value: "24/7", color: "text-primary" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <span className="stat-label">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className="stat-value">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* POPULAR — STARS */}
        <section className="container mt-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Mashhur Stars paketlari</h2>
              <p className="mt-1 text-sm text-muted-foreground">Tezkor xarid uchun tayyor miqdorlar</p>
            </div>
            <Link to="/stars" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">Hammasini ko'rish →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STAR_PACKS.map((s) => (
              <Link
                key={s}
                to="/stars"
                className="surface surface-hover group p-5 text-center"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-warning/10">
                  <Star className="h-6 w-6 fill-warning text-warning" />
                </div>
                <div className="mt-3 font-display text-2xl font-bold">{s}</div>
                <div className="text-xs text-muted-foreground">Stars</div>
                <div className="mt-3 border-t border-border pt-3 text-sm font-semibold text-primary">
                  {(s * rate).toLocaleString("ru-RU")} UZS
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* POPULAR — PREMIUM */}
        <section className="container mt-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">Telegram Premium tariflar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sevimli funksiyalar bilan obuna</p>
            </div>
            <Link to="/pricing" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">Barchasi →</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const popular = p.duration_months === 6;
              return (
                <div key={p.id} className={`relative surface surface-hover p-6 ${popular ? "ring-2 ring-primary" : ""}`}>
                  {popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      Tavsiya etiladi
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-lg font-bold">Premium {p.duration_months} oy</h3>
                  </div>
                  <div className="mt-4 font-display text-3xl font-bold tracking-tight">
                    {Number(p.price_uzs).toLocaleString("ru-RU")}
                    <span className="ml-1 text-base font-normal text-muted-foreground">UZS</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Premium badge</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> 4 GB fayl yuklash</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Voice-to-text</li>
                  </ul>
                  <Button asChild className={`mt-6 w-full ${popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`} variant={popular ? "default" : "outline"}>
                    <Link to={`/buy/premium?plan=${p.id}`}>Sotib olish <ArrowRight className="h-4 w-4" /></Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        {/* NFT GIFT */}
        <section className="container mt-16">
          <div className="flex items-end justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Gift className="h-3.5 w-3.5" /> NFT Collection
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">NFT Gift marketplace</h2>
              <p className="mt-1 text-sm text-muted-foreground">Telegram NFT sovg'alarining noyob to'plami</p>
            </div>
            <Link to="/gifts" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">Barchasi →</Link>
          </div>
          {gifts.length === 0 ? (
            <div className="mt-6 surface p-10 text-center">
              <Gift className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Tez orada NFT sovg'alar qo'shiladi</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {gifts.map((g) => (
                <div key={g.id} className="surface surface-hover group overflow-hidden p-4">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary/40">
                    {g.image_url ? (
                      <img src={g.image_url} alt={g.title} loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="grid h-full w-full place-items-center"><Gift className="h-12 w-12 text-muted-foreground" /></div>
                    )}
                    {g.badge && (
                      <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
                        {g.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 line-clamp-1 font-display text-base font-bold">{g.title}</h3>
                  <div className="mt-2 flex items-end justify-between">
                    <div>
                      {g.price_ton != null && <div className="text-[11px] text-muted-foreground">{g.price_ton} TON</div>}
                      {g.price != null && (
                        <div className="font-display text-sm font-bold text-primary">
                          {Number(g.price).toLocaleString("ru-RU")} <span className="text-[10px] text-muted-foreground">UZS</span>
                        </div>
                      )}
                    </div>
                    {g.telegram_link && (
                      <Button asChild size="sm" variant="outline" className="h-7 rounded-full px-2 text-xs">
                        <a href={g.telegram_link} target="_blank" rel="noreferrer">Xarid <ExternalLink className="ml-1 h-3 w-3" /></a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* WHY US */}
        <section className="container mt-16">
          <div className="surface-lg p-8 md:p-10">
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-2xl font-bold md:text-3xl">Nega Premium Usz Store?</h2>
                <p className="mt-3 text-muted-foreground">
                  Biz Telegram'ning rasmiy Fragment API'si bilan to'g'ridan-to'g'ri ishlaymiz —
                  arzon narx, tez yetkazib berish va 24/7 yordam.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Zap, title: "Tezkor yetkazib berish", desc: "O'rtacha 5 daqiqada faollashadi" },
                  { icon: ShieldCheck, title: "Xavfsiz to'lov", desc: "Bank kartasi orqali, SSL himoyalangan" },
                  { icon: TrendingUp, title: "Eng yaxshi kurs", desc: "Bozordagi eng arzon narxlar" },
                  { icon: LifeBuoy, title: "24/7 yordam", desc: "Istalgan vaqtda javob beramiz" },
                ].map((f) => (
                  <div key={f.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{f.title}</div>
                      <div className="text-xs text-muted-foreground">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* RECENT ORDERS */}
        <section className="container mt-16">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl font-bold md:text-3xl">So'nggi muvaffaqiyatli buyurtmalar</h2>
          </div>
          <div className="mt-6 surface overflow-hidden">
            <div className="table-scroll">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">Buyurtma</th>
                    <th className="p-4 font-medium">Mahsulot</th>
                    <th className="p-4 font-medium">Summa</th>
                    <th className="p-4 font-medium">Vaqt</th>
                    <th className="p-4 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Hozircha buyurtmalar yo'q</td></tr>
                  ) : recent.map((o) => (
                    <tr key={o.order_number} className="border-t border-border">
                      <td className="p-4 font-mono text-xs">{o.order_number}</td>
                      <td className="p-4">
                        {o.product_type === "premium" ? (
                          <span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-primary" /> Premium {o.duration_months} oy</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> {o.stars_amount} Stars</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{Number(o.amount_uzs).toLocaleString("ru-RU")} UZS</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(o.created_at).toLocaleString("ru-RU")}
                      </td>
                      <td className="p-4"><span className="pill pill-completed"><CheckCircle2 className="h-3 w-3" /> Yakunlandi</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SUPPORT */}
        <section className="container mt-16">
          <div className="surface-lg overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground md:p-12">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                  <MessageCircle className="h-3.5 w-3.5" /> 24/7 yordam markazi
                </div>
                <h2 className="mt-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
                  Savolingiz bormi? Biz yordam beramiz
                </h2>
                <p className="mt-2 max-w-xl text-sm opacity-90">
                  Telegram bot yoki saytdagi chat orqali istalgan vaqtda murojaat qiling.
                  O'rtacha javob vaqti — 2 daqiqa.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link to="/faq">Yordam markazi</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10">
                  <a href="https://t.me/" target="_blank" rel="noreferrer">Telegram bot</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
