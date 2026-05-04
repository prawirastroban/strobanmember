import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Sparkles, ArrowLeft } from "lucide-react";

const LoginDialog = () => {
  const { isOpen, redirectPath, closeLoginDialog } = useLoginDialog();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [magicLinkEmail, setMagicLinkEmail] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("phone");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("phone");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFullName, setSignupFullName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  const resetForm = () => {
    setLoginEmail("");
    setLoginPhone("");
    setLoginPassword("");
    setSignupEmail("");
    setSignupPassword("");
    setSignupFullName("");
    setSignupPhone("");
    setMagicLinkEmail("");
    setShowMagicLink(false);
  };

  // Auto-close dialog if user is already authenticated
  useEffect(() => {
    if (isOpen && user) {
      resetForm();
      closeLoginDialog();
      if (redirectPath) navigate(redirectPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const emailToUse = loginMethod === "email" ? loginEmail : `62${loginPhone.replace(/^0+/, '')}@phone.local`;
    const { error } = await signIn(emailToUse, loginPassword);
    if (error) {
      toast({ variant: "destructive", title: t.auth.loginFailed, description: error.message });
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
    setIsLoading(true);
    const formattedPhone = signupMethod === "phone" ? `+62${signupPhone.replace(/^0+/, '')}` : signupPhone;
    const emailToUse = signupMethod === "email" ? signupEmail : `${formattedPhone.replace('+', '')}@phone.local`;
    const { error } = await signUp(emailToUse, signupPassword, signupFullName, formattedPhone);
    if (error) {
      toast({ variant: "destructive", title: t.auth.signupFailed, description: error.message });
    } else {
      toast({
        title: t.auth.accountCreated,
        description:
          signupMethod === "phone"
            ? "Akun Anda sedang ditinjau admin. Anda akan mendapat notifikasi setelah diverifikasi."
            : t.auth.checkEmailVerify,
      });
    }
    setIsLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingMagicLink(true);
    try {
      if (redirectPath) {
        sessionStorage.setItem("postLoginRedirect", redirectPath);
      }
    } catch { /* ignore */ }
    const { error } = await supabase.auth.signInWithOtp({
      email: magicLinkEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Gagal mengirim link", description: error.message });
    } else {
      toast({
        title: "Cek email Anda 📧",
        description: `Link login dikirim ke ${magicLinkEmail}. Klik link tersebut untuk masuk.`,
      });
      setShowMagicLink(false);
      setMagicLinkEmail("");
    }
    setIsSendingMagicLink(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      closeLoginDialog();
    }
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
            {showMagicLink ? (
              <form onSubmit={handleMagicLink} className="space-y-2 p-3 rounded-[10px] bg-primary/5 border border-primary/20">
                <Label htmlFor="dialog-magic-email" className="text-[10px] font-medium flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" /> Login dengan Magic Link
                </Label>
                <Input
                  id="dialog-magic-email"
                  type="email"
                  placeholder="you@example.com"
                  value={magicLinkEmail}
                  onChange={e => setMagicLinkEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-[34px] text-[12px]"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMagicLink(false)}
                    className="flex-1 h-[34px] min-h-0 text-[11px] rounded-[8px]"
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />Batal
                  </Button>
                  <Button type="submit" className="flex-1 h-[34px] min-h-0 text-[11px] rounded-[8px]" disabled={isSendingMagicLink}>
                    {isSendingMagicLink ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                    Kirim Link
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full h-[38px] min-h-0 text-[12px] rounded-[9px] px-[14px] bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                onClick={() => setShowMagicLink(true)}
              >
                <Sparkles className="mr-2 h-3.5 w-3.5 text-primary" />
                Masuk dengan Magic Link
              </Button>
            )}
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

              <Button type="submit" className="w-full h-[42px] min-h-0 text-[13px] font-bold rounded-[10px]" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t.auth.creatingAccount}</> : t.auth.createAccount}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
