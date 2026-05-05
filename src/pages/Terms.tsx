import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const Terms = () => (
  <div className="flex min-h-screen flex-col">
    <SiteHeader />
    <main className="flex-1 container py-12">
      <div className="mx-auto max-w-3xl rounded-3xl glass p-8 prose prose-invert prose-headings:font-display">
        <h1>Foydalanish shartlari</h1>
        <p className="text-sm text-muted-foreground">Oxirgi yangilanish: {new Date().toLocaleDateString("uz-UZ")}</p>

        <h2>1. Umumiy qoidalar</h2>
        <p>Ushbu sayt orqali Telegram Premium obuna va Telegram Stars sotib olishingiz mumkin. Saytdan foydalanish orqali siz quyidagi shartlarga rozilik bildirgan hisoblanasiz.</p>

        <h2>2. Xizmatlar</h2>
        <ul>
          <li>Telegram Premium obunasi (3, 6, 12 oy)</li>
          <li>Telegram Stars (50 ⭐ dan boshlab)</li>
          <li>Balansni to'ldirish va undan xaridlar</li>
        </ul>

        <h2>3. To'lov</h2>
        <p>To'lovlar O'zbekiston so'mida (UZS) bank kartalari orqali qabul qilinadi. To'lovdan keyin chek rasmini yuklash majburiy. Admin tasdiqlagandan so'ng buyurtma bajariladi.</p>

        <h2>4. Yetkazib berish muddati</h2>
        <p>To'lov tasdiqlangach 5–30 daqiqa ichida. Texnik nosozliklar bo'lsa 24 soat ichida.</p>

        <h2>5. Pulni qaytarish</h2>
        <p>Buyurtma rad etilsa pul balansga avtomatik qaytariladi. Bajarilgan buyurtmalar qaytarilmaydi (Telegram qoidalariga muvofiq).</p>

        <h2>6. Foydalanuvchining majburiyatlari</h2>
        <p>Siz haqiqiy ma'lumot kiritishingiz va to'g'ri Telegram username ko'rsatishingiz shart. Noto'g'ri ma'lumot tufayli yuzaga kelgan zararlar uchun sayt javobgar emas.</p>

        <h2>7. Aloqa</h2>
        <p>Savollar bo'yicha Telegram bot yoki sayt ichidagi chat orqali murojaat qiling.</p>
      </div>
    </main>
    <SiteFooter />
  </div>
);
export default Terms;
