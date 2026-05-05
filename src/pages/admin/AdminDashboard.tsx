import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Wallet, TrendingUp, Crown, Star } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAdminT } from "@/lib/adminI18n";

interface Analytics {
  total_users: number;
  total_bot_users: number;
  pending_orders: number;
  approved_orders: number;
  revenue_today: number;
  revenue_month: number;
  revenue_total: number;
  daily: Array<{ date: string; revenue: number; orders: number }>;
  monthly?: Array<{ month: string; revenue: number; orders: number }>;
  by_product: Array<{ type: string; count: number; revenue: number }>;
  top_customers?: Array<{ name: string; phone: string; is_web: boolean; orders_count: number; total_spent: number }>;
}

const StatCard = ({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) => (
  <div className="rounded-2xl glass p-5">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent || "bg-primary/15 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-3 font-display text-2xl font-bold">{value}</div>
  </div>
);

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--accent))"];

const AdminDashboard = () => {
  const t = useAdminT();
  const [a, setA] = useState<Analytics | null>(null);

  useEffect(() => {
    supabase.rpc("admin_analytics").then(({ data, error }) => {
      if (error) {
        console.error("admin_analytics error", error);
        return;
      }
      if (data) setA(data as unknown as Analytics);
    });
  }, []);

  const fmtUZS = (n: number) => `${Number(n).toLocaleString("ru-RU")}`;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("dashboard")}</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Wallet} label={t("todayRevenue")} value={`${fmtUZS(a?.revenue_today ?? 0)} UZS`} accent="bg-success/15 text-success" />
        <StatCard icon={TrendingUp} label={t("monthRevenue")} value={`${fmtUZS(a?.revenue_month ?? 0)} UZS`} accent="bg-primary/15 text-primary" />
        <StatCard icon={Wallet} label={t("totalRevenue")} value={`${fmtUZS(a?.revenue_total ?? 0)} UZS`} accent="bg-accent/15 text-accent" />
        <StatCard icon={Users} label={t("webUsersCount")} value={(a?.total_users ?? 0).toLocaleString()} />
        <StatCard icon={Users} label={t("botUsersCount")} value={(a?.total_bot_users ?? 0).toLocaleString()} accent="bg-warning/15 text-warning" />
        <StatCard icon={ShoppingBag} label={t("pending")} value={(a?.pending_orders ?? 0).toLocaleString()} accent="bg-warning/15 text-warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl glass p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">{t("revenue30")}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a?.daily ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  formatter={(v: any) => [`${Number(v).toLocaleString("ru-RU")} UZS`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl glass p-5">
          <h3 className="mb-4 font-semibold">{t("byProduct")}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={a?.by_product ?? []}
                  dataKey="revenue"
                  nameKey="type"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {(a?.by_product ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  formatter={(v: any, n: any) => [`${Number(v).toLocaleString("ru-RU")} UZS`, n]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl glass p-5">
        <h3 className="mb-4 font-semibold">{t("ordersPerDay")}</h3>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
              />
              <Bar dataKey="orders" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {(a?.by_product ?? []).map((p, i) => (
          <div key={p.type} className="rounded-2xl glass p-5">
            <div className="flex items-center gap-2">
              {p.type === "premium" ? <Crown className="h-4 w-4 text-primary" /> : p.type === "stars" ? <Star className="h-4 w-4 fill-warning text-warning" /> : <Wallet className="h-4 w-4" />}
              <span className="text-sm font-medium capitalize">{p.type}</span>
            </div>
            <div className="mt-2 font-display text-xl font-bold">{p.count} {t("orders")}</div>
            <div className="text-sm text-muted-foreground">{Number(p.revenue).toLocaleString("ru-RU")} UZS</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
