import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate("/profile", { replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/profile`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm sign up");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/profile",
    });
    if (result.error) {
      toast.error((result.error as any).message || "Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate("/profile");
  };

  if (loading) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm rounded-3xl glass p-8 animate-fade-up">
          <div className="mb-6 flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </span>
            <h1 className="font-display text-xl font-bold">
              {mode === "signup" ? t("auth.signup") : t("auth.signin")}
            </h1>
          </div>

          <div className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label>{t("auth.fullname")}</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" required />
              </div>
            )}
            <div>
              <Label>{t("auth.email")}</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>{t("auth.password")}</Label>
              <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {busy ? t("common.loading") : mode === "signup" ? t("auth.signup") : t("auth.signin")}
            </Button>

            <div className="relative my-2 text-center text-xs text-muted-foreground">
              <span className="bg-background px-2 relative z-10">{t("auth.or")}</span>
              <div className="absolute inset-x-0 top-1/2 -z-0 h-px bg-border" />
            </div>

            <Button type="button" variant="outline" disabled={busy} onClick={google} className="w-full">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 11v3.6h5.1c-.2 1.3-1.6 3.8-5.1 3.8-3.1 0-5.6-2.5-5.6-5.7s2.5-5.7 5.6-5.7c1.7 0 2.9.7 3.6 1.4l2.5-2.4C16.5 4.5 14.4 3.5 12 3.5 6.9 3.5 2.8 7.6 2.8 12.7s4.1 9.2 9.2 9.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"/></svg>
              {t("auth.google")}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
            </button>
          </div>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Auth;
