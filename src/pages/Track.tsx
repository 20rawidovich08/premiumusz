import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
  paid: "bg-primary/20 text-primary",
};

const Track = () => {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const [num, setNum] = useState(params.get("n") ?? "");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const lookup = async (n: string) => {
    if (!n.trim()) return;
    setLoading(true);
    setNotFound(false);
    setOrder(null);
    const { data } = await supabase.rpc("get_order_by_number", { p_number: n.trim().toUpperCase() });
    setLoading(false);
    if (!data || (data as any[]).length === 0) setNotFound(true);
    else setOrder((data as any[])[0]);
  };

  useEffect(() => {
    if (params.get("n")) lookup(params.get("n")!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="Buyurtmani kuzatish — Premium UZ"
        description="Buyurtma raqami bo'yicha Telegram Premium yoki Stars buyurtmangiz holatini tekshiring."
        path="/track"
      />
      <SiteHeader />
      <main className="flex-1 container py-16">
        <div className="mx-auto max-w-xl">
          <h1 className="font-display text-3xl font-bold md:text-4xl">{t("track.title")}</h1>
          <div className="mt-6 flex gap-2">
            <Label htmlFor="track-input" className="sr-only">{t("track.placeholder")}</Label>
            <Input
              id="track-input"
              value={num}
              onChange={(e) => setNum(e.target.value)}
              placeholder={t("track.placeholder")}
              aria-label={t("track.placeholder")}
              className="h-12 rounded-xl font-mono"
              onKeyDown={(e) => e.key === "Enter" && lookup(num)}
            />
            <Button onClick={() => lookup(num)} disabled={loading} className="h-12 rounded-xl bg-gradient-primary px-5 text-primary-foreground">
              <Search className="mr-1 h-4 w-4" /> {t("track.search")}
            </Button>
          </div>

          {notFound && (
            <div className="mt-6 rounded-2xl glass p-6 text-center text-muted-foreground">
              {t("track.notfound")}
            </div>
          )}

          {order && (
            <div className="mt-6 rounded-3xl glass p-6 animate-fade-up">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">{t("order.orderNumber")}</div>
                  <div className="font-mono text-xl font-bold">{order.order_number}</div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[order.status] ?? ""}`}>
                  {t(`status.${order.status}`)}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-secondary/60 p-3">
                  <div className="text-xs text-muted-foreground">{t("order.plan")}</div>
                  <div className="mt-0.5 font-medium">
                    {order.duration_months} {order.duration_months === 1 ? t("pricing.month") : t("pricing.months")}
                  </div>
                </div>
                <div className="rounded-xl bg-secondary/60 p-3">
                  <div className="text-xs text-muted-foreground">{t("order.amount")}</div>
                  <div className="mt-0.5 font-medium">
                    {order.amount_uzs ? `${Number(order.amount_uzs).toLocaleString("ru-RU")} UZS` : "—"}
                  </div>
                </div>
              </div>
              {order.admin_note && (
                <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Note</div>
                  <div className="mt-0.5">{order.admin_note}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Track;
