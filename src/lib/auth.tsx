import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";
import { api } from "./api";

export type UserProfile = {
  full_name: string;
  avatar_url: string | null;
  email: string;
  default_whatsapp_e164?: string;
};

type AuthState = {
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  session: null,
  userProfile: null,
  loading: true,
  configured: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const fetchProfile = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setUserProfile(null);
      return;
    }
    try {
      const data = await api.profile();
      setUserProfile({
        full_name: data.full_name || (currentSession.user.user_metadata?.full_name as string) || (currentSession.user.user_metadata?.display_name as string) || "",
        avatar_url: data.avatar_url || (currentSession.user.user_metadata?.avatar_url as string) || null,
        email: data.email || currentSession.user.email || "",
        default_whatsapp_e164: data.default_whatsapp_e164 || "",
      });
    } catch {
      setUserProfile({
        full_name: (currentSession.user.user_metadata?.full_name as string) || (currentSession.user.user_metadata?.display_name as string) || "",
        avatar_url: (currentSession.user.user_metadata?.avatar_url as string) || null,
        email: currentSession.user.email || "",
      });
    }
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      let current = data.session;
      if (current?.expires_at && current.expires_at * 1000 < Date.now()) {
        const { data: refreshed } = await supabase!.auth.refreshSession();
        current = refreshed.session ?? current;
      }
      setSession(current);
      if (current) await fetchProfile(current);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) await fetchProfile(next);
      else setUserProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo(
    () => ({
      session,
      userProfile,
      loading,
      configured: isSupabaseConfigured,
      signOut: async () => {
        await supabase?.auth.signOut();
        setSession(null);
        setUserProfile(null);
      },
      refreshProfile: async () => {
        if (session) await fetchProfile(session);
      },
    }),
    [session, userProfile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
