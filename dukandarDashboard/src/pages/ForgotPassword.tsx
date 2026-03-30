import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, LockKeyhole, Mail } from "lucide-react";
import { authApi } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await authApi.forgotPassword({ email });
      if (!res.success) throw new Error(res.message || "Unable to send OTP");

      toast({
        title: "OTP sent",
        description: "Check your email for password reset OTP.",
      });
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await authApi.resendResetOtp(email);
      if (!res.success) throw new Error(res.message || "Unable to resend OTP");
      toast({ title: "OTP resent", description: "A fresh OTP is sent to your email." });
    } catch (err: any) {
      setError(err.message || "Unable to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter valid 6-digit OTP");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await authApi.resetPassword({ email, otp, newPassword });
      if (!res.success) throw new Error(res.message || "Password reset failed");

      toast({ title: "Password updated", description: "You are now logged in." });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center px-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm bg-card rounded-2xl shadow-xl border p-6"
      >
        <button
          onClick={() => navigate("/login")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </button>

        <h1 className="text-xl font-bold">Forgot Password</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          {step === "request"
            ? "Enter your email to receive OTP"
            : "Enter OTP and set your new password"}
        </p>

        {step === "request" ? (
          <form onSubmit={requestOtp} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full pl-11 pr-4 py-3.5 bg-muted border rounded-xl text-sm"
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending OTP...
                </span>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="space-y-4">
            <div className="text-xs text-muted-foreground break-all">Email: {email}</div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit OTP"
              className="w-full px-4 py-3.5 bg-muted border rounded-xl text-sm tracking-[0.2em]"
            />

            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full pl-11 pr-4 py-3.5 bg-muted border rounded-xl text-sm"
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || newPassword.length < 6}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Resetting...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={loading}
              className="w-full text-sm text-primary font-semibold"
            >
              Resend OTP
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
