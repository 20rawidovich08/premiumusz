import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";

interface Plan {
  id: string;
  duration_months: number;
  price_uzs: number;
}

export const PricingCards = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useI18n();
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    supabase
      .from("plans")
      .select("id,duration_months,price_uzs")
      .eq("active", true)
      .order("duration_months")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const popular = plans.find((p) => p.duration_months === 6)?.id ?? plans.find((p) => p.duration_months === 3)?.id;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((p) => {
        const isPopular = p.id === popular;
        return (
          <div
            key={p.id}
            className={`relative flex flex-col rounded-3xl glass p-7 transition-all hover:-translate-y-1 hover:shadow-glow ${
              isPopular ? "border-primary/40 ring-1 ring-primary/30" : ""
            }`}
          >
            {isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {t("pricing.popular")}
              </span>
            )}
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl font-bold">
                {p.duration_months} {p.duration_months === 1 ? t("pricing.month") : t("pricing.months")}
              </h3>
            </div>
            <div className="mb-6 text-4xl font-display font-bold">
              {Number(p.price_uzs).toLocaleString("ru-RU")} <span className="text-base font-normal text-muted-foreground">UZS</span>
            </div>
            {!compact && (
              <ul className="mb-6 space-y-2 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> Premium badge</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> 4 GB upload</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> Faster downloads</li>
                <li className="flex gap-2"><Check className="h-4 w-4 text-success" /> Voice-to-text</li>
              </ul>
            )}
            <Button asChild className="mt-auto h-12 rounded-xl bg-gradient-primary font-semibold text-primary-foreground hover:opacity-90">
              <Link to={`/buy/premium?plan=${p.id}`}>{t("pricing.choose")}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
};
