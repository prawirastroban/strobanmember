import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, ShieldAlert, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface ClaimInfo {
  full_name: string;
  email: string;
  booking_public_token: string | null;
  booking_id: string | null;
}

const ClaimAccount = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Sign out any existing session so claim flow starts clean
        await supabase.auth.signOut().catch(() => {});
        const { data, error } = await supabase.functions.invoke("account-claim", {
          body: { action: "validate", token },
        });
        if (cancelled) return;
        if (error || !data?.success) {
          setError(data?.error || error?.message || "Link tidak valid.");
        } else {
          setInfo(data as ClaimInfo);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || "Gagal memuat link.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !info) return;
    if (password.length < 8) { toast.error("Kata sandi minimal 8 karakter"); return; }
    if (password !== confirm) { toast.error("Konfirmasi kata sandi tidak cocok"); return; }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("account-claim", {
        body: { action: "claim", token, password },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || "Gagal mengaktifkan akun");
        setSubmitting(false);
        return;
      }

      // Auto sign-in
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });
      if (signInErr) {
        toast.error("Akun aktif, namun login gagal. Silakan login manual.");
        navigate("/auth", { replace: true });
        return;
      }

      toast.success("Akun aktif! Anda sudah login.");

      // Redirect to booking status page
      if (data.booking_id) {
        navigate(`/booking/status/${data.booking_id}`, { replace: true });
      } else if (data.booking_public_token) {
        navigate(`/t/${data.booking_public_token}`, { replace: true });
      } else {
        navigate("/profile", { replace: true });
      }
    } catch (e) {
      toast.error((e as Error)?.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Link Tidak Valid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{error || "Link tidak ditemukan."}</p>
            <p className="text-xs text-muted-foreground">
              Jika Anda sudah pernah mengaktifkan akun, silakan login langsung.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1"><Link to="/auth">Login</Link></Button>
              <Button asChild className="flex-1"><Link to="/">Beranda</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Aktivasi Akun
          </CardTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Halo <span className="font-semibold text-foreground">{info.full_name}</span>, akun Anda
            sudah dibuat oleh tim Sahabat Stroban Service. Buat kata sandi untuk mengakses status servis Anda.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={info.email} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>Kata Sandi Baru</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Konfirmasi Kata Sandi</Label>
              <Input
                type={showPwd ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ulangi kata sandi"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Aktifkan & Login
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Link ini hanya dapat digunakan 1 kali. Setelah aktif, Anda bisa login menggunakan email/WhatsApp kapan saja.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimAccount;