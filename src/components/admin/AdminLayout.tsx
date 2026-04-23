import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, ShoppingBag, Settings, Megaphone, LogOut, Sparkles, Tag } from "lucide-react";

const items = [
  { to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/plans", icon: Tag, label: "Plans" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
  { to: "/admin/broadcast", icon: Megaphone, label: "Broadcast" },
];

export const AdminLayout = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading...</div>;
  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="rounded-3xl glass max-w-md p-8">
          <h2 className="font-display text-2xl font-bold">Not authorized</h2>
          <p className="mt-2 text-muted-foreground">
            Your account does not have admin access. Contact a workspace admin to grant the <code className="rounded bg-secondary px-1">admin</code> role to <span className="font-mono text-foreground">{user.email}</span>.
          </p>
          <Button className="mt-6" onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}>
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
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
              end={it.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border/50 p-3 text-xs">
          <div className="truncate px-2 text-muted-foreground">{user.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/admin/login");
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10">
        <Outlet />
      </main>
    </div>
  );
};
