import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, ArrowRight, Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const GoogleColorIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-6.9 0-.6-.1-1.2-.2-1.7H12z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.6 0 4.8-.9 6.4-2.5l-3.1-2.4c-.9.6-2 1-3.3 1-2.5 0-4.6-1.7-5.3-4l-3.2 2.5C5.1 19.7 8.3 22 12 22z"
    />
    <path
      fill="#FBBC05"
      d="M6.7 14.1c-.2-.6-.3-1.3-.3-2.1s.1-1.4.3-2.1l-3.2-2.5C2.9 8.8 2.5 10.3 2.5 12s.4 3.2 1 4.6l3.2-2.5z"
    />
    <path
      fill="#4285F4"
      d="M12 5.9c1.4 0 2.7.5 3.7 1.5l2.8-2.8C16.8 2.9 14.6 2 12 2 8.3 2 5.1 4.3 3.5 7.4l3.2 2.5c.7-2.3 2.8-4 5.3-4z"
    />
  </svg>
);

const FacebookColorIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 12v-8.4H7.1v-3.6h3V9.4c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.6H14v8.4c5.6-1 10-6 10-12z"
    />
    <path fill="#fff" d="M16.9 15.7l.5-3.6H14V9.8c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.2-2.7-.2c-2.8 0-4.6 1.7-4.6 4.7v2.7h-3v3.6h3v8.4c.6.1 1.2.2 1.9.2s1.3-.1 1.9-.2v-8.4h2.9z" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [socialProvider, setSocialProvider] = useState<"google" | "facebook" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithFacebook, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load social auth SDK"));
      document.body.appendChild(script);
    });

  const performPostLoginRedirect = () => {
    navigate("/dashboard");
  };

  const handleSocialSuccess = (message: string) => {
    toast({ title: "Login Successful", description: message });
    performPostLoginRedirect();
  };

  const handleGoogleLogin = async () => {
    if (!googleClientId) {
      setError("Google login is not configured.");
      return;
    }

    setIsSocialLoading(true);
    setSocialProvider("google");
    setError("");

    try {
      await loadScript("https://accounts.google.com/gsi/client");
      const google = (window as any).google;
      if (!google?.accounts?.oauth2?.initTokenClient) {
        throw new Error("Google SDK unavailable");
      }

      const accessToken = await new Promise<string>((resolve, reject) => {
        let settled = false;
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: (response: any) => {
            settled = true;
            if (response?.error) {
              reject(new Error(response.error_description || response.error || "Google login failed"));
              return;
            }
            if (!response?.access_token) {
              reject(new Error("Google access token not received"));
              return;
            }
            resolve(response.access_token);
          },
        });

        tokenClient.requestAccessToken({ prompt: "consent" });
        window.setTimeout(() => {
          if (!settled) reject(new Error("Google login was cancelled or timed out"));
        }, 20000);
      });

      await loginWithGoogle(accessToken);
      handleSocialSuccess("Logged in with Google");
    } catch (err: any) {
      const message = err.message || "Google login failed";
      setError(message);
      toast({ variant: "destructive", title: "Google Login Failed", description: message });
    } finally {
      setIsSocialLoading(false);
      setSocialProvider(null);
    }
  };

  const handleFacebookLogin = async () => {
    if (!facebookAppId) {
      setError("Facebook login is not configured.");
      return;
    }

    setIsSocialLoading(true);
    setSocialProvider("facebook");
    setError("");

    try {
      await loadScript("https://connect.facebook.net/en_US/sdk.js");
      const FB = (window as any).FB;
      if (!FB) throw new Error("Facebook SDK unavailable");

      await new Promise<void>((resolve) => {
        FB.init({
          appId: facebookAppId,
          cookie: true,
          xfbml: false,
          version: "v19.0",
        });
        resolve();
      });

      const accessToken = await new Promise<string>((resolve, reject) => {
        FB.login(
          (response: any) => {
            const token = response?.authResponse?.accessToken;
            if (!token) {
              reject(new Error("Facebook login cancelled"));
              return;
            }
            resolve(token);
          },
          { scope: "email,public_profile" }
        );
      });

      await loginWithFacebook(accessToken);
      handleSocialSuccess("Logged in with Facebook");
    } catch (err: any) {
      const message = err.message || "Facebook login failed";
      setError(message);
      toast({ variant: "destructive", title: "Facebook Login Failed", description: message });
    } finally {
      setIsSocialLoading(false);
      setSocialProvider(null);
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Login Successful",
        description: "Welcome back to your dashboard!",
      });
      performPostLoginRedirect();
    } catch (err: any) {
      if (err?.message?.includes("Email not verified")) {
        sessionStorage.setItem("pendingVerificationEmail", email);
        navigate("/otp-verification", { state: { email, flow: "login" } });
        return;
      }

      setError(err.message || "Login failed. Please check your credentials.");
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message || "Invalid email or password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center px-4 py-4 sm:py-8">
      <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-6 sm:mb-8">
        <Link to="/" className="inline-block group">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <ShoppingBag className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">DukaanSetu</h1>
          <p className="text-sm text-muted-foreground mt-1">Apni dukaan, online!</p>
        </Link>
      </motion.div>

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        className="w-full max-w-sm bg-card rounded-2xl shadow-xl border p-4 sm:p-6 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto overflow-x-hidden overscroll-contain">
        <h2 className="text-lg font-bold text-foreground mb-1">Welcome Back</h2>
        <p className="text-sm text-muted-foreground mb-6">Login to your business dashboard</p>
        
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={isLoading}
              className="w-full pl-11 pr-4 py-3.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isLoading}
              className="w-full pl-11 pr-11 py-3.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={isLoading || !email || !password}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              <>
                Login <ArrowRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="w-full text-sm text-primary font-semibold"
          >
            Forgot password?
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSocialLoading}
              className="w-full border border-slate-300 bg-white text-slate-700 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSocialLoading && socialProvider === "google" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <GoogleColorIcon /> Google
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isSocialLoading}
              className="w-full border border-[#1877F2] bg-[#1877F2] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#166FE5] hover:border-[#166FE5] disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {isSocialLoading && socialProvider === "facebook" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <FacebookColorIcon /> Facebook
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Don't have an account?{" "}
          <button onClick={() => navigate("/onboarding")} className="text-primary font-semibold">Sign Up</button>
        </p>

      </motion.div>

      
    </div>
  );
};

export default Login;
