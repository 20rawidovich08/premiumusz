import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAdminT } from "@/lib/adminI18n";
import { requestAdminNotificationPermission } from "@/hooks/useAdminNotifications";
import { LayoutDashboard, Users, ShoppingBag, Settings, Megaphone, LogOut, Sparkles, Tag, Star, Wallet, Bell } from "lucide-react";

const items = [
  { to: "/admin", end: true, icon: LayoutDashboard, labelKey: "dashboard" },
  { to: "/admin/orders", icon: ShoppingBag, labelKey: "orders" },
  { to: "/admin/topups", icon: Wallet, labelKey: "topups" },
  { to: "/admin/users", icon: Users, labelKey: "users" },
  { to: "/admin/plans", icon: Tag, labelKey: "plans" },
  { to: "/admin/stars", icon: Star, labelKey: "stars" },
  { to: "/admin/settings", icon: Settings, labelKey: "settings" },
  { to: "/admin/broadcast", icon: Megaphone, labelKey: "broadcast" },
] as const;

export const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const t = useAdminT();

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">{t("loading")}</div>;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="rounded-3xl glass max-w-md p-8">
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
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border/50 bg-card/40 backdrop-blur md:flex">
        <Link to="/" className="flex items-center gap-2 px-6 py-5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="font-display font-bold">Admin</span>
        </Link>
        <nav className="flex-1 space-y-1 px-3">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={"end" in it ? it.end : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              <it.icon className="h-4 w-4" />
              {t(it.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border/50 p-3 text-xs">
          <div className="truncate px-2 text-muted-foreground">{user.email}</div>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => requestAdminNotificationPermission(t("notificationsEnabled"))}
          >
            <Bell className="mr-2 h-4 w-4" /> {t("enableNotifications")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/admin/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/50 bg-card/70 px-3 py-2 backdrop-blur md:hidden">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </span>
            <span className="font-display text-sm font-bold">Admin</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => requestAdminNotificationPermission(t("notificationsEnabled"))}
              aria-label="notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}
              aria-label="sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-3 pb-20 sm:p-5 md:p-8 lg:p-10">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch overflow-x-auto border-t border-border/50 bg-card/90 backdrop-blur md:hidden">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={"end" in it ? it.end : undefined}
              className={({ isActive }) =>
                `flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`
              }
            >
              <it.icon className="h-4 w-4" />
              <span className="leading-none">{t(it.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

