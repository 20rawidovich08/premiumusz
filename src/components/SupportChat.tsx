import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const openSupportChat = () => {
  window.dispatchEvent(new CustomEvent("open-support-chat"));
};

type Msg = { id: string; sender_kind: "user" | "admin"; body: string; created_at: string };

export const SupportChat = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-support-chat", handler);
    return () => window.removeEventListener("open-support-chat", handler);
  }, []);

  // Init thread when opened
  useEffect(() => {
    if (!open || !user || threadId) return;
    (async () => {
      const { data, error } = await supabase.rpc("support_get_or_create_thread");
      if (error) return toast.error(error.message);
      setThreadId(data as string);
    })();
  }, [open, user, threadId]);

  // Load messages + realtime
  useEffect(() => {
    if (!threadId) return;
    let active = true;
    supabase
      .from("support_messages")
      .select("id, sender_kind, body, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (active) setMessages((data ?? []) as Msg[]);
      });

    const ch = supabase
      .channel(`support-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `thread_id=eq.${threadId}` },
        (payload: any) => {
          setMessages((m) => [...m, payload.new as Msg]);
          if (payload.new.sender_kind === "admin" && !open) setUnread((n) => n + 1);
        }
      )
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [threadId, open]);

  // Mark read on open
  useEffect(() => {
    if (open && threadId) {
      setUnread(0);
      supabase.rpc("support_mark_read", { p_thread_id: threadId, p_as: "user" });
    }
  }, [open, threadId, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Listen for unread on background (initial)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("support_threads")
      .select("unread_user")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.unread_user) setUnread(data.unread_user);
      });
  }, [user]);

  const send = async () => {
    const body = text.trim();
    if (!body || !threadId || !user) return;
    if (body.length > 2000) return toast.error("Xabar juda uzun");
    setBusy(true);
    const { error } = await supabase.from("support_messages").insert({
      thread_id: threadId,
      sender_kind: "user",
      sender_id: user.id,
      body,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full bg-gradient-primary shadow-glow transition-all hover:scale-110 md:bottom-6 md:right-6 md:h-14 md:w-14"
        aria-label="Support chat"
      >
        {open ? <X className="h-5 w-5 text-primary-foreground" /> : <MessageCircle className="h-5 w-5 text-primary-foreground" />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[70vh] max-h-[560px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl md:right-6">
          <div className="flex items-start justify-between border-b border-border/60 p-4">
            <div>
              <h3 className="font-display text-lg font-bold">Admin bilan chat</h3>
              <p className="text-xs text-muted-foreground">Tezda javob beramiz</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-secondary" aria-label="Yopish">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Chat uchun avval tizimga kiring</p>
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
                <Link to="/auth" onClick={() => setOpen(false)}>Kirish</Link>
              </Button>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground">Salom! Savolingizni yozing.</p>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender_kind === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                        m.sender_kind === "user"
                          ? "rounded-br-sm bg-primary text-primary-foreground"
                          : "rounded-bl-sm bg-secondary text-foreground"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-border/60 p-3">
                <Input
                  placeholder="Xabar yozing..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  maxLength={2000}
                />
                <Button onClick={send} disabled={busy || !text.trim()} size="icon" className="bg-gradient-primary text-primary-foreground">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
