import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, CheckCircle2, Wallet } from "lucide-react";
import { CardPicker } from "@/components/CardPicker";

const TopUp = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [minAmount, setMinAmount] = useState(10000);
  const [amount, setAmount] = useState<number>(50000);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("settings")
      .select("key,value")
      .eq("key", "min_topup_uzs")
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
        if (map.min_topup_uzs) setMinAmount(Number(map.min_topup_uzs));
      });
  }, []);

  const submit = async () => {
    if (!user) return;
    if (amount < minAmount) return toast.error(t("errors.minAmount"));
    if (!receipt) return toast.error(t("errors.receipt"));
    setBusy(true);
    try {
      const ext = receipt.name.split(".").pop() || "jpg";
      const path = `topup/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receipt, {
        contentType: receipt.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: txId, error } = await supabase.rpc("request_topup", {
        p_amount_uzs: amount,
        p_receipt_path: path,
      });
      if (error) throw error;
      if (txId) supabase.functions.invoke("notify-admin", { body: { topup_id: txId } }).catch(() => undefined);
      setDone(true);
      toast.success(t("topup.success"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
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
            <h1 className="font-display text-2xl font-bold">{t("topup.success")}</h1>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={() => navigate("/profile")}>{t("nav.profile")}</Button>
              <Button variant="outline" onClick={() => { setDone(false); setReceipt(null); }}>{t("topup.title")}</Button>
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
          <h1 className="font-display text-4xl font-bold flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" /> {t("topup.title")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("topup.subtitle")}</p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl glass p-6 space-y-4">
              <div>
                <Label>{t("topup.amount")} *</Label>
                <Input
                  type="number"
                  min={minAmount}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("topup.min")}: {minAmount.toLocaleString("ru-RU")} UZS
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[50000, 100000, 200000, 500000, 1000000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={`rounded-xl border p-2 text-sm transition-all ${
                      amount === v ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
                    }`}
                  >
                    {v >= 1_000_000 ? `${v / 1_000_000}M` : `${v / 1000}k`}
                  </button>
                ))}
              </div>

              <div>
                <Label>{t("topup.upload")} *</Label>
                <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-all hover:border-primary/50">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm">{receipt ? receipt.name : t("topup.upload")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <Button
                disabled={busy}
                onClick={submit}
                className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold text-primary-foreground hover:opacity-90"
              >
                {busy ? t("common.loading") : t("topup.submit")}
              </Button>
            </div>

            <div className="rounded-3xl glass p-6 space-y-4">
              <h3 className="font-display text-xl font-bold">Karta ma'lumotlari</h3>
              <CardPicker
                amountUzs={amount}
                copyLabel={t("common.copied")}
                cardNumberLabel={t("topup.cardNumber")}
                cardHolderLabel={t("topup.cardHolder")}
                bankLabel="Bank"
                amountLabel="Tanlangan kartaga ushbu summani o'tkazing va chek rasmini yuklang."
              />
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default TopUp;
