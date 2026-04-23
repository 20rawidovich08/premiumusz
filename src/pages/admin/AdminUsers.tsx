import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ban, CheckCircle, Plus, Minus } from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    let q = supabase.from("bot_users").select("*").order("created_at", { ascending: false }).limit(200);
    const { data } = await q;
    let rows = (data as any[]) ?? [];
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        String(r.telegram_id).includes(s) ||
        (r.username || "").toLowerCase().includes(s) ||
        (r.full_name || "").toLowerCase().includes(s) ||
        (r.phone || "").toLowerCase().includes(s)
      );
    }
    setUsers(rows);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleBan = async (u: any) => {
    const { error } = await supabase.from("bot_users").update({ banned: !u.banned }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success(u.banned ? "Unbanned" : "Banned");
    load();
  };

  const adjustBalance = async (u: any, delta: number) => {
    const newBal = Number(u.balance) + delta;
    if (newBal < 0) return toast.error("Balance cannot be negative");
    const { error } = await supabase.from("bot_users").update({ balance: newBal }).eq("id", u.id);
    if (error) return toast.error(error.message);
    toast.success("Balance updated");
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Users</h1>
      <div className="mt-6 flex gap-2">
        <Input
          placeholder="Search by ID, username, name, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="max-w-md"
        />
        <Button onClick={load} variant="outline">Search</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl glass">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Telegram ID</th>
              <th className="p-3">Username</th>
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Ref code</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border/40 hover:bg-secondary/20">
                <td className="p-3 font-mono">{u.telegram_id}</td>
                <td className="p-3">{u.username ? "@" + u.username : "-"}</td>
                <td className="p-3">{u.full_name || "-"}</td>
                <td className="p-3">{u.phone || "-"}</td>
                <td className="p-3">{Number(u.balance).toLocaleString("ru-RU")}</td>
                <td className="p-3 font-mono text-xs">{u.referral_code}</td>
                <td className="p-3">
                  {u.banned ? <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">Banned</span>
                            : <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">Active</span>}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => adjustBalance(u, 5000)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => adjustBalance(u, -5000)}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleBan(u)}>
                      {u.banned ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Ban className="h-3.5 w-3.5 text-destructive" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No users yet</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">+/- buttons adjust balance by 5000.</p>
    </div>
  );
};

export default AdminUsers;
