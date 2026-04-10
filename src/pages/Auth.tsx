import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, Phone, Chrome } from "lucide-react";
import strobanLogo from "@/assets/stroban_white.png";
import { lovable } from "@/integrations/lovable";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LanguageSwitcher from "@/components/LanguageSwitcher";
const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const {
    signIn,
    signUp
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/";
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
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const emailToUse = loginMethod === "email" ? loginEmail : `62${loginPhone.replace(/^0+/, '')}@phone.local`;
    const {
      error
    } = await signIn(emailToUse, loginPassword);
    if (error) {
      toast({
        variant: "destructive",
        title: t.auth.loginFailed,
        description: error.message
      });
    } else {
      toast({
        title: t.auth.welcomeBack,
        description: t.auth.loggedInSuccess
      });
      navigate(redirectPath);
    }
    setIsLoading(false);
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const formattedPhone = signupMethod === "phone" ? `+62${signupPhone.replace(/^0+/, '')}` : signupPhone;
    const emailToUse = signupMethod === "email" ? signupEmail : `${formattedPhone.replace('+', '')}@phone.local`;
    const {
      error
    } = await signUp(emailToUse, signupPassword, signupFullName, formattedPhone);
    if (error) {
      toast({
        variant: "destructive",
        title: t.auth.signupFailed,
        description: error.message
      });
    } else {
      toast({
        title: "Pendaftaran Berhasil",
        description: "Akun Anda sedang menunggu verifikasi dari admin. Anda akan mendapat notifikasi setelah diverifikasi."
      });
    }
    setIsLoading(false);
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
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const {
      error
    } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin
    });
    if (error) {
      toast({
        variant: "destructive",
        title: t.auth.googleFailed,
        description: error.message
      });
      setIsGoogleLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={strobanLogo} alt="Sahabat Stroban" className="h-7" />
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
                  <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.signingIn}</> : t.common.signIn}
                </Button>
                <div className="text-center">
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

                {signupMethod === "email" ? <div className="space-y-2">
                    <Label htmlFor="signup-email">{t.auth.email}</Label>
                    <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} />
                  </div> : <div className="space-y-2">
                    <Label htmlFor="signup-phone">{t.auth.phoneIndonesia}</Label>
                    <div className="flex">
                      <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground text-sm">+62</div>
                      <Input id="signup-phone" type="tel" placeholder="812 3456 7890" value={signupPhone} onChange={e => setSignupPhone(e.target.value.replace(/\D/g, ''))} className="rounded-l-none" required maxLength={12} />
                    </div>
                    <p className="text-xs text-muted-foreground">{t.auth.enterWithout0}</p>
                  </div>}

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t.auth.password}</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.auth.creatingAccount}</> : t.auth.createAccount}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
};
export default Auth;