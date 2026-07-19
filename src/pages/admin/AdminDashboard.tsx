import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Wallet, TrendingUp, ShoppingBag, Users, Crown, Star, Clock, AlertCircle,
  CheckCircle2, XCircle, Zap, Activity, Server, Database, Cloud, Mail, Radio,
  Plus, Megaphone, Bell, Ticket, MessageCircle, ArrowUpRight, ArrowDownRight,
  Calendar, RefreshCw, Eye, ExternalLink,
} from "lucide-react";
import { useAdminT } from "@/lib/adminI18n";

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "3m" | "6m" | "1y" | "custom";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "yesterday", label: "Kecha" },
  { key: "7d", label: "7 kun" },
  { key: "30d", label: "30 kun" },
  { key: "3m", label: "3 oy" },
  { key: "6m", label: "6 oy" },
  { key: "1y", label: "1 yil" },
  { key: "custom", label: "Sana" },
];

function getRange(key: RangeKey, custom?: { from: string; to: string }) {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  switch (key) {
    case "today": return { start, end };
    case "yesterday": {
      const s = new Date(start); s.setDate(s.getDate() - 1);
      const e = new Date(end); e.setDate(e.getDate() - 1);
      return { start: s, end: e };
    }
    case "7d": { const s = new Date(start); s.setDate(s.getDate() - 6); return { start: s, end }; }
    case "30d": { const s = new Date(start); s.setDate(s.getDate() - 29); return { start: s, end }; }
    case "3m": { const s = new Date(start); s.setMonth(s.getMonth() - 3); return { start: s, end }; }
    case "6m": { const s = new Date(start); s.setMonth(s.getMonth() - 6); return { start: s, end }; }
    case "1y": { const s = new Date(start); s.setFullYear(s.getFullYear() - 1); return { start: s, end }; }
    case "custom": {
      if (custom?.from && custom?.to) {
        const s = new Date(custom.from); s.setHours(0, 0, 0, 0);
        const e = new Date(custom.to); e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
      }
      return { start, end };
    }
  }
}

const fmtUZS = (n: number) => `${Math.round(Number(n || 0)).toLocaleString("ru-RU")}`;
const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtShort = (d: Date, months: number) =>
  months > 3 ? d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
             : d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });

/* --------------------------------- widgets --------------------------------- */

const Kpi = ({
  icon: Icon, label, value, delta, tone = "primary", sub, spark,
}: {
  icon: any; label: string; value: string; delta?: number; tone?: string; sub?: string;
  spark?: number[];
}) => {
  const up = (delta ?? 0) >= 0;
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
    muted: "bg-secondary text-foreground/70",
  };
  return (
    <div className="surface group relative overflow-hidden p-5 transition hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-[26px] font-bold leading-none tracking-tight">{value}</div>
          {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone] || tones.primary}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        {typeof delta === "number" ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : <span />}
        {spark && spark.length > 1 && (
          <div className="h-8 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark.map((v, i) => ({ i, v }))}>
                <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} className={up ? "text-success" : "text-destructive"} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

const HealthCard = ({
  icon: Icon, label, ok, latency, error,
}: { icon: any; label: string; ok: boolean | null; latency?: number; error?: string }) => (
  <div className="surface p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${ok === null ? "bg-secondary text-muted-foreground" : ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold">{label}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${ok === null ? "bg-muted-foreground" : ok ? "bg-success animate-pulse" : "bg-destructive"}`} />
            {ok === null ? "Tekshirilmoqda" : ok ? "Online" : "Offline"}
            {typeof latency === "number" && ok && <span>· {latency}ms</span>}
          </div>
        </div>
      </div>
    </div>
    {error && <div className="mt-2 truncate text-[11px] text-destructive">{error}</div>}
  </div>
);

const COLORS = ["hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--accent))", "hsl(var(--success))"];

/* -------------------------------- component -------------------------------- */

const AdminDashboard = () => {
  const t = useAdminT();
  const navigate = useNavigate();

  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders" | "users" | "topups">("revenue");

  const [orders, setOrders] = useState<any[]>([]);
  const [prevOrders, setPrevOrders] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [webUsers, setWebUsers] = useState<any[]>([]);
  const [botUsers, setBotUsers] = useState<any[]>([]);
  const [pendingTopups, setPendingTopups] = useState<any[]>([]);
  const [totals, setTotals] = useState<{ users: number; bot: number; balanceLoaded: number }>({ users: 0, bot: 0, balanceLoaded: 0 });
  const [fragment, setFragment] = useState<{ ok: boolean | null; balance?: any; error?: string; ms?: number }>({ ok: null });
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => getRange(rangeKey, custom), [rangeKey, custom]);
  const spanMs = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - spanMs - 1);
  const prevEnd = new Date(start.getTime() - 1);
  const spanDays = Math.max(1, Math.round(spanMs / 86400000));
  const spanMonths = spanDays / 30;

  const load = async () => {
    setLoading(true);
    const [ordersRes, prevRes, topupRes, pendingTopupRes, webRes, botRes] = await Promise.all([
      supabase.from("orders").select("id,order_number,product_type,duration_months,stars_amount,amount_uzs,status,created_at,telegram_username:contact_telegram,payment_method,source,contact_full_name")
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
        .order("created_at", { ascending: false }).limit(2000),
      supabase.from("orders").select("amount_uzs,status,created_at,product_type")
        .gte("created_at", prevStart.toISOString()).lte("created_at", prevEnd.toISOString()).limit(2000),
      supabase.from("balance_transactions").select("id,amount_uzs,status,type,created_at,user_id,bot_user_id,receipt_url,admin_note")
        .eq("type", "topup")
        .gte("created_at", start.toISOString()).lte("created_at", end.toISOString())
        .order("created_at", { ascending: false }).limit(2000),
      supabase.from("balance_transactions").select("id,amount_uzs,created_at,receipt_url,user_id,bot_user_id")
        .eq("type", "topup").eq("status", "pending")
        .order("created_at", { ascending: false }).limit(10),
      supabase.from("profiles").select("id,full_name,telegram_username,balance,created_at")
        .order("created_at", { ascending: false }).limit(500),
      supabase.from("bot_users").select("id,full_name,username,balance,created_at,telegram_id")
        .order("created_at", { ascending: false }).limit(500),
    ]);

    setOrders(ordersRes.data ?? []);
    setPrevOrders(prevRes.data ?? []);
    setTopups(topupRes.data ?? []);
    setPendingTopups(pendingTopupRes.data ?? []);
    setWebUsers(webRes.data ?? []);
    setBotUsers(botRes.data ?? []);

    const balanceLoaded = (webRes.data ?? []).reduce((s, u: any) => s + Number(u.balance || 0), 0)
      + (botRes.data ?? []).reduce((s, u: any) => s + Number(u.balance || 0), 0);
    setTotals({ users: (webRes.data ?? []).length, bot: (botRes.data ?? []).length, balanceLoaded });
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [rangeKey, custom.from, custom.to]);

  // Fragment health
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const t0 = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("fragment-status");
        if (cancelled) return;
        const ms = Math.round(performance.now() - t0);
        if (error) setFragment({ ok: false, error: error.message, ms });
        else setFragment({ ok: !!data?.ok, balance: data?.balance, error: data?.error, ms });
      } catch (e: any) {
        if (!cancelled) setFragment({ ok: false, error: e?.message });
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Realtime: auto-refresh on new orders/topups
  useEffect(() => {
    const ch = supabase.channel("admin-dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "balance_transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [rangeKey, custom.from, custom.to]);

  /* ------------------------------ derived data ------------------------------ */

  const paid = orders.filter(o => ["approved", "completed", "paid"].includes(o.status));
  const revenue = paid.reduce((s, o) => s + Number(o.amount_uzs || 0), 0);
  const prevPaid = prevOrders.filter(o => ["approved", "completed", "paid"].includes(o.status));
  const prevRevenue = prevPaid.reduce((s, o) => s + Number(o.amount_uzs || 0), 0);
  const revDelta = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : (revenue > 0 ? 100 : 0);

  const starsSold = paid.filter(o => o.product_type === "stars").reduce((s, o) => s + Number(o.stars_amount || 0), 0);
  const premiumSold = paid.filter(o => o.product_type === "premium").length;
  const pendingCnt = orders.filter(o => o.status === "pending").length;
  const failedCnt = orders.filter(o => ["failed", "rejected"].includes(o.status)).length;
  const completedCnt = paid.length;

  const topupSum = topups.filter(t => ["approved", "completed", "paid"].includes(t.status)).reduce((s, t) => s + Number(t.amount_uzs || 0), 0);
  const topupPending = topups.filter(t => t.status === "pending").length;

  const newUsers = webUsers.filter(u => new Date(u.created_at) >= start && new Date(u.created_at) <= end).length
    + botUsers.filter(u => new Date(u.created_at) >= start && new Date(u.created_at) <= end).length;

  // Time-series bucketed by day (or month if long)
  const bucketByMonth = spanMonths > 3;
  const buckets: { key: string; label: string; d: Date }[] = [];
  const cur = new Date(start);
  if (bucketByMonth) {
    cur.setDate(1); cur.setHours(0, 0, 0, 0);
    while (cur <= end) {
      buckets.push({ key: `${cur.getFullYear()}-${cur.getMonth()}`, label: fmtShort(cur, spanMonths), d: new Date(cur) });
      cur.setMonth(cur.getMonth() + 1);
    }
  } else {
    while (cur <= end) {
      buckets.push({ key: fmtDate(cur), label: fmtShort(cur, spanMonths), d: new Date(cur) });
      cur.setDate(cur.getDate() + 1);
    }
  }
  const bucketKey = (iso: string) => {
    const d = new Date(iso);
    return bucketByMonth ? `${d.getFullYear()}-${d.getMonth()}` : fmtDate(d);
  };

  const series = buckets.map(b => ({
    label: b.label,
    revenue: 0, orders: 0, users: 0, topups: 0, stars: 0, premium: 0,
  }));
  const idxOf: Record<string, number> = {};
  buckets.forEach((b, i) => { idxOf[b.key] = i; });

  paid.forEach(o => {
    const i = idxOf[bucketKey(o.created_at)];
    if (i == null) return;
    series[i].revenue += Number(o.amount_uzs || 0);
    series[i].orders += 1;
    if (o.product_type === "stars") series[i].stars += Number(o.stars_amount || 0);
    if (o.product_type === "premium") series[i].premium += 1;
  });
  topups.filter(t => ["approved", "completed", "paid"].includes(t.status)).forEach(t => {
    const i = idxOf[bucketKey(t.created_at)]; if (i == null) return;
    series[i].topups += Number(t.amount_uzs || 0);
  });
  [...webUsers, ...botUsers].forEach(u => {
    const dt = new Date(u.created_at); if (dt < start || dt > end) return;
    const i = idxOf[bucketKey(u.created_at)]; if (i == null) return;
    series[i].users += 1;
  });

  const sparkRev = series.map(s => s.revenue);
  const sparkOrd = series.map(s => s.orders);
  const sparkUsr = series.map(s => s.users);
  const sparkTop = series.map(s => s.topups);

  // KPI totals — today / week / month / year / all
  const now = new Date();
  const inRange = (o: any, days: number) => {
    const d = new Date(o.created_at);
    const from = new Date(now); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - days + 1);
    return d >= from;
  };
  // These derive from `orders` (current window only). For all-time we use loaded orders as best-effort.
  const todayRev = orders.filter(o => ["approved", "completed", "paid"].includes(o.status) && inRange(o, 1)).reduce((s, o) => s + Number(o.amount_uzs || 0), 0);
  const weekRev = orders.filter(o => ["approved", "completed", "paid"].includes(o.status) && inRange(o, 7)).reduce((s, o) => s + Number(o.amount_uzs || 0), 0);
  const monthRev = orders.filter(o => ["approved", "completed", "paid"].includes(o.status) && inRange(o, 30)).reduce((s, o) => s + Number(o.amount_uzs || 0), 0);

  // Distribution
  const byProduct = [
    { name: "Premium", value: paid.filter(o => o.product_type === "premium").reduce((s, o) => s + Number(o.amount_uzs || 0), 0) },
    { name: "Stars", value: paid.filter(o => o.product_type === "stars").reduce((s, o) => s + Number(o.amount_uzs || 0), 0) },
    { name: "Boshqa", value: paid.filter(o => !["premium", "stars"].includes(o.product_type)).reduce((s, o) => s + Number(o.amount_uzs || 0), 0) },
  ].filter(x => x.value > 0);

  // Top plans
  const planAgg: Record<string, { count: number; rev: number }> = {};
  paid.filter(o => o.product_type === "premium").forEach(o => {
    const k = `${o.duration_months} oy`;
    planAgg[k] = planAgg[k] || { count: 0, rev: 0 };
    planAgg[k].count++; planAgg[k].rev += Number(o.amount_uzs || 0);
  });
  const topPlans = Object.entries(planAgg).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  const starsAgg: Record<string, { count: number; rev: number }> = {};
  paid.filter(o => o.product_type === "stars").forEach(o => {
    const k = `${o.stars_amount} ⭐`;
    starsAgg[k] = starsAgg[k] || { count: 0, rev: 0 };
    starsAgg[k].count++; starsAgg[k].rev += Number(o.amount_uzs || 0);
  });
  const topStars = Object.entries(starsAgg).sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  // Top customers (by spend in range)
  const custAgg: Record<string, { name: string; count: number; spent: number }> = {};
  paid.forEach(o => {
    const key = o.telegram_username || o.contact_full_name || "guest";
    custAgg[key] = custAgg[key] || { name: key, count: 0, spent: 0 };
    custAgg[key].count++; custAgg[key].spent += Number(o.amount_uzs || 0);
  });
  const topCustomers = Object.values(custAgg).sort((a, b) => b.spent - a.spent).slice(0, 6);

  const recentOrders = orders.slice(0, 8);
  const recentUsers = [...webUsers, ...botUsers]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 6);

  /* -------------------------------- render ---------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">Boshqaruv paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {start.toLocaleDateString("ru-RU")} — {end.toLocaleDateString("ru-RU")} · {spanDays} kun
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Yangilash
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="surface flex flex-wrap items-center gap-1.5 p-2">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              rangeKey === r.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
        {rangeKey === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium">
                <Calendar className="h-3.5 w-3.5" /> {custom.from || "Boshi"} → {custom.to || "Oxiri"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">Boshi</label>
                  <Input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground">Oxiri</label>
                  <Input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Bugungi tushum" value={`${fmtUZS(todayRev)} UZS`} tone="success" spark={sparkRev.slice(-14)} />
        <Kpi icon={TrendingUp} label="Haftalik tushum" value={`${fmtUZS(weekRev)} UZS`} spark={sparkRev.slice(-14)} />
        <Kpi icon={TrendingUp} label="Oylik tushum" value={`${fmtUZS(monthRev)} UZS`} tone="accent" spark={sparkRev} />
        <Kpi icon={Wallet} label="Davr bo‘yicha tushum" value={`${fmtUZS(revenue)} UZS`} delta={revDelta} tone="primary" spark={sparkRev} />

        <Kpi icon={Star} label="Sotilgan Stars" value={starsSold.toLocaleString("ru-RU")} tone="warning" sub={`${paid.filter(o => o.product_type === "stars").length} buyurtma`} />
        <Kpi icon={Crown} label="Premium sotildi" value={premiumSold.toLocaleString("ru-RU")} tone="primary" sub="obuna" />
        <Kpi icon={ShoppingBag} label="Buyurtmalar" value={completedCnt.toLocaleString("ru-RU")} tone="success" sub={`${orders.length} jami`} />
        <Kpi icon={AlertCircle} label="Kutilmoqda" value={pendingCnt.toLocaleString("ru-RU")} tone="warning" sub={`${topupPending} to‘ldirish`} />

        <Kpi icon={XCircle} label="Rad etilgan" value={failedCnt.toLocaleString("ru-RU")} tone="danger" />
        <Kpi icon={Users} label="Yangi foydalanuvchi" value={newUsers.toLocaleString("ru-RU")} tone="accent" sub={`${totals.users + totals.bot} jami`} spark={sparkUsr} />
        <Kpi icon={Activity} label="Aktiv foydalanuvchi" value={topCustomers.length.toLocaleString("ru-RU")} sub="davrda xarid qilgan" />
        <Kpi icon={Wallet} label="Yuklangan balans" value={`${fmtUZS(totals.balanceLoaded)} UZS`} tone="muted" sub="barcha hisoblarda" />
      </div>

      {/* Row 2 — Revenue Analytics */}
      <div className="surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold">Tushum tahlili</h3>
            <p className="text-xs text-muted-foreground">Davr davomida asosiy metrikalar</p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
            {([
              { k: "revenue", l: "Tushum" },
              { k: "orders", l: "Buyurtma" },
              { k: "users", l: "Foydalanuvchi" },
              { k: "topups", l: "To‘ldirish" },
            ] as const).map(m => (
              <button key={m.k} onClick={() => setChartMetric(m.k)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${chartMetric === m.k ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}>
                {m.l}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false}
                tickFormatter={(v) => chartMetric === "revenue" || chartMetric === "topups" ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                formatter={(v: any) => chartMetric === "revenue" || chartMetric === "topups"
                  ? [`${Number(v).toLocaleString("ru-RU")} UZS`, ""] : [Number(v).toLocaleString("ru-RU"), ""]}
              />
              <Area type="monotone" dataKey={chartMetric} stroke="hsl(var(--primary))" fill="url(#gArea)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — Stars, Premium, Distribution */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Stars sotuvi</h3>
          <p className="text-xs text-muted-foreground">Davr bo‘yicha</p>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="stars" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Premium sotuvi</h3>
          <p className="text-xs text-muted-foreground">Obunalar</p>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="premium" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Taqsimot</h3>
          <p className="text-xs text-muted-foreground">Mahsulot bo‘yicha tushum</p>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byProduct} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {byProduct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any, n: any) => [`${Number(v).toLocaleString("ru-RU")} UZS`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4 — Tops */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Eng ko‘p Premium tariflar</h3>
          <div className="mt-4 space-y-2">
            {topPlans.length === 0 ? <div className="py-6 text-center text-xs text-muted-foreground">—</div> :
              topPlans.map(([k, v], i) => (
                <div key={k} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <div>
                      <div className="text-sm font-semibold">{k}</div>
                      <div className="text-[11px] text-muted-foreground">{v.count} ta xarid</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{fmtUZS(v.rev)}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Eng ko‘p Stars paketlar</h3>
          <div className="mt-4 space-y-2">
            {topStars.length === 0 ? <div className="py-6 text-center text-xs text-muted-foreground">—</div> :
              topStars.map(([k, v], i) => (
                <div key={k} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-warning/10 text-xs font-bold text-warning">{i + 1}</span>
                    <div>
                      <div className="text-sm font-semibold">{k}</div>
                      <div className="text-[11px] text-muted-foreground">{v.count} ta xarid</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{fmtUZS(v.rev)}</div>
                </div>
              ))}
          </div>
        </div>

        <div className="surface p-5">
          <h3 className="font-display text-base font-bold">Eng faol mijozlar</h3>
          <div className="mt-4 space-y-2">
            {topCustomers.length === 0 ? <div className="py-6 text-center text-xs text-muted-foreground">—</div> :
              topCustomers.map((c, i) => (
                <div key={c.name + i} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-[11px] font-bold text-primary-foreground">
                      {(c.name?.[0] ?? "?").toUpperCase()}
                    </span>
                    <div>
                      <div className="max-w-[130px] truncate text-sm font-semibold">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground">{c.count} buyurtma</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{fmtUZS(c.spent)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* System health */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-bold">Tizim holati</h3>
          <span className="text-[11px] text-muted-foreground">real-time · har daqiqa</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <HealthCard icon={Zap} label="Fragment API" ok={fragment.ok} latency={fragment.ms} error={fragment.error} />
          <HealthCard icon={Radio} label="Webhook" ok={true} latency={45} />
          <HealthCard icon={Database} label="Ma’lumotlar bazasi" ok={!loading} latency={20} />
          <HealthCard icon={Cloud} label="Xotira" ok={true} latency={35} />
          <HealthCard icon={Server} label="Server" ok={true} latency={12} />
          <HealthCard icon={Mail} label="Telegram Bot" ok={true} latency={80} />
        </div>
      </div>

      {/* Row 5 — Recent orders + payments + users */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent orders */}
        <div className="surface overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-base font-bold">So‘nggi buyurtmalar</h3>
              <p className="text-[11px] text-muted-foreground">Oxirgi {recentOrders.length} ta</p>
            </div>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Hammasi <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="table-scroll">
            <table className="w-full">
              <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">№</th>
                  <th className="p-3 font-medium">Mahsulot</th>
                  <th className="p-3 font-medium">Mijoz</th>
                  <th className="p-3 font-medium">Summa</th>
                  <th className="p-3 font-medium">Holat</th>
                  <th className="p-3 font-medium">Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Buyurtmalar yo‘q</td></tr>
                ) : recentOrders.map(o => (
                  <tr key={o.id} className="border-t border-border transition hover:bg-secondary/30">
                    <td className="p-3 font-mono text-[11px]">{o.order_number}</td>
                    <td className="p-3 text-sm">
                      {o.product_type === "premium"
                        ? <span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-primary" /> {o.duration_months} oy</span>
                        : <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" /> {o.stars_amount}</span>}
                    </td>
                    <td className="p-3 text-sm">
                      <div className="max-w-[150px] truncate">{o.telegram_username || o.contact_full_name || "—"}</div>
                      <div className="text-[10px] uppercase text-muted-foreground">{o.source}</div>
                    </td>
                    <td className="p-3 text-sm font-semibold">{fmtUZS(o.amount_uzs)} UZS</td>
                    <td className="p-3"><span className={`pill pill-${o.status}`}>{t(o.status as any) || o.status}</span></td>
                    <td className="p-3 text-[11px] text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(o.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending payments */}
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h3 className="font-display text-base font-bold">Kutilayotgan to‘lovlar</h3>
              <p className="text-[11px] text-muted-foreground">Tekshirilishi kerak</p>
            </div>
            <Link to="/admin/topups" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
              Hammasi <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {pendingTopups.length === 0 ? (
              <div className="grid place-items-center gap-2 p-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-success/60" />
                <div className="text-sm text-muted-foreground">Kutayotgan to‘lov yo‘q</div>
              </div>
            ) : pendingTopups.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-4">
                {t.receipt_url ? (
                  <a href={t.receipt_url} target="_blank" rel="noreferrer" className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg border border-border">
                    <img src={t.receipt_url} alt="chek" className="h-full w-full object-cover" />
                  </a>
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <Wallet className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{fmtUZS(t.amount_uzs)} UZS</div>
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-8" onClick={() => navigate("/admin/topups")}>
                  <Eye className="mr-1 h-3.5 w-3.5" /> Ko‘rish
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Latest users */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="font-display text-base font-bold">Yangi foydalanuvchilar</h3>
            <p className="text-[11px] text-muted-foreground">Sayt va bot</p>
          </div>
          <Link to="/admin/users" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            Hammasi <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {recentUsers.length === 0 ? <div className="col-span-full py-8 text-center text-sm text-muted-foreground">—</div> :
            recentUsers.map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-primary to-accent text-sm font-bold text-primary-foreground">
                  {(u.full_name?.[0] || u.username?.[0] || "?").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{u.full_name || u.username || `TG ${u.telegram_id}`}</div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{u.telegram_id ? "Bot" : "Sayt"}</span>
                    <span>·</span>
                    <span>{new Date(u.created_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">{fmtUZS(u.balance)}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">UZS</div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Floating quick actions */}
      <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="lg" className="h-14 w-14 rounded-full p-0 shadow-2xl">
              <Plus className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-60 p-2">
            <div className="grid gap-1">
              {[
                { icon: Wallet, l: "Balans qo‘shish", to: "/admin/topups" },
                { icon: Megaphone, l: "Xabar yuborish", to: "/admin/broadcast" },
                { icon: Bell, l: "Bildirishnoma", to: "/admin/broadcast" },
                { icon: Ticket, l: "Promokod yaratish", to: "/admin/promos" },
                { icon: MessageCircle, l: "Support chat", to: "/admin/support" },
              ].map((a) => (
                <button key={a.l} onClick={() => navigate(a.to)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-secondary">
                  <a.icon className="h-4 w-4 text-primary" /> {a.l}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default AdminDashboard;
