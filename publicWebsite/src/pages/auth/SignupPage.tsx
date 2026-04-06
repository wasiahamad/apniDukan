import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

export default function SignupPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signup, socialLogin } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; phone?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);

  const validate = () => {
    const nextErrors: { name?: string; email?: string; password?: string; phone?: string } = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      nextErrors.name = "Name is required";
    }

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

    if (phone && phone.length !== 10) {
      nextErrors.phone = "Phone number must be 10 digits";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await signup({
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim(),
        password,
      });
      toast({ title: "Account created", description: "Your profile is ready." });
      navigate("/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account right now";
      toast({ title: "Signup failed", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    try {
      await socialLogin(provider);
      toast({ title: "Success", description: `Signed in with ${provider}.` });
      navigate("/account", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unable to signup with ${provider}`;
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
            <p className="inline-flex w-fit items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700">New Customer</p>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Create Account</CardTitle>
            <CardDescription className="text-[15px] text-slate-600">Sign up to unlock your personal DukaanDirect dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="signup-name" className="text-slate-700">Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-name"
                  type="text"
                  className="h-12 pl-10 rounded-xl border-slate-200 bg-white focus-visible:ring-orange-200"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone" className="text-slate-700">Phone (optional)</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-phone"
                  type="tel"
                  className="h-12 pl-10 rounded-xl border-slate-200 bg-white focus-visible:ring-orange-200"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                />
              </div>
              {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-slate-700">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-email"
                  type="email"
                  className="h-12 pl-10 rounded-xl border-slate-200 bg-white focus-visible:ring-orange-200"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-password"
                  type="password"
                  className="h-12 pl-10 rounded-xl border-slate-200 bg-white focus-visible:ring-orange-200"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
            </div>

            <Button
              className="w-full h-12 rounded-xl bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white font-semibold shadow-[0_14px_24px_-16px_rgba(255,136,0,0.9)] transition-all duration-200"
              onClick={onSubmit}
              disabled={isSubmitting || !!socialLoading}
            >
              {isSubmitting ? "Creating account..." : "Signup"}
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
              Already have an account?{" "}
              <Link className="font-semibold text-[rgb(30,190,118)] hover:underline" to="/login">
                Login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
