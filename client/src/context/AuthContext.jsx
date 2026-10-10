import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('guess_it_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore authenticated session on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const data = await authApi.getMe();
        if (data.success && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        // Not authenticated or token expired
        localStorage.removeItem('guess_it_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await authApi.login({ email, password });
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('guess_it_token', data.token);
        return { success: true, user: data.user };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const register = async (formData) => {
    setError(null);
    try {
      const data = await authApi.register(formData);
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('guess_it_token', data.token);
        return { success: true, user: data.user };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout error:', err.message);
    } finally {
      localStorage.removeItem('guess_it_token');
      setUser(null);
      setToken(null);
    }
  };

  const updateUsername = async (newUsername) => {
    try {
      const data = await userApi.updateUsername(newUsername);
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true, user: data.user };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    updateUsername,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
