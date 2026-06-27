import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let hasRestoredInitialSession = false;

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      // Honor a post-OAuth redirect saved before redirecting to the provider.
      // Lovable OAuth requires redirect_uri to equal window.location.origin (no path),
      // so we navigate to the desired destination here once the session is established.
      if (nextSession?.user) {
        try {
          const target = sessionStorage.getItem("postLoginRedirect");
          if (target && target.startsWith("/") && !target.startsWith("//")) {
            sessionStorage.removeItem("postLoginRedirect");
            if (window.location.pathname !== target) {
              window.history.replaceState({}, "", target);
              // Notify React Router of the new path
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          }
        } catch {
          /* ignore storage errors */
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (!isMounted) return;
        if (event === "INITIAL_SESSION" && !hasRestoredInitialSession) return;
        applySession(nextSession);
      }
    );

    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        hasRestoredInitialSession = true;

        if (error) {
          console.warn("Failed to restore auth session", error.message);
          applySession(null);
          void supabase.auth.signOut().catch(() => undefined);
          return;
        }

        applySession(session);
      })
      .catch((error) => {
        hasRestoredInitialSession = true;
        console.warn("Unexpected auth restore failure", error);
        applySession(null);
      });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            phone: phone || null,
          },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      let { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      const msg = (m?: string) => (m || "").toLowerCase();

      // 1) Fallback: akun phone lama memakai domain @phone.local.
      //    Coba ulang dengan domain legacy sebelum menyerah.
      if (
        error &&
        (msg(error.message).includes("invalid login credentials") ||
          msg(error.message).includes("email not confirmed")) &&
        email.toLowerCase().endsWith("@phone.bengkelstroban.com")
      ) {
        const legacy = email.toLowerCase().replace(
          "@phone.bengkelstroban.com",
          "@phone.local",
        );
        const retry = await supabase.auth.signInWithPassword({
          email: legacy,
          password,
        });
        if (!retry.error) return { error: null };
        // simpan error terakhir untuk fallback berikut
        error = retry.error;
        // ganti `email` ke domain modern lagi untuk auto-confirm fallback
      }

      // 2) Fallback auto-confirm. Supabase versi baru menyamarkan
      //    "email not confirmed" → "Invalid login credentials". Kita coba
      //    konfirmasi sekali (server hanya mengkonfirmasi bila profil
      //    `is_verified=true`) lalu retry login.
      if (
        error &&
        (msg(error.message).includes("invalid login credentials") ||
          msg(error.message).includes("email not confirmed"))
      ) {
        try {
          const { data: confirmData } = await supabase.functions.invoke(
            "admin-user-ops",
            { body: { action: "confirm_email_by_email", email } },
          );
          if (confirmData?.success) {
            const retry = await supabase.auth.signInWithPassword({ email, password });
            if (!retry.error) return { error: null };
            return { error: retry.error as Error };
          }
        } catch {
          /* ignore confirm errors, jatuh ke pesan asli */
        }
      }

      if (error) return { error: error as Error | null };
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During HMR, context may temporarily be undefined - provide safe defaults
    console.warn("useAuth called outside AuthProvider - this may be a transient HMR issue");
    return {
      user: null,
      session: null,
      loading: true,
      signUp: async () => ({ error: new Error("Auth not ready") }),
      signIn: async () => ({ error: new Error("Auth not ready") }),
      signOut: async () => {},
    } as AuthContextType;
  }
  return context;
}
