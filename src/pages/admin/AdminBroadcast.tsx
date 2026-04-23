import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const AdminBroadcast = () => {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const send = async () => {
    if (!msg.trim()) return toast.error("Message is empty");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("broadcast", { body: { message: msg } });
    setBusy(false);
    if (error) return toast.error(error.message);
    setResult(data);
    toast.success("Broadcast sent");
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Broadcast</h1>
      <p className="mt-2 text-sm text-muted-foreground">Send a message to every registered bot user. HTML is supported.</p>
      <Textarea
        rows={8}
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Hello! New discount available..."
        className="mt-4 max-w-2xl"
      />
      <Button onClick={send} disabled={busy} className="mt-3 bg-gradient-primary text-primary-foreground">
        {busy ? "Sending..." : "Send broadcast"}
      </Button>
      {result && (
        <pre className="mt-4 max-w-2xl rounded-xl bg-secondary/60 p-4 text-xs">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

export default AdminBroadcast;
