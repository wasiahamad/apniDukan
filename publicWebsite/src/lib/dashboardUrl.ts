export const getDashboardUrl = (): string => {
  const envUrl = (import.meta.env.VITE_DASHBOARD_URL as string | undefined)?.trim();
  if (envUrl) return envUrl;

  if (typeof window === "undefined") return "/dashboard";

  const { protocol, hostname, origin } = window.location;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  // Dev default: dashboard runs separately (example: 8080) while public website runs on 8081.
  if (isLocalhost) {
    return `${protocol}//${hostname}:8080/dashboard`;
  }

  // Prod default (server should route /dashboard to the dashboard app).
  return `${origin}/dashboard`;
};
