import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, XCircle, Plus, Trash2 } from "lucide-react";
import { useAdminT } from "@/lib/adminI18n";

type CardItem = { number: string; holder: string; bank: string };

const AdminSettings = () => {
  const t = useAdminT();
  const [s, setS] = useState<Record<string, any>>({});
  const [cards, setCards] = useState<CardItem[]>([]);
  const [webhook, setWebhook] = useState<any>(null);
  const [webhookBusy, setWebhookBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("settings").select("key,value");
    const map: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
    setS(map);
    // Initialize cards from `cards` jsonb or fall back to legacy single card
    let initial: CardItem[] = [];
    if (Array.isArray(map.cards)) {
      initial = (map.cards as any[])
        .map((c) => ({ number: String(c?.number ?? ""), holder: String(c?.holder ?? ""), bank: String(c?.bank ?? "") }))
        .filter((c) => c.number || c.holder || c.bank);
    }
    if (initial.length === 0 && (map.card_number || map.card_holder || map.card_bank)) {
      initial = [{
        number: typeof map.card_number === "string" ? map.card_number : "",
        holder: typeof map.card_holder === "string" ? map.card_holder : "",
        bank: typeof map.card_bank === "string" ? map.card_bank : "",
      }];
    }
    setCards(initial);
  };
  useEffect(() => { load(); }, []);

  const checkWebhook = async () => {
    setWebhookBusy(true);
    const { data, error } = await supabase.functions.invoke("set-webhook", { body: { action: "status" } });
    setWebhookBusy(false);
    if (error) return toast.error(error.message);
    setWebhook(data);
  };

  useEffect(() => { checkWebhook(); }, []);

  const save = async (key: string, value: any) => {
    const normalized = key === "bot_username" && typeof value === "string" ? value.replace(/^@/, "") : value;
    const { error } = await supabase.from("settings").upsert({ key, value: normalized });
    if (error) return toast.error(error.message);
    toast.success(t("saved"));
  };

  const setField = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  const saveCards = async (next: CardItem[]) => {
    const cleaned = next.map((c) => ({
      number: (c.number || "").trim(),
      holder: (c.holder || "").trim(),
      bank: (c.bank || "").trim(),
    }));
    setCards(cleaned);
    const { error } = await supabase.from("settings").upsert({ key: "cards", value: cleaned });
    if (error) return toast.error(error.message);
    // Mirror the first card to legacy fields for backward compatibility
    const first = cleaned[0] ?? { number: "", holder: "", bank: "" };
    await Promise.all([
      supabase.from("settings").upsert({ key: "card_number", value: first.number }),
      supabase.from("settings").upsert({ key: "card_holder", value: first.holder }),
      supabase.from("settings").upsert({ key: "card_bank", value: first.bank }),
    ]);
    toast.success(t("saved"));
  };

  const updateCard = (idx: number, patch: Partial<CardItem>) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const commitCard = (idx: number, patch: Partial<CardItem>) => {
    const next = cards.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    saveCards(next);
  };

  const addCard = async () => {
    const next = [...cards, { number: "", holder: "", bank: "" }];
    setCards(next);
    const { error } = await supabase.from("settings").upsert({ key: "cards", value: next });
    if (error) toast.error(error.message);
  };
  const removeCard = (idx: number) => {
    const next = cards.filter((_, i) => i !== idx);
    saveCards(next);
  };

  const lastError = webhook?.last_error_message || webhook?.status?.result?.last_error_message || webhook?.telegram?.result?.last_error_message;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("settings")}</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl glass p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{t("cardDetails")}</h3>
            <Button size="sm" variant="outline" onClick={addCard}>
              <Plus className="mr-1 h-4 w-4" /> {t("add")}
            </Button>
          </div>
          {cards.length === 0 && (
            <p className="text-sm text-muted-foreground">—</p>
          )}
          <div className="space-y-3">
            {cards.map((c, idx) => (
              <div key={idx} className="rounded-xl border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase text-muted-foreground">#{idx + 1}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeCard(idx)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div>
                  <Label className="text-xs">{t("cardNumber")}</Label>
                  <Input
                    value={c.number}
                    onChange={(e) => updateCard(idx, { number: e.target.value })}
                    onBlur={(e) => commitCard(idx, { number: e.target.value })}
                    placeholder="8600 1234 5678 9012"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("holderName")}</Label>
                    <Input
                      value={c.holder}
                      onChange={(e) => updateCard(idx, { holder: e.target.value })}
                      onBlur={(e) => commitCard(idx, { holder: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("bank")}</Label>
                    <Input
                      value={c.bank}
                      onChange={(e) => updateCard(idx, { bank: e.target.value })}
                      onBlur={(e) => commitCard(idx, { bank: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Bir nechta karta qo'shing — foydalanuvchi to'lov vaqtida istalgan birini tanlay oladi.
          </p>
        </div>

        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-semibold">{t("paymentMethods")}</h3>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
            <span>{t("cardPayments")}</span>
            <Switch checked={s.card_enabled !== false} onCheckedChange={(v) => { setField("card_enabled", v); save("card_enabled", v); }} />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
            <span>{t("telegramStars")}</span>
            <Switch checked={s.stars_enabled !== false} onCheckedChange={(v) => { setField("stars_enabled", v); save("stars_enabled", v); }} />
          </div>
          <div>
            <Label>{t("botUsername")}</Label>
            <Input value={typeof s.bot_username === "string" ? s.bot_username : ""} onChange={(e) => setField("bot_username", e.target.value)} onBlur={(e) => save("bot_username", e.target.value)} />
          </div>
          <div>
            <Label>{t("referralReward")}</Label>
            <Input type="number" value={typeof s.referral_reward === "number" ? s.referral_reward : 0} onChange={(e) => setField("referral_reward", Number(e.target.value))} onBlur={(e) => save("referral_reward", Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("adminTelegramIds")}</Label>
            <Input
              placeholder="123456789, 987654321"
              value={typeof s.admin_telegram_ids === "string" ? s.admin_telegram_ids : Array.isArray(s.admin_telegram_ids) ? s.admin_telegram_ids.join(", ") : ""}
              onChange={(e) => setField("admin_telegram_ids", e.target.value)}
              onBlur={(e) => save("admin_telegram_ids", e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("adminTelegramIdsHint")}</p>
          </div>
          <div>
            <Label>Support Telegram (chat link)</Label>
            <Input
              placeholder="https://t.me/yourbot"
              value={typeof s.support_telegram === "string" ? s.support_telegram : ""}
              onChange={(e) => setField("support_telegram", e.target.value)}
              onBlur={(e) => save("support_telegram", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* To'lov provayderlari (kelajakda) */}
      <div className="mt-6 rounded-2xl glass p-5 space-y-4">
        <div>
          <h3 className="font-semibold">To'lov provayderlari</h3>
          <p className="text-xs text-muted-foreground mt-1">Click / Payme / Uzum kalitlarini kiriting. Hozircha ko'rsatkichli rejim — kalitlar saqlanadi, integratsiya keyinroq ulanadi.</p>
        </div>
        {[
          { key: "click", label: "Click", fields: ["merchant_id", "service_id", "secret_key"] },
          { key: "payme", label: "Payme", fields: ["merchant_id", "key"] },
          { key: "uzum", label: "Uzum Bank", fields: ["merchant_id", "secret_key"] },
        ].map((p) => (
          <div key={p.key} className="rounded-xl border border-border/60 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.label}</span>
              <Switch
                checked={s[`${p.key}_enabled`] === true}
                onCheckedChange={(v) => { setField(`${p.key}_enabled`, v); save(`${p.key}_enabled`, v); }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {p.fields.map((f) => (
                <div key={f}>
                  <Label className="text-xs">{f}</Label>
                  <Input
                    type={f.includes("secret") || f === "key" ? "password" : "text"}
                    value={typeof s[`${p.key}_${f}`] === "string" ? s[`${p.key}_${f}`] : ""}
                    onChange={(e) => setField(`${p.key}_${f}`, e.target.value)}
                    onBlur={(e) => save(`${p.key}_${f}`, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">{t("botWebhook")}</h3>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${webhook?.registered ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {webhook?.registered ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {webhook?.registered ? t("registered") : t("notRegistered")}
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t("webhookHint")}</p>
        {typeof webhook?.pending_update_count === "number" && (
          <p className="mt-2 text-xs text-muted-foreground">Pending updates: {webhook.pending_update_count}</p>
        )}
        {lastError && <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{lastError}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            disabled={webhookBusy}
            onClick={async () => {
              setWebhookBusy(true);
              const { data, error } = await supabase.functions.invoke("set-webhook");
              setWebhookBusy(false);
              if (error) return toast.error(error.message);
              setWebhook(data);
              data?.registered ? toast.success(t("webhookRegistered")) : toast.error(data?.telegram?.description || t("webhookFailed"));
            }}
          >
            {webhookBusy ? t("checking") : t("registerWebhook")}
          </Button>
          <Button variant="outline" disabled={webhookBusy} onClick={checkWebhook}>
            <RefreshCw className="mr-2 h-4 w-4" /> {t("checkStatus")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
