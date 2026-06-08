import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingBag, Wallet, TrendingUp, Crown, Star, Clock } from "lucide-react";
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

const StatCard = ({ icon: Icon, label, value, accent, trend }: { icon: any; label: string; value: string; accent?: string; trend?: string }) => (
  <div className="surface p-5">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${accent || "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</div>
    {trend && <div className="mt-1 text-xs text-success">{trend}</div>}
  </div>
);

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--accent))"];

const AdminDashboard = () => {
  const t = useAdminT();
  const [a, setA] = useState<Analytics | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    supabase.rpc("admin_analytics").then(({ data }) => { if (data) setA(data as unknown as Analytics); });
    supabase.from("orders").select("order_number,product_type,duration_months,stars_amount,amount_uzs,status,created_at,telegram_username")
      .order("created_at", { ascending: false }).limit(8).then(({ data }) => setRecent(data ?? []));
  }, []);

  const fmtUZS = (n: number) => `${Number(n).toLocaleString("ru-RU")}`;

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{t("dashboard")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bugungi savdo va asosiy metrikalar</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Bugungi tushum" value={`${fmtUZS(a?.revenue_today ?? 0)} UZS`} accent="bg-success/10 text-success" />
        <StatCard icon={TrendingUp} label="Oylik tushum" value={`${fmtUZS(a?.revenue_month ?? 0)} UZS`} />
        <StatCard icon={ShoppingBag} label="Kutilayotgan" value={(a?.pending_orders ?? 0).toLocaleString()} accent="bg-warning/10 text-warning" />
        <StatCard icon={Users} label="Foydalanuvchilar" value={(a?.total_users ?? 0).toLocaleString()} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Tushum (30 kun)</h3>
            <span className="text-xs text-muted-foreground">UZS</span>
          </div>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={a?.daily ?? []}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} formatter={(v: any) => [`${Number(v).toLocaleString("ru-RU")} UZS`, "Tushum"]} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Mahsulotlar bo'yicha</h3>
          <div className="mt-4 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={a?.by_product ?? []} dataKey="revenue" nameKey="type" innerRadius={50} outerRadius={90} paddingAngle={4}>
                  {(a?.by_product ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} formatter={(v: any, n: any) => [`${Number(v).toLocaleString("ru-RU")} UZS`, n]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 surface p-5">
        <h3 className="font-display text-base font-bold">Buyurtmalar (har kuni)</h3>
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a?.daily ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-6 surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-base font-bold">So'nggi faollik</h3>
          <span className="text-xs text-muted-foreground">Oxirgi 8 ta buyurtma</span>
        </div>
        <div className="table-scroll">
          <table className="w-full">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-4 font-medium">№</th>
                <th className="p-4 font-medium">Mahsulot</th>
                <th className="p-4 font-medium">Username</th>
                <th className="p-4 font-medium">Summa</th>
                <th className="p-4 font-medium">Holat</th>
                <th className="p-4 font-medium">Vaqt</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">—</td></tr>
              ) : recent.map((o) => (
                <tr key={o.order_number} className="border-t border-border">
                  <td className="p-4 font-mono text-xs">{o.order_number}</td>
                  <td className="p-4 text-sm">
                    {o.product_type === "premium"
                      ? <span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-primary" />{o.duration_months} oy</span>
                      : <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" />{o.stars_amount} ⭐</span>}
                  </td>
                  <td className="p-4 text-sm">{o.telegram_username || "—"}</td>
                  <td className="p-4 text-sm font-semibold">{Number(o.amount_uzs).toLocaleString("ru-RU")} UZS</td>
                  <td className="p-4"><span className={`pill pill-${o.status}`}>{t(o.status) || o.status}</span></td>
                  <td className="p-4 text-xs text-muted-foreground"><Clock className="mr-1 inline h-3 w-3" />{new Date(o.created_at).toLocaleString("ru-RU")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
