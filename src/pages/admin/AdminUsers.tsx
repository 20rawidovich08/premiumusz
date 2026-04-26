import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ban, CheckCircle, Plus, Minus } from "lucide-react";
import { useAdminT } from "@/lib/adminI18n";

type UserRow = {
  id: string;
  kind: "web" | "bot";
  telegram_id?: number | null;
  username?: string | null;
  full_name?: string | null;
  phone?: string | null;
  balance: number;
  referral_code?: string | null;
  banned?: boolean;
  created_at?: string;
};

const AdminUsers = () => {
  const t = useAdminT();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: bots, error: botError }, { data: profiles, error: profileError }] = await Promise.all([
      supabase.from("bot_users").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (botError) return toast.error(botError.message);
    if (profileError) return toast.error(profileError.message);

    let rows: UserRow[] = [
      ...((profiles as any[]) ?? []).map((p) => ({
        id: p.id,
        kind: "web" as const,
        username: p.telegram_username,
        full_name: p.full_name,
        phone: p.phone,
        balance: Number(p.balance || 0),
        created_at: p.created_at,
      })),
      ...((bots as any[]) ?? []).map((b) => ({
        id: b.id,
        kind: "bot" as const,
        telegram_id: b.telegram_id,
        username: b.username ? `@${String(b.username).replace(/^@/, "")}` : null,
        full_name: b.full_name,
        phone: b.phone,
        balance: Number(b.balance || 0),
        referral_code: b.referral_code,
        banned: b.banned,
        created_at: b.created_at,
      })),
    ];

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        String(r.telegram_id || r.id).toLowerCase().includes(s) ||
        (r.username || "").toLowerCase().includes(s) ||
        (r.full_name || "").toLowerCase().includes(s) ||
        (r.phone || "").toLowerCase().includes(s)
      );
    }
    rows.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
    setUsers(rows);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleBan = async (u: UserRow) => {
    if (u.kind !== "bot") return;
    const { error } = await supabase.from("bot_users").update({ banned: !u.banned }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(u.banned ? t("active") : t("banned"));
    load();
  };

  const adjustBalance = async (u: UserRow, direction: 1 | -1) => {
    const rawAmount = amounts[`${u.kind}-${u.id}`] || "";
    const amount = Number(rawAmount.replace(/\s/g, "").replace(/,/g, ""));
    if (!amount || amount <= 0) return toast.error(t("amountInvalid"));
    const delta = amount * direction;
    const newBal = Number(u.balance) + delta;
    if (newBal < 0) return toast.error(t("balanceNegative"));
    const table = u.kind === "bot" ? "bot_users" : "profiles";
    const { error } = await supabase.from(table).update({ balance: newBal }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(t("balanceUpdated"));
    setAmounts((prev) => ({ ...prev, [`${u.kind}-${u.id}`]: "" }));
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("users")}</h1>
      <div className="mt-6 flex gap-2">
        <Input
          placeholder={t("searchUsers")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="max-w-md"
        />
        <Button onClick={load} variant="outline">{t("search")}</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl glass">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">{t("username")}</th>
              <th className="p-3">{t("name")}</th>
              <th className="p-3">{t("phone")}</th>
              <th className="p-3">{t("balance")}</th>
              <th className="p-3">{t("refCode")}</th>
              <th className="p-3">{t("status")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={`${u.kind}-${u.id}`} className="border-t border-border/40 hover:bg-secondary/20">
                <td className="p-3 font-mono text-xs">{u.kind === "bot" ? u.telegram_id : u.id.slice(0, 8)}</td>
                <td className="p-3">{u.username || "-"}</td>
                <td className="p-3">{u.full_name || "-"}</td>
                <td className="p-3">{u.phone || "-"}</td>
                <td className="p-3">{u.balance.toLocaleString("ru-RU")}</td>
                <td className="p-3 font-mono text-xs">{u.referral_code || "web"}</td>
                <td className="p-3">
                  {u.kind === "web" ? (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Web</span>
                  ) : u.banned ? (
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">{t("banned")}</span>
                  ) : (
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">{t("active")}</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex min-w-[210px] items-center gap-1">
                    <Input
                      inputMode="numeric"
                      placeholder={t("amount")}
                      value={amounts[`${u.kind}-${u.id}`] || ""}
                      onChange={(e) => setAmounts((prev) => ({ ...prev, [`${u.kind}-${u.id}`]: e.target.value }))}
                      className="h-8 w-28"
                    />
                    <Button size="icon" variant="ghost" onClick={() => adjustBalance(u, 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => adjustBalance(u, -1)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    {u.kind === "bot" && (
                      <Button size="icon" variant="ghost" onClick={() => toggleBan(u)}>
                        {u.banned ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Ban className="h-3.5 w-3.5 text-destructive" />}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">{t("noUsers")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
