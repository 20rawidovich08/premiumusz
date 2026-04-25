import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";

const AdminSettings = () => {
  const [s, setS] = useState<Record<string, any>>({});
  const [webhook, setWebhook] = useState<any>(null);
  const [webhookBusy, setWebhookBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("settings").select("key,value");
    const map: Record<string, any> = {};
    (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
    setS(map);
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
    const { error } = await supabase.from("settings").upsert({ key, value });
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const setField = (k: string, v: any) => setS((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-semibold">Card details</h3>
          <div>
            <Label>Card number</Label>
            <Input
              value={typeof s.card_number === "string" ? s.card_number : ""}
              onChange={(e) => setField("card_number", e.target.value)}
              onBlur={(e) => save("card_number", e.target.value)}
            />
          </div>
          <div>
            <Label>Holder name</Label>
            <Input
              value={typeof s.card_holder === "string" ? s.card_holder : ""}
              onChange={(e) => setField("card_holder", e.target.value)}
              onBlur={(e) => save("card_holder", e.target.value)}
            />
          </div>
          <div>
            <Label>Bank</Label>
            <Input
              value={typeof s.card_bank === "string" ? s.card_bank : ""}
              onChange={(e) => setField("card_bank", e.target.value)}
              onBlur={(e) => save("card_bank", e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-2xl glass p-5 space-y-4">
          <h3 className="font-semibold">Payment methods</h3>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
            <span>Card payments</span>
            <Switch
              checked={s.card_enabled !== false}
              onCheckedChange={(v) => { setField("card_enabled", v); save("card_enabled", v); }}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/40 p-3">
            <span>Telegram Stars</span>
            <Switch
              checked={s.stars_enabled !== false}
              onCheckedChange={(v) => { setField("stars_enabled", v); save("stars_enabled", v); }}
            />
          </div>
          <div>
            <Label>Bot username (no @)</Label>
            <Input
              value={typeof s.bot_username === "string" ? s.bot_username : ""}
              onChange={(e) => setField("bot_username", e.target.value)}
              onBlur={(e) => save("bot_username", e.target.value)}
            />
          </div>
          <div>
            <Label>Referral reward (UZS)</Label>
            <Input
              type="number"
              value={typeof s.referral_reward === "number" ? s.referral_reward : 0}
              onChange={(e) => setField("referral_reward", Number(e.target.value))}
              onBlur={(e) => save("referral_reward", Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Bot webhook</h3>
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${webhook?.registered ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
            {webhook?.registered ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {webhook?.registered ? "Registered" : "Not registered"}
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          After deploying, register the webhook with Telegram by calling the <code className="rounded bg-secondary px-1">set-webhook</code> edge function once.
        </p>
        {webhook?.status?.result?.last_error_message && (
          <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{webhook.status.result.last_error_message}</p>
        )}
        {webhook?.telegram?.result?.last_error_message && (
          <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{webhook.telegram.result.last_error_message}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={webhookBusy}
          onClick={async () => {
            setWebhookBusy(true);
            const { data, error } = await supabase.functions.invoke("set-webhook");
            setWebhookBusy(false);
            if (error) return toast.error(error.message);
            setWebhook(data);
            data?.registered ? toast.success("Webhook registered") : toast.error(data?.telegram?.description || "Webhook not registered");
          }}
        >
          {webhookBusy ? "Checking..." : "Register webhook now"}
        </Button>
        <Button variant="outline" disabled={webhookBusy} onClick={checkWebhook}>
          <RefreshCw className="mr-2 h-4 w-4" /> Check status
        </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
