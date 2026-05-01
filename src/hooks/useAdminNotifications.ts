import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAdminT } from "@/lib/adminI18n";

const seenOrders = new Set<string>();
const seenTopups = new Set<string>();

const playBeep = () => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.05;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 250);
  } catch {}
};

const showBrowserNotification = async (title: string, body: string) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Try service worker first so notifications survive when tab is in background
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: "/placeholder.svg",
          badge: "/placeholder.svg",
          tag: "admin-alert-" + Date.now(),
          requireInteraction: true,
        } as any);
        return;
      }
    }
  } catch {}
  try {
    new Notification(title, { body, icon: "/placeholder.svg" });
  } catch {}
};

export function useAdminNotifications() {
  const { isAdmin, loading } = useAuth();
  const t = useAdminT();
  const ready = useRef(false);

  useEffect(() => {
    if (loading || !isAdmin || ready.current) return;
    ready.current = true;

    // Register service worker for background notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Auto-request notification permission once admin is detected
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

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
          playBeep();
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
          playBeep();
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
  if (permission === "granted") {
    toast.success(successText);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }
  return permission === "granted";
}
