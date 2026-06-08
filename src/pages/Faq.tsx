import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Seo } from "@/lib/seo";
import { HelpCircle, MessageCircle, Send, BookOpen, LifeBuoy } from "lucide-react";
import { openSupportChat } from "@/components/SupportChat";
import { Button } from "@/components/ui/button";

const FAQS = [
  { q: "Premium qanchada faollashadi?", a: "To'lov tasdiqlangach 5–30 daqiqa ichida Premium akkauntingizga ulanadi." },
  { q: "Stars qanday ishlaydi?", a: "Telegram Stars — Telegram ilovasidagi virtual valyuta. Sotib olganingizdan so'ng to'g'ridan-to'g'ri akkauntingizga yuboriladi." },
  { q: "To'lov qaysi usullarda qabul qilinadi?", a: "Hozircha karta orqali (Humo, Uzcard, Visa). Tez orada Click, Payme va Uzum integratsiyasi." },
  { q: "Pulim qaytariladimi?", a: "Agar buyurtma rad etilsa balansingizga avtomatik qaytariladi. Tasdiqlanganlar qaytarib bo'lmaydi." },
  { q: "Boshqa odamga Premium sovg'a qila olamanmi?", a: "Ha. Buyurtma berishda ularning @username manzilini ko'rsating." },
  { q: "Promokod qayerga kiritiladi?", a: "Premium yoki Stars sotib olish sahifasida \"Promokod\" maydoniga kiriting va \"Qo'llash\" tugmasini bosing." },
  { q: "Telegram username noto'g'ri bo'lsa?", a: "Username 5–32 belgi, faqat harflar/raqamlar va _, @ bilan boshlanishi kerak." },
  { q: "Support bilan qanday bog'lanaman?", a: "O'ng pastdagi chat tugmasi orqali yoki Telegram bot orqali yozing." },
];

const Faq = () => {
  const faqJsonLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <div className="flex min-h-screen flex-col">
      <Seo title="Yordam markazi — Premium Usz" description="Premium, Stars va to'lovlar bo'yicha savol-javoblar." path="/faq" jsonLd={faqJsonLd} />
      <SiteHeader />
      <main className="flex-1 container py-10 md:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <LifeBuoy className="h-3.5 w-3.5" /> Yordam markazi
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold md:text-4xl">Sizga qanday yordam beramiz?</h1>
            <p className="mt-2 text-muted-foreground">Ko'p so'raladigan savollarga javoblar yoki bizga to'g'ridan-to'g'ri yozing</p>
          </div>

          {/* Contact options */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { icon: MessageCircle, title: "Saytdagi chat", desc: "Bir necha daqiqada javob", action: () => openSupportChat(), label: "Chatni ochish" },
              { icon: Send, title: "Telegram bot", desc: "Tezkor xabar almashish", href: "https://t.me/", label: "Botni ochish" },
              { icon: BookOpen, title: "Blog", desc: "Yangiliklar va qo'llanmalar", to: "/blog", label: "Blogni ko'rish" },
            ].map((c, i) => (
              <div key={i} className="surface surface-hover p-5">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-base font-bold">{c.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                {c.action ? (
                  <Button onClick={c.action} variant="outline" size="sm" className="mt-3 w-full">{c.label}</Button>
                ) : c.href ? (
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full"><a href={c.href} target="_blank" rel="noreferrer">{c.label}</a></Button>
                ) : (
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full"><a href={c.to!}>{c.label}</a></Button>
                )}
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold">
              <HelpCircle className="h-5 w-5 text-primary" /> Tez-tez so'raladigan savollar
            </h2>
            <div className="mt-4 surface p-2 md:p-4">
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((f, i) => (
                  <AccordionItem value={`q${i}`} key={i}>
                    <AccordionTrigger className="px-3 text-left text-sm font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                    <AccordionContent className="px-3 text-sm text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};
export default Faq;
