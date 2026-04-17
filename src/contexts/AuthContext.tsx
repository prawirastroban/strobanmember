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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // If "Email not confirmed", check if user is admin-verified
      if (error && error.message?.toLowerCase().includes("email not confirmed")) {
        // Look up profile by email pattern to check is_verified
        // We need to call the edge function to confirm email first
        try {
          const { data: confirmData, error: confirmError } = await supabase.functions.invoke("admin-user-ops", {
            body: { action: "confirm_email_by_email", email },
          });
          if (!confirmError && confirmData?.success) {
            // Retry login after email confirmed
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (retryError) return { error: retryError as Error };
            
            // Check is_verified
            if (retryData.user) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("is_verified")
                .eq("id", retryData.user.id)
                .single();
              if (profile && !(profile as any).is_verified) {
                await supabase.auth.signOut();
                return { error: new Error("Akun belum diverifikasi. Silakan hubungi admin.") };
              }
            }
            return { error: null };
          }
        } catch (e) {
          // confirm failed, return original error
        }
        return { error: new Error("Akun belum diverifikasi. Silakan hubungi admin.") };
      }

      if (error) return { error: error as Error | null };

      // Check if user is verified
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_verified")
          .eq("id", data.user.id)
          .single();

        if (profile && !(profile as any).is_verified) {
          await supabase.auth.signOut();
          return { error: new Error("Akun belum diverifikasi. Silakan hubungi admin.") };
        }
      }

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
