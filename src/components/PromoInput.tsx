import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tag, Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  amount: number;
  type: "premium" | "stars" | "topup";
  onApply: (data: { code: string; discount: number; final: number } | null) => void;
}

export const PromoInput = ({ amount, type, onApply }: Props) => {
  const { t, locale } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<{ code: string; discount: number; final: number } | null>(null);

  const apply = async () => {
    if (!code.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("validate_promo_code", {
      p_code: code.trim(),
      p_amount: amount,
      p_type: type,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    const r = data as any;
    if (!r?.valid) {
      const errMap: Record<string, string> = {
        invalid: t("promo.invalid"),
        expired: t("promo.expired"),
        limit_reached: t("promo.limit_reached"),
        wrong_type: t("promo.wrong_type"),
        min_amount: t("promo.min_amount", { amount: r.min_amount }),
        already_used: t("promo.already_used"),
      };
      return toast.error(errMap[r?.error] || t("common.error"));
    }
    const next = { code: r.code, discount: Number(r.discount_uzs), final: Number(r.final_amount) };
    setApplied(next);
    onApply(next);
    toast.success(`${t("promo.discount")}: -${next.discount.toLocaleString(locale)} UZS`);
  };

  const clear = () => {
    setApplied(null);
    setCode("");
    onApply(null);
  };

  if (applied) {
    return (
      <div className="rounded-xl bg-success/10 border border-success/30 p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-success" />
          <span className="font-mono font-semibold">{applied.code}</span>
          <span className="text-success">-{applied.discount.toLocaleString(locale)} UZS</span>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={t("promo.remove")} onClick={clear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> {t("promo.label")}</Label>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PROMO2026"
          className="font-mono"
        />
        <Button onClick={apply} disabled={busy || !code.trim()} variant="outline">
          {busy ? "..." : t("promo.apply")}
        </Button>
      </div>
    </div>
  );
};
