import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const Privacy = () => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <main className="flex-1 container py-12">
      <div className="mx-auto max-w-3xl rounded-3xl glass p-8 prose prose-invert prose-headings:font-display">
        <h1>Maxfiylik siyosati</h1>
        <p className="text-sm text-muted-foreground">Oxirgi yangilanish: {new Date().toLocaleDateString("uz-UZ")}</p>

        <h2>1. Yig'ilgan ma'lumotlar</h2>
        <ul>
          <li>Email manzil (ro'yxatdan o'tishda)</li>
          <li>F.I.Sh., telefon raqami, Telegram username</li>
          <li>To'lov cheklari rasmlari</li>
          <li>Buyurtmalar tarixi va balans tranzaksiyalari</li>
        </ul>

        <h2>2. Foydalanish maqsadi</h2>
        <p>Ma'lumotlar faqat buyurtmalarni qayta ishlash, to'lovlarni tasdiqlash va sizga xizmat ko'rsatish uchun ishlatiladi. Uchinchi shaxslarga sotilmaydi.</p>

        <h2>3. Saqlanish</h2>
        <p>Barcha ma'lumotlar shifrlangan holda himoyalangan serverlarda saqlanadi. To'lov cheklari xavfsiz storage'da saqlanadi va faqat admin foydalana oladi.</p>

        <h2>4. Cookie va analitika</h2>
        <p>Sayt ishlashi uchun zarur cookie'lardan foydalanamiz (sessiya, til). Tashqi tracker'lar yo'q.</p>

        <h2>5. Foydalanuvchi huquqlari</h2>
        <ul>
          <li>O'z ma'lumotlaringizni ko'rish</li>
          <li>Akkauntni o'chirishni so'rash</li>
          <li>Ma'lumotlaringizni eksport qilish</li>
        </ul>

        <h2>6. Aloqa</h2>
        <p>Maxfiylik bo'yicha savollar uchun Telegram bot orqali murojaat qiling.</p>
      </div>
    </main>
    <SiteFooter />
  </div>
);
export default Privacy;
