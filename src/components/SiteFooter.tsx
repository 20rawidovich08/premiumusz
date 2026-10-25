import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Send } from "lucide-react";

export const SiteFooter = () => {
  const { t } = useI18n();
  const cols = [
    {
      title: t("footer.products"),
      links: [
        { to: "/stars", label: "Telegram Stars" },
        { to: "/pricing", label: "Telegram Premium" },
        { to: "/gifts", label: "NFT Gift" },
      ],
    },
    {
      title: t("footer.account"),
      links: [
        { to: "/profile", label: t("nav.profile") },
        { to: "/topup", label: t("nav.topup") },
        { to: "/track", label: t("nav.track") },
      ],
    },
    {
      title: t("footer.company"),
      links: [
        { to: "/faq", label: t("faq.center") },
        { to: "/terms", label: t("footer.terms") },
        { to: "/privacy", label: t("footer.privacy") },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-border bg-card/60">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Send className="h-4 w-4 -rotate-45" />
              </span>
              <span className="font-display text-base font-bold">Premium <span className="text-primary">Usz</span></span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold">{c.title}</h4>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-muted-foreground hover:text-primary">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Premium Usz Store — {t("footer.rights")}</p>
          <p className="font-mono opacity-60">v2.0</p>
        </div>
      </div>
    </footer>
  );
};
