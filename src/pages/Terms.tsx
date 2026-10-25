import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";

const Terms = () => {
  const { t, locale } = useI18n();
  return (
  <div className="flex min-h-screen flex-col">
    <Seo
      title={`${t("footer.terms")} — Premium Usz`}
      description={t("footer.terms")}
      path="/terms"
    />
    <SiteHeader />
    <main className="flex-1 container py-12">
      <div className="mx-auto max-w-3xl rounded-3xl glass p-8 prose prose-invert prose-headings:font-display">
        <h1>{t("footer.terms")}</h1>
        <p className="text-sm text-muted-foreground">{t("common.updated")}: {new Date().toLocaleDateString(locale)}</p>
        <h2>{t("terms.general")}</h2>
        <p>{t("terms.generalText")}</p>
        <h2>{t("terms.services")}</h2>
        <ul>
          <li>{t("terms.premium")}</li>
          <li>{t("terms.stars")}</li>
          <li>{t("terms.balance")}</li>
        </ul>
        <h2>{t("terms.payment")}</h2>
        <p>{t("terms.paymentText")}</p>
        <h2>{t("terms.delivery")}</h2>
        <p>{t("terms.deliveryText")}</p>
        <h2>{t("terms.refund")}</h2>
        <p>{t("terms.refundText")}</p>
        <h2>{t("terms.obligations")}</h2>
        <p>{t("terms.obligationsText")}</p>
        <h2>{t("terms.contact")}</h2>
        <p>{t("terms.contactText")}</p>
      </div>
    </main>
    <SiteFooter />
  </div>
);
};
export default Terms;
