/**
 * Authentication Context
 * Manages user authentication state across the app
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  authApi,
  businessApi,
  type User,
  type AuthResponse,
  type RegisterVerificationResponse,
} from '@/lib/api/index';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithFacebook: (accessToken: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
    referralCode?: string,
    offerId?: string
  ) => Promise<AuthResponse | RegisterVerificationResponse>;
  logout: () => void;
} 

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    const isAuth = authApi.isAuthenticated();
    
    if (isAuth && currentUser) {
      setUser(currentUser);
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    if (response.success && response.data) {
      businessApi.clearCache();
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    const response = await authApi.loginWithGoogle(idToken);
    if (response.success && response.data) {
      businessApi.clearCache();
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Google login failed');
    }
  };

  const loginWithFacebook = async (accessToken: string) => {
    const response = await authApi.loginWithFacebook(accessToken);
    if (response.success && response.data) {
      businessApi.clearCache();
      setUser(response.data.user);
    } else {
      throw new Error(response.message || 'Facebook login failed');
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    referralCode?: string,
    offerId?: string
  ) => {
    const response = await authApi.register({ name, email, phone, password, referralCode, offerId });
    if (response.success && response.data) {
      if ('accessToken' in response.data) {
        businessApi.clearCache();
        setUser(response.data.user);
      }
      return response.data;
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  const logout = () => {
    authApi.logout();
    businessApi.clearCache();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithGoogle,
      loginWithFacebook,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
