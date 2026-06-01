import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingCards } from "@/components/PricingCards";
import { Seo } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";

const Pricing = () => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="Telegram Premium tariflari — 3, 6, 12 oy | Premium UZ"
        description="Telegram Premium obunaning eng arzon narxlari O'zbekistonda. 3, 6 va 12 oylik tariflarni karta orqali xarid qiling."
        path="/pricing"
      />
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
