import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout, fetchCurrentUser } from '../services/api';

const AuthContext = createContext(null);

const ROLE_HIERARCHY = {
  viewer: 1,
  moderator: 2,
  admin: 3
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cmh_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isForcePasswordModalOpen, setIsForcePasswordModalOpen] = useState(false);

  // Check current session on mount
  const checkSession = useCallback(async () => {
    try {
      if (localStorage.getItem('cmh_token')) {
        const currentUser = await fetchCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          if (currentUser.mustChangePassword) {
            setIsForcePasswordModalOpen(true);
          } else {
            setIsForcePasswordModalOpen(false);
          }
        } else {
          setToken(null);
        }
      }
    } catch {
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const data = await apiLogin(username, password);
      setUser(data.user);
      setToken(data.token);
      setIsLoginModalOpen(false);

      if (data.requirePasswordChange || data.user.mustChangePassword) {
        setIsForcePasswordModalOpen(true);
        return { requirePasswordChange: true, user: data.user };
      }

      setIsForcePasswordModalOpen(false);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const completePasswordChange = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser, mustChangePassword: false }));
    setIsForcePasswordModalOpen(false);
  };

  const updateUserProfile = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setToken(null);
    setIsForcePasswordModalOpen(false);
    setIsLoginModalOpen(false);
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasMinRole = (minRole) => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const reqLevel = ROLE_HIERARCHY[minRole] || 1;
    return userLevel >= reqLevel;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasRole,
        hasMinRole,
        isLoginModalOpen,
        setIsLoginModalOpen,
        isForcePasswordModalOpen,
        setIsForcePasswordModalOpen,
        completePasswordChange,
        updateUserProfile,
        refreshSession: checkSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return ctx;
}
