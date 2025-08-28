/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, AuthState } from "@/types";

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for existing auth on mount
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user: User = JSON.parse(storedUser);
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to load user", error);
        localStorage.removeItem("user");
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, _password: string): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      // For now, create a mock user
      const user: User = {
        id: "1",
        email,
        name: email.split("@")[0],
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(user));
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Login failed", error);
      throw new Error("Login failed");
    }
  };

  const register = async (email: string, _password: string, name: string): Promise<void> => {
    try {
      // TODO: Replace with actual API call
      // For now, create a mock user
      const user: User = {
        id: Math.random().toString(36).substring(2, 11),
        email,
        name,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem("user", JSON.stringify(user));
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error("Registration failed", error);
      throw new Error("Registration failed");
    }
  };

  const logout = (): void => {
    localStorage.removeItem("user");
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
