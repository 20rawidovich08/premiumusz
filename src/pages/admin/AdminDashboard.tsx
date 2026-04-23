import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Wallet, Star, TrendingUp } from "lucide-react";

interface Stats {
  users: number;
  orders: number;
  pending: number;
  revenueCard: number;
  revenueStars: number;
}

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) => (
  <div className="rounded-2xl glass p-5">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent || "bg-primary/15 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-3 font-display text-3xl font-bold">{value}</div>
  </div>
);

const AdminDashboard = () => {
  const [s, setS] = useState<Stats>({ users: 0, orders: 0, pending: 0, revenueCard: 0, revenueStars: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: orders }, { count: pending }, { data: cardRev }, { data: starsRev }] = await Promise.all([
        supabase.from("bot_users").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("amount_uzs").eq("status", "approved").eq("payment_method", "card"),
        supabase.from("orders").select("amount_stars").eq("status", "paid").eq("payment_method", "stars"),
      ]);
      const revC = (cardRev ?? []).reduce((a, r: any) => a + Number(r.amount_uzs || 0), 0);
      const revS = (starsRev ?? []).reduce((a, r: any) => a + Number(r.amount_stars || 0), 0);
      setS({ users: users ?? 0, orders: orders ?? 0, pending: pending ?? 0, revenueCard: revC, revenueStars: revS });
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={Users} label="Bot users" value={s.users.toLocaleString()} />
        <StatCard icon={ShoppingBag} label="Total orders" value={s.orders.toLocaleString()} accent="bg-accent/15 text-accent" />
        <StatCard icon={TrendingUp} label="Pending" value={s.pending.toLocaleString()} accent="bg-warning/15 text-warning" />
        <StatCard icon={Wallet} label="Card revenue" value={`${s.revenueCard.toLocaleString("ru-RU")} UZS`} accent="bg-success/15 text-success" />
        <StatCard icon={Star} label="Stars revenue" value={`⭐ ${s.revenueStars.toLocaleString()}`} accent="bg-warning/15 text-warning" />
      </div>
    </div>
  );
};

export default AdminDashboard;
