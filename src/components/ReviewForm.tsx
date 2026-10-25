import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export const ReviewForm = ({ onSubmitted }: { onSubmitted?: () => void }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async () => {
    if (!body.trim() || body.trim().length < 5) return toast.error(t("reviews.short"));
    setBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const display = profile?.full_name?.trim() || user.email?.split("@")[0] || t("common.anonymous");

    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      display_name: display,
      rating,
      body: body.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setBody("");
    setRating(5);
    toast.success(t("reviews.submitted"));
    onSubmitted?.();
  };

  return (
    <div className="rounded-2xl glass p-5 space-y-3">
      <h3 className="font-display text-lg font-bold">{t("reviews.write")}</h3>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            className="p-1"
            aria-label={t("reviews.rating", { count: i + 1 })}
          >
            <Star
              className={`h-6 w-6 transition-all ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("reviews.placeholder")}
        maxLength={500}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{body.length}/500</span>
        <Button onClick={submit} disabled={busy} className="bg-gradient-primary text-primary-foreground">
          {busy ? t("common.sending") : t("common.send")}
        </Button>
      </div>
    </div>
  );
};
