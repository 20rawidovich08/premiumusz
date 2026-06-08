import { Link, NavLink, useNavigate } from "react-router-dom";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Send, Wallet, User as UserIcon, LogOut, Menu, LifeBuoy, Bell } from "lucide-react";
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
    { to: "/stars", label: t("nav.stars") },
    { to: "/pricing", label: t("nav.pricing") },
    { to: "/topup", label: "To'lovlar" },
    { to: "/faq", label: "Yordam" },
  ];

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Send className="h-4 w-4 -rotate-45" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-bold">Premium <span className="text-primary">Usz</span></div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Store</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          <div className="hidden sm:block"><LangSwitcher /></div>

          {!loading && user ? (
            <>
              <Link
                to="/topup"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold shadow-xs hover:border-primary/50 hover:text-primary"
              >
                <Wallet className="h-4 w-4 text-primary" />
                <span>{balance.toLocaleString("ru-RU")}</span>
                <span className="text-[10px] font-medium text-muted-foreground">UZS</span>
              </Link>

              <Button variant="ghost" size="icon" className="hidden h-9 w-9 sm:inline-flex" aria-label="Bildirishnomalar">
                <Bell className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-border" aria-label="Profil">
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
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/auth">{t("nav.login")}</Link>
            </Button>
          ) : null}

          {/* mobile menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 md:hidden" aria-label="Menyu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {navItems.map((n) => (
                <DropdownMenuItem key={n.to} onClick={() => navigate(n.to)}>{n.label}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5"><LangSwitcher /></div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
