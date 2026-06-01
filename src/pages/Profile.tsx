import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet, ArrowUpRight, ArrowDownRight, Crown, Star, Receipt } from "lucide-react";

const statusLabel: Record<string, string> = {
  pending: "status.pending",
  approved: "status.approved",
  rejected: "status.rejected",
  paid: "status.paid",
};

const Profile = () => {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: tx }, { data: o }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("balance_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("orders").select("order_number,product_type,duration_months,stars_amount,amount_uzs,status,created_at,admin_note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setProfile(p);
    setTxs(tx ?? []);
    setOrders(o ?? []);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        telegram_username: profile.telegram_username,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("profile.savedToast"));
  };

  if (loading || !profile) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center text-muted-foreground">{t("common.loading")}</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Seo title="Mening profilim — Premium UZ" description="Balansingiz, buyurtmalar tarixi va shaxsiy ma'lumotlaringizni boshqaring." path="/profile" />
      <SiteHeader />
      <main className="flex-1 container py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Mening profilim</h1>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Balance card */}
            <div className="rounded-3xl glass p-6 md:col-span-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4 text-primary" /> {t("profile.balance")}
              </div>
              <div className="mt-2 font-display text-4xl font-bold text-gradient">
                {Number(profile.balance).toLocaleString("ru-RU")}
              </div>
              <div className="text-sm text-muted-foreground">UZS</div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild className="bg-gradient-primary text-primary-foreground">
                  <Link to="/topup">{t("profile.topup")}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/pricing">{t("buy.premium")}</Link>
                </Button>
              </div>
            </div>

            {/* Profile form */}
            <div className="rounded-3xl glass p-6 md:col-span-2 space-y-4">
              <h2 className="font-display text-xl font-bold">{t("profile.title")}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t("auth.fullname")}</Label>
                  <Input
                    value={profile.full_name ?? ""}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input
                    value={profile.phone ?? ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="mt-1.5"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Telegram username</Label>
                  <Input
                    value={profile.telegram_username ?? ""}
                    onChange={(e) => setProfile({ ...profile, telegram_username: e.target.value })}
                    placeholder="@username"
                    className="mt-1.5"
                  />
                </div>
              </div>
              <Button onClick={save} disabled={busy} className="bg-gradient-primary text-primary-foreground">
                {busy ? t("common.loading") : t("profile.update")}
              </Button>
            </div>
          </div>

          {/* Orders */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
              <Receipt className="h-5 w-5 text-primary" /> {t("profile.orders")}
            </h2>
            <div className="overflow-hidden rounded-2xl glass">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">№</th>
                    <th className="p-3">Tovar</th>
                    <th className="p-3">Summa</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.order_number} className="border-t border-border/40">
                      <td className="p-3 font-mono">{o.order_number}</td>
                      <td className="p-3">
                        {o.product_type === "premium" ? (
                          <span className="inline-flex items-center gap-1"><Crown className="h-3.5 w-3.5 text-primary" />{o.duration_months} {t("pricing.months")}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-warning fill-warning" />⭐ {o.stars_amount}</span>
                        )}
                      </td>
                      <td className="p-3">{Number(o.amount_uzs).toLocaleString("ru-RU")} UZS</td>
                      <td className="p-3">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{t(statusLabel[o.status] ?? o.status)}</span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">—</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Transactions */}
          <section>
            <h2 className="mb-3 font-display text-xl font-bold">{t("profile.tx")}</h2>
            <div className="overflow-hidden rounded-2xl glass">
              <table className="w-full text-sm">
                <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Tip</th>
                    <th className="p-3">Summa</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Izoh</th>
                    <th className="p-3">Sana</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((x) => (
                    <tr key={x.id} className="border-t border-border/40">
                      <td className="p-3 capitalize">{x.type.replace("_", " ")}</td>
                      <td className={`p-3 font-medium ${Number(x.amount_uzs) >= 0 ? "text-success" : "text-destructive"}`}>
                        <span className="inline-flex items-center gap-1">
                          {Number(x.amount_uzs) >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                          {Number(x.amount_uzs).toLocaleString("ru-RU")} UZS
                        </span>
                      </td>
                      <td className="p-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{x.status}</span></td>
                      <td className="p-3 text-xs text-muted-foreground">{x.admin_note || "-"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(x.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {txs.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">—</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Profile;
