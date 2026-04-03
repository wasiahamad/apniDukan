import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Facebook, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
    <section className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top_left,#ecfdf5,transparent_35%),radial-gradient(circle_at_top_right,#fff7ed,transparent_30%),linear-gradient(#ffffff,#f8fafc)] py-8 md:py-12">
      <div className="container max-w-lg">
        <Card className="rounded-3xl border-0 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur transition-all duration-300 hover:shadow-[0_26px_70px_rgba(15,23,42,0.16)]">
          <CardHeader>
            <CardTitle className="text-3xl font-black tracking-tight text-slate-900">Create Account</CardTitle>
            <CardDescription>Sign up to unlock your personal DukaanDirect dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-name"
                  type="text"
                  className="h-12 pl-10"
                  placeholder="Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              {errors.name ? <p className="text-xs text-red-600">{errors.name}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-phone">Phone (optional)</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-phone"
                  type="tel"
                  className="h-12 pl-10"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                />
              </div>
              {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-email"
                  type="email"
                  className="h-12 pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="signup-password"
                  type="password"
                  className="h-12 pl-10"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {errors.password ? <p className="text-xs text-red-600">{errors.password}</p> : null}
            </div>

            <Button
              className="w-full h-12 bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white transition-all duration-200"
              onClick={onSubmit}
              disabled={isSubmitting || !!socialLoading}
            >
              {isSubmitting ? "Creating account..." : "Signup"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="relative text-center text-xs tracking-[0.2em] text-slate-500 py-2">
              <span className="px-3 bg-card relative z-10">OR CONTINUE WITH</span>
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
                {socialLoading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base font-semibold">G</span>}
                <span className="ml-3">Continue with Google</span>
              </Button>
              <Button
                type="button"
                className="h-12 rounded-full justify-start bg-[#1877F2] hover:bg-[#1665cf] text-white"
                onClick={() => onSocialLogin("facebook")}
                disabled={!!socialLoading || isSubmitting}
              >
                {socialLoading === "facebook" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
                <span className="ml-3">Continue with Facebook</span>
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
