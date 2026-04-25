import { createContext, createElement, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; isAdmin: boolean; loading: boolean };

const AuthContext = createContext<AuthState>({ session: null, user: null, isAdmin: false, loading: true });

const getAdmin = async (userId: string) => {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return !!data;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySession = async (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsAdmin(s?.user ? await getAdmin(s.user.id) : false);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setLoading(true);
      setTimeout(() => { applySession(s); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      applySession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  return createElement(AuthContext.Provider, { value: { session, user, isAdmin, loading } }, children);
};

export const useAuth = () => useContext(AuthContext);
