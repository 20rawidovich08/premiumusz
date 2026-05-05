import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const SupportChat = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (msg.trim().length < 2) return toast.error("Xabar juda qisqa");
    if (msg.length > 2000) return toast.error("Xabar juda uzun");
    setBusy(true);
    const { error } = await supabase.functions.invoke("support-message", {
      body: {
        name: name || user?.email || "Anonim",
        contact: contact || user?.email || "",
        message: msg,
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
    setMsg("");
    toast.success("Xabar yuborildi! Tez orada javob beramiz.");
    setTimeout(() => { setSent(false); setOpen(false); }, 2500);
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
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-xl md:right-6">
          <div className="mb-3">
            <h3 className="font-display text-lg font-bold">Yordam kerakmi?</h3>
            <p className="text-xs text-muted-foreground">Xabaringiz Telegram orqali adminlarga yetadi</p>
          </div>

          {sent ? (
            <div className="rounded-xl bg-success/10 p-4 text-center text-sm text-success">
              ✓ Yuborildi! Tez orada javob olasiz.
            </div>
          ) : (
            <div className="space-y-2">
              {!user && (
                <>
                  <Input placeholder="Ismingiz" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Telegram yoki telefon" value={contact} onChange={(e) => setContact(e.target.value)} />
                </>
              )}
              <Textarea
                placeholder="Xabaringizni yozing..."
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <Button onClick={send} disabled={busy} className="w-full bg-gradient-primary text-primary-foreground">
                <Send className="mr-2 h-4 w-4" /> {busy ? "Yuborilmoqda..." : "Yuborish"}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
