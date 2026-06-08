import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminT } from "@/lib/adminI18n";
import { requestAdminNotificationPermission } from "@/hooks/useAdminNotifications";
import {
  LayoutDashboard, Users, ShoppingBag, Settings, Megaphone, LogOut, Send,
  Tag, Star, Wallet, Bell, Ticket, MessageCircle, BookOpen, Gift, Search,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; end?: boolean; icon: any; labelKey: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Asosiy",
    items: [
      { to: "/admin", end: true, icon: LayoutDashboard, labelKey: "dashboard" },
      { to: "/admin/users", icon: Users, labelKey: "users" },
    ],
  },
  {
    label: "Sotuvlar",
    items: [
      { to: "/admin/orders", icon: ShoppingBag, labelKey: "orders" },
      { to: "/admin/topups", icon: Wallet, labelKey: "topups" },
      { to: "/admin/stars", icon: Star, labelKey: "stars" },
      { to: "/admin/plans", icon: Tag, labelKey: "plans" },
      { to: "/admin/nft-gifts", icon: Gift, labelKey: "nftGifts" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/admin/promos", icon: Ticket, labelKey: "promos" },
      { to: "/admin/broadcast", icon: Megaphone, labelKey: "broadcast" },
      { to: "/admin/blog", icon: BookOpen, labelKey: "blog" },
    ],
  },
  {
    label: "Boshqaruv",
    items: [
      { to: "/admin/support", icon: MessageCircle, labelKey: "support" },
      { to: "/admin/settings", icon: Settings, labelKey: "settings" },
    ],
  },
];

const allItems = groups.flatMap(g => g.items);

export const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const t = useAdminT();
  const [_, setTick] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("loading")}</div>;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="surface-lg max-w-md p-8">
          <h2 className="font-display text-2xl font-bold">{t("notAuthorized")}</h2>
          <p className="mt-2 text-muted-foreground">
            Your account does not have admin access. Contact a workspace admin to grant the <code className="rounded bg-secondary px-1">admin</code> role to <span className="font-mono text-foreground">{user.email}</span>.
          </p>
          <Button className="mt-6" onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}>
            {t("signOut")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-secondary/40">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Link to="/" className="flex items-center gap-2.5 border-b border-border px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Send className="h-4 w-4 -rotate-45" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-sm font-bold">Premium Usz</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Console</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.label}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{g.label}</div>
              <div className="space-y-0.5">
                {g.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={"end" in it ? it.end : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-secondary"
                      }`
                    }
                  >
                    <it.icon className="h-4 w-4" />
                    {t(it.labelKey)}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost" size="sm" className="w-full justify-start"
            onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}
          >
            <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur lg:px-6">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Send className="h-3.5 w-3.5 -rotate-45" />
            </span>
            <span className="font-display text-sm font-bold">Admin</span>
          </Link>
          <div className="hidden flex-1 lg:flex">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Qidirish: buyurtma, foydalanuvchi, ID..." className="h-9 pl-9" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => requestAdminNotificationPermission(t("notificationsEnabled"))} aria-label="notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {(user.email?.[0] ?? "A").toUpperCase()}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-xs sm:inline">{user.email}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/")}>Saytga o'tish</DropdownMenuItem>
                <DropdownMenuItem onClick={() => requestAdminNotificationPermission(t("notificationsEnabled"))}>
                  <Bell className="mr-2 h-4 w-4" /> {t("enableNotifications")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}>
                  <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch overflow-x-auto border-t border-border bg-card/95 backdrop-blur lg:hidden">
          {allItems.slice(0, 6).map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={"end" in it ? it.end : undefined}
              className={({ isActive }) =>
                `flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <it.icon className="h-4 w-4" />
              <span className="leading-none">{t(it.labelKey)}</span>
            </NavLink>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-w-[56px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium text-muted-foreground">
                <Settings className="h-4 w-4" />
                <span>Boshqa</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end">
              {allItems.slice(6).map((it) => (
                <DropdownMenuItem key={it.to} onClick={() => navigate(it.to)}>
                  <it.icon className="mr-2 h-4 w-4" /> {t(it.labelKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </div>
  );
};
