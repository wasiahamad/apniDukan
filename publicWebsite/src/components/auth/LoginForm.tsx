import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type LoginFormProps = {
  isLoading: boolean;
  onSubmit: (payload: { email: string; password: string; rememberMe: boolean }) => Promise<void>;
  onForgotPassword: () => void;
  defaultEmail?: string;
};

export default function LoginForm({ isLoading, onSubmit, onForgotPassword, defaultEmail = "" }: LoginFormProps) {
  const { t } = useTranslation();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(defaultEmail));
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = t("auth.validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = t("auth.validation.emailInvalid");
    }

    if (!password) {
      nextErrors.password = t("auth.validation.passwordRequired");
    } else if (password.length < 6) {
      nextErrors.password = t("auth.validation.passwordMin");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ email: email.trim(), password, rememberMe });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="relative">
        <Input
          ref={emailRef}
          id="login-email"
          type="email"
          placeholder=" "
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="peer h-12 rounded-2xl bg-white/80"
        />
        <label
          htmlFor="login-email"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm transition-all peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-[rgb(30,190,118)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1"
        >
          {t("auth.login.email")}
        </label>
        {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
      </div>

      <div className="relative">
        <Input
          id="login-password"
          type={showPassword ? "text" : "password"}
          placeholder=" "
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="peer h-12 rounded-2xl bg-white/80 pr-11"
        />
        <label
          htmlFor="login-password"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm transition-all peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-[rgb(30,190,118)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1"
        >
          {t("auth.login.password")}
        </label>
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-slate-600">
          <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
          {t("auth.login.rememberMe")}
        </label>
        <button type="button" className="text-[rgb(255,136,0)] font-medium hover:underline" onClick={onForgotPassword}>
          {t("auth.login.forgotPassword")}
        </button>
      </div>

      <div className="sticky bottom-0 bg-white/70 backdrop-blur-sm py-2 md:static md:bg-transparent md:py-0">
        <Button
          type="submit"
          disabled={isLoading}
          className="h-12 w-full rounded-2xl bg-[rgb(30,190,118)] hover:bg-[rgb(25,163,101)] text-white"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isLoading ? t("auth.login.loggingIn") : t("auth.login.login")}
        </Button>
      </div>

      <p className="text-sm text-center text-slate-600">
        {t("auth.login.newTo")} <Link to="/signup" className="font-semibold text-[rgb(255,136,0)] hover:underline">{t("auth.login.createAccount")}</Link>
      </p>
    </form>
  );
}
