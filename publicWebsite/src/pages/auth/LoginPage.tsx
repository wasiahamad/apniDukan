import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/lib/publicShopsApi";
import { FacebookIcon, GoogleIcon } from "@/components/auth/BrandIcons";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
  authRequired?: boolean;
};

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, socialLogin, verifyEmailOtp, resendEmailOtp } = useAuth();

  const [mode, setMode] = useState<"login" | "forgot" | "verify">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const state = location.state as LocationState | null;

  const getRedirectTo = () => {
    const pathname = state?.from?.pathname || "/account";
    const search = state?.from?.search || "";
    const hash = state?.from?.hash || "";
    return `${pathname}${search}${hash}`;
  };

  useEffect(() => {
    if (!state?.authRequired) return;
    toast({
      title: t("auth.login.toast.authRequiredTitle"),
      description: t("auth.login.toast.authRequiredDesc"),
      variant: "destructive",
    });
  }, [location.key, state?.authRequired, t, toast]);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email or phone number is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) && !/^\d{10}$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email address or 10-digit phone number";
    }

    if (!password) {
      nextErrors.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      nextErrors.password = t("auth.validation.passwordMin");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({ identifier: email.trim(), password });
      toast({ title: t("auth.login.toast.welcomeTitle"), description: t("auth.login.toast.welcomeDesc") });
      const redirectTo = getRedirectTo();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const anyErr: any = error;
      if (anyErr?.code === "EMAIL_NOT_VERIFIED") {
        setMode("verify");
        setVerifyOtp("");
        const verificationEmail = anyErr?.details?.data?.email || email.trim();
        setEmail(verificationEmail);
        toast({
          title: t("auth.login.toast.verifyEmailTitle"),
          description: t("auth.login.toast.verifyEmailDesc"),
          variant: "destructive",
        });
        return;
      }

      const message = error instanceof Error ? error.message : "Unable to login right now";
      toast({ title: t("auth.login.toast.loginFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyEmail = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({
        title: t("auth.login.toast.emailRequiredTitle"),
        description: t("auth.login.toast.emailRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    if (!verifyOtp.trim()) {
      toast({
        title: t("auth.login.toast.otpRequiredTitle"),
        description: t("auth.login.toast.otpRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmailOtp({ email: trimmedEmail, otp: verifyOtp });
      toast({ title: t("auth.login.toast.verifiedTitle"), description: t("auth.login.toast.verifiedDesc") });
      const redirectTo = getRedirectTo();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed";
      toast({ title: t("auth.login.toast.verificationFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResendVerifyOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setIsSubmitting(true);
    try {
      await resendEmailOtp({ email: trimmedEmail });
      toast({ title: t("auth.login.toast.otpResentTitle"), description: t("auth.login.toast.otpResentDesc") });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend OTP";
      toast({ title: t("auth.login.toast.resendFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendForgotOtp = async () => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to send OTP");
      }
      setForgotStep("verify");
      setForgotOtp("");
      toast({ title: t("auth.login.toast.otpSentTitle"), description: t("auth.login.toast.otpSentDesc") });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send OTP";
      toast({ title: t("auth.login.toast.failedTitle"), description: message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) return;
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Failed to resend OTP");
      }
      toast({ title: t("auth.login.toast.otpResentTitle"), description: t("auth.login.toast.otpResentDesc") });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend OTP";
      toast({ title: t("auth.login.toast.failedTitle"), description: message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const resetPassword = async () => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail || !forgotOtp.trim() || !forgotNewPassword) {
      toast({
        title: t("auth.validation.missingInfo"),
        description: t("auth.login.toast.missingInfoDesc"),
        variant: "destructive",
      });
      return;
    }
    if (forgotNewPassword.length < 6) {
      toast({
        title: t("auth.validation.weakPassword"),
        description: t("auth.validation.passwordMin"),
        variant: "destructive",
      });
      return;
    }
    setForgotLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, otp: forgotOtp.trim(), newPassword: forgotNewPassword }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Password reset failed");
      }
      toast({ title: t("auth.login.toast.passwordUpdatedTitle"), description: t("auth.login.toast.passwordUpdatedDesc") });
      setMode("login");
      setForgotStep("request");
      setPassword("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password";
      toast({ title: t("auth.login.toast.failedTitle"), description: message, variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  const onSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      await socialLogin(provider);
      toast({ title: t("auth.toast.successTitle"), description: t("auth.toast.socialSuccessDesc", { provider }) });
      const redirectTo = getRedirectTo();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to login with ${provider}`;
      toast({ title: t("auth.toast.socialFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_35%),radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.18),transparent_30%),linear-gradient(180deg,hsl(var(--muted)),hsl(var(--background)))] py-8 md:py-12">
      <div className="container max-w-lg">
        <Card className="rounded-3xl border-0 bg-card/90 shadow-xl backdrop-blur transition-all duration-300 hover:shadow-2xl">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight text-foreground">
              {mode === "forgot" ? t("auth.login.titleForgot") : mode === "verify" ? t("auth.login.titleVerify") : t("auth.login.titleLogin")}
            </CardTitle>
            <CardDescription>
              {mode === "forgot"
                ? t("auth.login.descForgot")
                : mode === "verify"
                  ? t("auth.login.descVerify")
                  : t("auth.login.descLogin")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode !== "forgot" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email or phone</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="text"
                      className="h-12 pl-10"
                      placeholder="you@example.com or 10-digit phone"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                    />
                  </div>
                  {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
                </div>

                {mode === "verify" ? (
                  <div className="space-y-2">
                    <Label htmlFor="verify-otp">{t("auth.login.otp")}</Label>
                    <Input
                      id="verify-otp"
                      inputMode="numeric"
                      className="h-12"
                      placeholder="Enter OTP"
                      value={verifyOtp}
                      onChange={(e) => setVerifyOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                    />
                    <div className="grid grid-cols-1 gap-3">
                      <Button className="w-full h-12" onClick={onVerifyEmail} disabled={isSubmitting || !!socialLoading}>
                        {isSubmitting ? t("auth.login.verifying") : t("auth.login.verifyContinue")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button type="button" variant="outline" className="h-12" onClick={onResendVerifyOtp} disabled={isSubmitting || !!socialLoading}>
                        {t("auth.login.resendOtp")}
                      </Button>
                      <Button type="button" variant="ghost" className="h-10" onClick={() => setMode("login")} disabled={isSubmitting || !!socialLoading}>
                        {t("auth.login.backToLogin")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t("auth.login.password")}</Label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          className="h-12 pl-10"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
                    </div>

                    <button
                      type="button"
                      className="text-sm font-semibold text-muted-foreground hover:underline text-left"
                      onClick={() => {
                        setMode("forgot");
                        setForgotStep("request");
                        setForgotEmail(email.trim());
                        setForgotOtp("");
                        setForgotNewPassword("");
                      }}
                      disabled={isSubmitting || !!socialLoading}
                    >
                      {t("auth.login.forgotPassword")}
                    </button>

                    <Button
                      className="w-full h-12 transition-all duration-200"
                      onClick={onSubmit}
                      disabled={isSubmitting || !!socialLoading}
                    >
                      {isSubmitting ? t("auth.login.loggingIn") : t("auth.login.login")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    className="h-12"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>

                {forgotStep === "verify" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-otp">{t("auth.login.otp")}</Label>
                      <Input
                        id="forgot-otp"
                        inputMode="numeric"
                        className="h-12"
                        placeholder="Enter OTP"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-new-password">New {t("auth.login.password")}</Label>
                      <Input
                        id="forgot-new-password"
                        type="password"
                        className="h-12"
                        placeholder="Minimum 6 characters"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <Button className="w-full h-12" onClick={resetPassword} disabled={forgotLoading}>
                        {forgotLoading ? t("auth.login.updating") : t("auth.login.resetPassword")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button type="button" variant="outline" className="h-12" onClick={resendForgotOtp} disabled={forgotLoading}>
                        {t("auth.login.resendOtp")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button className="w-full h-12" onClick={sendForgotOtp} disabled={forgotLoading}>
                    {forgotLoading ? t("auth.login.sending") : t("auth.login.sendOtp")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                <Button type="button" variant="ghost" className="h-10" onClick={() => setMode("login")} disabled={forgotLoading}>
                  {t("auth.login.backToLogin")}
                </Button>
              </>
            )}

            {mode === "login" ? (
              <>
                <div className="relative text-center text-xs tracking-[0.2em] text-muted-foreground py-2">
                  <span className="px-3 bg-card relative z-10">{t("auth.login.orContinueWith")}</span>
                  <span className="absolute left-0 right-0 top-1/2 border-t -z-0" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-full justify-start"
                    onClick={() => onSocialLogin("google")}
                    disabled={!!socialLoading || isSubmitting}
                  >
                    {socialLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon className="w-4 h-4" />}
                    <span className="ml-3">{t("auth.login.continueGoogle")}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-full justify-start border-[#1877F2]/30 hover:bg-[#1877F2]/5"
                    onClick={() => onSocialLogin("facebook")}
                    disabled={!!socialLoading || isSubmitting}
                  >
                    {socialLoading === "facebook" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FacebookIcon className="w-4 h-4 text-[#1877F2]" />}
                    <span className="ml-3">{t("auth.login.continueFacebook")}</span>
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {t("auth.login.newTo")}{" "}
                  <Link className="font-semibold text-secondary hover:underline" to="/signup">
                    {t("auth.login.createAccount")}
                  </Link>
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
