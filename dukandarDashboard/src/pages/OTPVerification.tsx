import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import { authApi } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";

const OTPVerification = () => {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const flow = (location.state as any)?.flow || "login";

  useEffect(() => {
    const stateEmail = (location.state as any)?.email;
    const storedEmail = sessionStorage.getItem("pendingVerificationEmail");
    const resolved = stateEmail || storedEmail || "";
    setEmail(resolved);

    if (!resolved) {
      navigate("/login");
    }
  }, [location.state, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || otp.length !== 6) {
      setError("Please enter valid 6-digit OTP");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await authApi.verifyEmailOtp({ email, otp });
      if (!response.success) throw new Error(response.message || "OTP verification failed");

      sessionStorage.removeItem("pendingVerificationEmail");

      toast({
        title: "Verified",
        description: "Your account is activated successfully.",
      });

      if (flow === "onboarding") {
        // Force a full reload so AuthContext rehydrates with fresh tokens from localStorage.
        window.location.assign("/onboarding?resume=1&step=1");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const message = err.message || "Failed to verify OTP";
      setError(message);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    setError("");
    try {
      const response = await authApi.resendEmailOtp(email);
      if (!response.success) throw new Error(response.message || "Failed to resend OTP");

      toast({
        title: "OTP sent",
        description: "A new OTP has been sent to your email.",
      });
    } catch (err: any) {
      const message = err.message || "Failed to resend OTP";
      setError(message);
      toast({
        variant: "destructive",
        title: "Resend failed",
        description: message,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm bg-card rounded-2xl shadow-xl border p-6 text-center"
      >
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>

        <h2 className="text-lg font-bold mb-1">Verify Email OTP</h2>
        <p className="text-sm text-muted-foreground mb-6 break-all">Sent to {email}</p>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit OTP"
            className="w-full h-12 bg-muted border-2 rounded-xl text-center text-xl font-bold tracking-[0.3em] focus:outline-none focus:border-primary transition-colors"
          />

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={isVerifying || otp.length !== 6}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {isVerifying ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
              </span>
            ) : (
              "Verify OTP"
            )}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-4">
          Didn't receive OTP?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-primary font-semibold disabled:opacity-50"
          >
            {isResending ? "Resending..." : "Resend OTP"}
          </button>
        </p>

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground mx-auto mt-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </motion.div>
    </div>
  );
};

export default OTPVerification;
