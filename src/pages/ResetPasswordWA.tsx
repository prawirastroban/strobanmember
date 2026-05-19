import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const ResetPasswordWA = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const phone = (params.get("phone") || "").replace(/\D/g, "");

  const [step, setStep] = useState<"otp" | "password">("otp");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (!phone) {
      navigate("/auth", { replace: true });
    }
  }, [phone, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const masked = useMemo(() => (phone.length >= 6 ? phone.slice(0, 4) + "***" + phone.slice(-3) : phone), [phone]);

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("wa-password-reset", {
      body: { action: "verify", phone, otp },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Verifikasi gagal", description: (data as any)?.error || error?.message || "OTP salah" });
      return;
    }
    setResetToken((data as any).reset_token);
    setStep("password");
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    const { error } = await supabase.functions.invoke("wa-password-reset", {
      body: { action: "request", phone },
    });
    setLoading(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal mengirim ulang", description: error.message });
      return;
    }
    toast({ title: "OTP dikirim ulang", description: `Cek WhatsApp ${masked}` });
    setResendCooldown(60);
    setOtp("");
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/\d/.test(password)) {
      toast({ variant: "destructive", title: "Password lemah", description: "Minimal 8 karakter dan mengandung angka" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Konfirmasi tidak cocok" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("wa-password-reset", {
      body: { action: "confirm", phone, reset_token: resetToken, new_password: password },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Gagal memperbarui password", description: (data as any)?.error || error?.message });
      return;
    }
    toast({ title: "Password berhasil diubah", description: "Silakan login dengan password baru." });
    setTimeout(() => navigate("/auth", { replace: true }), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-full">
              {step === "otp" ? <MessageCircle className="h-8 w-8 text-primary-foreground" /> : <Lock className="h-8 w-8 text-primary-foreground" />}
            </div>
          </div>
          <CardTitle className="text-2xl">
            {step === "otp" ? "Verifikasi WhatsApp" : "Atur Password Baru"}
          </CardTitle>
          <CardDescription>
            {step === "otp"
              ? <>Masukkan 6 digit kode yang kami kirim ke WhatsApp <span className="font-medium">{masked}</span></>
              : "Buat password baru. Minimal 8 karakter dan mengandung angka."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "otp" ? (
            <form onSubmit={verifyOtp} className="space-y-5">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memverifikasi...</> : <><ShieldCheck className="mr-2 h-4 w-4" />Verifikasi OTP</>}
              </Button>
              <div className="text-center text-sm">
                <Button type="button" variant="link" onClick={resendOtp} disabled={resendCooldown > 0 || loading}>
                  {resendCooldown > 0 ? `Kirim ulang dalam ${resendCooldown}s` : "Kirim ulang OTP"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Tidak terima OTP? Pastikan nomor terdaftar dan WhatsApp aktif. JANGAN bagikan kode ke siapa pun.
              </p>
            </form>
          ) : (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <PasswordInput id="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <PasswordInput id="confirm-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : "Ubah Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordWA;