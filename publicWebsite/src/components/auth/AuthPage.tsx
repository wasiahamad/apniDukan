import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import SocialAuthButtons from "@/components/auth/SocialAuthButtons";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type Mode = "login" | "signup";

type AuthPageProps = {
  initialMode?: Mode;
};

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export default function AuthPage({ initialMode = "login" }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, signup, socialLogin } = useAuth();

  const rememberedEmail = useMemo(() => localStorage.getItem("publicdukan-remember-email") || "", []);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const state = location.state as LocationState | null;

  const handleForgotPassword = () => {
    toast({
      title: "Forgot password",
      description: "Password recovery flow can be linked to your backend OTP endpoint.",
    });
  };

  const handleLogin = async (payload: { email: string; password: string; rememberMe: boolean }) => {
    setIsSubmitting(true);
    try {
      await login({ email: payload.email, password: payload.password });
      if (payload.rememberMe) {
        localStorage.setItem("publicdukan-remember-email", payload.email);
      } else {
        localStorage.removeItem("publicdukan-remember-email");
      }
      toast({ title: "Welcome back", description: "You are now logged in." });
      navigate(state?.from?.pathname || "/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login right now";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (payload: { name: string; email: string; password: string }) => {
    setIsSubmitting(true);
    try {
      const result = await signup(payload);
      if (result?.verificationRequired) {
        toast({ title: "OTP sent", description: "Enter the OTP on the Signup page to verify your email." });
        navigate("/signup", { replace: true });
        return;
      }
      toast({ title: "Account created", description: "Your premium profile is ready." });
      navigate("/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account";
      toast({ title: "Signup failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocial = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      await socialLogin(provider);
      toast({ title: "Success", description: `Signed in with ${provider}.` });
      navigate("/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to continue with ${provider}`;
      toast({ title: "Social login failed", description: message, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-5">
        <div className="flex items-center rounded-2xl p-1 bg-slate-100/80 border border-slate-200">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all ${mode === "login" ? "bg-white text-[rgb(30,190,118)] shadow-sm" : "text-slate-500"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all ${mode === "signup" ? "bg-white text-[rgb(255,136,0)] shadow-sm" : "text-slate-500"}`}
          >
            Signup
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: mode === "login" ? -8 : 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: mode === "login" ? 8 : -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {mode === "login" ? (
              <LoginForm
                isLoading={isSubmitting}
                onSubmit={handleLogin}
                onForgotPassword={handleForgotPassword}
                defaultEmail={rememberedEmail}
              />
            ) : (
              <SignupForm isLoading={isSubmitting} onSubmit={handleSignup} />
            )}
          </motion.div>
        </AnimatePresence>

        <SocialAuthButtons
          loadingProvider={socialLoading}
          onGoogle={() => handleSocial("google")}
          onFacebook={() => handleSocial("facebook")}
        />
      </div>
    </AuthLayout>
  );
}
