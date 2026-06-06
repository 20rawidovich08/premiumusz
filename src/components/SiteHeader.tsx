import { Link, NavLink, useNavigate } from "react-router-dom";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Wallet, User as UserIcon, LogOut, Menu, LifeBuoy } from "lucide-react";
import { openSupportChat } from "@/components/SupportChat";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const SiteHeader = () => {
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!user) { setBalance(0); return; }
    let active = true;
    supabase.from("profiles").select("balance").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (active) setBalance(Number(data?.balance ?? 0));
    });
    const ch = supabase
      .channel(`profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, (payload: any) => {
        setBalance(Number(payload.new?.balance ?? 0));
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [user]);

  const navItems = [
    { to: "/", label: t("nav.home") },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/stars", label: t("nav.stars") },
    { to: "/gifts", label: t("nav.gifts") },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="container flex items-center justify-between gap-2 py-2.5 sm:py-4">
        <Link to="/" className="flex items-center gap-2 font-display text-base font-bold sm:text-lg">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary glow-ring sm:h-9 sm:w-9">
            <Sparkles className="h-4 w-4 text-primary-foreground sm:h-5 sm:w-5" />
          </span>
          <span className="text-gradient">Premium UZ</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full glass px-2 py-1 md:flex">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          {!loading && user ? (
            <>
              <Link
                to="/topup"
                className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-1 text-xs font-medium hover:bg-secondary sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-sm"
              >
                <Wallet className="h-3.5 w-3.5 text-primary sm:h-4 sm:w-4" />
                {balance.toLocaleString("ru-RU")} <span className="text-[10px] text-muted-foreground sm:text-xs">UZS</span>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full" aria-label="Foydalanuvchi menyusi">
                    <UserIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <UserIcon className="mr-2 h-4 w-4" /> {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/topup")}>
                    <Wallet className="mr-2 h-4 w-4" /> {t("nav.topup")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openSupportChat()}>
                    <LifeBuoy className="mr-2 h-4 w-4" /> Qo'llab-quvvatlash
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> {t("nav.signout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : !loading ? (
            <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground">
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          ) : null}

          {/* mobile nav */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Asosiy menyu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {navItems.map((n) => (
                <DropdownMenuItem key={n.to} onClick={() => navigate(n.to)}>{n.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
