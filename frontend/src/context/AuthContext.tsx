import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

export interface User {
  id: number;
  uuid: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TEAM_LEADER' | 'PARTICIPANT' | 'JUDGE';
  status: string;
  teamId?: number | null;
  participantId?: number | null;
  judgeId?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isTeamLeader: boolean;
  isParticipant: boolean;
  isJudge: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('esperanza_user');
      if (!saved || saved === 'undefined' || saved === 'null') {
        return null;
      }
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('esperanza_user');
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const saved = localStorage.getItem('esperanza_access_token');
    if (!saved || saved === 'undefined' || saved === 'null') {
      return null;
    }
    return saved;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const currentToken = localStorage.getItem('esperanza_access_token');
    if (!currentToken || currentToken === 'undefined' || currentToken === 'null') {
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.get<any>('/auth/me');
      const userData: User = res.data?.user || res.data;
      if (userData && userData.id) {
        setUser(userData);
        localStorage.setItem('esperanza_user', JSON.stringify(userData));
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<any>('/auth/login', {
      email,
      password,
    });

    const accessToken = res.data?.accessToken;
    const loggedInUser: User = res.data?.user || res.data;

    if (!accessToken || !loggedInUser) {
      throw new Error('Invalid login response from server');
    }

    setToken(accessToken);
    setUser(loggedInUser);
    localStorage.setItem('esperanza_access_token', accessToken);
    localStorage.setItem('esperanza_user', JSON.stringify(loggedInUser));

    return loggedInUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('esperanza_access_token');
    localStorage.removeItem('esperanza_user');
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    refreshUser,
    isAdmin: user?.role === 'ADMIN',
    isTeamLeader: user?.role === 'TEAM_LEADER',
    isParticipant: user?.role === 'PARTICIPANT',
    isJudge: user?.role === 'JUDGE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
