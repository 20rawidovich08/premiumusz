import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Copy, Upload, Star, CreditCard, CheckCircle2, Bot } from "lucide-react";

interface Plan {
  id: string;
  duration_months: number;
  price_uzs: number;
  price_stars: number;
}

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(20),
  telegram: z.string().trim().max(50).optional(),
  plan_id: z.string().uuid(),
});

const Order = () => {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState<string>(params.get("plan") ?? "");
  const [method, setMethod] = useState<"card" | "stars">("card");
  const [card, setCard] = useState({ number: "", holder: "", bank: "" });
  const [botUsername, setBotUsername] = useState("");
  const [starsEnabled, setStarsEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [tg, setTg] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: planData }, { data: settingsData }] = await Promise.all([
        supabase.from("plans").select("id,duration_months,price_uzs,price_stars").eq("active", true).order("duration_months"),
        supabase.from("settings").select("key,value").in("key", ["card_number", "card_holder", "card_bank", "bot_username", "stars_enabled", "card_enabled"]),
      ]);
      setPlans((planData as Plan[]) ?? []);
      const map = Object.fromEntries((settingsData ?? []).map((s: any) => [s.key, s.value]));
      setCard({
        number: typeof map.card_number === "string" ? map.card_number : "",
        holder: typeof map.card_holder === "string" ? map.card_holder : "",
        bank: typeof map.card_bank === "string" ? map.card_bank : "",
      });
      setBotUsername(typeof map.bot_username === "string" ? map.bot_username : "");
      setStarsEnabled(map.stars_enabled !== false);
      setCardEnabled(map.card_enabled !== false);
      if (!planId && planData && planData[0]) setPlanId((planData[0] as any).id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = plans.find((p) => p.id === planId);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("order.copied"));
  };

  const submit = async () => {
    const parsed = schema.safeParse({ full_name: fullName, phone, telegram: tg, plan_id: planId });
    if (!parsed.success) {
      toast.error(t("errors.required"));
      return;
    }
    if (!receipt) {
      toast.error(t("errors.receipt"));
      return;
    }
    setSubmitting(true);
    try {
      const ext = receipt.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receipt, {
        contentType: receipt.type,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data, error } = await supabase.rpc("create_website_order", {
        p_full_name: fullName,
        p_phone: phone,
        p_telegram: tg || null,
        p_plan_id: planId,
        p_receipt_path: path,
      });
      if (error) throw error;
      const num = (data as any[])?.[0]?.order_number;
      setOrderNumber(num);
      toast.success(t("order.success"));
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (orderNumber) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20">
          <div className="mx-auto max-w-lg rounded-3xl glass p-8 text-center animate-fade-up">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success/20">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("order.success")}</h1>
            <p className="mt-2 text-muted-foreground">{t("order.successDesc")}</p>
            <div className="mt-6 rounded-2xl bg-secondary/60 p-5">
              <div className="text-sm text-muted-foreground">{t("order.orderNumber")}</div>
              <div className="mt-1 flex items-center justify-center gap-2 font-mono text-2xl font-bold text-primary">
                {orderNumber}
                <button onClick={() => copy(orderNumber)} className="rounded-lg p-1.5 hover:bg-background/50">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("order.copyNumber")}</p>
            </div>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => navigate("/track?n=" + orderNumber)}>
                {t("nav.track")}
              </Button>
              <Button onClick={() => navigate("/")}>{t("nav.home")}</Button>
            </div>
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
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold">{t("order.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("order.subtitle")}</p>

          <div className="mt-8 grid gap-6 md:grid-cols-[1fr,1fr]">
            {/* form */}
            <div className="rounded-3xl glass p-6 space-y-4">
              <div>
                <Label>{t("order.fullname")} *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} className="mt-1.5" />
              </div>
              <div>
                <Label>{t("order.phone")} *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+998 90 123 45 67" className="mt-1.5" />
              </div>
              <div>
                <Label>{t("order.telegram")}</Label>
                <Input value={tg} onChange={(e) => setTg(e.target.value)} maxLength={50} placeholder="@username" className="mt-1.5" />
              </div>
              <div>
                <Label>{t("order.plan")} *</Label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {plans.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlanId(p.id)}
                      className={`rounded-xl border p-3 text-center transition-all ${
                        planId === p.id ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
                      }`}
                    >
                      <div className="font-display text-lg font-bold">{p.duration_months}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.duration_months === 1 ? t("pricing.month") : t("pricing.months")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* method tabs */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/40 p-1">
                <button
                  onClick={() => setMethod("card")}
                  disabled={!cardEnabled}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    method === "card" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
                  } ${!cardEnabled && "opacity-40"}`}
                >
                  <CreditCard className="h-4 w-4" /> Card
                </button>
                <button
                  onClick={() => setMethod("stars")}
                  disabled={!starsEnabled}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    method === "stars" ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"
                  } ${!starsEnabled && "opacity-40"}`}
                >
                  <Star className="h-4 w-4" /> Stars
                </button>
              </div>
            </div>

            {/* payment side */}
            <div className="rounded-3xl glass p-6">
              {method === "card" ? (
                <div className="space-y-4">
                  <h3 className="font-display text-xl font-bold">{t("order.payInstructions")}</h3>
                  {selected && (
                    <div className="rounded-xl bg-secondary/60 p-4">
                      <div className="text-sm text-muted-foreground">{t("order.amount")}</div>
                      <div className="font-display text-2xl font-bold text-gradient">
                        {Number(selected.price_uzs).toLocaleString("ru-RU")} UZS
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl bg-secondary/60 p-4">
                    <div className="text-xs uppercase text-muted-foreground">{t("order.cardNumber")}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-mono text-lg tracking-wider">{card.number || "—"}</span>
                      <button onClick={() => copy(card.number)} className="rounded-lg p-2 hover:bg-background/50">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">{t("order.cardHolder")}</div>
                        <div className="mt-0.5 font-medium">{card.holder || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs uppercase text-muted-foreground">Bank</div>
                        <div className="mt-0.5 font-medium">{card.bank || "—"}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>{t("order.uploadReceipt")} *</Label>
                    <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-all hover:border-primary/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm">
                        {receipt ? receipt.name : t("order.uploadReceipt")}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>

                  <Button disabled={submitting} onClick={submit} className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground hover:opacity-90">
                    {submitting ? t("common.loading") : t("order.submit")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-warning/20">
                    <Star className="h-8 w-8 fill-warning text-warning" />
                  </div>
                  <h3 className="font-display text-xl font-bold">{t("order.starsTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("order.starsDesc")}</p>
                  {selected && (
                    <div className="rounded-xl bg-secondary/60 p-4">
                      <div className="text-sm text-muted-foreground">{t("order.amount")}</div>
                      <div className="font-display text-2xl font-bold text-warning">
                        ⭐ {selected.price_stars} {t("pricing.stars")}
                      </div>
                    </div>
                  )}
                  <Button
                    asChild
                    className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground"
                  >
                    <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer">
                      <Bot className="mr-2 h-4 w-4" /> {t("order.openBot")}
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Order;
