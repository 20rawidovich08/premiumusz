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
import { Crown, Wallet, CheckCircle2 } from "lucide-react";

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

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/buy/premium", { replace: true });
  }, [loading, user, navigate]);

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
  const insufficient = selected ? balance < Number(selected.price_uzs) : false;

  const submit = async () => {
    if (!selected) return;
    const tgTrim = tg.trim();
    if (!tgTrim) return toast.error(t("buy.target") + " — " + t("common.required"));
    if (!/^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(tgTrim)) return toast.error(t("buy.targetInvalid"));
    if (insufficient) return toast.error(t("buy.insufficient"));
    setBusy(true);
    const { data, error } = await supabase.rpc("purchase_premium_with_balance", {
      p_plan_id: selected.id, p_telegram: tgTrim,
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
            <Crown className="h-8 w-8 text-primary" /> {t("buy.premium")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("buy.choosePlan")}</p>

          <div className="mt-6 rounded-3xl glass p-6 space-y-5">
            <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-4">
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /> {t("buy.balance")}</div>
              <div className="font-display text-xl font-bold text-gradient">{balance.toLocaleString("ru-RU")} UZS</div>
            </div>

            <div>
              <Label>{t("buy.choosePlan")} *</Label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlanId(p.id)}
                    className={`rounded-xl border p-4 text-center transition-all ${
                      planId === p.id ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
                    }`}
                  >
                    <div className="font-display text-2xl font-bold">{p.duration_months}</div>
                    <div className="text-xs text-muted-foreground">{t("pricing.months")}</div>
                    <div className="mt-2 text-sm font-semibold">{Number(p.price_uzs).toLocaleString("ru-RU")} UZS</div>
                  </button>
                ))}
              </div>
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

            {insufficient && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 text-sm">
                {t("buy.insufficient")} <Link to="/topup" className="ml-2 underline">{t("nav.topup")}</Link>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/50 pt-4">
              <div>
                <div className="text-xs text-muted-foreground">{t("buy.price")}</div>
                <div className="font-display text-2xl font-bold text-gradient">
                  {selected ? Number(selected.price_uzs).toLocaleString("ru-RU") : 0} UZS
                </div>
              </div>
              <Button
                disabled={busy || insufficient || !selected}
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

export default BuyPremium;
