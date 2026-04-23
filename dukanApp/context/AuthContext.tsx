import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Storage } from "@/utils/storage";
import { getApiBase } from "@/utils/apiBase";
import { apiRequest, ApiError, tryParsePhone10 } from "@/utils/apiClient";

export type UserRole = "customer" | "business_owner";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  avatar?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: RegisterData) => Promise<{ verificationRequired: boolean; email?: string; otpExpiresInMinutes?: number }>;
  verifyEmailOtp: (email: string, otp: string) => Promise<AuthUser>;
  resendEmailOtp: (email: string) => Promise<{ otpExpiresInMinutes?: number }>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ACCESS_TOKEN_KEY = "apnidukan_access_token";
const REFRESH_TOKEN_KEY = "apnidukan_refresh_token";
const USER_KEY = "apnidukan_user";

const API_BASE = getApiBase();

type BackendUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: UserRole;
  profileImage?: string | null;
  avatar?: string | null;
};

type LoginResponse = {
  user: BackendUser;
  accessToken: string;
  refreshToken: string;
};

type VerificationRequiredResponse = {
  user: BackendUser;
  verificationRequired: true;
  otpExpiresInMinutes?: number;
};

function normalizeUser(raw: BackendUser): AuthUser {
  return {
    id: String(raw.id || raw._id || ""),
    name: String(raw.name || ""),
    email: String(raw.email || ""),
    phone: raw.phone ?? null,
    role: (raw.role as UserRole) || "customer",
    avatar: (raw.avatar ?? raw.profileImage) ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isLoading: true,
  });

  // Keep a ref-like value for the token getter to avoid stale closures
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [token, userStr] = await Promise.all([
        Storage.getItemAsync(ACCESS_TOKEN_KEY),
        Storage.getItemAsync(USER_KEY),
      ]);
      if (token && userStr) {
        const user = JSON.parse(userStr) as AuthUser;
        setAccessToken(token);
        setState({ user, accessToken: token, isLoading: false });
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    } catch {
      setState(s => ({ ...s, isLoading: false }));
    }
  }

  async function storeAuth(token: string, refreshToken: string, user: AuthUser) {
    await Promise.all([
      Storage.setItemAsync(ACCESS_TOKEN_KEY, token),
      Storage.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
      Storage.setItemAsync(USER_KEY, JSON.stringify(user)),
    ]);
    setAccessToken(token);
    setState({ user, accessToken: token, isLoading: false });
  }

  async function login(email: string, password: string): Promise<AuthUser> {
    try {
      const data = await apiRequest<LoginResponse>("/auth/login/customer", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const user = normalizeUser(data.user);
      await storeAuth(data.accessToken, data.refreshToken, user);
      return user;
    } catch (err: any) {
      // If this is not a customer account, fall back to the generic login endpoint.
      // IMPORTANT: do NOT fall back for EMAIL_NOT_VERIFIED (would bypass customer verification).
      if (err instanceof ApiError && err.status === 403) {
        const details: any = err.details;
        const code = details?.code;
        const msg = String(err.message || "");

        if (code === "EMAIL_NOT_VERIFIED") {
          throw err;
        }

        if (msg.toLowerCase().includes("only customer")) {
          const data = await apiRequest<LoginResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
          const user = normalizeUser(data.user);
          await storeAuth(data.accessToken, data.refreshToken, user);
          return user;
        }
      }
      throw err;
    }
  }

  async function register(data: RegisterData) {
    const phone10 = tryParsePhone10(data.phone);
    const payload = {
      name: data.name,
      email: data.email,
      phone: phone10,
      password: data.password,
      ...(data.role ? { role: data.role } : {}),
    };

    const path = data.role === "customer" ? "/auth/register/customer" : "/auth/register";
    const result = await apiRequest<LoginResponse | VerificationRequiredResponse>(path, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const anyResult: any = result as any;
    if (anyResult?.verificationRequired) {
      return {
        verificationRequired: true,
        email: String(anyResult?.user?.email || data.email),
        otpExpiresInMinutes: anyResult?.otpExpiresInMinutes,
      };
    }

    const loggedIn = anyResult as LoginResponse;
    const user = normalizeUser(loggedIn.user);
    await storeAuth(loggedIn.accessToken, loggedIn.refreshToken, user);
    return { verificationRequired: false };
  }

  async function verifyEmailOtp(email: string, otp: string): Promise<AuthUser> {
    const data = await apiRequest<LoginResponse>("/auth/verify-email-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });

    const user = normalizeUser(data.user);
    await storeAuth(data.accessToken, data.refreshToken, user);
    return user;
  }

  async function resendEmailOtp(email: string) {
    const data = await apiRequest<{ otpExpiresInMinutes?: number }>("/auth/resend-email-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return data;
  }

  async function logout() {
    await Promise.all([
      Storage.deleteItemAsync(ACCESS_TOKEN_KEY),
      Storage.deleteItemAsync(REFRESH_TOKEN_KEY),
      Storage.deleteItemAsync(USER_KEY),
    ]);
    setAccessToken(null);
    setState({ user: null, accessToken: null, isLoading: false });
  }

  function updateUser(user: AuthUser) {
    setState(s => ({ ...s, user }));
    Storage.setItemAsync(USER_KEY, JSON.stringify(user));
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, verifyEmailOtp, resendEmailOtp, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
