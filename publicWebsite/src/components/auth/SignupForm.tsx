import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type SignupFormProps = {
  isLoading: boolean;
  onSubmit: (payload: { name: string; email: string; password: string }) => Promise<void>;
};

const getInitials = (value: string) => {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "DU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

export default function SignupForm({ isLoading, onSubmit }: SignupFormProps) {
  const { t } = useTranslation();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const initials = useMemo(() => getInitials(name || email || "User"), [name, email]);

  const validate = () => {
    const nextErrors: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};

    if (!name.trim()) nextErrors.name = t("auth.validation.nameRequired");

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

    if (!confirmPassword) {
      nextErrors.confirmPassword = t("auth.validation.confirmPasswordRequired");
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = t("auth.validation.passwordMismatch");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({ name: name.trim(), email: email.trim(), password });
  };

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
        <Avatar className="h-10 w-10 border border-[rgb(30,190,118)]/30">
          <AvatarFallback className="bg-[rgb(30,190,118)]/15 text-[rgb(30,190,118)] font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("auth.signup.profilePreview.title")}</p>
          <p className="text-xs text-slate-500">{t("auth.signup.profilePreview.desc")}</p>
        </div>
      </div>

      <div className="relative">
        <Input ref={nameRef} id="signup-name" type="text" placeholder=" " value={name} onChange={(e) => setName(e.target.value)} className="peer h-12 rounded-2xl bg-white/80" />
        <label htmlFor="signup-name" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm transition-all peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-[rgb(30,190,118)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">{t("auth.signup.name")}</label>
        {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
      </div>

      <div className="relative">
        <Input id="signup-email" type="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} className="peer h-12 rounded-2xl bg-white/80" />
        <label htmlFor="signup-email" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm transition-all peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-[rgb(30,190,118)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">{t("auth.signup.email")}</label>
        {errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}
      </div>

      <div className="relative">
        <Input id="signup-password" type={showPassword ? "text" : "password"} placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} className="peer h-12 rounded-2xl bg-white/80 pr-11" />
        <label htmlFor="signup-password" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm transition-all peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-[rgb(30,190,118)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">{t("auth.signup.password")}</label>
        <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {errors.password ? <p className="mt-1 text-xs text-red-600">{errors.password}</p> : null}
      </div>

      <div className="relative">
        <Input id="signup-confirm-password" type={showConfirmPassword ? "text" : "password"} placeholder=" " value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="peer h-12 rounded-2xl bg-white/80 pr-11" />
        <label htmlFor="signup-confirm-password" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm transition-all peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:text-xs peer-focus:bg-white peer-focus:px-1 peer-focus:text-[rgb(30,190,118)] peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:bg-white peer-[:not(:placeholder-shown)]:px-1">{t("auth.signup.confirmPassword")}</label>
        <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        {errors.confirmPassword ? <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p> : null}
      </div>

      <div className="sticky bottom-0 bg-white/70 backdrop-blur-sm py-2 md:static md:bg-transparent md:py-0">
        <Button type="submit" disabled={isLoading} className="h-12 w-full rounded-2xl bg-[rgb(255,136,0)] hover:bg-[rgb(235,121,0)] text-white">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isLoading ? t("auth.signup.creating") : t("auth.signup.titleForm")}
        </Button>
      </div>

      <p className="text-sm text-center text-slate-600">
        {t("auth.signup.alreadyHave")} <Link to="/login" className="font-semibold text-[rgb(30,190,118)] hover:underline">{t("auth.signup.login")}</Link>
      </p>
    </form>
  );
}
