import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UserCircle2 } from "lucide-react";

const USERNAME_RE = /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

/**
 * Shown automatically after the user signs in if either phone or telegram_username
 * is missing on their profile. Both fields are required to use buy/topup features.
 */
export function CompleteProfileDialog() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [tg, setTg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone,telegram_username")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (!data?.phone || !data?.telegram_username) {
        setPhone(data?.phone ?? "");
        setTg(data?.telegram_username ?? "");
        setOpen(true);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const save = async () => {
    if (!user) return;
    const phoneTrim = phone.trim();
    const tgTrim = tg.trim();
    if (phoneTrim.length < 7) return toast.error(t("complete.phoneInvalid"));
    if (!USERNAME_RE.test(tgTrim)) return toast.error(t("complete.usernameInvalid"));
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: phoneTrim, telegram_username: tgTrim })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.savedToast"));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { /* required — no dismiss */ if (!o) return; setOpen(o); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary">
            <UserCircle2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center">{t("complete.title")}</DialogTitle>
          <DialogDescription className="text-center">
            {t("complete.subtitle")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("complete.phone")} *</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998 90 123 45 67"
              className="mt-1.5"
              inputMode="tel"
            />
          </div>
          <div>
            <Label>{t("complete.username")} *</Label>
            <Input
              value={tg}
              onChange={(e) => setTg(e.target.value.startsWith("@") ? e.target.value : "@" + e.target.value.replace(/^@*/, ""))}
              placeholder="@username"
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("complete.usernameHelp")}</p>
          </div>
          <Button onClick={save} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
            {busy ? t("common.loading") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
