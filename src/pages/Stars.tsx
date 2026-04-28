import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, TrendingUp, Sparkles } from "lucide-react";

interface Pkg { id: string; stars: number; }

const QUICK = [100, 250, 500, 1000, 2500, 5000];

const Stars = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [rate, setRate] = useState(220);
  const [minStars, setMinStars] = useState(50);
  const [custom, setCustom] = useState<number>(100);

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

  const customPrice = useMemo(() => Math.max(0, Math.floor(custom)) * rate, [custom, rate]);
  const valid = custom >= minStars;

  const buyCustom = () => {
    if (!valid) return;
    navigate(`/buy/stars?stars=${Math.floor(custom)}`);
  };

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

        {/* Custom amount card — featured */}
        <div className="mt-10 mx-auto max-w-3xl">
          <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-background to-warning/10 p-7 shadow-glow">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-warning/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">{t("stars.customAmount") || "Istalgan miqdor"}</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold">
                {t("stars.customTitle") || "Sizga kerak bo‘lgan miqdorni tanlang"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("stars.min")}: {minStars} ⭐ — {t("stars.customHint") || "minimumdan boshlab istalgan sonni kiriting"}
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-2 backdrop-blur">
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
                </div>
                <div className="text-right md:min-w-[180px]">
                  <div className="text-xs text-muted-foreground">{t("buy.price")}</div>
                  <div className="font-display text-3xl font-bold text-gradient">
                    {customPrice.toLocaleString("ru-RU")}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">UZS</span>
                  </div>
                  <Button
                    disabled={!valid}
                    onClick={buyCustom}
                    className="mt-3 h-12 w-full rounded-xl bg-gradient-primary px-6 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {t("stars.buy")}
                  </Button>
                </div>
              </div>
              {!valid && (
                <p className="mt-2 text-xs text-destructive">
                  {t("stars.min")}: {minStars} ⭐
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preset packages */}
        {packages.length > 0 && (
          <>
            <div className="mt-12 text-center">
              <h3 className="font-display text-2xl font-bold">{t("stars.popularPackages") || "Mashhur paketlar"}</h3>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3 lg:grid-cols-3">
              {packages.map((p) => {
                const popular = p.stars === 500;
                return (
                  <div
                    key={p.id}
                    className={`relative rounded-3xl glass p-7 transition-all hover:-translate-y-1 hover:shadow-glow ${
                      popular ? "border-primary/40 ring-1 ring-primary/30" : ""
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
                    <Button asChild className="mt-6 h-12 w-full rounded-xl bg-gradient-primary font-semibold text-primary-foreground hover:opacity-90">
                      <Link to={`/buy/stars?stars=${p.stars}`}>{t("stars.buy")}</Link>
                    </Button>
                  </div>
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
