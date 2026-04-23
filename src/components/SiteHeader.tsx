import { Link, NavLink } from "react-router-dom";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useI18n } from "@/lib/i18n";
import { Sparkles } from "lucide-react";

export const SiteHeader = () => {
  const { t } = useI18n();
  const navItems = [
    { to: "/", label: t("nav.home") },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/order", label: t("nav.order") },
    { to: "/track", label: t("nav.track") },
  ];
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="container flex items-center justify-between py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary glow-ring">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="text-gradient">Premium UZ</span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full glass px-2 py-1 md:flex">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <LangSwitcher />
      </div>
    </header>
  );
};
