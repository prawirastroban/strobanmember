import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Phone, Chrome, Gift, X } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { lovable } from "@/integrations/lovable";
import { signInWithGoogle } from "@/lib/googleAuth";
import { isNative } from "@/lib/platform";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useBranding } from "@/hooks/useBranding";
import Turnstile from "@/components/Turnstile";
import { phoneToEmail, normalizePhoneDigits } from "@/lib/phoneEmail";
import { friendlyAuthError } from "@/lib/authErrors";

async function resolvePostLoginPath(userId: string, fallback: string): Promise<string> {
  try {
    // Lindungi dengan timeout supaya user tidak pernah hang di /auth bila
    // kueri RLS lambat / gagal. Fallback ke path tujuan default.
    const queryPromise = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const timeoutPromise = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => resolve({ data: null }), 1500),
    );
    const { data } = (await Promise.race([queryPromise, timeoutPromise])) as { data: any };
    const roles = (data ?? []).map((r: any) => r.role);
    if (roles.includes("admin") || roles.includes("staff")) return "/admin";
  } catch {
    /* ignore */
  }
  return fallback || "/";
}

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { logoLight, brandName } = useBranding();
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isForgotWaOpen, setIsForgotWaOpen] = useState(false);
  const [forgotWaPhone, setForgotWaPhone] = useState("");
  const [isSendingWaOtp, setIsSendingWaOtp] = useState(false);
  // Phone-only OTP login (password-less)
  const [isOtpLoginOpen, setIsOtpLoginOpen] = useState(false);
  const [otpLoginPhone, setOtpLoginPhone] = useState("");
  const [otpLoginStep, setOtpLoginStep] = useState<"phone" | "code">("phone");
  const [otpLoginCode, setOtpLoginCode] = useState("");
  const [otpLoginLoading, setOtpLoginLoading] = useState(false);
  const [otpLoginMasked, setOtpLoginMasked] = useState("");
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const {
    signIn,
    signUp,
    user,
    loading: authLoading,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect =
    searchParams.get("redirect") ||
    searchParams.get("next") ||
    sessionStorage.getItem("lastVisitedPath") ||
    "/";
  // Cegah loop balik ke /auth jika lastVisitedPath kebetulan adalah halaman auth.
  const redirectPath =
    rawRedirect.startsWith("/auth") || !rawRedirect.startsWith("/") || rawRedirect.startsWith("//")
      ? "/"
      : rawRedirect;
  const {
    toast
  } = useToast();
  const {
    t
  } = useLanguage();
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("phone");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("phone");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [signupReferralCode, setSignupReferralCode] = useState("");
  const [referralPrefilled, setReferralPrefilled] = useState(false);
  const [loginCaptchaToken, setLoginCaptchaToken] = useState("");
  const [signupCaptchaToken, setSignupCaptchaToken] = useState("");
  const [loginCaptchaUnavailable, setLoginCaptchaUnavailable] = useState(false);
  const [signupCaptchaUnavailable, setSignupCaptchaUnavailable] = useState(false);

  const verifyCaptcha = async (token: string): Promise<boolean> => {
    if (!token) return false;
    try {
      const { data, error } = await supabase.functions.invoke("verify-turnstile", { body: { token } });
      if (error) return false;
      return !!(data as any)?.success;
    } catch {
      return false;
    }
  };

  // Anti-duplicate signup precheck: hard-block if IP already used or email taken.
  // Returns true if signup may proceed.
  const preflightSignup = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("signup-precheck", {
        body: { email, mode: "email" },
      });
      if (error) return true; // fail-open on network error
      const res = data as any;
      if (res?.ok) return true;
      if (res?.reason === "duplicate_signup_ip") {
        toast({
          variant: "destructive",
          title: "Pendaftaran ditolak",
          description:
            "Perangkat atau jaringan ini sudah pernah digunakan untuk mendaftar. Silakan gunakan akun yang ada atau hubungi admin.",
        });
        return false;
      }
      if (res?.reason === "duplicate_email") {
        toast({
          variant: "destructive",
          title: "Email sudah terdaftar",
          description: "Silakan login dengan akun yang sudah ada.",
        });
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  // Prefill kode referral dari localStorage (di-set oleh ReferralCapture saat ?ref=CODE)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pending_ref_code");
      if (stored) {
        setSignupReferralCode(stored.toUpperCase());
        setReferralPrefilled(true);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-open OTP login dialog when arriving from staff-welcome WA link
  useEffect(() => {
    if (searchParams.get("login") === "phone") {
      const p = searchParams.get("phone") || "";
      const digits = p.replace(/\D/g, "").replace(/^62/, "");
      setOtpLoginPhone(digits);
      setOtpLoginStep("phone");
      setIsOtpLoginOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-trigger Google OAuth when the native app launches the web /auth tab
  // with `?google=1`. We're now on the web origin where `/~oauth/*` works,
  // so the standard Lovable helper succeeds.
  useEffect(() => {
    if (searchParams.get("google") !== "1") return;
    if (isNative()) return; // safety: never loop inside the native shell
    void handleGoogleSignIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const id = setInterval(() => setOtpResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [otpResendCooldown]);

  const requestOtpLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const digits = normalizePhoneDigits(otpLoginPhone).replace(/^62/, "");
    if (digits.length < 8) {
      toast({ variant: "destructive", title: "Nomor tidak valid", description: "Masukkan nomor WhatsApp aktif." });
      return;
    }
    const phone = `62${digits}`;
    setOtpLoginLoading(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-login", {
      body: { action: "request", phone },
    });
    setOtpLoginLoading(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Gagal mengirim OTP", description: (data as any)?.error || error?.message });
      return;
    }
    setOtpLoginMasked((data as any)?.masked || phone);
    setOtpLoginStep("code");
    setOtpResendCooldown(60);
    toast({ title: "Kode dikirim", description: `Cek WhatsApp ${(data as any)?.masked || phone}` });
  };

  const verifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpLoginCode.length !== 6) return;
    const digits = normalizePhoneDigits(otpLoginPhone).replace(/^62/, "");
    const phone = `62${digits}`;
    setOtpLoginLoading(true);
    const { data, error } = await supabase.functions.invoke("phone-otp-login", {
      body: { action: "verify", phone, code: otpLoginCode },
    });
    setOtpLoginLoading(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Verifikasi gagal", description: (data as any)?.error || error?.message });
      return;
    }
    const link = (data as any)?.action_link;
    if (!link) {
      toast({ variant: "destructive", title: "Sesi gagal", description: "Tidak dapat membuat sesi." });
      return;
    }
    toast({ title: "Berhasil!", description: "Mengarahkan ke akun Anda..." });
    window.location.href = link;
  };

  // Surface OAuth callback errors (e.g. duplicate_ip) as a toast.
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "duplicate_ip") {
      toast({
        variant: "destructive",
        title: "Pendaftaran ditolak",
        description:
          "Perangkat atau jaringan ini sudah pernah digunakan untuk mendaftar. Silakan login dengan akun yang ada.",
      });
    } else if (err === "callback_failed" || err === "google_native" || err === "state_mismatch") {
      toast({
        variant: "destructive",
        title: "Login Google gagal",
        description: "Sesi Google tidak dapat diselesaikan. Silakan coba lagi dari tombol Google.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user is already authenticated, never let them stuck on /auth — redirect immediately.
  useEffect(() => {
    if (!authLoading && user) {
      sessionStorage.removeItem("postLoginRedirect");
      (async () => {
        try {
          const refCode = localStorage.getItem("pending_ref_code");
          if (refCode) {
            await supabase.functions.invoke("attach-referrer", { body: { code: refCode } });
            localStorage.removeItem("pending_ref_code");
          }
        } catch { /* ignore */ }
        // Always land on Home after any successful login/session restore.
        navigate("/", { replace: true });
      })();
    }
  }, [user, authLoading, redirectPath, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginCaptchaToken && !loginCaptchaUnavailable) {
      toast({ variant: "destructive", title: "Verifikasi diperlukan", description: "Mohon selesaikan verifikasi captcha." });
      return;
    }
    setIsLoading(true);
    const ok = await verifyCaptcha(loginCaptchaToken || "unavailable");
    if (!ok) {
      toast({ variant: "destructive", title: "Verifikasi gagal", description: "Captcha tidak valid, silakan coba lagi." });
      setLoginCaptchaToken("");
      setIsLoading(false);
      return;
    }
    const emailToUse =
      loginMethod === "email" ? loginEmail : phoneToEmail(loginPhone);
    try {
      const { error } = await signIn(emailToUse, loginPassword);
      if (error) {
        toast({
          variant: "destructive",
          title: t.auth.loginFailed,
          description: friendlyAuthError(error.message)
        });
        setIsLoading(false);
        return;
      }
      toast({
        title: t.auth.welcomeBack,
        description: t.auth.loggedInSuccess
      });
      setIsLoading(false);
      // Navigate eksplisit agar tidak bergantung pada propagasi state user.
      // useEffect di bawah akan mengoreksi target untuk admin/staff bila perlu.
      try {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (freshUser) {
          // Always land on Home after login.
          navigate("/", { replace: true });
        }
      } catch { /* useEffect fallback will handle */ }
    } catch (err) {
      toast({
        variant: "destructive",
        title: t.auth.loginFailed,
        description: friendlyAuthError((err as Error)?.message)
      });
      setIsLoading(false);
    }
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupCaptchaToken && !signupCaptchaUnavailable) {
      toast({ variant: "destructive", title: "Verifikasi diperlukan", description: "Mohon selesaikan verifikasi captcha." });
      return;
    }
    if (!signupPassword || signupPassword.length < 8) {
      toast({ variant: "destructive", title: "Kata sandi terlalu pendek", description: "Minimal 8 karakter." });
      return;
    }
    setIsLoading(true);
    const ok = await verifyCaptcha(signupCaptchaToken || "unavailable");
    if (!ok) {
      toast({ variant: "destructive", title: "Verifikasi gagal", description: "Captcha tidak valid, silakan coba lagi." });
      setSignupCaptchaToken("");
      setIsLoading(false);
      return;
    }
    // Persist kode referral (kalau diisi) sebelum signUp; akan di-attach di useEffect post-login
    try {
      const code = signupReferralCode.trim().toUpperCase();
      if (code && /^[A-Z0-9-]{3,20}$/.test(code)) {
        localStorage.setItem("pending_ref_code", code);
      } else if (!code) {
        localStorage.removeItem("pending_ref_code");
      }
    } catch { /* ignore */ }
    const phoneDigits = normalizePhoneDigits(signupPhone).replace(/^62/, "");
    if (phoneDigits.length < 8) {
      toast({ variant: "destructive", title: "Nomor WhatsApp wajib", description: "Masukkan nomor WhatsApp aktif minimal 8 digit." });
      setIsLoading(false);
      return;
    }
    const formattedPhone = `+62${phoneDigits}`;
    const emailToUse =
      signupMethod === "email" ? signupEmail.trim().toLowerCase() : phoneToEmail(signupPhone);
    // Hard-block duplicate signup (IP + email)
    const allowed = await preflightSignup(emailToUse);
    if (!allowed) {
      setIsLoading(false);
      return;
    }
    // Buat akun lewat edge function admin (auto email_confirm) supaya tidak
    // ada lagi kasus "Invalid login credentials" karena akun belum dikonfirmasi.
    try {
      const { data: resp, error: fnError } = await supabase.functions.invoke("auth-signup", {
        body: {
          email: emailToUse,
          password: signupPassword,
          full_name: signupFullName.trim(),
          phone: formattedPhone,
          mode: signupMethod,
        },
      });
      const ok = (resp as any)?.ok === true;
      if (!ok || fnError) {
        const errMsg = (resp as any)?.error || fnError?.message || "Pendaftaran gagal";
        toast({ variant: "destructive", title: t.auth.signupFailed, description: friendlyAuthError(errMsg) });
        setIsLoading(false);
        return;
      }
      // Auto sign-in agar user langsung masuk.
      const { error: siErr } = await signIn(emailToUse, signupPassword);
      if (siErr) {
        toast({
          title: "Pendaftaran Berhasil",
          description: "Akun aktif. Silakan login dengan kata sandi yang baru dibuat.",
        });
      } else {
        toast({ title: "Pendaftaran Berhasil", description: "Selamat datang di Bengkel Mobil Stroban Service." });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: t.auth.signupFailed,
        description: friendlyAuthError((err as Error)?.message),
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    const {
      error
    } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) {
      toast({
        variant: "destructive",
        title: t.auth.resetFailed,
        description: error.message
      });
    } else {
      toast({
        title: t.auth.resetEmailSent,
        description: t.auth.checkEmailReset
      });
      setIsForgotPasswordOpen(false);
      setForgotPasswordEmail("");
    }
    setIsSendingReset(false);
  };
  const handleForgotPasswordWA = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = forgotWaPhone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 8) {
      toast({ variant: "destructive", title: "Nomor tidak valid", description: "Masukkan nomor WhatsApp aktif." });
      return;
    }
    const phone = `62${digits}`;
    setIsSendingWaOtp(true);
    const { data, error } = await supabase.functions.invoke("wa-password-reset", {
      body: { action: "request", phone },
    });
    setIsSendingWaOtp(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal mengirim OTP", description: error.message });
      return;
    }
    toast({
      title: "OTP dikirim",
      description: `Jika nomor ${(data as any)?.masked || phone} terdaftar, kode OTP telah dikirim via WhatsApp.`,
    });
    setIsForgotWaOpen(false);
    setForgotWaPhone("");
    navigate(`/reset-password-wa?phone=${encodeURIComponent(phone)}`);
  };
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Lovable OAuth requires redirect_uri = window.location.origin (no path).
      // Persist intended destination so we can navigate after callback.
      if (redirectPath && redirectPath !== "/auth") {
        sessionStorage.setItem("postLoginRedirect", redirectPath);
      }
    } catch {
      /* ignore storage errors */
    }
    // On native, skip IP precheck (it runs again on the web side once the
    // external browser tab loads `/auth?google=1`).
    if (!isNative()) try {
      const { data } = await supabase.functions.invoke("signup-precheck", {
        body: { mode: "oauth" },
      });
      if ((data as any)?.ok === false && (data as any)?.reason === "duplicate_signup_ip") {
        toast({
          variant: "destructive",
          title: "Pendaftaran ditolak",
          description:
            "Perangkat atau jaringan ini sudah pernah digunakan untuk mendaftar. Silakan login dengan akun yang ada.",
        });
        setIsGoogleLoading(false);
        return;
      }
    } catch {
      /* fail-open */
    }
    const { error } = await signInWithGoogle({ redirectPath });
    if (error) {
      toast({
        variant: "destructive",
        title: t.auth.googleFailed,
        description: error.message
      });
      setIsGoogleLoading(false);
      return;
    }
    // Safety net: if for any reason the browser doesn't redirect within 8s,
    // re-enable the button so the user isn't stuck on a spinner.
    setTimeout(() => setIsGoogleLoading(false), 8000);
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <button
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/", { replace: true });
        }}
        aria-label="Kembali"
        className="absolute top-4 left-4 h-9 w-9 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 active:scale-95 transition"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoLight} alt={brandName} className="h-7 object-contain" />
          </div>
          <CardTitle className="text-2xl">{t.auth.title}</CardTitle>
          <CardDescription>{t.auth.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t.auth.login}</TabsTrigger>
              <TabsTrigger value="signup">{t.auth.signUp}</TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                {t.auth.continueWithGoogle}
              </Button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.auth.orContinueWith}</span>
              </div>
            </div>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div className="space-y-3">
                  <Label>{t.auth.loginWith}</Label>
                  <RadioGroup value={loginMethod} onValueChange={(value: "email" | "phone") => setLoginMethod(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="login-method-email" />
                      <Label htmlFor="login-method-email" className="flex items-center gap-1 cursor-pointer">
                        <Mail className="h-4 w-4" /> {t.auth.email}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="login-method-phone" />
                      <Label htmlFor="login-method-phone" className="flex items-center gap-1 cursor-pointer">
                        <Phone className="h-4 w-4" /> {t.auth.phone}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {loginMethod === "email" ? <div className="space-y-2">
                    <Label htmlFor="login-email">{t.auth.email}</Label>
                    <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                  </div> : <div className="space-y-2">
                    <Label htmlFor="login-phone">{t.auth.phoneIndonesia}</Label>
                    <div className="flex">
                      <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                      <Input id="login-phone" type="tel" placeholder="812 3456 7890" value={loginPhone} onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))} className="rounded-l-none" required maxLength={12} />
                    </div>
                  </div>}
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t.auth.password}</Label>
                  <PasswordInput id="login-password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Turnstile
                  onVerify={(t) => { setLoginCaptchaToken(t); setLoginCaptchaUnavailable(false); }}
                  onExpire={() => setLoginCaptchaToken("")}
                  onError={() => setLoginCaptchaUnavailable(true)}
                  className="flex justify-center"
                />
                {loginCaptchaUnavailable && (
                  <p className="text-xs text-muted-foreground text-center">
                    Verifikasi captcha tidak tersedia di domain ini — Anda tetap dapat melanjutkan.
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || (!loginCaptchaToken && !loginCaptchaUnavailable)}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.signingIn}</> : t.common.signIn}
                </Button>
                <div className="text-center">
                  {loginMethod === "email" ? (
                    <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="text-sm text-muted-foreground">{t.auth.forgotPassword}</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t.auth.resetPassword}</DialogTitle>
                          <DialogDescription>{t.auth.resetDescription}</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="forgot-email">{t.auth.email}</Label>
                            <Input id="forgot-email" type="email" placeholder="you@example.com" value={forgotPasswordEmail} onChange={e => setForgotPasswordEmail(e.target.value)} required />
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsForgotPasswordOpen(false)} className="flex-1">
                              <ArrowLeft className="mr-2 h-4 w-4" />{t.common.back}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isSendingReset}>
                              {isSendingReset ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.sending}</> : t.auth.sendResetLink}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <>
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-primary"
                      onClick={() => {
                        setOtpLoginPhone(loginPhone);
                        setOtpLoginStep("phone");
                        setIsOtpLoginOpen(true);
                      }}
                    >
                      Login tanpa password (OTP WhatsApp)
                    </Button>
                    <Dialog open={isForgotWaOpen} onOpenChange={setIsForgotWaOpen}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="text-sm text-muted-foreground">{t.auth.forgotPassword}</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Reset Password via WhatsApp</DialogTitle>
                          <DialogDescription>
                            Masukkan nomor WhatsApp yang terdaftar. Kami akan mengirim kode OTP 6 digit untuk verifikasi.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleForgotPasswordWA} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="forgot-wa-phone">Nomor WhatsApp</Label>
                            <div className="flex">
                              <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                              <Input
                                id="forgot-wa-phone"
                                type="tel"
                                placeholder="812 3456 7890"
                                value={forgotWaPhone}
                                onChange={(e) => setForgotWaPhone(e.target.value.replace(/\D/g, ""))}
                                className="rounded-l-none"
                                required
                                maxLength={13}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Hanya untuk akun yang mendaftar via nomor WhatsApp. Pengguna Google silakan login dengan Google.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsForgotWaOpen(false)} className="flex-1">
                              <ArrowLeft className="mr-2 h-4 w-4" />{t.common.back}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={isSendingWaOtp}>
                              {isSendingWaOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : "Kirim OTP"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    </>
                  )}
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t.auth.fullName}</Label>
                  <Input id="signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} required />
                </div>

                <div className="space-y-3">
                  <Label>{t.auth.signUpWith}</Label>
                  <RadioGroup value={signupMethod} onValueChange={(value: "email" | "phone") => setSignupMethod(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="method-email" />
                      <Label htmlFor="method-email" className="flex items-center gap-1 cursor-pointer">
                        <Mail className="h-4 w-4" /> {t.auth.email}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="method-phone" />
                      <Label htmlFor="method-phone" className="flex items-center gap-1 cursor-pointer">
                        <Phone className="h-4 w-4" /> {t.auth.phone}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {signupMethod === "email" ? <>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t.auth.email}</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone-email" className="flex items-center gap-1.5">
                      {t.auth.phoneIndonesia}
                      <span className="text-[10px] font-semibold text-[#ff2b2b]">• Wajib</span>
                    </Label>
                    <div className="flex">
                      <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                      <Input id="signup-phone-email" type="tel" placeholder="812 3456 7890" value={signupPhone} onChange={e => setSignupPhone(e.target.value.replace(/\D/g, ''))} className="rounded-l-none" required maxLength={13} />
                    </div>
                    <p className="text-xs text-muted-foreground">Untuk konfirmasi booking, reminder service & reset password via WhatsApp.</p>
                  </div>
                </> : <div className="space-y-2">
                    <Label htmlFor="signup-phone">{t.auth.phoneIndonesia}</Label>
                    <div className="flex">
                      <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                      <Input id="signup-phone" type="tel" placeholder="812 3456 7890" value={signupPhone} onChange={e => setSignupPhone(e.target.value.replace(/\D/g, ''))} className="rounded-l-none" required maxLength={12} />
                    </div>
                    <p className="text-xs text-muted-foreground">{t.auth.enterWithout0}</p>
                  </div>}

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <PasswordInput id="signup-password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-ref" className="flex items-center gap-1.5">
                    <Gift className="h-4 w-4 text-primary" />
                    Kode Referral <span className="text-xs text-muted-foreground font-normal">(opsional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-ref"
                      type="text"
                      placeholder="Contoh: ABC123"
                      value={signupReferralCode}
                      onChange={e => {
                        const v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
                        setSignupReferralCode(v);
                        if (referralPrefilled) setReferralPrefilled(false);
                      }}
                      className="font-mono uppercase tracking-wider pr-9"
                      maxLength={20}
                      autoComplete="off"
                    />
                    {signupReferralCode && (
                      <button
                        type="button"
                        onClick={() => { setSignupReferralCode(""); setReferralPrefilled(false); try { localStorage.removeItem("pending_ref_code"); } catch {} }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                        aria-label="Hapus kode"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {referralPrefilled ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Gift className="h-3 w-3" /> Otomatis terisi dari link referral teman Anda
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Punya kode dari teman? Masukkan untuk dapatkan bonus.
                    </p>
                  )}
                </div>

                <Turnstile
                  onVerify={(t) => { setSignupCaptchaToken(t); setSignupCaptchaUnavailable(false); }}
                  onExpire={() => setSignupCaptchaToken("")}
                  onError={() => setSignupCaptchaUnavailable(true)}
                  className="flex justify-center"
                />
                {signupCaptchaUnavailable && (
                  <p className="text-xs text-muted-foreground text-center">
                    Verifikasi captcha tidak tersedia di domain ini — Anda tetap dapat melanjutkan.
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || (!signupCaptchaToken && !signupCaptchaUnavailable)}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.creatingAccount}</> : t.auth.createAccount}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {/* OTP Login Dialog (password-less, WA) */}
      <Dialog open={isOtpLoginOpen} onOpenChange={(o) => {
        setIsOtpLoginOpen(o);
        if (!o) { setOtpLoginStep("phone"); setOtpLoginCode(""); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login dengan WhatsApp</DialogTitle>
            <DialogDescription>
              {otpLoginStep === "phone"
                ? "Masukkan nomor WhatsApp Anda. Kami akan kirim kode OTP 6 digit — tidak perlu password."
                : <>Masukkan 6 digit kode yang kami kirim ke <span className="font-medium">{otpLoginMasked}</span>.</>}
            </DialogDescription>
          </DialogHeader>
          {otpLoginStep === "phone" ? (
            <form onSubmit={requestOtpLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-login-phone">Nomor WhatsApp</Label>
                <div className="flex">
                  <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                  <Input
                    id="otp-login-phone"
                    type="tel"
                    placeholder="812 3456 7890"
                    value={otpLoginPhone}
                    onChange={(e) => setOtpLoginPhone(e.target.value.replace(/\D/g, ""))}
                    className="rounded-l-none"
                    required
                    maxLength={13}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Akun baru akan dibuat otomatis bila nomor belum terdaftar.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={otpLoginLoading}>
                {otpLoginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : "Kirim Kode OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtpLogin} className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpLoginCode} onChange={setOtpLoginCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" className="w-full" disabled={otpLoginLoading || otpLoginCode.length !== 6}>
                {otpLoginLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memverifikasi...</> : "Masuk"}
              </Button>
              <div className="text-center text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => requestOtpLogin()}
                  disabled={otpResendCooldown > 0 || otpLoginLoading}
                >
                  {otpResendCooldown > 0 ? `Kirim ulang dalam ${otpResendCooldown}s` : "Kirim ulang kode"}
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => { setOtpLoginStep("phone"); setOtpLoginCode(""); }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Ganti nomor
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>;
};
export default Auth;