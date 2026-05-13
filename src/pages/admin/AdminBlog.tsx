import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);

const empty = (): Partial<Post> => ({
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_url: "",
  published: false,
});

const AdminBlog = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<Partial<Post> | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setPosts((data as Post[]) ?? []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const slug = (editing.slug || slugify(editing.title || "")).trim();
    if (!editing.title?.trim() || !slug) return toast.error("Sarlavha va slug majburiy");
    const payload: any = {
      slug,
      title: editing.title.trim(),
      excerpt: editing.excerpt?.trim() || null,
      content: editing.content || "",
      cover_url: editing.cover_url?.trim() || null,
      published: !!editing.published,
      published_at: editing.published ? (editing.published_at || new Date().toISOString()) : null,
      author_id: user?.id,
    };
    if (editing.id) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) return toast.error(error.message);
    }
    toast.success("Saqlandi");
    setEditing(null);
    load();
  };

  const togglePublish = async (p: Post) => {
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: !p.published,
        published_at: !p.published ? new Date().toISOString() : p.published_at,
      })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (p: Post) => {
    if (!confirm(`"${p.title}" maqolasini o'chirilsinmi?`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("O'chirildi");
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Blog</h1>
        <Button onClick={() => setEditing(empty())} className="bg-gradient-primary text-primary-foreground">
          <Plus className="mr-1 h-4 w-4" /> Yangi maqola
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl glass">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Sarlavha</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Holat</th>
              <th className="p-3">Sana</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-t border-border/40 hover:bg-secondary/20">
                <td className="p-3 font-medium">{p.title}</td>
                <td className="p-3 font-mono text-xs">/{p.slug}</td>
                <td className="p-3">
                  {p.published ? (
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">Nashrda</span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Qoralama</span>
                  )}
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => togglePublish(p)} title="Nashr / Qoralama">
                      {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(p)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Maqolalar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Maqolani tahrirlash" : "Yangi maqola"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Sarlavha *</Label>
                <Input
                  value={editing.title || ""}
                  onChange={(e) => {
                    const title = e.target.value;
                    setEditing({
                      ...editing,
                      title,
                      slug: editing.id ? editing.slug : slugify(title),
                    });
                  }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Slug (URL) *</Label>
                <Input
                  value={editing.slug || ""}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  className="mt-1.5 font-mono"
                  placeholder="telegram-premium-haqida"
                />
              </div>
              <div>
                <Label>Qisqa matn (excerpt)</Label>
                <Textarea
                  rows={2}
                  value={editing.excerpt || ""}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  className="mt-1.5"
                  maxLength={300}
                />
              </div>
              <div>
                <Label>Muqova rasm URL</Label>
                <Input
                  value={editing.cover_url || ""}
                  onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })}
                  className="mt-1.5"
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Asosiy matn (Markdown qo'llanadi)</Label>
                <Textarea
                  rows={14}
                  value={editing.content || ""}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="mt-1.5 font-mono text-sm"
                  placeholder="## Sarlavha\n\nMatn..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={!!editing.published}
                  onCheckedChange={(v) => setEditing({ ...editing, published: v })}
                />
                <Label>Nashr qilish</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Bekor qilish</Button>
                <Button onClick={save} className="bg-gradient-primary text-primary-foreground">
                  Saqlash
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlog;
