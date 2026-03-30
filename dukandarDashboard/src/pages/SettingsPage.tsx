import { useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Trash2, LockKeyhole, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api/index";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setIsChanging(true);
    try {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      if (!response.success) throw new Error(response.message || "Failed to change password");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    } catch (err: any) {
      const message = err.message || "Failed to change password";
      setError(message);
      toast({ variant: "destructive", title: "Password change failed", description: message });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Settings</h1>

      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleChangePassword}
        className="bg-card border rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <LockKeyhole className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Change Password</span>
        </div>

        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password"
          className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2.5 bg-muted border rounded-lg text-sm"
        />

        {error ? <p className="text-xs text-destructive">{error}</p> : null}

        <button
          type="submit"
          disabled={isChanging || !currentPassword || !newPassword || !confirmPassword}
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
        >
          {isChanging ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Updating...
            </span>
          ) : (
            "Update Password"
          )}
        </button>
      </motion.form>

      <button
        onClick={handleLogout}
        className="w-full bg-card border rounded-xl p-4 flex items-center gap-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        <LogOut className="w-4 h-4" /> Logout
      </button>

      <button className="w-full bg-card border border-destructive/20 rounded-xl p-4 flex items-center gap-2 text-sm font-medium text-destructive hover:bg-destructive/5">
        <Trash2 className="w-4 h-4" /> Request Account Deletion
      </button>
    </div>
  );
};

export default SettingsPage;
