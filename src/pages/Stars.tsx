import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp } from "lucide-react";

interface Pkg { id: string; stars: number; }

const Stars = () => {
  const { t } = useI18n();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [rate, setRate] = useState(220);

  useEffect(() => {
    Promise.all([
      supabase.from("stars_packages").select("id,stars").eq("active", true).order("stars"),
      supabase.from("settings").select("value").eq("key", "stars_rate_uzs").maybeSingle(),
    ]).then(([{ data: pks }, { data: r }]) => {
      setPackages((pks as Pkg[]) ?? []);
      if (r?.value) setRate(Number(r.value));
    });
  }, []);

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

        <div className="mt-12 grid gap-5 md:grid-cols-3 lg:grid-cols-3">
          {packages.map((p, i) => {
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
      </main>
      <SiteFooter />
    </div>
  );
};

export default Stars;
