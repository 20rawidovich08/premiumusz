import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/lib/seo";
import { ArrowLeft, Calendar } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  published_at: string | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("blog_posts")
      .select("id,slug,title,excerpt,content,cover_url,published_at")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPost(data as Post);
        else setNotFound(true);
      });
  }, [slug]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 container py-20 text-center">
          <h1 className="font-display text-3xl font-bold">Maqola topilmadi</h1>
          <Link to="/blog" className="mt-4 inline-block text-primary underline">
            Blogga qaytish
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 grid place-items-center text-muted-foreground">Yuklanmoqda...</main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Seo
        title={`${post.title} — Premium UZ Blog`}
        description={post.excerpt || post.title}
        path={`/blog/${post.slug}`}
        type="article"
        image={post.cover_url || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: post.cover_url ? [post.cover_url] : undefined,
          datePublished: post.published_at,
          author: { "@type": "Organization", name: "Premium UZ" },
        }}
      />
      <SiteHeader />
      <main className="flex-1 container py-12">
        <div className="mx-auto max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Blogga qaytish
          </Link>

          <article className="mt-6">
            <h1 className="font-display text-4xl font-bold leading-tight md:text-5xl">{post.title}</h1>
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
            </div>

            {post.cover_url && (
              <img
                src={post.cover_url}
                alt={post.title}
                className="mt-6 aspect-video w-full rounded-2xl object-cover"
              />
            )}

            {post.excerpt && (
              <p className="mt-6 text-lg text-muted-foreground">{post.excerpt}</p>
            )}

            <div className="prose prose-invert mt-8 max-w-none prose-headings:font-display prose-a:text-primary prose-strong:text-foreground prose-img:rounded-xl">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default BlogPost;
