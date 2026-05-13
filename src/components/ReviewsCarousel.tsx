import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

interface Review {
  id: string;
  display_name: string;
  rating: number;
  body: string;
  created_at: string;
}

export const ReviewsCarousel = () => {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id,display_name,rating,body,created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(9)
      .then(({ data }) => setReviews((data as Review[]) ?? []));
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="container py-16">
      <div className="mb-10 text-center">
        <h2 className="font-display text-4xl font-bold md:text-5xl">Mijozlarimiz fikri</h2>
        <p className="mt-3 text-muted-foreground">Bizga ishongan foydalanuvchilarning haqiqiy sharhlari</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-2xl glass p-6">
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < r.rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
                />
              ))}
            </div>
            <p className="text-sm text-foreground/90">{r.body}</p>
            <div className="mt-4 flex items-center gap-3 border-t border-border/40 pt-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                {r.display_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-medium">{r.display_name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
