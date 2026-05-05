import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { MessageCircle, Send, User as UserIcon } from "lucide-react";

type Thread = {
  id: string;
  user_id: string | null;
  subject: string | null;
  status: string;
  unread_admin: number;
  last_message_at: string;
  profile?: { full_name: string | null; phone: string | null } | null;
};

type Msg = { id: string; sender_kind: "user" | "admin"; body: string; created_at: string };

const AdminSupport = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    const { data } = await supabase
      .from("support_threads")
      .select("id, user_id, subject, status, unread_admin, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(100);
    const list = (data ?? []) as Thread[];
    // fetch profiles
    const ids = Array.from(new Set(list.map((t) => t.user_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
      list.forEach((t) => {
        if (t.user_id) t.profile = map.get(t.user_id) ?? null;
      });
    }
    setThreads(list);
    if (!active && list[0]) setActive(list[0].id);
  };

  useEffect(() => {
    loadThreads();
    const ch = supabase
      .channel("admin-support-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load messages for active thread + realtime
  useEffect(() => {
    if (!active) return;
    let ok = true;
    supabase
      .from("support_messages")
      .select("id, sender_kind, body, created_at")
      .eq("thread_id", active)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (ok) setMessages((data ?? []) as Msg[]); });

    supabase.rpc("support_mark_read", { p_thread_id: active, p_as: "admin" });

    const ch = supabase
      .channel(`admin-support-${active}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${active}` },
        (payload: any) => {
          setMessages((m) => [...m, payload.new as Msg]);
          supabase.rpc("support_mark_read", { p_thread_id: active, p_as: "admin" });
        }
      )
      .subscribe();
    return () => { ok = false; supabase.removeChannel(ch); };
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!active || !user || !text.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert({
      thread_id: active,
      sender_kind: "admin",
      sender_id: user.id,
      body: text.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  const closeThread = async () => {
    if (!active) return;
    await supabase.from("support_threads").update({ status: "closed" }).eq("id", active);
    toast.success("Yopildi");
    loadThreads();
  };

  const activeThread = threads.find((t) => t.id === active);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" /> Qo'llab-quvvatlash
        </h1>
        <p className="text-sm text-muted-foreground">Foydalanuvchilar bilan to'g'ridan-to'g'ri chat</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Threads list */}
        <div className="rounded-2xl glass overflow-hidden">
          <div className="border-b border-border/60 p-3 text-sm font-semibold">Suhbatlar ({threads.length})</div>
          <div className="max-h-[60vh] overflow-y-auto">
            {threads.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">Hozircha suhbatlar yo'q</p>
            )}
            {threads.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`flex w-full items-start gap-2 border-b border-border/40 p-3 text-left transition-colors ${
                  active === t.id ? "bg-primary/10" : "hover:bg-secondary/40"
                }`}
              >
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {t.profile?.full_name || t.profile?.phone || "Foydalanuvchi"}
                    </p>
                    {t.unread_admin > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                        {t.unread_admin}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {new Date(t.last_message_at).toLocaleString("uz-UZ")}
                    {t.status === "closed" && " · yopilgan"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex h-[60vh] flex-col rounded-2xl glass overflow-hidden">
          {activeThread ? (
            <>
              <div className="flex items-center justify-between border-b border-border/60 p-3">
                <div>
                  <p className="text-sm font-semibold">
                    {activeThread.profile?.full_name || "Foydalanuvchi"}
                  </p>
                  <p className="text-xs text-muted-foreground">{activeThread.profile?.phone || activeThread.user_id?.slice(0, 8)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={closeThread} disabled={activeThread.status === "closed"}>
                  Yopish
                </Button>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_kind === "admin" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                        m.sender_kind === "admin"
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-secondary text-foreground"
                      }`}
                    >
                      {m.body}
                      <div className="mt-0.5 text-[10px] opacity-60">
                        {new Date(m.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-border/60 p-3">
                <Input
                  placeholder="Javob yozing..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  maxLength={2000}
                />
                <Button onClick={send} disabled={busy || !text.trim()} size="icon" className="bg-gradient-primary text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Suhbatni tanlang
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
