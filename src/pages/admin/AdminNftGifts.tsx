import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface NftGift {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number | null;
  price_ton: number | null;
  telegram_link: string | null;
  badge: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyDraft = {
  title: "",
  description: "",
  image_url: "",
  price: "",
  price_ton: "",
  telegram_link: "",
  badge: "",
  category: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminNftGifts() {
  const [items, setItems] = useState<NftGift[]>([]);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("nft_gifts")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    setItems((data as NftGift[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addGift = async () => {
    if (!draft.title.trim()) {
      toast.error("Sarlavha kerak");
      return;
    }
    const payload: any = {
      title: draft.title.trim(),
      description: draft.description || null,
      image_url: draft.image_url || null,
      price: draft.price ? Number(draft.price) : null,
      price_ton: draft.price_ton ? Number(draft.price_ton) : null,
      telegram_link: draft.telegram_link || null,
      badge: draft.badge || null,
      category: draft.category || null,
      is_active: draft.is_active,
      sort_order: Number(draft.sort_order) || 0,
    };
    const { error } = await supabase.from("nft_gifts").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("NFT qo'shildi");
    setDraft({ ...emptyDraft });
    load();
  };

  const updateGift = async (id: string, patch: Partial<NftGift>) => {
    const { error } = await supabase.from("nft_gifts").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saqlandi");
    load();
  };

  const deleteGift = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    const { error } = await supabase.from("nft_gifts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("O'chirildi");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">NFT Gift boshqaruvi</h1>
        <p className="text-muted-foreground">Sayt uchun NFT sovg'alarni qo'shing va tahrirlang.</p>
      </div>

      {/* Add form */}
      <div className="rounded-3xl glass p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Yangi NFT qo'shish
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Sarlavha *</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="NFT nomi" />
          </div>
          <div>
            <Label>Kategoriya</Label>
            <Input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="masalan: Rare" />
          </div>
          <div className="md:col-span-2">
            <Label>Tavsif</Label>
            <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Rasm URL</Label>
            <Input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <div>
            <Label>Narx (UZS)</Label>
            <Input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} />
          </div>
          <div>
            <Label>Narx (TON)</Label>
            <Input type="number" step="0.01" value={draft.price_ton} onChange={(e) => setDraft({ ...draft, price_ton: e.target.value })} />
          </div>
          <div>
            <Label>Telegram link</Label>
            <Input value={draft.telegram_link} onChange={(e) => setDraft({ ...draft, telegram_link: e.target.value })} placeholder="https://t.me/..." />
          </div>
          <div>
            <Label>Badge</Label>
            <Input value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} placeholder="NEW / HOT" />
          </div>
          <div>
            <Label>Tartib</Label>
            <Input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            <Label>Faol</Label>
          </div>
        </div>
        <Button onClick={addGift} className="bg-gradient-primary">
          <Plus className="mr-1 h-4 w-4" /> Qo'shish
        </Button>
      </div>

      {/* List */}
      <div className="rounded-3xl glass p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Barcha NFT sovg'alar ({items.length})</h2>
        {loading ? (
          <div className="text-muted-foreground">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground">Hozircha NFT yo'q</div>
        ) : (
          <div className="grid gap-3">
            {items.map((g) => (
              <div key={g.id} className="flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/40 p-4 sm:flex-row sm:items-center">
                {g.image_url && (
                  <img src={g.image_url} alt={g.title} className="h-16 w-16 rounded-xl object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{g.title}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {g.price && `${Number(g.price).toLocaleString("ru-RU")} UZS`}
                    {g.price_ton && ` • ${g.price_ton} TON`}
                    {g.badge && ` • ${g.badge}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={g.is_active}
                    onCheckedChange={(v) => updateGift(g.id, { is_active: v })}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteGift(g.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
