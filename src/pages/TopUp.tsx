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
import { Upload, CheckCircle2, Wallet, CreditCard, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { CardPicker } from "@/components/CardPicker";

const TopUp = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [minAmount, setMinAmount] = useState(10000);
  const [amount, setAmount] = useState<number>(50000);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [online, setOnline] = useState({ click: false, payme: false, uzum: false });
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) navigate("/auth", { replace: true }); }, [loading, user, navigate]);

  useEffect(() => {
    supabase.from("settings").select("key,value")
      .in("key", ["min_topup_uzs", "click_enabled", "payme_enabled", "uzum_enabled"])
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
        if (map.min_topup_uzs) setMinAmount(Number(map.min_topup_uzs));
        setOnline({
          click: map.click_enabled === true || map.click_enabled === "true",
          payme: map.payme_enabled === true || map.payme_enabled === "true",
          uzum: map.uzum_enabled === true || map.uzum_enabled === "true",
        });
      });
  }, []);

  const loadAccount = async () => {
    if (!user) return;
    const [{ data: p }, { data: tx }] = await Promise.all([
      supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle(),
      supabase.from("balance_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
    ]);
    setBalance(Number(p?.balance ?? 0));
    setHistory(tx ?? []);
  };

  useEffect(() => { if (user) loadAccount(); /* eslint-disable-next-line */ }, [user]);

  const submit = async () => {
    if (!user) return;
    if (amount < minAmount) return toast.error(t("errors.minAmount"));
    if (!receipt) return toast.error(t("errors.receipt"));
    setBusy(true);
    try {
      const ext = receipt.name.split(".").pop() || "jpg";
      const path = `${user.id}/topup/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, receipt, {
        contentType: receipt.type, upsert: false,
      });
      if (upErr) throw upErr;
      try {
        const { data: check } = await supabase.functions.invoke("check-receipt", {
          body: { receipt_path: path, expected_amount: amount },
        });
        if (check && !check.error) {
          if (check.matches) toast.success(t("topup.receiptMatch", { amount: check.detected_amount?.toLocaleString(locale) ?? "" }));
          else if (check.detected_amount > 0) toast.warning(t("topup.receiptMismatch", { amount: check.detected_amount?.toLocaleString(locale) ?? "" }));
        }
      } catch {}
      const { data: txId, error } = await supabase.rpc("request_topup", { p_amount_uzs: amount, p_receipt_path: path });
      if (error) throw error;
      if (txId) supabase.functions.invoke("notify-admin", { body: { topup_id: txId } }).catch(() => undefined);
      setDone(true);
      toast.success(t("topup.success"));
      loadAccount();
    } catch (e: any) {
      toast.error(t("common.error"));
    } finally { setBusy(false); }
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container py-10 md:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold md:text-4xl">{t("topup.pageTitle")}</h1>
          </div>
          <p className="mt-1.5 text-muted-foreground">{t("topup.intro")}</p>

          {/* Balance card */}
          <div className="mt-6 surface-lg overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-7 text-primary-foreground">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider opacity-80">{t("profile.balance")}</div>
                <div className="mt-1 font-display text-4xl font-bold md:text-5xl">
                  {balance.toLocaleString(locale)} <span className="text-xl font-normal opacity-80">UZS</span>
                </div>
                <div className="mt-2 text-xs opacity-80">{t("topup.balanceHint")}</div>
              </div>
              <div className="hidden h-16 w-16 place-items-center rounded-2xl bg-white/15 sm:grid">
                <CreditCard className="h-8 w-8" />
              </div>
            </div>
          </div>

          {done && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span>{t("topup.success")}</span>
            </div>
          )}

          {/* Top-up methods */}
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="surface p-6">
              <h3 className="font-display text-base font-bold">{t("topup.method")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("topup.methodsDesc")}</p>

              {(online.click || online.payme || online.uzum) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {online.click && (
                    <button onClick={() => toast.info(t("topup.comingSoon", { service: "Click" }))} className="rounded-xl border border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5">
                      <div className="text-sm font-bold text-[#00BFFF]">Click</div>
                      <p className="text-[10px] text-muted-foreground">{t("topup.fast")}</p>
                    </button>
                  )}
                  {online.payme && (
                    <button onClick={() => toast.info(t("topup.comingSoon", { service: "Payme" }))} className="rounded-xl border border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5">
                      <div className="text-sm font-bold text-[#36CFC9]">Payme</div>
                      <p className="text-[10px] text-muted-foreground">{t("topup.fast")}</p>
                    </button>
                  )}
                  {online.uzum && (
                    <button onClick={() => toast.info(t("topup.comingSoon", { service: "Uzum" }))} className="rounded-xl border border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5">
                      <div className="text-sm font-bold text-[#7C3AED]">Uzum</div>
                      <p className="text-[10px] text-muted-foreground">{t("topup.fast")}</p>
                    </button>
                  )}
                </div>
              )}

              <div className="mt-5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("topup.amount")}</Label>
                <Input type="number" min={minAmount} step={1000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="mt-2 h-11 text-lg font-semibold" />
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {[50000, 100000, 200000, 500000, 1000000].map((v) => (
                    <button key={v} onClick={() => setAmount(v)}
                      className={`rounded-lg border p-2 text-xs font-semibold transition-all ${amount === v ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}>
                      {v >= 1_000_000 ? `${v/1_000_000}M` : `${v/1000}k`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("topup.upload")}</Label>
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-5 text-center hover:border-primary/50 hover:bg-primary/5">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{receipt ? receipt.name : t("topup.receiptPrompt")}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              <Button disabled={busy} onClick={submit} className="mt-5 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
                {busy ? t("common.loading") : t("topup.submit")}
              </Button>
            </div>

            <div className="surface p-6">
              <h3 className="font-display text-base font-bold">{t("topup.cardDetails")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("topup.cardInstructions")}</p>
              <div className="mt-4">
                <CardPicker
                  amountUzs={amount}
                  copyLabel={t("common.copied")}
                  cardNumberLabel={t("topup.cardNumber")}
                  cardHolderLabel={t("topup.cardHolder")}
                  bankLabel={t("common.bank")}
                  amountLabel={t("topup.transferAmount")}
                />
              </div>
            </div>
          </div>

          {/* Payment history */}
          <div className="mt-8">
            <h3 className="font-display text-lg font-bold">{t("topup.history")}</h3>
            <div className="mt-3 surface overflow-hidden">
              <div className="table-scroll">
                <table className="w-full">
                  <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4 font-medium">{t("common.type")}</th>
                      <th className="p-4 font-medium">{t("common.amount")}</th>
                      <th className="p-4 font-medium">{t("common.status")}</th>
                      <th className="p-4 font-medium">{t("common.date")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">{t("profile.emptyTransactions")}</td></tr>
                    ) : history.map((x) => {
                      const positive = Number(x.amount_uzs) >= 0;
                      return (
                        <tr key={x.id} className="border-t border-border">
                          <td className="p-4 text-sm capitalize">{t(`transaction.${x.type}`) === `transaction.${x.type}` ? t("transaction.unknown") : t(`transaction.${x.type}`)}</td>
                          <td className={`p-4 text-sm font-semibold ${positive ? "text-success" : "text-destructive"}`}>
                            <span className="inline-flex items-center gap-1">
                              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                              {Number(x.amount_uzs).toLocaleString(locale)} UZS
                            </span>
                          </td>
                          <td className="p-4"><span className={`pill pill-${x.status}`}>{t(`status.${x.status}`)}</span></td>
                          <td className="p-4 text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{new Date(x.created_at).toLocaleString(locale)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default TopUp;
