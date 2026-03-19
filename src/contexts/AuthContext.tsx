import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string, role?: 'user' | 'admin') => Promise<any>;
  signOut: () => Promise<any>;
  refreshUser: () => Promise<void>;
  forceRefreshUserData: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Load existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsAdmin(session.user.app_metadata?.role === 'admin');
      }
      setLoading(false);
    });

    // Keep session in sync across tabs and token refresh events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setIsAdmin(session.user.app_metadata?.role === 'admin');
      } else {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        if (error.message.includes('Auth session missing')) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
        return null;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user);
        const role = session.user.app_metadata?.role || 'user';
        setIsAdmin(role === 'admin');
        return session.access_token;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        return null;
      }
      
      const expiresAt = session.expires_at * 1000;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      const isExpired = expiresAt <= now;
      const isExpiringSoon = (expiresAt - now) < fiveMinutes;
      
      if (isExpired || isExpiringSoon) {
        try {
          const refreshedToken = await refreshToken();
          if (refreshedToken) {
            return refreshedToken;
          }
          
          if (!isExpired) {
            return session.access_token;
          }
        } catch (refreshError) {
          if (!isExpired) {
            return session.access_token;
          }
          return null;
        }
      }
      
      return session.access_token;
    } catch (error) {
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Don't log expected errors as errors
        if (error.message?.includes('Invalid login credentials')) {
          console.log('[Auth] Login attempt with invalid credentials - user may need to sign up first');
        } else {
          console.error('[Auth] Sign in error:', error);
        }
        throw error;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        const role = data.session.user.app_metadata?.role || 'user';
        setIsAdmin(role === 'admin');
        console.log('[Auth] User signed in successfully');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'user' | 'admin' = 'user') => {
    try {
      const { apiService } = await import('../utils/api');
      const result = await apiService.signup(email, password, name, role);
      
      if (result.error) {
        // Don't log expected errors as errors
        if (result.error.includes('User already registered') || result.error.includes('already exists')) {
          console.log('[Auth] Sign up attempt with existing email - user should sign in instead');
        } else {
          console.error('[Auth] Sign up error:', result.error);
        }
        throw new Error(result.error);
      }
      
      console.log('[Auth] User signed up successfully');
      return result;
    } catch (error: any) {
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  const refreshUser = async () => {
    try {
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
      
      if (getError) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return;
      }
      
      if (!currentSession) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return;
      }
      
      const now = Date.now();
      const expiresAt = currentSession.expires_at * 1000;
      const isExpiringSoon = (expiresAt - now) < (5 * 60 * 1000);
      const isExpired = expiresAt <= now;
      
      if (isExpired || isExpiringSoon) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          if (refreshError.message.includes('Auth session missing')) {
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            return;
          }
          
          setSession(currentSession);
          setUser(currentSession.user);
          const role = currentSession.user.app_metadata?.role || 'user';
          setIsAdmin(role === 'admin');
          return;
        }
        
        if (refreshedSession) {
          setSession(refreshedSession);
          setUser(refreshedSession.user);
          const role = refreshedSession.user.app_metadata?.role || 'user';
          setIsAdmin(role === 'admin');
          return;
        }
      }
      
      setSession(currentSession);
      setUser(currentSession.user);
      const role = currentSession.user.app_metadata?.role || 'user';
      setIsAdmin(role === 'admin');
      
    } catch (error) {
      setSession(null);
      setUser(null);
      setIsAdmin(false);
    }
  };

  const forceRefreshUserData = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        return;
      }
      
      const now = Date.now();
      const expiresAt = currentSession.expires_at * 1000;
      const isExpired = expiresAt <= now;
      
      if (isExpired) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          
          try {
            const supabaseAuthKeys = Object.keys(localStorage).filter(key => 
              key.startsWith('sb-') && key.includes('auth-token')
            );
            supabaseAuthKeys.forEach(key => localStorage.removeItem(key));
          } catch (e) {
            // Silent fail
          }
          
          return;
        }
        
        if (refreshedSession) {
          setSession(refreshedSession);
          setUser(refreshedSession.user);
          const role = refreshedSession.user.app_metadata?.role || 'user';
          setIsAdmin(role === 'admin');
          return;
        }
      } else {
        const { data: { user: freshUser }, error: getUserError } = await supabase.auth.getUser();
        
        if (getUserError) {
          return;
        }
        
        if (freshUser) {
          setUser(freshUser);
          const role = freshUser.app_metadata?.role || 'user';
          setIsAdmin(role === 'admin');
          return;
        }
      }
      
    } catch (error) {
      try {
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        if (fallbackSession) {
          setSession(fallbackSession);
          setUser(fallbackSession.user);
          const role = fallbackSession.user.app_metadata?.role || 'user';
          setIsAdmin(role === 'admin');
        } else {
          setSession(null);
          setUser(null);
          setIsAdmin(false);
        }
      } catch (fallbackError) {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
      }
    }
  };

  const value = {
    user,
    session,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    refreshUser,
    forceRefreshUserData,
    getAccessToken,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};