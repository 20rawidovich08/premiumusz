import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { Check, Crown } from "lucide-react";

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
    <div className="grid gap-5 md:grid-cols-3">
      {plans.map((p) => {
        const isPopular = p.id === popular;
        return (
          <div
            key={p.id}
            className={`surface surface-hover relative flex flex-col p-7 ${
              isPopular ? "ring-2 ring-primary shadow-glow" : ""
            }`}
          >
            {isPopular && (
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                {t("pricing.popular")}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold">
                {p.duration_months} {p.duration_months === 1 ? t("pricing.month") : t("pricing.months")}
              </h3>
            </div>
            <div className="mt-4 font-display text-4xl font-bold tracking-tight">
              {Number(p.price_uzs).toLocaleString("ru-RU")}
              <span className="ml-1 text-base font-normal text-muted-foreground">UZS</span>
            </div>
            {!compact && (
              <ul className="mt-6 space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Premium badge</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 4 GB fayl yuklash</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Tezroq yuklash</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Voice-to-text</li>
              </ul>
            )}
            <Button
              asChild
              className={`mt-7 h-11 w-full rounded-xl font-semibold ${
                isPopular ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
              }`}
              variant={isPopular ? "default" : "outline"}
            >
              <Link to={`/buy/premium?plan=${p.id}`}>{t("pricing.choose")}</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
};
