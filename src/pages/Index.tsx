import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PricingCards } from "@/components/PricingCards";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, ShieldCheck, Zap } from "lucide-react";

const Index = () => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="container py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-primary-foreground/90">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {t("hero.badge")}
            </span>
            <h1 className="mt-6 whitespace-pre-line font-display text-5xl font-bold leading-tight md:text-7xl">
              <span className="text-gradient">{t("hero.title")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">{t("hero.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 rounded-xl bg-gradient-primary px-6 text-base font-semibold text-primary-foreground hover:opacity-90 glow-ring">
                <Link to="/pricing">
                  {t("hero.cta")} <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-border/60 bg-secondary/40 px-6 text-base font-semibold backdrop-blur">
                <Link to="/track">{t("nav.track")}</Link>
              </Button>
            </div>
          </div>

          {/* Floating cards */}
          <div className="relative mx-auto mt-20 max-w-4xl">
            <div className="absolute -inset-x-10 -inset-y-6 -z-10 rounded-[3rem] bg-gradient-primary opacity-20 blur-3xl" />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: Zap, t: t("features.fast.title"), d: t("features.fast.desc") },
                { icon: ShieldCheck, t: t("features.safe.title"), d: t("features.safe.desc") },
                { icon: Bot, t: t("features.support.title"), d: t("features.support.desc") },
              ].map((f, i) => (
                <div key={i} className="rounded-2xl glass p-6 animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="mb-1 font-semibold">{f.t}</h3>
                  <p className="text-sm text-muted-foreground">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="container py-16">
          <div className="mb-10 text-center">
            <h2 className="font-display text-4xl font-bold md:text-5xl">{t("pricing.title")}</h2>
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
