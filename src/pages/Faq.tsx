import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Seo } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";
import { HelpCircle } from "lucide-react";

const FAQS_UZ = [
  { q: "Premium qanchada faollashadi?", a: "To'lov tasdiqlangach 5–30 daqiqa ichida Premium akkauntingizga ulanadi. Odatda 10 daqiqada tayyor bo'ladi." },
  { q: "Stars qanday ishlaydi?", a: "Telegram Stars — Telegram ilovasidagi virtual valyuta. Sotib olganingizdan so'ng to'g'ridan-to'g'ri akkauntingizga yuboriladi." },
  { q: "To'lov qaysi usullarda qabul qilinadi?", a: "Hozircha karta orqali (Humo, Uzcard, Visa). Tez orada Click, Payme va Uzum bank integratsiyasi qo'shiladi." },
  { q: "Pulim qaytariladimi?", a: "Agar buyurtma rad etilsa balansingizga avtomatik qaytariladi. Tasdiqlangan buyurtmalar qaytarib bo'lmaydi." },
  { q: "Boshqa odamga Premium sovg'a qila olamanmi?", a: "Ha. Buyurtma berishda ularning @username manzilini ko'rsating." },
  { q: "Promokod qayerga kiritiladi?", a: "Premium yoki Stars sotib olish sahifasida \"Promokod\" maydoniga kiriting va \"Qo'llash\" tugmasini bosing." },
  { q: "Telegram username noto'g'ri bo'lsa?", a: "Username 5–32 belgi, faqat harflar/raqamlar va _, @ bilan boshlanishi kerak. Akkauntingizda Settings → Username dan tekshiring." },
  { q: "Support bilan qanday bog'lanaman?", a: "O'ng pastdagi chat tugmasi orqali yoki Telegram botimiz orqali yozing." },
];

const Faq = () => {
  const { t } = useI18n();
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS_UZ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="Tez-tez so'raladigan savollar — Premium UZ"
        description="Telegram Premium va Stars xaridi, to'lov, yetkazib berish va boshqa savollarga javoblar."
        path="/faq"
        jsonLd={faqJsonLd}
      />
      <SiteHeader />
      <main className="flex-1 container py-12">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-medium text-primary">
              <HelpCircle className="h-3.5 w-3.5" /> FAQ
            </div>
            <h1 className="mt-4 font-display text-4xl font-bold">Ko'p so'raladigan savollar</h1>
            <p className="mt-2 text-muted-foreground">Eng ko'p uchraydigan savollarga javoblar</p>
          </div>
          <div className="mt-8 rounded-3xl glass p-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQS_UZ.map((f, i) => (
                <AccordionItem value={`q${i}`} key={i}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};
export default Faq;
