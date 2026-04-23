export type AppLanguage = 'en' | 'hi';

export const LANG_STORAGE_KEY = 'dukaansetu:lang';

export const normalizeLanguage = (value: unknown): AppLanguage | null => {
  if (value === 'en' || value === 'hi') return value;
  return null;
};

export const getPreferredLanguage = (): AppLanguage => {
  if (typeof window === 'undefined') return 'en';

  try {
    const stored = normalizeLanguage(window.localStorage.getItem(LANG_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // ignore storage errors
  }

  const navLang = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  if (navLang.toLowerCase().startsWith('hi')) return 'hi';
  return 'en';
};

export const setPreferredLanguage = (lang: AppLanguage) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    window.dispatchEvent(new Event('dukaansetu:lang'));
  } catch {
    // ignore
  }
};

export const getAcceptLanguageHeader = (lang: AppLanguage): string => {
  // Prefer the selected language, keep the other as a fallback.
  return lang === 'hi' ? 'hi-IN,hi;q=0.9,en;q=0.8' : 'en-IN,en;q=0.9,hi;q=0.8';
};

export const withLangQueryParam = (endpoint: string, lang: AppLanguage): string => {
  if (!endpoint) return endpoint;

  // Avoid duplicating.
  if (/[?&]lang=/.test(endpoint)) return endpoint;

  const join = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${join}lang=${encodeURIComponent(lang)}`;
};
