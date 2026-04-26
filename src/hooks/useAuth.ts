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
    let lastUserId: string | null = null;

    const applySession = async (s: Session | null, initial = false) => {
      const nextUser = s?.user ?? null;
      setSession(s);
      setUser(nextUser);
      if (nextUser?.id !== lastUserId) {
        lastUserId = nextUser?.id ?? null;
        setIsAdmin(nextUser ? await getAdmin(nextUser.id) : false);
      }
      if (initial) setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setTimeout(() => { applySession(s); }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      applySession(s, true);
    });

    return () => subscription.unsubscribe();
  }, []);

  return createElement(AuthContext.Provider, { value: { session, user, isAdmin, loading } }, children);
};

export const useAuth = () => useContext(AuthContext);
