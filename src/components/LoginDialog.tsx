import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Chrome } from "lucide-react";

const LoginDialog = () => {
  const { isOpen, redirectPath, closeLoginDialog } = useLoginDialog();
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupMethod, setSignupMethod] = useState<"email" | "phone">("email");
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
  };

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
        title: "Pendaftaran Berhasil",
        description: "Akun Anda sedang menunggu verifikasi dari admin. Anda akan mendapat notifikasi setelah diverifikasi.",
      });
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + (redirectPath || ""),
    });
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

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.auth.title}</DialogTitle>
          <DialogDescription>{t.auth.subtitle}</DialogDescription>
        </DialogHeader>

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
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t.auth.orContinueWith}</span>
            </div>
          </div>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3">
                <Label>{t.auth.loginWith}</Label>
                <RadioGroup value={loginMethod} onValueChange={(v: "email" | "phone") => setLoginMethod(v)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="dialog-login-email" />
                    <Label htmlFor="dialog-login-email" className="flex items-center gap-1 cursor-pointer"><Mail className="h-4 w-4" /> {t.auth.email}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="dialog-login-phone" />
                    <Label htmlFor="dialog-login-phone" className="flex items-center gap-1 cursor-pointer"><Phone className="h-4 w-4" /> {t.auth.phone}</Label>
                  </div>
                </RadioGroup>
              </div>

              {loginMethod === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="dialog-email">{t.auth.email}</Label>
                  <Input id="dialog-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="dialog-phone">{t.auth.phoneIndonesia}</Label>
                  <div className="flex">
                    <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                    <Input id="dialog-phone" type="tel" placeholder="812 3456 7890" value={loginPhone} onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))} className="rounded-l-none" required maxLength={12} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dialog-password">{t.auth.password}</Label>
                <Input id="dialog-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.signingIn}</> : t.common.signIn}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dialog-signup-name">{t.auth.fullName}</Label>
                <Input id="dialog-signup-name" type="text" placeholder="John Doe" value={signupFullName} onChange={e => setSignupFullName(e.target.value)} required />
              </div>

              <div className="space-y-3">
                <Label>{t.auth.signUpWith}</Label>
                <RadioGroup value={signupMethod} onValueChange={(v: "email" | "phone") => setSignupMethod(v)} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="dialog-signup-email" />
                    <Label htmlFor="dialog-signup-email" className="flex items-center gap-1 cursor-pointer"><Mail className="h-4 w-4" /> {t.auth.email}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="phone" id="dialog-signup-phone" />
                    <Label htmlFor="dialog-signup-phone" className="flex items-center gap-1 cursor-pointer"><Phone className="h-4 w-4" /> {t.auth.phone}</Label>
                  </div>
                </RadioGroup>
              </div>

              {signupMethod === "email" ? (
                <div className="space-y-2">
                  <Label htmlFor="dialog-signup-email-input">{t.auth.email}</Label>
                  <Input id="dialog-signup-email-input" type="email" placeholder="you@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="dialog-signup-phone-input">{t.auth.phoneIndonesia}</Label>
                  <div className="flex">
                    <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                    <Input id="dialog-signup-phone-input" type="tel" placeholder="812 3456 7890" value={signupPhone} onChange={e => setSignupPhone(e.target.value.replace(/\D/g, ''))} className="rounded-l-none" required maxLength={12} />
                  </div>
                  <p className="text-xs text-muted-foreground">{t.auth.enterWithout0}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dialog-signup-password">{t.auth.password}</Label>
                <Input id="dialog-signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.creatingAccount}</> : t.auth.createAccount}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
