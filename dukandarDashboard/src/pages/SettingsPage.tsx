import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Trash2, LockKeyhole, Loader2, HelpCircle, MessageCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, platformFeedbackApi } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";
import Support from "@/pages/Support";

const SettingsPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState("");

  const [platformRating, setPlatformRating] = useState("5");
  const [platformFeedbackText, setPlatformFeedbackText] = useState("");
  const [platformSubmitting, setPlatformSubmitting] = useState(false);
  const [platformSubmitError, setPlatformSubmitError] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t("settings.password.errors.minLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("settings.password.errors.mismatch"));
      return;
    }

    setIsChanging(true);
    try {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      if (!response.success) throw new Error(response.message || t("settings.password.errors.changeFailed"));

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: t("settings.password.toasts.changedTitle"), description: t("settings.password.toasts.changedDesc") });
    } catch (err: any) {
      const message = err.message || t("settings.password.errors.changeFailed");
      setError(message);
      toast({ variant: "destructive", title: t("settings.password.toasts.changeFailedTitle"), description: message });
    } finally {
      setIsChanging(false);
    }
  };

  const handleSubmitPlatformFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlatformSubmitError("");

    const rating = Number.parseInt(platformRating, 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setPlatformSubmitError(t("settings.feedback.errors.ratingRange"));
      return;
    }

    setPlatformSubmitting(true);
    try {
      const res = await platformFeedbackApi.submit({
        rating,
        feedback: platformFeedbackText,
        source: 'dukandarDashboard',
      });
      if (!res.success) throw new Error(res.message || t("settings.feedback.errors.submitFailed"));

      setPlatformFeedbackText("");
      toast({
        title: t("settings.feedback.toasts.submittedTitle"),
        description: t("settings.feedback.toasts.submittedDesc"),
      });
    } catch (err: any) {
      const message = err?.message || t("settings.feedback.errors.submitFailed");
      setPlatformSubmitError(message);
      toast({ variant: "destructive", title: t("settings.feedback.toasts.submitFailedTitle"), description: message });
    } finally {
      setPlatformSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleChangePassword}
          className="bg-card border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <LockKeyhole className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("settings.password.title")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.password.subtitle")}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t("settings.password.currentPlaceholder")}
              className="w-full px-3 py-3 bg-muted border rounded-xl text-sm"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("settings.password.newPlaceholder")}
              className="w-full px-3 py-3 bg-muted border rounded-xl text-sm"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("settings.password.confirmPlaceholder")}
              className="w-full px-3 py-3 bg-muted border rounded-xl text-sm"
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <button
            type="submit"
            disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            {isChanging ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("settings.password.updating")}
              </span>
            ) : (
              t("settings.password.updateCta")
            )}
          </button>
        </motion.form>

        <div className="bg-card border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{t("settings.support.title")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.support.subtitle")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <MessageCircle className="w-4 h-4" /> {t("settings.support.quickTitle")}
            </div>
            <p className="text-sm text-emerald-900/80">
              {t("settings.support.quickDesc")}
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("support-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="w-full sm:w-auto bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
            >
              {t("settings.support.openCta")}
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border bg-muted/40 p-3 text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {t("settings.support.hint")}
          </div>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmitPlatformFeedback}
        className="bg-card border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-secondary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t("settings.feedback.title")}</p>
            <p className="text-xs text-muted-foreground">{t("settings.feedback.subtitle")}</p>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("settings.feedback.ratingLabel")}</div>
            <select
              value={platformRating}
              onChange={(e) => setPlatformRating(e.target.value)}
              className="w-full px-3 py-3 bg-muted border rounded-xl text-sm"
            >
              <option value="5">{t("settings.feedback.ratingOptions.5")}</option>
              <option value="4">{t("settings.feedback.ratingOptions.4")}</option>
              <option value="3">{t("settings.feedback.ratingOptions.3")}</option>
              <option value="2">{t("settings.feedback.ratingOptions.2")}</option>
              <option value="1">{t("settings.feedback.ratingOptions.1")}</option>
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t("settings.feedback.textLabel")}</div>
            <textarea
              value={platformFeedbackText}
              onChange={(e) => setPlatformFeedbackText(e.target.value)}
              placeholder={t("settings.feedback.placeholder")}
              maxLength={2000}
              className="w-full min-h-[110px] px-3 py-3 bg-muted border rounded-xl text-sm"
            />
            <div className="text-[11px] text-muted-foreground">{t("settings.feedback.maxChars")}</div>
          </div>
        </div>

        {platformSubmitError ? <p className="text-xs text-destructive">{platformSubmitError}</p> : null}

        <button
          type="submit"
          disabled={platformSubmitting}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {platformSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> {t("settings.feedback.submitting")}
            </span>
          ) : (
            t("settings.feedback.submitCta")
          )}
        </button>
      </motion.form>

      <div id="support-section" className="space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{t("settings.support.centerTitle")}</h2>
        </div>
        <div className="bg-card border rounded-2xl p-4 sm:p-5 shadow-sm">
          <Support />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={handleLogout}
          className="w-full bg-card border rounded-2xl p-4 flex items-center gap-3 text-sm font-medium text-foreground hover:bg-muted"
        >
          <LogOut className="w-4 h-4" /> {t("settings.actions.logout")}
        </button>

        <button className="w-full bg-card border border-destructive/20 rounded-2xl p-4 flex items-center gap-3 text-sm font-medium text-destructive hover:bg-destructive/5">
          <Trash2 className="w-4 h-4" /> {t("settings.actions.requestDeletion")}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
