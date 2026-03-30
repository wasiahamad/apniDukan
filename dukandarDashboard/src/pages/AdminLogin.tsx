import { useEffect, useState } from "react";

import { authApi } from "@/lib/api/index";

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const refreshToken = params.get("refreshToken");

      if (!token) {
        setError("Missing token");
        return;
      }

      localStorage.setItem("accessToken", token);
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

      try {
        const me = await authApi.me();
        if (!me.success || !me.data) {
          throw new Error(me.message || "Failed to load user");
        }

        // Force reload so AuthProvider re-initializes from localStorage
        window.location.replace("/dashboard");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to login";
        setError(msg);
      }
    };

    void run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {error ? error : "Logging you in…"}
        </p>
      </div>
    </div>
  );
}
