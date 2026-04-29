import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Car, Loader2, Lock } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Detect recovery via URL hash (#access_token=...&type=recovery) or query (?type=recovery)
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const hasRecoveryMarker =
      hash.includes("type=recovery") ||
      search.includes("type=recovery") ||
      hash.includes("access_token=");

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session || hasRecoveryMarker) setIsValidSession(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsValidSession(true);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
  }, []);

  // Password strength: weak (<8 OR no number), medium (>=8 + number), strong (>=12 + number + symbol/upper)
  const strength = useMemo(() => {
    const len = password.length;
    const hasNumber = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    if (len === 0) return { level: 0, label: "", color: "bg-muted" };
    if (len < 8 || !hasNumber) return { level: 1, label: "Lemah", color: "bg-destructive" };
    if (len >= 12 && (hasUpper || hasSymbol)) return { level: 3, label: "Kuat", color: "bg-green-500" };
    return { level: 2, label: "Sedang", color: "bg-amber-500" };
  }, [password]);

  const validate = (): string | null => {
    if (password.length < 8) return "Password minimal 8 karakter";
    if (!/\d/.test(password)) return "Password harus mengandung minimal 1 angka";
    if (password !== confirmPassword) return "Konfirmasi password tidak cocok";
    return null;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      toast({
        variant: "destructive",
        title: "Gagal mengubah password",
        description: updateError.message,
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Password berhasil diubah",
      description: "Anda akan diarahkan ke halaman login.",
    });
    // Sign out so the user logs in with the new password explicitly
    await supabase.auth.signOut().catch(() => undefined);
    setIsLoading(false);
    setTimeout(() => navigate("/auth", { replace: true }), 2000);
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary rounded-full">
                <Car className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Tautan Tidak Valid</CardTitle>
            <CardDescription>
              Tautan reset password tidak valid atau telah kedaluwarsa. Silakan minta tautan baru.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              <Lock className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Atur Password Baru</CardTitle>
          <CardDescription>
            Masukkan password baru Anda. Minimal 8 karakter dan mengandung angka.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password Baru</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= strength.level ? strength.color : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Kekuatan: <span className="font-medium">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Konfirmasi Password</Label>
              <PasswordInput
                id="confirm-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memperbarui password...
                </>
              ) : (
                "Ubah Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
