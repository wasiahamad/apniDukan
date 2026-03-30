export const DUKANDAR_DASHBOARD_BASE_URL =
  import.meta.env.VITE_DUKANDAR_DASHBOARD_URL || "http://localhost:8080";

const trimSlash = (v: string) => String(v || "").replace(/\/+$/, "");

export const getDukandarOnboardingUrl = () => `${trimSlash(DUKANDAR_DASHBOARD_BASE_URL)}/onboarding`;
