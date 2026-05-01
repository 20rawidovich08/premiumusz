import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy } from "lucide-react";

export type CardItem = { number: string; holder: string; bank: string };

type Props = {
  amountUzs?: number;
  copyLabel?: string;
  cardNumberLabel?: string;
  cardHolderLabel?: string;
  bankLabel?: string;
  amountLabel?: string;
};

export const CardPicker = ({ amountUzs, copyLabel = "Copied", cardNumberLabel = "Karta raqami", cardHolderLabel = "Karta egasi", bankLabel = "Bank", amountLabel }: Props) => {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("settings")
        .select("key,value")
        .in("key", ["cards", "card_number", "card_holder", "card_bank"]);
      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
      let list: CardItem[] = [];
      if (Array.isArray(map.cards)) {
        list = (map.cards as any[])
          .map((c) => ({ number: String(c?.number ?? ""), holder: String(c?.holder ?? ""), bank: String(c?.bank ?? "") }))
          .filter((c) => c.number || c.holder || c.bank);
      }
      if (list.length === 0) {
        const single: CardItem = {
          number: typeof map.card_number === "string" ? map.card_number : "",
          holder: typeof map.card_holder === "string" ? map.card_holder : "",
          bank: typeof map.card_bank === "string" ? map.card_bank : "",
        };
        if (single.number || single.holder || single.bank) list = [single];
      }
      setCards(list);
    })();
  }, []);

  const card = useMemo(() => cards[active], [cards, active]);

  const copy = (s: string) => {
    if (!s) return;
    navigator.clipboard.writeText(s);
    toast.success(copyLabel);
  };

  if (cards.length === 0) {
    return (
      <div className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">—</div>
    );
  }

  return (
    <div className="space-y-3">
      {cards.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {cards.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                i === active ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:border-primary/50"
              }`}
            >
              {c.bank || `Karta #${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-xl bg-secondary/60 p-4">
        <div className="text-xs uppercase text-muted-foreground">{cardNumberLabel}</div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="font-mono text-lg tracking-wider">{card?.number || "—"}</span>
          <button onClick={() => copy(card?.number || "")} className="rounded-lg p-2 hover:bg-background/50">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground">{cardHolderLabel}</div>
            <div className="mt-0.5 font-medium">{card?.holder || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">{bankLabel}</div>
            <div className="mt-0.5 font-medium">{card?.bank || "—"}</div>
          </div>
        </div>
      </div>
      {typeof amountUzs === "number" && amountUzs > 0 && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-sm">
          <div className="font-semibold mb-1">{amountUzs.toLocaleString("ru-RU")} UZS</div>
          {amountLabel && <p className="text-xs text-muted-foreground">{amountLabel}</p>}
        </div>
      )}
    </div>
  );
};
