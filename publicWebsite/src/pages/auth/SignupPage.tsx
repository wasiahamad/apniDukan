import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FacebookIcon, GoogleIcon } from "@/components/auth/BrandIcons";
import { ArrowRight, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signup, socialLogin, verifyEmailOtp, resendEmailOtp } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpExpiresInMinutes, setOtpExpiresInMinutes] = useState<number | undefined>(undefined);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const validate = () => {
    const nextErrors: { name?: string; email?: string; password?: string; phone?: string } = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      nextErrors.name = t("auth.validation.nameRequired");
    }

    if (!trimmedEmail) {
      nextErrors.email = t("auth.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      nextErrors.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      nextErrors.password = t("auth.validation.passwordMin");
    }

    if (phone && phone.length !== 10) {
      nextErrors.phone = t("auth.validation.phoneDigits10");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await signup({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });

      if (result?.verificationRequired) {
        setOtp("");
        setOtpExpiresInMinutes(result.otpExpiresInMinutes);
        setStep("verify");
        toast({ title: t("auth.signup.toast.otpSentTitle"), description: t("auth.signup.toast.otpSentDesc") });
      } else {
        toast({ title: t("auth.signup.toast.accountCreatedTitle"), description: t("auth.signup.toast.accountCreatedDesc") });
        navigate("/account", { replace: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account right now";
      toast({ title: t("auth.signup.toast.signupFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({
        title: t("auth.signup.toast.emailRequiredTitle"),
        description: t("auth.signup.toast.emailRequiredDesc"),
        variant: "destructive",
      });
      setStep("form");
      return;
    }
    if (!otp.trim()) {
      toast({
        title: t("auth.validation.otpRequired"),
        description: t("auth.login.toast.otpRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setVerifyLoading(true);
    try {
      await verifyEmailOtp({ email: trimmedEmail, otp });
      toast({ title: t("auth.signup.toast.verifiedTitle"), description: t("auth.signup.toast.verifiedDesc") });
      navigate("/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OTP verification failed";
      toast({ title: t("auth.signup.toast.verificationFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setVerifyLoading(false);
    }
  };

  const onResendOtp = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    setResendLoading(true);
    try {
      const result = await resendEmailOtp({ email: trimmedEmail });
      setOtpExpiresInMinutes(result?.otpExpiresInMinutes);
      toast({ title: t("auth.signup.toast.otpResentTitle"), description: t("auth.signup.toast.otpResentDesc") });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to resend OTP";
      toast({ title: t("auth.signup.toast.resendFailedTitle"), description: message, variant: "destructive" });
    } finally {
      setResendLoading(false);
    }
  };

  const onSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      const completed = await socialLogin(provider);
      if (!completed) return;
      toast({ title: t("auth.toast.successTitle"), description: t("auth.toast.socialSuccessDesc", { provider }) });
      navigate("/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to signup with ${provider}`;
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
              {step === "verify" ? t("auth.signup.titleVerify") : t("auth.signup.titleForm")}
            </CardTitle>
            <CardDescription>
              {step === "verify"
                ? `${t("auth.signup.otpNotePrefix")} ${email.trim() || "your email"} ${
                    otpExpiresInMinutes ? t("auth.signup.otpValidFor", { mins: otpExpiresInMinutes }) : ""
                  }.`
                : t("auth.signup.descForm")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "verify" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="verify-otp">{t("auth.signup.otp")}</Label>
                  <Input
                    id="verify-otp"
                    inputMode="numeric"
                    className="h-12"
                    placeholder={t("auth.signup.enterOtp")}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  />
                  <p className="text-xs text-muted-foreground">{t("auth.signup.alsoCheckSpam")}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    variant="secondary"
                    className="w-full h-12 transition-all duration-200"
                    onClick={onVerifyOtp}
                    disabled={verifyLoading || resendLoading}
                  >
                    {verifyLoading ? t("auth.signup.verifying") : t("auth.signup.verifyContinue")}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <Button type="button" variant="outline" className="h-12" onClick={onResendOtp} disabled={verifyLoading || resendLoading}>
                    {resendLoading ? t("auth.signup.resending") : t("auth.signup.resendOtp")}
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground text-center">
                  {t("auth.signup.wrongEmail")}{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => setStep("form")}
                    disabled={verifyLoading || resendLoading}
                  >
                    {t("auth.signup.changeSignupAgain")}
                  </button>
                </p>
              </>
            ) : (
              <>
            <div className="space-y-2">
              <Label htmlFor="signup-name">{t("auth.signup.name")}</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  className="h-12 pl-10"
                  placeholder={t("auth.signup.placeholderName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone">{t("auth.signup.phoneOptional")}</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-phone"
                  type="tel"
                  className="h-12 pl-10"
                  placeholder={t("auth.signup.placeholderPhone")}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                />
              </div>
              {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">{t("auth.signup.email")}</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-email"
                  type="email"
                  className="h-12 pl-10"
                  placeholder={t("auth.signup.placeholderEmail")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">{t("auth.signup.password")}</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type="password"
                  className="h-12 pl-10"
                  placeholder={t("auth.signup.placeholderPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
            </div>

            <Button
              variant="secondary"
              className="w-full h-12 transition-all duration-200"
              onClick={onSubmit}
              disabled={isSubmitting || !!socialLoading}
            >
              {isSubmitting ? t("auth.signup.creating") : t("auth.signup.signup")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="relative text-center text-xs tracking-[0.2em] text-muted-foreground py-2">
              <span className="px-3 bg-card relative z-10">{t("auth.signup.orContinueWith")}</span>
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
                <span className="ml-3">{t("auth.signup.continueGoogle")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-full justify-start border-[#1877F2]/30 hover:bg-[#1877F2]/5"
                onClick={() => onSocialLogin("facebook")}
                disabled={!!socialLoading || isSubmitting}
              >
                {socialLoading === "facebook" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FacebookIcon className="w-4 h-4 text-[#1877F2]" />}
                <span className="ml-3">{t("auth.signup.continueFacebook")}</span>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              {t("auth.signup.alreadyHave")}{" "}
              <Link className="font-semibold text-primary hover:underline" to="/login">
                {t("auth.signup.login")}
              </Link>
            </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
