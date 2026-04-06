import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

function GoogleBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.4-4l-3.2 2.5C4.9 19.7 8.2 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.6 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1L3.4 7.4C2.8 8.8 2.5 10.3 2.5 12s.3 3.2.9 4.6l3.2-2.5z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.9c1.4 0 2.7.5 3.7 1.5l2.8-2.8C16.8 3 14.6 2 12 2 8.2 2 4.9 4.3 3.4 7.4l3.2 2.5c.7-2.3 2.9-4 5.4-4z"
      />
    </svg>
  );
}

function FacebookBrandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.8v-8.3H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.3A12 12 0 0 0 24 12z"
      />
      <path fill="#fff" d="M16.6 15.5l.5-3.5h-3.3V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.7 0-4.5 1.6-4.5 4.7V12h-3v3.5h3v8.3c.6.1 1.2.2 1.9.2.6 0 1.2-.1 1.8-.2v-8.3h2.8z" />
    </svg>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login, socialLogin } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const state = location.state as LocationState | null;

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = "Enter a valid email";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      toast({ title: "Welcome back", description: "You are now logged in." });
      const redirectTo = state?.from?.pathname || "/account";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login right now";
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      await socialLogin(provider);
      toast({ title: "Success", description: `Signed in with ${provider}.` });
      const redirectTo = state?.from?.pathname || "/account";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to login with ${provider}`;
      toast({ title: "Social login failed", description: message, variant: "destructive" });
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,#e6fef3,transparent_38%),radial-gradient(circle_at_top_right,#fff1df,transparent_34%),linear-gradient(130deg,#f8fffc_0%,#f3f8ff_46%,#fff8f0_100%)] py-8 md:py-12">
      <div className="container max-w-lg">
        <Card className="rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_18px_52px_-30px_rgba(15,23,42,0.36)] backdrop-blur">
          <CardHeader className="space-y-2">
            <p className="inline-flex w-fit items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">Customer Access</p>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Welcome Back</CardTitle>
            <CardDescription className="text-[15px] text-slate-600">Login to manage your profile, bookings, and nearby shops.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login-email"
                  type="email"
                  className="h-12 pl-10 rounded-xl border-slate-200 bg-white focus-visible:ring-emerald-200"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="login-password"
                  type="password"
                  className="h-12 pl-10 rounded-xl border-slate-200 bg-white focus-visible:ring-emerald-200"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
            </div>

            <Button
              className="w-full h-12 rounded-xl bg-[rgb(30,190,118)] hover:bg-[rgb(26,168,104)] text-white font-semibold shadow-[0_14px_24px_-16px_rgba(30,190,118,0.9)] transition-all duration-200"
              onClick={onSubmit}
              disabled={isSubmitting || !!socialLoading}
            >
              {isSubmitting ? "Logging in..." : "Login"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="relative text-center text-xs tracking-[0.2em] text-slate-500 py-1">
              <span className="px-3 bg-white relative z-10">OR CONTINUE WITH</span>
              <span className="absolute left-0 right-0 top-1/2 border-t -z-0" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl justify-center border-slate-200 bg-white text-slate-800 transition-colors hover:bg-slate-50 hover:text-slate-900 hover:translate-y-0 active:translate-y-0"
                onClick={() => onSocialLogin("google")}
                disabled={!!socialLoading || isSubmitting}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 shadow-sm transition-none transform-none">
                    {socialLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleBrandIcon />}
                  </span>
                  <span>Continue with Google</span>
                </span>
              </Button>
              <Button
                type="button"
                className="h-12 rounded-xl justify-center border border-[#d7e7ff] bg-[#eff5ff] text-[#1f4ea8] transition-colors hover:bg-[#e4efff] hover:text-[#1a438f] hover:translate-y-0 active:translate-y-0"
                onClick={() => onSocialLogin("facebook")}
                disabled={!!socialLoading || isSubmitting}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#cfe0ff] bg-white/95 shadow-sm transition-none transform-none">
                    {socialLoading === "facebook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FacebookBrandIcon />}
                  </span>
                  <span>Continue with Facebook</span>
                </span>
              </Button>
            </div>

            <p className="text-sm text-slate-600 text-center">
              New to DukaanDirect?{" "}
              <Link className="font-semibold text-[rgb(255,136,0)] hover:underline" to="/signup">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
