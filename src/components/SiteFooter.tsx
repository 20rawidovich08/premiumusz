import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { HelpCircle, Package, FileText, Shield } from "lucide-react";

const links = [
  { to: "/faq", label: "Tez-tez so'raladigan savollar", icon: HelpCircle },
  { to: "/track", label: "Buyurtmani kuzatish", icon: Package },
  { to: "/terms", label: "Foydalanish shartlari", icon: FileText },
  { to: "/privacy", label: "Maxfiylik siyosati", icon: Shield },
];

export const SiteFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/50 mt-16">
      <div className="container py-10">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 rounded-2xl glass p-4 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
                <Icon className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="text-sm font-medium group-hover:text-primary">{label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Premium UZ — {t("footer.rights")}</p>
          <p className="font-mono opacity-70">v1.2</p>
        </div>
      </div>
    </footer>
  );
};
