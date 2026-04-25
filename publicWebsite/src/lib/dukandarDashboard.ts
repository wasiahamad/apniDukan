const isLocalhostUrl = (value: string) => {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    const u = new URL(withProtocol);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(raw);
  }
};

const resolveDashboardBaseUrl = () => {
  const envValue = String(import.meta.env.VITE_DUKANDAR_DASHBOARD_URL || '').trim();
  if (envValue && !(import.meta.env.PROD && isLocalhostUrl(envValue))) return envValue;
  if (import.meta.env.DEV) return 'http://localhost:8080';
  return 'https://seller.publicdukan.com';
};

export const DUKANDAR_DASHBOARD_BASE_URL = resolveDashboardBaseUrl();

const trimSlash = (v: string) => String(v || "").replace(/\/+$/, "");

export const getDukandarOnboardingUrl = () => `${trimSlash(DUKANDAR_DASHBOARD_BASE_URL)}/onboarding`;
