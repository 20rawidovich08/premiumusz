import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";

const Privacy = () => {
  const { t, locale } = useI18n();
  return (
  <div className="flex min-h-screen flex-col">
    <Seo
      title={`${t("footer.privacy")} — Premium Usz`}
      description={t("footer.privacy")}
      path="/privacy"
    />
    <SiteHeader />
    <main className="flex-1 container py-12">
      <div className="mx-auto max-w-3xl rounded-3xl glass p-8 prose prose-invert prose-headings:font-display">
        <h1>{t("footer.privacy")}</h1>
        <p className="text-sm text-muted-foreground">{t("common.updated")}: {new Date().toLocaleDateString(locale)}</p>
        <h2>{t("privacy.data")}</h2>
        <ul>
          <li>{t("privacy.email")}</li>
          <li>{t("privacy.identity")}</li>
          <li>{t("privacy.receipts")}</li>
          <li>{t("privacy.history")}</li>
        </ul>
        <h2>{t("privacy.purpose")}</h2>
        <p>{t("privacy.purposeText")}</p>
        <h2>{t("privacy.storage")}</h2>
        <p>{t("privacy.storageText")}</p>
        <h2>{t("privacy.cookies")}</h2>
        <p>{t("privacy.cookiesText")}</p>
        <h2>{t("privacy.rights")}</h2>
        <ul>
          <li>{t("privacy.view")}</li>
          <li>{t("privacy.delete")}</li>
          <li>{t("privacy.export")}</li>
        </ul>
        <h2>{t("privacy.contact")}</h2>
        <p>{t("privacy.contactText")}</p>
      </div>
    </main>
    <SiteFooter />
  </div>
);
};
export default Privacy;
