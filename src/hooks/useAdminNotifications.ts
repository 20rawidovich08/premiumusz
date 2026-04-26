import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAdminT } from "@/lib/adminI18n";

const seenOrders = new Set<string>();
const seenTopups = new Set<string>();

const showBrowserNotification = (title: string, body: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/placeholder.svg" });
  }
};

export function useAdminNotifications() {
  const { isAdmin, loading } = useAuth();
  const t = useAdminT();
  const ready = useRef(false);

  useEffect(() => {
    if (loading || !isAdmin || ready.current) return;
    ready.current = true;

    const orders = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload: any) => {
          const order = payload.new;
          if (!order?.id || seenOrders.has(order.id)) return;
          seenOrders.add(order.id);
          const body = `${order.order_number || ""} · ${order.contact_phone || order.contact_telegram || order.telegram_target || ""}`;
          toast.success(`${t("newOrder")}: ${order.order_number || ""}`);
          showBrowserNotification(t("newOrder"), body);
        }
      )
      .subscribe();

    const topups = supabase
      .channel("admin-new-topups")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "balance_transactions", filter: "type=eq.topup" },
        (payload: any) => {
          const tx = payload.new;
          if (!tx?.id || seenTopups.has(tx.id)) return;
          seenTopups.add(tx.id);
          const amount = Number(tx.amount_uzs || 0).toLocaleString("ru-RU");
          toast.success(`${t("newTopup")}: ${amount} UZS`);
          showBrowserNotification(t("newTopup"), `${amount} UZS`);
        }
      )
      .subscribe();

    return () => {
      ready.current = false;
      supabase.removeChannel(orders);
      supabase.removeChannel(topups);
    };
  }, [loading, isAdmin, t]);
}

export async function requestAdminNotificationPermission(successText: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  if (permission === "granted") toast.success(successText);
  return permission === "granted";
}
