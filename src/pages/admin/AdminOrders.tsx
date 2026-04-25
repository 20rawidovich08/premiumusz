import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Eye, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusColor: Record<string, string> = {
  pending: "bg-warning/20 text-warning",
  approved: "bg-success/20 text-success",
  rejected: "bg-destructive/20 text-destructive",
  paid: "bg-primary/20 text-primary",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
    if (filter !== "all") q = q.eq("status", filter as any);
    const { data } = await q;
    let rows = (data as any[]) ?? [];
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        r.order_number.toLowerCase().includes(s) ||
        (r.contact_full_name || "").toLowerCase().includes(s) ||
        (r.contact_phone || "").toLowerCase().includes(s) ||
        (r.contact_telegram || "").toLowerCase().includes(s)
      );
    }
    setOrders(rows);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const openView = async (o: any) => {
    setView(o);
    setNote(o.admin_note || "");
    setReceiptUrl(null);
    if (o.receipt_url) {
      const { data } = await supabase.rpc("get_receipt_signed_url", { p_path: o.receipt_url });
      setReceiptUrl(data as string);
    }
  };

  const setStatus = async (id: string, approve: boolean) => {
    const { error } = await supabase.rpc("admin_decide_order", {
      p_order_id: id, p_approve: approve, p_note: note || null,
    });
    if (error) return toast.error(error.message);
    // Notify user via Telegram bot (best-effort)
    supabase.functions.invoke("notify-user", { body: { kind: "order", id, approved: approve, note } })
      .catch(() => {/* non-blocking */});
    toast.success(approve ? "Buyurtma tasdiqlandi" : "Buyurtma rad etildi");
    setView(null);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Orders</h1>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {["all", "pending", "approved", "rejected", "paid"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            className={filter === s ? "bg-gradient-primary text-primary-foreground" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
        <Input
          placeholder="Search by number, name, phone, @username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          className="ml-auto max-w-sm"
        />
        <Button onClick={load} variant="outline">Search</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl glass">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Method</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-border/40 hover:bg-secondary/20">
                <td className="p-3 font-mono">{o.order_number}</td>
                <td className="p-3">
                  <div>{o.contact_full_name || "-"}</div>
                  <div className="text-xs text-muted-foreground">{o.contact_phone || o.contact_telegram || "-"}</div>
                </td>
                <td className="p-3">{o.duration_months}m</td>
                <td className="p-3 capitalize">{o.payment_method}</td>
                <td className="p-3">
                  {o.amount_uzs ? `${Number(o.amount_uzs).toLocaleString("ru-RU")} UZS` : `⭐ ${o.amount_stars || 0}`}
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[o.status]}`}>{o.status}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <Button size="sm" variant="ghost" onClick={() => openView(o)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No orders</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          {view && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono">{view.order_number}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 text-sm">
                  <div><span className="text-muted-foreground">Name: </span>{view.contact_full_name || "-"}</div>
                  <div><span className="text-muted-foreground">Phone: </span>{view.contact_phone || "-"}</div>
                  <div><span className="text-muted-foreground">Telegram: </span>{view.contact_telegram || "-"}</div>
                  <div><span className="text-muted-foreground">Source: </span>{view.source}</div>
                  <div><span className="text-muted-foreground">Method: </span>{view.payment_method}</div>
                  <div><span className="text-muted-foreground">Plan: </span>{view.duration_months} months</div>
                  <div>
                    <span className="text-muted-foreground">Amount: </span>
                    {view.amount_uzs ? `${Number(view.amount_uzs).toLocaleString("ru-RU")} UZS` : `⭐ ${view.amount_stars}`}
                  </div>
                  <Textarea
                    placeholder="Admin note (visible on tracking page)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  {receiptUrl ? (
                    <a href={receiptUrl} target="_blank" rel="noreferrer">
                      <img src={receiptUrl} alt="receipt" className="rounded-xl border border-border" />
                    </a>
                  ) : (
                    <div className="grid h-full place-items-center rounded-xl bg-secondary/40 p-6 text-sm text-muted-foreground">
                      No receipt
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                {view.status === "pending" && (
                  <>
                    <Button onClick={() => setStatus(view.id, true)} className="bg-success text-success-foreground">
                      <Check className="mr-1 h-4 w-4" /> Tasdiqlash
                    </Button>
                    <Button onClick={() => setStatus(view.id, false)} variant="destructive">
                      <X className="mr-1 h-4 w-4" /> Rad etish
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
