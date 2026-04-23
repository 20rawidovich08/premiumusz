import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingCards } from "@/components/PricingCards";
import { useI18n } from "@/lib/i18n";

const Pricing = () => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 container py-16">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold md:text-5xl">{t("pricing.title")}</h1>
          <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
        <PricingCards />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Pricing;
