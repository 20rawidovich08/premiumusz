import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminT } from "@/lib/adminI18n";

const AdminTopups = () => {
  const t = useAdminT();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [view, setView] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    let q = supabase
      .from("balance_transactions")
      .select("*")
      .eq("type", "topup")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) return toast.error(error.message);

    const list = (data as any[]) ?? [];
    const profileIds = list.filter((r) => r.user_id).map((r) => r.user_id);
    const botIds = list.filter((r) => r.bot_user_id).map((r) => r.bot_user_id);
    const [{ data: profiles }, { data: bots }] = await Promise.all([
      profileIds.length ? supabase.from("profiles").select("id,full_name,phone,telegram_username").in("id", profileIds) : Promise.resolve({ data: [] as any[] }),
      botIds.length ? supabase.from("bot_users").select("id,full_name,phone,username,telegram_id").in("id", botIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileMap = new Map(((profiles as any[]) ?? []).map((p) => [p.id, p]));
    const botMap = new Map(((bots as any[]) ?? []).map((b) => [b.id, b]));
    setRows(list.map((r) => ({ ...r, person: r.bot_user_id ? botMap.get(r.bot_user_id) : profileMap.get(r.user_id), source: r.bot_user_id ? "bot" : "web" })));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const open = async (row: any) => {
    setView(row);
    setNote(row.admin_note || "");
    setReceiptUrl(null);
    if (row.receipt_url) {
      const { data } = await supabase.rpc("get_receipt_signed_url", { p_path: row.receipt_url });
      setReceiptUrl(data as string);
    }
  };

  const decide = async (approve: boolean) => {
    if (!view) return;
    const { error } = await supabase.rpc("admin_decide_topup", {
      p_tx_id: view.id, p_approve: approve, p_note: note || null,
    });
    if (error) return toast.error(error.message);
    supabase.functions.invoke("notify-user", { body: { kind: "topup", id: view.id, approved: approve, note } }).catch(() => {});
    toast.success(approve ? t("approveAddBalance") : t("rejected"));
    setView(null);
    load();
  };

  const statusLabel = (s: string) => t((s === "approved" || s === "rejected" || s === "pending" ? s : "all") as any);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("topups")}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            className={filter === s ? "bg-gradient-primary text-primary-foreground" : ""}
            onClick={() => setFilter(s)}
          >
            {statusLabel(s)}
          </Button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl glass">
        <table className="w-full min-w-[760px] text-xs sm:text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">{t("users")}</th>
              <th className="p-3">{t("amount")}</th>
              <th className="p-3">{t("status")}</th>
              <th className="p-3">{t("date")}</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40 hover:bg-secondary/20">
                <td className="p-3">
                  <div>{r.person?.full_name || "-"} <span className="text-xs text-muted-foreground">({r.source})</span></div>
                  <div className="text-xs text-muted-foreground">{r.person?.phone || r.person?.telegram_username || (r.person?.username ? `@${r.person.username}` : "-")}</div>
                </td>
                <td className="p-3 font-medium">{Number(r.amount_uzs).toLocaleString("ru-RU")} UZS</td>
                <td className="p-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{statusLabel(r.status)}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => open(r)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">{t("noReceipt")}</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle>{t("topupReview")}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div><span className="text-muted-foreground">{t("users")}: </span>{view.person?.full_name || "-"}</div>
                  <div><span className="text-muted-foreground">{t("phone")}: </span>{view.person?.phone || "-"}</div>
                  <div><span className="text-muted-foreground">Telegram: </span>{view.person?.telegram_username || (view.person?.username ? `@${view.person.username}` : "-")}</div>
                  <div><span className="text-muted-foreground">{t("amount")}: </span><b>{Number(view.amount_uzs).toLocaleString("ru-RU")} UZS</b></div>
                  <div><span className="text-muted-foreground">{t("status")}: </span>{statusLabel(view.status)}</div>
                  <Textarea placeholder={t("adminNote")} value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                </div>
                <div>
                  {receiptUrl ? (
                    <a href={receiptUrl} target="_blank" rel="noreferrer">
                      <img src={receiptUrl} alt="receipt" className="rounded-xl border border-border" />
                    </a>
                  ) : (
                    <div className="grid h-full place-items-center rounded-xl bg-secondary/40 p-6 text-sm text-muted-foreground">
                      {t("noReceipt")}
                    </div>
                  )}
                </div>
              </div>
              {view.status === "pending" && (
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button onClick={() => decide(true)} className="bg-success text-success-foreground">
                    <Check className="mr-1 h-4 w-4" /> {t("approveAddBalance")}
                  </Button>
                  <Button onClick={() => decide(false)} variant="destructive">
                    <X className="mr-1 h-4 w-4" /> {t("reject")}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTopups;
