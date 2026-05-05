import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Tag } from "lucide-react";

interface Promo {
  id?: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  applies_to: "all" | "premium" | "stars" | "topup";
  max_uses: number | null;
  used_count?: number;
  per_user_limit: number;
  min_amount: number;
  expires_at: string | null;
  active: boolean;
}

const empty: Promo = {
  code: "", discount_type: "percent", discount_value: 10, applies_to: "all",
  max_uses: null, per_user_limit: 1, min_amount: 0, expires_at: null, active: true,
};

const AdminPromos = () => {
  const [list, setList] = useState<Promo[]>([]);
  const [form, setForm] = useState<Promo>(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setList((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.code.trim()) return toast.error("Kod kiriting");
    setBusy(true);
    const { error } = await supabase.from("promo_codes").insert({
      ...form,
      code: form.code.trim().toUpperCase(),
      max_uses: form.max_uses || null,
      expires_at: form.expires_at || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Yaratildi");
    setForm(empty);
    load();
  };

  const toggle = async (p: Promo) => {
    await supabase.from("promo_codes").update({ active: !p.active }).eq("id", p.id!);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await supabase.from("promo_codes").delete().eq("id", id);
    load();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl flex items-center gap-2"><Tag className="h-6 w-6" /> Promokodlar</h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl glass p-4 space-y-3">
          <h3 className="font-semibold">Yangi promokod</h3>
          <div>
            <Label>Kod</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PROMO2026" className="font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tur</Label>
              <select className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}>
                <option value="percent">Foiz (%)</option>
                <option value="fixed">Qat'iy (UZS)</option>
              </select>
            </div>
            <div>
              <Label>Qiymat</Label>
              <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Mahsulot</Label>
            <select className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.applies_to} onChange={(e) => setForm({ ...form, applies_to: e.target.value as any })}>
              <option value="all">Hammasi</option>
              <option value="premium">Premium</option>
              <option value="stars">Stars</option>
              <option value="topup">Balans</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Min summa</Label>
              <Input type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Jami limit</Label>
              <Input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="∞" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>1 user uchun</Label>
              <Input type="number" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Tugash sanasi</Label>
              <Input type="datetime-local" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })} />
            </div>
          </div>
          <Button onClick={create} disabled={busy} className="w-full"><Plus className="mr-1 h-4 w-4" /> Yaratish</Button>
        </div>

        <div className="rounded-2xl glass p-4">
          <h3 className="mb-3 font-semibold">Mavjud promokodlar ({list.length})</h3>
          <div className="space-y-2">
            {list.length === 0 && <p className="text-sm text-muted-foreground">Hali yo'q</p>}
            {list.map((p) => (
              <div key={p.id} className="rounded-xl border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{p.code}</span>
                      <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                        {p.discount_type === "percent" ? `${p.discount_value}%` : `${p.discount_value} UZS`}
                      </span>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{p.applies_to}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ishlatilgan: {p.used_count ?? 0}{p.max_uses ? `/${p.max_uses}` : ""} · 1 user: {p.per_user_limit}x
                      {p.expires_at && ` · ${new Date(p.expires_at).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch checked={p.active} onCheckedChange={() => toggle(p)} />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => remove(p.id!)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPromos;
