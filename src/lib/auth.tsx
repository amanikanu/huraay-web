import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  configured: false,
  signOut: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  useEffect(() => {
    if (!supabase) return;
    // On mount, check whether the stored session's access token is already expired.
    // autoRefreshToken only fires proactively (before expiry) — it cannot rescue a
    // token that expired while the browser tab was closed. We call refreshSession()
    // here so the Supabase client has a valid JWT before any component fires its
    // first API call, eliminating the cascade of 401s on app load.
    supabase.auth.getSession().then(async ({ data }) => {
      let current = data.session;
      if (current?.expires_at && current.expires_at * 1000 < Date.now()) {
        const { data: refreshed } = await supabase!.auth.refreshSession();
        current = refreshed.session ?? current;
      }
      setSession(current);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useMemo(
    () => ({
      session,
      loading,
      configured: isSupabaseConfigured,
      signOut: async () => {
        await supabase?.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
