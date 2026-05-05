import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, TrendingUp, Sparkles, Wallet, CheckCircle2 } from "lucide-react";
import { PromoInput } from "@/components/PromoInput";

interface Pkg { id: string; stars: number; }

const QUICK = [100, 250, 500, 1000, 2500, 5000];

const Stars = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [rate, setRate] = useState(220);
  const [minStars, setMinStars] = useState(50);
  const [custom, setCustom] = useState<number>(100);
  const [tg, setTg] = useState("");
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ num: string } | null>(null);
  const [promo, setPromo] = useState<{ code: string; discount: number; final: number } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("stars_packages").select("id,stars").eq("active", true).order("stars"),
      supabase.from("settings").select("key,value").in("key", ["stars_rate_uzs", "min_stars"]),
    ]).then(([{ data: pks }, { data: s }]) => {
      setPackages((pks as Pkg[]) ?? []);
      const map = Object.fromEntries((s ?? []).map((r: any) => [r.key, r.value]));
      if (map.stars_rate_uzs) setRate(Number(map.stars_rate_uzs));
      if (map.min_stars) {
        const m = Number(map.min_stars);
        setMinStars(m);
        setCustom((c) => Math.max(c, m));
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("balance,telegram_username")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setBalance(Number(data?.balance ?? 0));
        if (data?.telegram_username) setTg(data.telegram_username);
      });
  }, [user]);

  const customPrice = useMemo(() => Math.max(0, Math.floor(custom)) * rate, [custom, rate]);
  const finalPrice = promo ? promo.final : customPrice;
  const valid = custom >= minStars;
  const insufficient = user ? balance < finalPrice : false;

  const submit = async () => {
    if (!user) { navigate("/auth?next=/stars"); return; }
    if (!valid) return toast.error(`${t("stars.min")}: ${minStars}`);
    const tgTrim = tg.trim();
    if (!tgTrim) return toast.error(t("buy.target") + " — " + t("common.required"));
    if (!/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tgTrim)) return toast.error(t("buy.targetInvalid"));
    if (insufficient) return toast.error(t("buy.insufficient"));
    setBusy(true);
    const { data, error } = await supabase.rpc("purchase_stars_with_promo", {
      p_stars: Math.floor(custom), p_telegram: tgTrim, p_promo_code: promo?.code ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const num = (data as any[])?.[0]?.order_number;
    const id = (data as any[])?.[0]?.order_id;
    if (id) supabase.functions.invoke("notify-admin", { body: { order_id: id } }).catch(() => undefined);
    setDone({ num });
    toast.success(t("buy.success"));
  };

  if (done) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20">
          <div className="mx-auto max-w-md rounded-3xl glass p-8 text-center animate-fade-up">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/20">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("buy.success")}</h1>
            <div className="mt-3 font-mono text-xl text-primary">{done.num}</div>
            <Button className="mt-6" onClick={() => navigate("/profile")}>{t("nav.profile")}</Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container py-16">
        <div className="text-center mx-auto max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning">
            <Star className="h-3.5 w-3.5 fill-warning" /> Telegram Stars
          </div>
          <h1 className="mt-4 font-display text-5xl font-bold">{t("stars.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("stars.subtitle")}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary/60 px-4 py-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("stars.rate")}: <span className="font-semibold">1 ⭐ = {rate} UZS</span>
          </div>
        </div>

        {/* Main purchase card */}
        <div className="mt-10 mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-warning/10 p-7 shadow-glow">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-warning/20 blur-3xl" />
            <div className="relative space-y-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  {t("stars.customAmount") || "Istalgan miqdor"}
                </span>
              </div>

              {user && (
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-4">
                  <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> {t("buy.balance")}</div>
                  <div className="font-display text-xl font-bold text-gradient">{balance.toLocaleString("ru-RU")} UZS</div>
                </div>
              )}

              <div>
                <Label>{t("buy.amountStars")} *</Label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-2 backdrop-blur">
                  <Star className="ml-2 h-5 w-5 fill-warning text-warning" />
                  <Input
                    type="number"
                    min={minStars}
                    step={1}
                    value={custom}
                    onChange={(e) => setCustom(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                    placeholder={`${minStars}+`}
                    className="border-0 bg-transparent text-2xl font-bold focus-visible:ring-0"
                  />
                  <span className="pr-3 text-sm text-muted-foreground">⭐</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setCustom(q)}
                      className={`rounded-lg border px-3 py-1 text-xs transition-all ${
                        custom === q
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border/60 hover:border-primary/50"
                      }`}
                    >
                      {q.toLocaleString("ru-RU")} ⭐
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("stars.min")}: {minStars} ⭐
                </p>
              </div>

              <div>
                <Label>{t("buy.target")} *</Label>
                <Input
                  value={tg}
                  onChange={(e) => setTg(e.target.value)}
                  placeholder="@username"
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("buy.targetHelp")}</p>
              </div>

              {user && valid && (
                <PromoInput amount={customPrice} type="stars" onApply={setPromo} />
              )}

              {user && insufficient && valid && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm">
                  {t("buy.insufficient")} <Link to="/topup" className="ml-2 underline">{t("nav.topup")}</Link>
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{t("buy.price")}</div>
                  <div className="font-display text-3xl font-bold text-gradient">
                    {finalPrice.toLocaleString("ru-RU")}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">UZS</span>
                  </div>
                  {promo && (
                    <div className="text-xs text-muted-foreground line-through">{customPrice.toLocaleString("ru-RU")} UZS</div>
                  )}
                </div>
                <Button
                  disabled={busy || !valid || (!!user && insufficient)}
                  onClick={submit}
                  className="h-12 rounded-xl bg-gradient-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? t("common.loading") : user ? t("buy.confirm") : t("nav.login")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preset packages — quick fill */}
        {packages.length > 0 && (
          <>
            <div className="mt-12 text-center">
              <h3 className="font-display text-2xl font-bold">{t("stars.popularPackages") || "Mashhur paketlar"}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("stars.popularHint") || "Tanlasangiz miqdor avtomatik to'ldiriladi"}
              </p>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3 lg:grid-cols-3">
              {packages.map((p) => {
                const popular = p.stars === 500;
                const selected = custom === p.stars;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setCustom(p.stars);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`relative rounded-3xl glass p-7 text-left transition-all hover:-translate-y-1 hover:shadow-glow ${
                      selected ? "border-primary ring-2 ring-primary/40" : popular ? "border-primary/40 ring-1 ring-primary/30" : ""
                    }`}
                  >
                    {popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                        {t("pricing.popular")}
                      </span>
                    )}
                    <div className="flex items-center justify-center gap-2 text-warning">
                      <Star className="h-7 w-7 fill-warning" />
                      <div className="font-display text-4xl font-bold text-foreground">{p.stars}</div>
                    </div>
                    <div className="mt-4 text-center">
                      <div className="font-display text-3xl font-bold text-gradient">
                        {(p.stars * rate).toLocaleString("ru-RU")} <span className="text-sm font-normal text-muted-foreground">UZS</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Stars;
