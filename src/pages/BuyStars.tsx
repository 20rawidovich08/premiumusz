import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Star, Wallet, CheckCircle2 } from "lucide-react";

interface Pkg { id: string; stars: number; }

const BuyStars = () => {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [stars, setStars] = useState<number>(Number(params.get("stars")) || 50);
  const [tg, setTg] = useState("");
  const [balance, setBalance] = useState(0);
  const [rate, setRate] = useState(220);
  const [minStars, setMinStars] = useState(50);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ num: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/buy/stars", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("stars_packages").select("id,stars").eq("active", true).order("stars"),
      supabase.from("profiles").select("balance,telegram_username").eq("id", user.id).maybeSingle(),
      supabase.from("settings").select("key,value").in("key", ["stars_rate_uzs", "min_stars"]),
    ]).then(([{ data: pks }, { data: pr }, { data: s }]) => {
      setPackages((pks as Pkg[]) ?? []);
      setBalance(Number(pr?.balance ?? 0));
      if (pr?.telegram_username) setTg(pr.telegram_username);
      const map = Object.fromEntries((s ?? []).map((r: any) => [r.key, r.value]));
      if (map.stars_rate_uzs) setRate(Number(map.stars_rate_uzs));
      if (map.min_stars) setMinStars(Number(map.min_stars));
    });
  }, [user]); // eslint-disable-line

  const price = stars * rate;
  const insufficient = balance < price;
  const belowMin = stars < minStars;

  const submit = async () => {
    const tgTrim = tg.trim();
    if (!tgTrim) return toast.error(t("buy.target") + " — " + t("common.required"));
    if (!/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tgTrim)) return toast.error(t("buy.targetInvalid"));
    if (belowMin) return toast.error(`${t("stars.min")}: ${minStars}`);
    if (insufficient) return toast.error(t("buy.insufficient"));
    setBusy(true);
    const { data, error } = await supabase.rpc("purchase_stars_with_balance", {
      p_stars: stars, p_telegram: tgTrim,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const num = (data as any[])?.[0]?.order_number;
    setDone({ num });
    toast.success(t("buy.success"));
  };

  if (loading) return null;

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
      <main className="flex-1 container py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-4xl font-bold flex items-center gap-3">
            <Star className="h-8 w-8 fill-warning text-warning" /> {t("buy.stars")}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t("buy.choosePackage")} · {t("stars.rate")}: <span className="font-semibold text-foreground">1 ⭐ = {rate} UZS</span>
          </p>

          <div className="mt-6 rounded-3xl glass p-6 space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-4">
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> {t("buy.balance")}</div>
              <div className="font-display text-xl font-bold text-gradient">{balance.toLocaleString("ru-RU")} UZS</div>
            </div>

            <div>
              <Label>{t("buy.choosePackage")} *</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {packages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setStars(p.stars)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      stars === p.stars ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-display text-lg font-bold">{p.stars}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {(p.stars * rate).toLocaleString("ru-RU")} UZS
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>{t("buy.amountStars")}</Label>
              <Input
                type="number"
                min={minStars}
                value={stars}
                onChange={(e) => setStars(Number(e.target.value))}
                className="mt-1.5"
              />
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

            {insufficient && !belowMin && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm">
                {t("buy.insufficient")} <Link to="/topup" className="ml-2 underline">{t("nav.topup")}</Link>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/50 pt-4">
              <div>
                <div className="text-xs text-muted-foreground">{t("buy.price")}</div>
                <div className="font-display text-2xl font-bold text-gradient">
                  {price.toLocaleString("ru-RU")} UZS
                </div>
              </div>
              <Button
                disabled={busy || insufficient || belowMin}
                onClick={submit}
                className="h-12 rounded-xl bg-gradient-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90"
              >
                {busy ? t("common.loading") : t("buy.confirm")}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default BuyStars;
