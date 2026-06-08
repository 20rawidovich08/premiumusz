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
import { Wallet, ArrowUpRight, ArrowDownRight, Crown, Star, Receipt, User as UserIcon, Send, Mail } from "lucide-react";

const statusLabel: Record<string, string> = {
  pending: "status.pending", approved: "status.approved", rejected: "status.rejected", paid: "status.paid",
};

const Profile = () => {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [txs, setTxs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && !user) navigate("/auth", { replace: true }); }, [loading, user, navigate]);

  const load = async () => {
    if (!user) return;
    const [{ data: p }, { data: tx }, { data: o }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("balance_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("orders").select("order_number,product_type,duration_months,stars_amount,amount_uzs,status,created_at,admin_note").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setProfile(p); setTxs(tx ?? []); setOrders(o ?? []);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const save = async () => {
    if (!user || !profile) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, phone: profile.phone, telegram_username: profile.telegram_username,
    }).eq("id", user.id);
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
      <Seo title="Mening profilim — Premium Usz" description="Balans, buyurtmalar tarixi va shaxsiy ma'lumotlar." path="/profile" />
      <SiteHeader />
      <main className="flex-1 container py-10 md:py-14">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <UserIcon className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold md:text-3xl">{profile.full_name || "Hisobim"}</h1>
              <p className="text-sm text-muted-foreground">{user!.email}</p>
            </div>
          </div>

          {/* Balance + quick actions */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="surface-lg overflow-hidden bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground lg:col-span-1">
              <div className="text-xs font-medium uppercase tracking-wider opacity-80">Joriy balans</div>
              <div className="mt-1 font-display text-3xl font-bold">
                {Number(profile.balance).toLocaleString("ru-RU")} <span className="text-base font-normal opacity-80">UZS</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90"><Link to="/topup">{t("profile.topup")}</Link></Button>
                <Button asChild size="sm" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10"><Link to="/pricing">Premium</Link></Button>
              </div>
            </div>

            {/* Account info */}
            <div className="surface p-6 lg:col-span-2">
              <h2 className="font-display text-base font-bold">Shaxsiy ma'lumotlar</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("auth.fullname")}</Label>
                  <Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="mt-2" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefon</Label>
                  <Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+998 90 123 45 67" className="mt-2" />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 h-10 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" /> {user!.email}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Send className="mr-1 inline h-3 w-3" /> Telegram</Label>
                  <Input value={profile.telegram_username ?? ""} onChange={(e) => setProfile({ ...profile, telegram_username: e.target.value })} placeholder="@username" className="mt-2" />
                </div>
              </div>
              <Button onClick={save} disabled={busy} className="mt-5 bg-primary text-primary-foreground hover:bg-primary/90">
                {busy ? t("common.loading") : t("profile.update")}
              </Button>
            </div>
          </div>

          {/* Orders */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <Receipt className="h-5 w-5 text-primary" /> {t("profile.orders")}
            </h2>
            <div className="surface overflow-hidden">
              <div className="table-scroll">
                <table className="w-full">
                  <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4 font-medium">№</th>
                      <th className="p-4 font-medium">Mahsulot</th>
                      <th className="p-4 font-medium">Summa</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">Buyurtmalar yo'q</td></tr>
                    ) : orders.map((o) => (
                      <tr key={o.order_number} className="border-t border-border">
                        <td className="p-4 font-mono text-xs">{o.order_number}</td>
                        <td className="p-4 text-sm">
                          {o.product_type === "premium"
                            ? <span className="inline-flex items-center gap-1.5"><Crown className="h-4 w-4 text-primary" />{o.duration_months} oy</span>
                            : <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 fill-warning text-warning" />{o.stars_amount} ⭐</span>}
                        </td>
                        <td className="p-4 text-sm font-semibold">{Number(o.amount_uzs).toLocaleString("ru-RU")} UZS</td>
                        <td className="p-4"><span className={`pill pill-${o.status}`}>{t(statusLabel[o.status] ?? o.status)}</span></td>
                        <td className="p-4 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("ru-RU")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Transactions */}
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">{t("profile.tx")}</h2>
            <div className="surface overflow-hidden">
              <div className="table-scroll">
                <table className="w-full">
                  <thead className="border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-4 font-medium">Tip</th>
                      <th className="p-4 font-medium">Summa</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Sana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.length === 0 ? (
                      <tr><td colSpan={4} className="p-6 text-center text-sm text-muted-foreground">—</td></tr>
                    ) : txs.map((x) => {
                      const positive = Number(x.amount_uzs) >= 0;
                      return (
                        <tr key={x.id} className="border-t border-border">
                          <td className="p-4 text-sm capitalize">{x.type.replace("_", " ")}</td>
                          <td className={`p-4 text-sm font-semibold ${positive ? "text-success" : "text-destructive"}`}>
                            <span className="inline-flex items-center gap-1">
                              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                              {Number(x.amount_uzs).toLocaleString("ru-RU")} UZS
                            </span>
                          </td>
                          <td className="p-4"><span className={`pill pill-${x.status}`}>{x.status}</span></td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(x.created_at).toLocaleString("ru-RU")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Profile;
