import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { authApi } from "@/lib/api/index";

export default function AdminLogin() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const refreshToken = params.get("refreshToken");

      if (!token) {
        setError(i18n.t('adminLogin.missingToken'));
        return;
      }

      localStorage.setItem("accessToken", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      try {
        const me = await authApi.me();
        if (!me.success || !me.data) {
          throw new Error(me.message || i18n.t('adminLogin.failedToLoadUser'));
        }

        // Force reload so AuthProvider re-initializes from localStorage
        window.location.replace("/dashboard");
      } catch (e) {
        const msg = e instanceof Error ? e.message : i18n.t('adminLogin.failedToLogin');
        setError(msg);
      }
    };

    void run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {error ? error : t('adminLogin.loggingIn')}
        </p>
      </div>
    </div>
  );
}
