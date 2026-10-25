import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { starsPurchaseUrl } from "@/lib/purchase-selection";
import { parseStoreStats } from "@/lib/store-stats";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, ShieldCheck, Zap, Star, Crown, Users, ShoppingBag,
  Clock, LifeBuoy, CheckCircle2, Sparkles, MessageCircle, TrendingUp, Gift, ExternalLink,
} from "lucide-react";

interface NftGift { id: string; title: string; image_url: string | null; price: number | null; price_ton: number | null; telegram_link: string | null; badge: string | null; }

interface Plan { id: string; duration_months: number; price_uzs: number; }

const STAR_PACKS = [50, 100, 250, 500, 1000];

const Index = () => {
  const { t, locale } = useI18n();
  const { data: stats, isPending: statsLoading, isError: statsError, refetch: refreshStats } = useQuery({
    queryKey: ["public-store-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("public_store_stats");
      if (error) throw error;
      return parseStoreStats(data);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
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
        title={`Premium Usz Store — ${t("stars.title")} & Premium`}
        description={t("home.subtitle")}
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
                {t("home.badge")}
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
                {t("home.title")}
              </h1>
              <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
                {t("home.subtitle")}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90">
                  <Link to="/stars"><Star className="h-4 w-4 fill-current" /> {t("hero.starsCta")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-border px-6 text-base font-semibold hover:border-primary hover:text-primary">
                  <Link to="/pricing"><Crown className="h-4 w-4" /> {t("pricing.title")}</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t("home.fragment")}</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t("home.secure")}</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> {t("home.support24")}</span>
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
                      <div className="font-display text-sm font-bold">{t("home.showcase")}</div>
                    </div>
                  </div>
                  <span className="pill pill-completed">{t("home.live")}</span>
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
                    <div className="text-xs text-muted-foreground">{t("home.marketRate")}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {STAR_PACKS.slice(0, 3).map((s) => (
                    <Link key={s} to={starsPurchaseUrl(s)} className="rounded-lg border border-border bg-secondary/40 p-3 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
                      <div className="font-display text-lg font-bold">{s}</div>
                      <div className="text-[10px] text-muted-foreground">{(s * rate).toLocaleString(locale)} UZS</div>
                    </Link>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/60 p-3 text-xs">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /> {t("home.delivery")}</span>
                  <span className="font-semibold text-primary">{t("home.fiveMinutes")}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="container">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { icon: Users, label: t("home.stats.users"), value: stats?.registered_users, color: "text-primary" },
              { icon: ShoppingBag, label: t("home.stats.orders"), value: stats?.approved_orders, color: "text-success" },
              { icon: Star, label: t("home.stats.packages"), value: stats?.stars_packages, color: "text-warning" },
              { icon: Crown, label: t("home.stats.plans"), value: stats?.premium_plans, color: "text-primary" },
            ].map((s) => (
              <div key={s.label} className="stat-card">
                <div className="flex items-center justify-between">
                  <span className="stat-label">{s.label}</span>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div className={`stat-value min-h-8 ${statsLoading ? "animate-pulse" : ""}`}>{s.value == null ? "—" : s.value.toLocaleString(locale)}</div>
              </div>
            ))}
          </div>
        </section>

        {statsError && <div role="status" className="container mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          {t("home.stats.unavailable")} <Button variant="ghost" size="sm" onClick={() => refreshStats()}>{t("common.retry")}</Button>
        </div>}

        {/* POPULAR — STARS */}
        <section className="container mt-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">{t("home.stars.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("home.stars.subtitle")}</p>
            </div>
            <Link to="/stars" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">{t("home.viewAll")} →</Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STAR_PACKS.map((s) => (
              <Link
                key={s}
                to={starsPurchaseUrl(s)}
                className="surface surface-hover group p-5 text-center"
              >
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-warning/10">
                  <Star className="h-6 w-6 fill-warning text-warning" />
                </div>
                <div className="mt-3 font-display text-2xl font-bold">{s}</div>
                <div className="text-xs text-muted-foreground">Stars</div>
                <div className="mt-3 border-t border-border pt-3 text-sm font-semibold text-primary">
                  {(s * rate).toLocaleString(locale)} UZS
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* POPULAR — PREMIUM */}
        <section className="container mt-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold md:text-3xl">{t("home.premium.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("home.premium.subtitle")}</p>
            </div>
            <Link to="/pricing" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">{t("home.viewAll")} →</Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const popular = p.duration_months === 6;
              return (
                <div key={p.id} className={`relative surface surface-hover p-6 ${popular ? "ring-2 ring-primary" : ""}`}>
                  {popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      {t("pricing.recommended")}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-lg font-bold">Premium {p.duration_months} {t("pricing.months")}</h3>
                  </div>
                  <div className="mt-4 font-display text-3xl font-bold tracking-tight">
                    {Number(p.price_uzs).toLocaleString(locale)}
                    <span className="ml-1 text-base font-normal text-muted-foreground">UZS</span>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t("pricing.badge")}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t("pricing.upload")}</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> {t("pricing.voice")}</li>
                  </ul>
                  <Button asChild className={`mt-6 w-full ${popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`} variant={popular ? "default" : "outline"}>
                    <Link to={`/buy/premium?plan=${p.id}`}>{t("stars.buy")} <ArrowRight className="h-4 w-4" /></Link>
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
                <Gift className="h-3.5 w-3.5" /> {t("gifts.collection")}
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">{t("gifts.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("home.gifts.subtitle")}</p>
            </div>
            <Link to="/gifts" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex">{t("home.viewAll")} →</Link>
          </div>
          {gifts.length === 0 ? (
            <div className="mt-6 surface p-10 text-center">
              <Gift className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">{t("home.gifts.empty")}</p>
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
                          {Number(g.price).toLocaleString(locale)} <span className="text-[10px] text-muted-foreground">UZS</span>
                        </div>
                      )}
                    </div>
                    {g.telegram_link && (
                      <Button asChild size="sm" variant="outline" className="h-7 rounded-full px-2 text-xs">
                        <a href={g.telegram_link} target="_blank" rel="noreferrer">{t("stars.buy")} <ExternalLink className="ml-1 h-3 w-3" /></a>
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
                <h2 className="font-display text-2xl font-bold md:text-3xl">{t("home.why.title")}</h2>
                <p className="mt-3 text-muted-foreground">
                  {t("home.why.description")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Zap, title: t("home.why.fast"), desc: t("home.why.fastDesc") },
                  { icon: ShieldCheck, title: t("home.why.safe"), desc: t("home.why.safeDesc") },
                  { icon: TrendingUp, title: t("home.why.rate"), desc: t("home.why.rateDesc") },
                  { icon: LifeBuoy, title: t("home.support24"), desc: t("home.why.supportDesc") },
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
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t("home.orders.title")}</h2>
          </div>
          <div className="mt-6 surface overflow-hidden">
            <div className="table-scroll">
              <table className="w-full">
                <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">{t("common.order")}</th>
                    <th className="p-4 font-medium">{t("common.product")}</th>
                    <th className="p-4 font-medium">{t("common.amount")}</th>
                    <th className="p-4 font-medium">{t("common.time")}</th>
                    <th className="p-4 font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t("home.orders.empty")}</td></tr>
                  ) : recent.map((o) => (
                    <tr key={o.order_number} className="border-t border-border">
                      <td className="p-4 font-mono text-xs">{o.order_number}</td>
                      <td className="p-4">
                        {o.product_type === "premium" ? (
                          <span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-primary" /> Premium {o.duration_months} {t("pricing.months")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> {o.stars_amount} Stars</span>
                        )}
                      </td>
                      <td className="p-4 font-semibold">{Number(o.amount_uzs).toLocaleString(locale)} UZS</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(o.created_at).toLocaleString(locale)}
                      </td>
                      <td className="p-4"><span className="pill pill-completed"><CheckCircle2 className="h-3 w-3" /> {t("status.completed")}</span></td>
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
                  <MessageCircle className="h-3.5 w-3.5" /> {t("home.support24")}
                </div>
                <h2 className="mt-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
                  {t("home.support.title")}
                </h2>
                <p className="mt-2 max-w-xl text-sm opacity-90">
                  {t("home.support.description")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
                  <Link to="/faq">{t("faq.center")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10">
                  <a href="https://t.me/" target="_blank" rel="noreferrer">{t("faq.bot")}</a>
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
