import { useI18n } from "@/lib/i18n";

export const SiteFooter = () => {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/50 mt-24">
      <div className="container flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} Premium UZ — {t("footer.rights")}</p>
        <p className="font-mono text-xs opacity-70">v1.0</p>
      </div>
    </footer>
  );
};
