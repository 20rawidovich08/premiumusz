import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Image as ImageIcon, X, Upload } from "lucide-react";
import { useAdminT } from "@/lib/adminI18n";

const AdminBroadcast = () => {
  const t = useAdminT();
  const [msg, setMsg] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const onPickPhoto = (file: File | null) => {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const send = async () => {
    if (!msg.trim() && !photo) return toast.error(t("emptyMessage"));
    setBusy(true);
    try {
      let photo_url: string | undefined;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `broadcasts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("broadcast-assets")
          .upload(path, photo, { contentType: photo.type, upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("broadcast-assets").getPublicUrl(path);
        photo_url = data.publicUrl;
      }
      const { data, error } = await supabase.functions.invoke("broadcast", {
        body: { message: msg, photo_url },
      });
      if (error) throw error;
      setResult(data);
      toast.success(t("sent"));
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{t("broadcast")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Bot foydalanuvchilariga xabar yuboring. Rasm ham ilova qilishingiz mumkin. HTML qo'llab-quvvatlanadi.
      </p>
      <div className="mt-4 max-w-2xl space-y-3">
        <Textarea
          rows={8}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Xabar matni... (rasm bilan birga caption sifatida yuboriladi)"
        />

        <div>
          {photoPreview ? (
            <div className="relative inline-block">
              <img src={photoPreview} alt="preview" className="max-h-64 rounded-xl border border-border" />
              <button
                type="button"
                onClick={() => onPickPhoto(null)}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 hover:bg-background"
                aria-label="remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center transition-all hover:border-primary/50">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">
                <ImageIcon className="mr-1 inline h-4 w-4" /> Rasm tanlash (ixtiyoriy)
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          )}
        </div>

        <Button onClick={send} disabled={busy} className="bg-gradient-primary text-primary-foreground">
          {busy ? t("sending") : t("sendBroadcast")}
        </Button>
      </div>

      {result && (
        <pre className="mt-4 max-w-2xl rounded-xl bg-secondary/60 p-4 text-xs">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
};

export default AdminBroadcast;
