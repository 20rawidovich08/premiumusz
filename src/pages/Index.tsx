import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingCards } from "@/components/PricingCards";
import { Seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, ShieldCheck, Zap, Star, Wallet, Gift, Sparkles, Clock, CreditCard } from "lucide-react";

const Index = () => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="Premium Usz — Telegram Premium va Stars xarid qilish"
        description="O'zbekistonda Telegram Premium obuna (3, 6, 12 oy) va Telegram Stars'ni karta orqali tez va xavfsiz xarid qiling. 5–30 daqiqada faollashadi."
        path="/"
      />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-12 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {t("hero.badge")}
            </span>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] md:text-7xl">
              <span className="text-gradient-rainbow">{t("hero.title")}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              {t("hero.subtitle")}
            </p>
          </div>
        </section>

        {/* Bento Grid */}
        <section className="container pb-12">
          <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Premium - large */}
            <Link
              to="/pricing"
              className="bento bento-violet group sm:col-span-2 lg:row-span-2 flex flex-col justify-between"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              <div>
                <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-background/30 backdrop-blur">
                  <Sparkles className="h-6 w-6" style={{ color: "hsl(var(--c-violet))" }} />
                </div>
                <h2 className="font-display text-3xl font-bold md:text-4xl">{t("buy.premium")}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  3, 6 yoki 12 oylik Telegram Premium obunani sotib oling.
                </p>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-transform group-hover:translate-x-1">
                {t("hero.cta")} <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            {/* Stars */}
            <Link to="/stars" className="bento bento-amber group flex flex-col justify-between">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-background/30">
                <Star className="h-5 w-5 fill-warning text-warning" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">{t("nav.stars")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Joriy kurs bo'yicha</p>
              </div>
              <ArrowRight className="mt-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* NFT Gifts - new */}
            <Link to="/gifts" className="bento bento-magenta group flex flex-col justify-between">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-background/30">
                <Gift className="h-5 w-5" style={{ color: "hsl(var(--c-magenta))" }} />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">NFT Gift</h3>
                <p className="mt-1 text-xs text-muted-foreground">Telegram NFT to'plami</p>
              </div>
              <ArrowRight className="mt-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            {/* Balance */}
            <Link to="/topup" className="bento bento-cyan group flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-background/30">
                <Wallet className="h-5 w-5" style={{ color: "hsl(var(--c-cyan))" }} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold">{t("nav.topup")}</h3>
                <p className="text-xs text-muted-foreground">Karta orqali tez</p>
              </div>
            </Link>

            {/* Track */}
            <Link to="/track" className="bento bento-mint group flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-background/30">
                <Clock className="h-5 w-5" style={{ color: "hsl(var(--c-mint))" }} />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold">{t("nav.track")}</h3>
                <p className="text-xs text-muted-foreground">Buyurtma holati</p>
              </div>
            </Link>

            {/* Feature: fast */}
            <div className="bento bento-coral">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-background/30">
                <Zap className="h-5 w-5" style={{ color: "hsl(var(--c-coral))" }} />
              </div>
              <h3 className="font-display font-bold">{t("features.fast.title")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("features.fast.desc")}</p>
            </div>

            {/* Feature: secure */}
            <div className="bento">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-background/30">
                <ShieldCheck className="h-5 w-5" style={{ color: "hsl(var(--c-mint))" }} />
              </div>
              <h3 className="font-display font-bold">{t("features.safe.title")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("features.safe.desc")}</p>
            </div>

            {/* Feature: support */}
            <div className="bento bento-violet">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-background/30">
                <Bot className="h-5 w-5" style={{ color: "hsl(var(--c-violet))" }} />
              </div>
              <h3 className="font-display font-bold">{t("features.support.title")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("features.support.desc")}</p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="container py-12">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold md:text-5xl">{t("pricing.title")}</h2>
            <p className="mt-3 text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <PricingCards />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
