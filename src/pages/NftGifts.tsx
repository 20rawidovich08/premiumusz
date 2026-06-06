import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, ExternalLink, Sparkles } from "lucide-react";

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
  sort_order: number;
}

const tileGradients = [
  "bento-violet", "bento-magenta", "bento-cyan",
  "bento-mint", "bento-amber", "bento-coral",
];

const NftGifts = () => {
  const [gifts, setGifts] = useState<NftGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("nft_gifts")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGifts((data as NftGift[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="NFT Gift — Telegram NFT sovg'alar | Premium UZ"
        description="Telegram NFT sovg'alarini Premium UZ orqali tomosha qiling va xarid qiling."
        path="/gifts"
      />
      <SiteHeader />
      <main className="flex-1 container py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(var(--c-magenta))" }} />
            NFT Collection
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold md:text-6xl">
            <span className="text-gradient-rainbow">NFT Gift</span> Marketplace
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Telegram NFT sovg'alarining noyob to'plami. Yoqtirganingizni tanlang va to'g'ridan-to'g'ri xarid qiling.
          </p>
        </div>

        {loading ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-72 rounded-3xl bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : gifts.length === 0 ? (
          <div className="mt-16 rounded-3xl glass p-10 text-center">
            <Gift className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Hozircha NFT sovg'alar yo'q. Tez orada qo'shamiz!</p>
          </div>
        ) : (
          <div className="mt-12 grid auto-rows-[minmax(220px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gifts.map((g, i) => (
              <article
                key={g.id}
                className={`bento ${tileGradients[i % tileGradients.length]} group flex flex-col`}
              >
                {g.badge && (
                  <Badge className="absolute right-4 top-4 z-10 border-0 bg-background/80 backdrop-blur text-foreground">
                    {g.badge}
                  </Badge>
                )}
                {g.image_url ? (
                  <div className="mb-4 aspect-square overflow-hidden rounded-2xl bg-background/30">
                    <img
                      src={g.image_url}
                      alt={g.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="mb-4 grid aspect-square place-items-center rounded-2xl bg-background/30">
                    <Gift className="h-16 w-16 opacity-40" />
                  </div>
                )}
                <h3 className="font-display text-lg font-bold">{g.title}</h3>
                {g.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{g.description}</p>
                )}
                <div className="mt-auto flex items-end justify-between pt-4">
                  <div>
                    {g.price_ton != null && (
                      <div className="text-xs text-muted-foreground">{g.price_ton} TON</div>
                    )}
                    {g.price != null && (
                      <div className="font-display text-xl font-bold">
                        {Number(g.price).toLocaleString("ru-RU")} <span className="text-xs text-muted-foreground">UZS</span>
                      </div>
                    )}
                  </div>
                  {g.telegram_link && (
                    <Button asChild size="sm" className="rounded-full bg-gradient-primary">
                      <a href={g.telegram_link} target="_blank" rel="noreferrer">
                        Xarid <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default NftGifts;
