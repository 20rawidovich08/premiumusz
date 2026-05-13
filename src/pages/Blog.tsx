import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
}

const Blog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("blog_posts")
      .select("id,slug,title,excerpt,cover_url,published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts((data as Post[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title="Blog — Telegram Premium UZ"
        description="Telegram Premium, Stars va boshqa Telegram xizmatlari haqida eng so'nggi yangiliklar va foydali maqolalar."
        path="/blog"
      />
      <SiteHeader />
      <main className="flex-1 container py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-medium text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Blog
          </div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">Yangiliklar va maqolalar</h1>
          <p className="mt-3 text-muted-foreground">Telegram Premium, Stars va xizmatlarimiz haqida</p>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground">Yuklanmoqda...</div>
        ) : posts.length === 0 ? (
          <div className="text-center text-muted-foreground rounded-2xl glass p-12">
            Hozircha maqolalar yo'q. Tez orada qo'shamiz!
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={`/blog/${p.slug}`}
                className="group overflow-hidden rounded-2xl glass transition-all hover:-translate-y-1 hover:shadow-glow"
              >
                {p.cover_url ? (
                  <div className="aspect-video overflow-hidden bg-secondary/40">
                    <img
                      src={p.cover_url}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-primary opacity-40" />
                )}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}
                  </div>
                  <h2 className="mt-2 font-display text-lg font-bold group-hover:text-primary">
                    {p.title}
                  </h2>
                  {p.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.excerpt}</p>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    O'qish <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Blog;
