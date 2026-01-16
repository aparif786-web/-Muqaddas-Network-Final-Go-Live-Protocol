import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useSegments } from 'expo-router';
import api from '../services/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  processSessionId: (sessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && !inAuthGroup && segments[0] !== 'index') {
      router.replace('/(tabs)/home');
    }
  }, [user, segments, isLoading]);

  const checkAuth = async () => {
    try {
      const sessionToken = await AsyncStorage.getItem('session_token');
      
      if (sessionToken) {
        api.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`;
        
        const response = await api.get('/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.log('Auth check failed:', error);
      await AsyncStorage.removeItem('session_token');
      delete api.defaults.headers.common['Authorization'];
    } finally {
      setIsLoading(false);
    }
  };

  const processSessionId = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/session', { session_id: sessionId });
      
      if (response.data.success) {
        const { user: userData, session_token } = response.data;
        
        await AsyncStorage.setItem('session_token', session_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${session_token}`;
        
        setUser(userData);
        router.replace('/(tabs)/home');
      }
    } catch (error) {
      console.error('Session exchange failed:', error);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    router.push('/login');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.log('Logout API error:', error);
    }
    
    await AsyncStorage.removeItem('session_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, processSessionId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
