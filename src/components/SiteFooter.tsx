import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

export const SiteFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/50 mt-24">
      <div className="container py-8 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p>© {new Date().getFullYear()} Premium UZ — {t("footer.rights")}</p>
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/track" className="hover:text-foreground transition-colors">Buyurtmani kuzatish</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Foydalanish shartlari</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Maxfiylik</Link>
          </nav>
          <p className="font-mono text-xs opacity-70">v1.1</p>
        </div>
      </div>
    </footer>
  );
};
