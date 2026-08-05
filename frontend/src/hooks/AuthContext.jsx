import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const SUPER_ADMIN_EMAIL = 'zerox9861@gmail.com';
const API_BASE_URL = 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const isSuperAdmin = user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setIsLoadingAuth(false);
    };

    initAuth();
  }, []);

  const loginUser = (userData, token, refreshToken) => {
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async (shouldRedirect = true) => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (e) {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.assign('/');
  };

  const navigateToLogin = () => window.location.assign('/login');

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isSuperAdmin,
      SUPER_ADMIN_EMAIL,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError: null,
      loginUser,
      logout,
      navigateToLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
