import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { signInWithGoogle } from "@/lib/googleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Chrome, Gift, X } from "lucide-react";
import { phoneToEmail, toE164 } from "@/lib/phoneEmail";
import { friendlyAuthError } from "@/lib/authErrors";

const LoginDialog = () => {
  const { isOpen, redirectPath, closeLoginDialog } = useLoginDialog();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("phone");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("phone");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupReferralCode, setSignupReferralCode] = useState("");
  const [referralPrefilled, setReferralPrefilled] = useState(false);

  // Forgot password state
  const [isForgotEmailOpen, setIsForgotEmailOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isForgotWaOpen, setIsForgotWaOpen] = useState(false);
  const [forgotWaPhone, setForgotWaPhone] = useState("");
  const [isSendingWaOtp, setIsSendingWaOtp] = useState(false);

  // Prefill kode referral dari localStorage (ReferralCapture menyimpan ?ref=CODE)
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem("pending_ref_code");
      if (stored) {
        setSignupReferralCode(stored.toUpperCase());
        setReferralPrefilled(true);
      }
    } catch { /* ignore */ }
  }, [isOpen]);

  const resetForm = () => {
    setLoginEmail("");
    setLoginPhone("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupFullName("");
    setSignupPhone("");
  };

  // Auto-close dialog if user is already authenticated
  useEffect(() => {
    if (isOpen && user) {
      (async () => {
        try {
          const refCode = localStorage.getItem("pending_ref_code");
          if (refCode) {
            await supabase.functions.invoke("attach-referrer", { body: { code: refCode } });
            localStorage.removeItem("pending_ref_code");
          }
        } catch { /* ignore */ }
        resetForm();
        closeLoginDialog();
        if (redirectPath) navigate(redirectPath);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const emailToUse =
      loginMethod === "email" ? loginEmail : phoneToEmail(loginPhone);
    const { error } = await signIn(emailToUse, loginPassword);
    if (error) {
      toast({ variant: "destructive", title: t.auth.loginFailed, description: friendlyAuthError(error.message) });
    } else {
      toast({ title: t.auth.welcomeBack, description: t.auth.loggedInSuccess });
      resetForm();
      closeLoginDialog();
      if (redirectPath) navigate(redirectPath);
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupPassword || signupPassword.length < 8) {
      toast({ variant: "destructive", title: "Kata sandi terlalu pendek", description: "Minimal 8 karakter." });
      return;
    }
    setIsLoading(true);
    // Persist kode referral untuk di-attach saat login pertama
    try {
      const code = signupReferralCode.trim().toUpperCase();
      if (code && /^[A-Z0-9-]{3,20}$/.test(code)) {
        localStorage.setItem("pending_ref_code", code);
      } else if (!code) {
        localStorage.removeItem("pending_ref_code");
      }
    } catch { /* ignore */ }
    const formattedPhone =
      signupMethod === "phone" ? toE164(signupPhone) : signupPhone;
    const emailToUse =
      signupMethod === "email" ? signupEmail.trim().toLowerCase() : phoneToEmail(signupPhone);
    // Anti-duplicate signup precheck (IP + email hard-block)
    try {
      const { data } = await supabase.functions.invoke("signup-precheck", {
        body: { email: emailToUse, mode: "email" },
      });
      const res = data as any;
      if (res?.ok === false) {
        const desc =
          res.reason === "duplicate_signup_ip"
            ? "Perangkat atau jaringan ini sudah pernah digunakan untuk mendaftar. Silakan gunakan akun yang ada atau hubungi admin."
            : res.reason === "duplicate_email"
            ? "Email sudah terdaftar. Silakan login dengan akun yang ada."
            : "Pendaftaran ditolak.";
        toast({ variant: "destructive", title: "Pendaftaran ditolak", description: desc });
        setIsLoading(false);
        return;
      }
    } catch { /* fail-open */ }
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
      // Auto sign-in — akun sudah dikonfirmasi server, tidak perlu cek email.
      const { error: siErr } = await signIn(emailToUse, signupPassword);
      if (siErr) {
        toast({
          title: t.auth.accountCreated,
          description: "Akun aktif. Silakan login.",
        });
      } else {
        toast({ title: t.auth.welcomeBack, description: t.auth.loggedInSuccess });
        resetForm();
        closeLoginDialog();
        if (redirectPath) navigate(redirectPath);
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

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // IMPORTANT: Lovable OAuth only allows window.location.origin (no path).
      // Persist the desired post-login destination so we can navigate after callback.
      if (redirectPath) {
        sessionStorage.setItem("postLoginRedirect", redirectPath);
      }
    } catch {
      /* ignore storage errors */
    }
    // IP precheck before redirecting to Google
    try {
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
    } catch { /* fail-open */ }
    const { error } = await signInWithGoogle({ redirectPath });
    if (error) {
      toast({ variant: "destructive", title: t.auth.googleFailed, description: error.message });
      setIsGoogleLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      closeLoginDialog();
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);
    if (error) {
      toast({ variant: "destructive", title: "Gagal mengirim", description: error.message });
      return;
    }
    toast({ title: "Email terkirim", description: "Cek inbox Anda untuk link reset password." });
    setIsForgotEmailOpen(false);
    setForgotEmail("");
  };

  const handleForgotWa = async (e: React.FormEvent) => {
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
    closeLoginDialog();
    navigate(`/reset-password-wa?phone=${encodeURIComponent(phone)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto compact-form p-4">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[15px] font-semibold tracking-tight">{t.auth.title}</DialogTitle>
          <DialogDescription className="text-[11px] text-center text-muted-foreground line-clamp-2">
            {t.auth.subtitle}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full mt-1">
          <TabsList className="grid w-full grid-cols-2 h-auto p-[3px] rounded-[10px] bg-muted">
            <TabsTrigger value="login" className="text-[12px] font-semibold py-[7px] rounded-[8px] data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {t.auth.login}
            </TabsTrigger>
            <TabsTrigger value="signup" className="text-[12px] font-semibold py-[7px] rounded-[8px] data-[state=active]:bg-background data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              {t.auth.signUp}
            </TabsTrigger>
          </TabsList>

          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-[38px] min-h-0 text-[12px] rounded-[9px] px-[14px]"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Chrome className="mr-2 h-3.5 w-3.5" />}
              {t.auth.continueWithGoogle}
            </Button>
          </div>

          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-[9px] uppercase tracking-[0.08em] text-muted-foreground/70">
                {t.auth.orContinueWith}
              </span>
            </div>
          </div>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium">{t.auth.loginWith}</Label>
                <RadioGroup value={loginMethod} onValueChange={(v: "email" | "phone") => setLoginMethod(v)} className="flex gap-3 my-1.5">
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="email" id="dialog-login-email" className="h-3.5 w-3.5" />
                    <Label htmlFor="dialog-login-email" className="flex items-center gap-1 cursor-pointer text-[11px]"><Mail className="h-3 w-3" /> {t.auth.email}</Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="phone" id="dialog-login-phone" className="h-3.5 w-3.5" />
                    <Label htmlFor="dialog-login-phone" className="flex items-center gap-1 cursor-pointer text-[11px]"><Phone className="h-3 w-3" /> {t.auth.phone}</Label>
                  </div>
                </RadioGroup>
              </div>

              {loginMethod === "email" ? (
                <div className="space-y-1">
                  <Label htmlFor="dialog-email" className="text-[10px] font-medium">{t.auth.email}</Label>
                  <Input id="dialog-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="dialog-phone" className="text-[10px] font-medium">{t.auth.phoneIndonesia}</Label>
                  <div className="phone-prefix">
                    <span>+62</span>
                    <input
                      id="dialog-phone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="812 3456 7890"
                      value={loginPhone}
                      onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                      required
                      maxLength={12}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="dialog-password" className="text-[10px] font-medium">{t.auth.password}</Label>
                <PasswordInput id="dialog-password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full h-[42px] min-h-0 text-[13px] font-bold rounded-[10px]" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t.auth.signingIn}</> : t.common.signIn}
              </Button>
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (loginMethod === "email") {
                      setForgotEmail(loginEmail);
                      setIsForgotEmailOpen(true);
                    } else {
                      setForgotWaPhone(loginPhone);
                      setIsForgotWaOpen(true);
                    }
                  }}
                  className="text-[11px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                >
                  Lupa password?
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="dialog-signup-name" className="text-[10px] font-medium">{t.auth.fullName}</Label>
                <Input id="dialog-signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium">{t.auth.signUpWith}</Label>
                <RadioGroup value={signupMethod} onValueChange={(v: "email" | "phone") => setSignupMethod(v)} className="flex gap-3 my-1.5">
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="email" id="dialog-signup-email" className="h-3.5 w-3.5" />
                    <Label htmlFor="dialog-signup-email" className="flex items-center gap-1 cursor-pointer text-[11px]"><Mail className="h-3 w-3" /> {t.auth.email}</Label>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <RadioGroupItem value="phone" id="dialog-signup-phone" className="h-3.5 w-3.5" />
                    <Label htmlFor="dialog-signup-phone" className="flex items-center gap-1 cursor-pointer text-[11px]"><Phone className="h-3 w-3" /> {t.auth.phone}</Label>
                  </div>
                </RadioGroup>
              </div>

              {signupMethod === "email" ? (
                <div className="space-y-1">
                  <Label htmlFor="dialog-signup-email-input" className="text-[10px] font-medium">{t.auth.email}</Label>
                  <Input id="dialog-signup-email-input" type="email" placeholder="you@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label htmlFor="dialog-signup-phone-input" className="text-[10px] font-medium">{t.auth.phoneIndonesia}</Label>
                  <div className="phone-prefix">
                    <span>+62</span>
                    <input
                      id="dialog-signup-phone-input"
                      type="tel"
                      inputMode="numeric"
                      placeholder="812 3456 7890"
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value.replace(/\D/g, ''))}
                      required
                      maxLength={12}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t.auth.enterWithout0}</p>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="dialog-signup-password" className="text-[10px] font-medium">{t.auth.password}</Label>
                <PasswordInput id="dialog-signup-password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="dialog-signup-ref" className="text-[10px] font-medium flex items-center gap-1">
                  <Gift className="h-3 w-3 text-primary" /> Kode Referral <span className="text-muted-foreground font-normal">(opsional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="dialog-signup-ref"
                    type="text"
                    placeholder="Contoh: ABC123"
                    value={signupReferralCode}
                    onChange={e => {
                      const v = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);
                      setSignupReferralCode(v);
                      if (referralPrefilled) setReferralPrefilled(false);
                    }}
                    className="font-mono uppercase tracking-wider pr-8 h-9 text-[13px]"
                    maxLength={20}
                    autoComplete="off"
                  />
                  {signupReferralCode && (
                    <button
                      type="button"
                      onClick={() => { setSignupReferralCode(""); setReferralPrefilled(false); try { localStorage.removeItem("pending_ref_code"); } catch {} }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
                      aria-label="Hapus kode"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {referralPrefilled ? (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Gift className="h-2.5 w-2.5" /> Otomatis terisi dari link referral
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">Punya kode dari teman? Masukkan untuk dapat bonus.</p>
                )}
              </div>

              <Button type="submit" className="w-full h-[42px] min-h-0 text-[13px] font-bold rounded-[10px]" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t.auth.creatingAccount}</> : t.auth.createAccount}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Forgot password — Email */}
      <Dialog open={isForgotEmailOpen} onOpenChange={setIsForgotEmailOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password via Email</DialogTitle>
            <DialogDescription>
              Kami akan mengirim link reset password ke email Anda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotEmail} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email-dialog">Email</Label>
              <Input
                id="forgot-email-dialog"
                type="email"
                placeholder="you@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSendingReset}>
              {isSendingReset ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : "Kirim Link Reset"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Forgot password — WhatsApp */}
      <Dialog open={isForgotWaOpen} onOpenChange={setIsForgotWaOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password via WhatsApp</DialogTitle>
            <DialogDescription>
              Masukkan nomor WhatsApp yang terdaftar. Kami akan kirim kode OTP 6 digit untuk verifikasi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotWa} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-wa-dialog">Nomor WhatsApp</Label>
              <div className="flex">
                <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                <Input
                  id="forgot-wa-dialog"
                  type="tel"
                  placeholder="812 3456 7890"
                  value={forgotWaPhone}
                  onChange={(e) => setForgotWaPhone(e.target.value.replace(/\D/g, ""))}
                  className="rounded-l-none"
                  required
                  maxLength={13}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Hanya untuk akun yang mendaftar via nomor WhatsApp. Pengguna Google silakan login dengan Google.
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSendingWaOtp}>
              {isSendingWaOtp ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim...</> : "Kirim OTP"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default LoginDialog;
