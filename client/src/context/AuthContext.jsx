import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('netgram_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('netgram_token') || null;
  });

  const [serverUrl, setServerUrl] = useState(() => {
    return localStorage.getItem('netgram_server_url') || window.location.origin;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('netgram_token', token);
    } else {
      localStorage.removeItem('netgram_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('netgram_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('netgram_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('netgram_server_url', serverUrl);
  }, [serverUrl]);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('netgram_token');
    localStorage.removeItem('netgram_user');
  };

  const updateUser = (updatedFields) => {
    setUser((prev) => ({ ...prev, ...updatedFields }));
  };

  return (
    <AuthContext.Provider value={{ user, token, serverUrl, setServerUrl, login, logout, updateUser, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
