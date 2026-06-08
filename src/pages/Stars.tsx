import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Wallet, CheckCircle2, TrendingUp, Sparkles, Minus, Plus } from "lucide-react";
import { PromoInput } from "@/components/PromoInput";

interface Pkg { id: string; stars: number; }

const QUICK = [50, 100, 250, 500, 1000, 2500];

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
    supabase.from("profiles").select("balance,telegram_username").eq("id", user.id).maybeSingle()
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
          <div className="surface-lg mx-auto max-w-md p-8 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("buy.success")}</h1>
            <div className="mt-3 font-mono text-lg text-primary">{done.num}</div>
            <Button className="mt-6 bg-primary text-primary-foreground" onClick={() => navigate("/profile")}>{t("nav.profile")}</Button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Seo title="Telegram Stars xarid qilish — Premium Usz" description="Telegram Stars'ni 50 dan boshlab UZS karta orqali xarid qiling." path="/stars" />
      <SiteHeader />
      <main className="flex-1 container py-10 md:py-14">
        <div className="mx-auto max-w-2xl text-center md:text-left md:max-w-none">
          <span className="inline-flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
            <Star className="h-3.5 w-3.5 fill-current" /> Telegram Stars
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">Telegram Stars xarid qiling</h1>
          <p className="mt-2 text-muted-foreground">Joriy kurs: <span className="font-semibold text-foreground">1 ⭐ = {rate} UZS</span></p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* LEFT — package cards */}
          <div className="surface p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-bold">Paketni tanlang</h2>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {QUICK.map((q) => {
                const selected = custom === q;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setCustom(q)}
                    className={`group rounded-xl border p-4 text-center transition-all ${
                      selected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-warning/10">
                      <Star className="h-5 w-5 fill-warning text-warning" />
                    </div>
                    <div className="mt-3 font-display text-xl font-bold">{q.toLocaleString("ru-RU")}</div>
                    <div className="mt-1 text-xs font-medium text-primary">{(q * rate).toLocaleString("ru-RU")} UZS</div>
                  </button>
                );
              })}
            </div>

            {packages.length > 0 && (
              <>
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="text-sm font-semibold text-muted-foreground">Boshqa paketlar</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {packages.filter(p => !QUICK.includes(p.stars)).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setCustom(p.stars)}
                        className={`rounded-lg border p-3 text-center text-sm transition-all ${
                          custom === p.stars ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="font-display font-bold">{p.stars}</span> <span className="text-muted-foreground">⭐</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT — purchase panel */}
          <div className="surface-lg p-6 lg:sticky lg:top-24 lg:self-start">
            {user && (
              <div className="mb-5 flex items-center justify-between rounded-xl bg-secondary p-4">
                <div className="inline-flex items-center gap-2 text-sm">
                  <Wallet className="h-4 w-4 text-primary" /> Balans
                </div>
                <div className="font-display text-base font-bold">{balance.toLocaleString("ru-RU")} UZS</div>
              </div>
            )}

            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stars miqdori</Label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card p-1.5">
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setCustom(Math.max(minStars, custom - 50))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={minStars}
                value={custom}
                onChange={(e) => setCustom(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="border-0 bg-transparent text-center text-xl font-bold tracking-tight focus-visible:ring-0"
              />
              <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => setCustom(custom + 50)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Minimum: {minStars} ⭐</p>

            <div className="mt-4">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telegram username</Label>
              <Input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="@username" className="mt-2" />
            </div>

            {user && valid && (
              <div className="mt-4">
                <PromoInput amount={customPrice} type="stars" onApply={setPromo} />
              </div>
            )}

            {/* Live price preview */}
            <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Miqdor</span>
                <span className="font-semibold">{custom.toLocaleString("ru-RU")} ⭐</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Kurs</span>
                <span className="font-semibold">{rate} UZS / ⭐</span>
              </div>
              {promo && (
                <div className="mt-1.5 flex items-center justify-between text-sm text-success">
                  <span>Promo: {promo.code}</span>
                  <span className="font-semibold">−{promo.discount.toLocaleString("ru-RU")} UZS</span>
                </div>
              )}
              <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Jami</span>
                <div className="font-display text-2xl font-bold text-primary">
                  {finalPrice.toLocaleString("ru-RU")} <span className="text-sm font-normal text-muted-foreground">UZS</span>
                </div>
              </div>
            </div>

            {user && insufficient && valid && (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                {t("buy.insufficient")} <Link to="/topup" className="font-semibold text-primary hover:underline">To'ldirish</Link>
              </div>
            )}

            <Button
              disabled={busy || !valid || (!!user && insufficient)}
              onClick={submit}
              className="mt-5 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? t("common.loading") : user ? "Sotib olish" : t("nav.login")}
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Stars;
