import { API_BASE_URL } from "@/lib/publicShopsApi";
import type { AuthUser, LoginPayload, SignupPayload, SocialProvider } from "@/types/auth";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<{ verificationRequired: boolean; email?: string; otpExpiresInMinutes?: number }>;
  verifyEmailOtp: (payload: { email: string; otp: string }) => Promise<void>;
  resendEmailOtp: (payload: { email: string }) => Promise<{ otpExpiresInMinutes?: number }>;
  socialLogin: (provider: SocialProvider) => Promise<void>;
  updateUser: (fields: Partial<AuthUser>) => void;
  logout: () => void;
};

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const AUTH_EVENT = "publicdukan-auth-changed";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(input: Partial<AuthUser> | null | undefined): AuthUser | null {
  if (!input?.email) return null;
  const avatarUrl = input.avatarUrl || input.profileImage || "";
  return {
    ...input,
    avatarUrl,
    profileImage: avatarUrl,
  } as AuthUser;
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    return normalizeUser(parsed);
  } catch {
    return null;
  }
}

function createMockAuthData(payload: LoginPayload | SignupPayload) {
  const nameFromEmail = payload.email.split("@")[0]?.replace(/[._-]/g, " ") || "Customer";
  const name = "name" in payload && payload.name.trim() ? payload.name.trim() : nameFromEmail;
  const now = new Date().toISOString();

  const user: AuthUser = {
    _id: `mock-${Date.now()}`,
    name,
    email: payload.email.trim().toLowerCase(),
    phone: "phone" in payload ? payload.phone?.trim() : undefined,
    role: "customer",
    createdAt: now,
    updatedAt: now,
  };

  return {
    accessToken: `mock-jwt-${Date.now()}`,
    refreshToken: `mock-refresh-${Date.now()}`,
    user,
  };
}

function createMockSocialAuthData(provider: SocialProvider) {
  const now = new Date().toISOString();
  const label = provider === "google" ? "Google" : "Facebook";

  const user: AuthUser = {
    _id: `mock-${provider}-${Date.now()}`,
    name: `${label} User`,
    email: `${provider}.user${Date.now()}@publicdukan.app`,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(label + " User")}&background=1ebe76&color=fff`,
    role: "customer",
    createdAt: now,
    updatedAt: now,
  };

  return {
    accessToken: `mock-${provider}-jwt-${Date.now()}`,
    refreshToken: `mock-${provider}-refresh-${Date.now()}`,
    user,
  };
}

async function loadGoogleScript() {
  if ((window as any).google?.accounts?.oauth2?.initTokenClient) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-google-gsi="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google SDK failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGsi = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google SDK failed to load"));
    document.head.appendChild(script);
  });
}

async function loadFacebookScript() {
  if ((window as any).FB?.login) return;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-facebook-sdk="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Facebook SDK failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.dataset.facebookSdk = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Facebook SDK failed to load"));
    document.head.appendChild(script);
  });
}

async function requestSocialAuth(provider: SocialProvider) {
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  const facebookAppId = (import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined)?.trim();

  if (provider === "google") {
    if (!googleClientId) {
      throw new Error("Google login is not configured (VITE_GOOGLE_CLIENT_ID missing)");
    }

    await loadGoogleScript();
    const google = (window as any).google;
    // Prefer Sign-In with Google ID token (no redirect_uri issues), fallback to OAuth access token.
    const tryIdToken = async (): Promise<{ idToken: string } | null> => {
      if (!google?.accounts?.id?.initialize || !google?.accounts?.id?.prompt) return null;

      try {
        const idToken = await new Promise<string>((resolve, reject) => {
          let settled = false;

          google.accounts.id.initialize({
            client_id: googleClientId,
            auto_select: false,
            cancel_on_tap_outside: false,
            callback: (response: any) => {
              settled = true;
              const credential = response?.credential;
              if (!credential) {
                reject(new Error("Google credential not received"));
                return;
              }
              resolve(String(credential));
            },
          });

          google.accounts.id.prompt((notification: any) => {
            if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
              if (!settled) {
                settled = true;
                reject(new Error("Google prompt not available"));
              }
            }
          });

          window.setTimeout(() => {
            if (!settled) reject(new Error("Google login timed out or cancelled"));
          }, 20000);
        });

        return { idToken };
      } catch {
        return null;
      }
    };

    const idTokenPayload = await tryIdToken();
    let response: Response;

    if (idTokenPayload) {
      response = await fetch(`${API_BASE_URL}/auth/social/google/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(idTokenPayload),
      });
    } else {
      if (!google?.accounts?.oauth2?.initTokenClient) {
        throw new Error("Google SDK unavailable");
      }

      const accessToken = await new Promise<string>((resolve, reject) => {
        let settled = false;
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: (tokenResponse: any) => {
            settled = true;
            if (tokenResponse?.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error || "Google auth failed"));
              return;
            }
            if (!tokenResponse?.access_token) {
              reject(new Error("Google access token not received"));
              return;
            }
            resolve(tokenResponse.access_token);
          },
        });

        tokenClient.requestAccessToken({ prompt: "consent" });
        window.setTimeout(() => {
          if (!settled) reject(new Error("Google login timed out or cancelled"));
        }, 20000);
      });

      response = await fetch(`${API_BASE_URL}/auth/social/google/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
    }

    const json = await response.json();
    const authData = json?.data;

    if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
      throw new Error(json?.message || "Google authentication failed");
    }

    if (authData.user.role !== "customer") {
      throw new Error("Only customer login is allowed in PublicDukan website");
    }

    return authData as { accessToken: string; refreshToken?: string; user: AuthUser };
  }

  if (!facebookAppId) {
    throw new Error("Facebook login is not configured (VITE_FACEBOOK_APP_ID missing)");
  }

  await loadFacebookScript();
  const FB = (window as any).FB;
  if (!FB?.init || !FB?.login) {
    throw new Error("Facebook SDK unavailable");
  }

  FB.init({
    appId: facebookAppId,
    cookie: true,
    xfbml: false,
    version: "v19.0",
  });

  const accessToken = await new Promise<string>((resolve, reject) => {
    FB.login(
      (response: any) => {
        const token = response?.authResponse?.accessToken;
        if (!token) {
          reject(new Error("Facebook login cancelled or token not received"));
          return;
        }
        resolve(token);
      },
      { scope: "email,public_profile" },
    );
  });

  const response = await fetch(`${API_BASE_URL}/auth/social/facebook/customer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });

  const json = await response.json();
  const authData = json?.data;

  if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
    throw new Error(json?.message || "Facebook authentication failed");
  }

  if (authData.user.role !== "customer") {
    throw new Error("Only customer login is allowed in PublicDukan website");
  }

  return authData as { accessToken: string; refreshToken?: string; user: AuthUser };
}

function persistAuthSession(authData: { accessToken: string; refreshToken?: string; user: AuthUser }) {
  const normalizedUser = normalizeUser(authData.user);
  if (!normalizedUser) return;

  localStorage.setItem(ACCESS_TOKEN_KEY, authData.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, authData.refreshToken || "");
  localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

async function requestAuth(endpoint: string, payload: object) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  const authData = json?.data;

  // Registration may require OTP verification (no tokens yet)
  if (json?.success && authData?.verificationRequired) {
    return { verificationRequired: true, email: authData?.user?.email, otpExpiresInMinutes: authData?.otpExpiresInMinutes } as any;
  }

  if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
    const err: any = new Error(json?.message || "Authentication failed");
    err.code = json?.code;
    throw err;
  }

  if (authData.user.role !== "customer") {
    throw new Error("Only customer login is allowed in PublicDukan website");
  }

  return authData as { accessToken: string; refreshToken?: string; user: AuthUser };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [isInitializing] = useState(false);

  const syncFromStorage = useCallback(() => {
    setUser(readStoredUser());
    setToken(localStorage.getItem(ACCESS_TOKEN_KEY));
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const useMockAuth = (import.meta.env.VITE_USE_MOCK_AUTH as string | undefined) === "true";

    let authData: { accessToken: string; refreshToken?: string; user: AuthUser };

    if (useMockAuth) {
      authData = createMockAuthData(payload);
    } else {
      authData = await requestAuth("/auth/login/customer", payload);
    }

    persistAuthSession(authData);
    syncFromStorage();
  }, [syncFromStorage]);

  const signup = useCallback(async (payload: SignupPayload) => {
    const useMockAuth = (import.meta.env.VITE_USE_MOCK_AUTH as string | undefined) === "true";

    let authData: any;

    if (useMockAuth) {
      authData = createMockAuthData(payload);
    } else {
      authData = await requestAuth("/auth/register/customer", {
        ...payload,
        role: "customer",
      });
    }

    if (authData?.verificationRequired) {
      return { verificationRequired: true, email: authData?.email, otpExpiresInMinutes: authData?.otpExpiresInMinutes };
    }

    persistAuthSession(authData);
    syncFromStorage();
    return { verificationRequired: false };
  }, [syncFromStorage]);

  const verifyEmailOtp = useCallback(async ({ email, otp }: { email: string; otp: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
    });
    const json = await response.json();
    const authData = json?.data;

    if (!response.ok || !json?.success || !authData?.accessToken || !authData?.user) {
      throw new Error(json?.message || 'OTP verification failed');
    }

    if (authData.user.role !== 'customer') {
      throw new Error('Only customer login is allowed in PublicDukan website');
    }

    persistAuthSession(authData);
    syncFromStorage();
  }, [syncFromStorage]);

  const resendEmailOtp = useCallback(async ({ email }: { email: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-email-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const json = await response.json();
    if (!response.ok || !json?.success) {
      throw new Error(json?.message || 'Failed to resend OTP');
    }
    return { otpExpiresInMinutes: json?.data?.otpExpiresInMinutes } as { otpExpiresInMinutes?: number };
  }, []);

  const socialLogin = useCallback(async (provider: SocialProvider) => {
    const useMockAuth = (import.meta.env.VITE_USE_MOCK_AUTH as string | undefined) === "true";

    let authData: { accessToken: string; refreshToken?: string; user: AuthUser };

    if (useMockAuth) {
      authData = createMockSocialAuthData(provider);
    } else {
      authData = await requestSocialAuth(provider);
    }

    persistAuthSession(authData);
    syncFromStorage();
  }, [syncFromStorage]);

  const updateUser = useCallback((fields: Partial<AuthUser>) => {
    const existing = readStoredUser();
    if (!existing) return;

    const nextAvatar = fields.avatarUrl ?? fields.profileImage;

    const nextUser: AuthUser = {
      ...existing,
      ...fields,
      ...(typeof nextAvatar === "string" ? { avatarUrl: nextAvatar, profileImage: nextAvatar } : {}),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    window.dispatchEvent(new Event(AUTH_EVENT));
    syncFromStorage();
  }, [syncFromStorage]);

  const logout = useCallback(() => {
    clearAuthSession();
    syncFromStorage();
  }, [syncFromStorage]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isInitializing,
      login,
      signup,
      verifyEmailOtp,
      resendEmailOtp,
      socialLogin,
      updateUser,
      logout,
    }),
    [isInitializing, login, logout, token, user, signup, verifyEmailOtp, resendEmailOtp, socialLogin, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
