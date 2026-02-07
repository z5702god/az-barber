import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { removePushToken } from '../services/notifications';
import { User, UserRole } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
  isDevMode: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If user profile doesn't exist, create a new one
        if (error.code === 'PGRST116') {
          const newUser = await createUserProfile(userId);
          setUser(newUser);
        }
      } else {
        let userData = data as User;

        // If barber, get barber_id from barbers table
        if (userData.role === 'barber') {
          const { data: barberData } = await supabase
            .from('barbers')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (barberData) {
            userData = { ...userData, barber_id: barberData.id };
          }
        }

        setUser(userData);
      }
    } catch (_error) {
      // Error fetching user profile
    } finally {
      setLoading(false);
    }
  };

  const createUserProfile = async (userId: string): Promise<User | null> => {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser.user) return null;

    const newUser: Partial<User> = {
      id: userId,
      name: authUser.user.user_metadata?.full_name?.trim()
        || authUser.user.user_metadata?.name?.trim()
        || authUser.user.email?.split('@')[0]
        || '新用戶',
      email: authUser.user.email,
      role: 'customer' as UserRole,
      avatar_url: authUser.user.user_metadata?.avatar_url,
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      return null;
    }

    return data as User;
  };

  const signOut = async () => {
    // Clean up push token before signing out
    if (user?.id) {
      try {
        await removePushToken(user.id);
      } catch (_e) {
        // Silently ignore push token removal errors
      }
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (session?.user?.id) {
      await fetchUserProfile(session.user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, refreshUser, isDevMode: false }}>
      {children}
    </AuthContext.Provider>
  );
};
