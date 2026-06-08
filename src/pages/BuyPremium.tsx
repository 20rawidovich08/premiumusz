import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Crown, Wallet, CheckCircle2 } from "lucide-react";
import { PromoInput } from "@/components/PromoInput";

interface Plan { id: string; duration_months: number; price_uzs: number; }

const BuyPremium = () => {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState(params.get("plan") ?? "");
  const [tg, setTg] = useState("");
  const [balance, setBalance] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ num: string } | null>(null);
  const [promo, setPromo] = useState<{ code: string; discount: number; final: number } | null>(null);

  useEffect(() => { if (!loading && !user) navigate("/auth?next=/buy/premium", { replace: true }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("plans").select("id,duration_months,price_uzs").eq("active", true).order("duration_months"),
      supabase.from("profiles").select("balance,telegram_username").eq("id", user.id).maybeSingle(),
    ]).then(([{ data: p }, { data: pr }]) => {
      setPlans((p as Plan[]) ?? []);
      if (!planId && p?.[0]) setPlanId((p[0] as any).id);
      setBalance(Number(pr?.balance ?? 0));
      if (pr?.telegram_username) setTg(pr.telegram_username);
    });
  }, [user]); // eslint-disable-line

  const selected = plans.find((p) => p.id === planId);
  const finalAmount = promo ? promo.final : Number(selected?.price_uzs ?? 0);
  const insufficient = selected ? balance < finalAmount : false;

  const submit = async () => {
    if (!selected) return;
    const tgTrim = tg.trim();
    if (!tgTrim) return toast.error(t("buy.target") + " — " + t("common.required"));
    if (!/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tgTrim)) return toast.error(t("buy.targetInvalid"));
    if (insufficient) return toast.error(t("buy.insufficient"));
    setBusy(true);
    const { data, error } = await supabase.rpc("purchase_premium_with_promo", {
      p_plan_id: selected.id, p_telegram: tgTrim, p_promo_code: promo?.code ?? null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const num = (data as any[])?.[0]?.order_number;
    const id = (data as any[])?.[0]?.order_id;
    if (id) supabase.functions.invoke("notify-admin", { body: { order_id: id } }).catch(() => undefined);
    setDone({ num });
    toast.success(t("buy.success"));
  };

  if (loading) return null;
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
      <Seo title="Telegram Premium xarid qilish — Premium Usz" description="3, 6 yoki 12 oylik Telegram Premium obunani rasmiylashtiring." path="/buy/premium" />
      <SiteHeader />
      <main className="flex-1 container py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Crown className="h-3.5 w-3.5" /> Telegram Premium
          </span>
          <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">Premium obuna xarid qiling</h1>
          <p className="mt-2 text-muted-foreground">{t("buy.choosePlan")}</p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {plans.map((p) => {
              const popular = p.duration_months === 6;
              const active = planId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={`relative surface p-5 text-left transition-all ${
                    active ? "ring-2 ring-primary shadow-md" : "hover:border-primary/40"
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                      Tavsiya
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Crown className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium text-muted-foreground">{p.duration_months} {t("pricing.months")}</span>
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold tracking-tight">
                    {Number(p.price_uzs).toLocaleString("ru-RU")} <span className="text-sm font-normal text-muted-foreground">UZS</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {(Math.round(p.price_uzs / p.duration_months)).toLocaleString("ru-RU")} UZS/oy
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 surface-lg p-6 space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-secondary p-4">
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> {t("buy.balance")}</div>
              <div className="font-display text-base font-bold">{balance.toLocaleString("ru-RU")} UZS</div>
            </div>

            <div>
              <Label>{t("buy.target")} *</Label>
              <Input value={tg} onChange={(e) => setTg(e.target.value)} placeholder="@username" className="mt-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">{t("buy.targetHelp")}</p>
            </div>

            {selected && <PromoInput amount={Number(selected.price_uzs)} type="premium" onApply={setPromo} />}

            {insufficient && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                {t("buy.insufficient")} <Link to="/topup" className="font-semibold text-primary hover:underline">{t("nav.topup")}</Link>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div>
                <div className="text-xs text-muted-foreground">{t("buy.price")}</div>
                <div className="font-display text-2xl font-bold text-primary">
                  {finalAmount.toLocaleString("ru-RU")} UZS
                </div>
                {promo && selected && (
                  <div className="text-xs text-muted-foreground line-through">
                    {Number(selected.price_uzs).toLocaleString("ru-RU")} UZS
                  </div>
                )}
              </div>
              <Button
                disabled={busy || insufficient || !selected}
                onClick={submit}
                className="h-12 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
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

export default BuyPremium;
