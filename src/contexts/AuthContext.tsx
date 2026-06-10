import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; data: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cek session awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen perubahan auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (!error && data) {
        setProfile(data);
      } else {
        console.warn('Profile not found, creating...', error);
        // Auto-create profile jika belum ada
        const currentUser = supabase.auth.getUser().then(r => r.data.user);
        const u = await currentUser;
        if (u) {
          await supabase.from('user_profiles').insert({
            id: u.id,
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
            email: u.email || ''
          });
          setProfile({
            id: u.id,
            full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
            email: u.email || ''
          });
        }
      }
    } catch (e) {
      console.error('Fetch profile error:', e);
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    
    // ✅ PENTING: Sign out jika user otomatis login setelah signup
    if (result.data.user && result.data.session) {
      console.log('User auto-logged in after signup, signing out...');
      await supabase.auth.signOut();
    }
    
    console.log('Sign up result:', result);
    return result;
  } catch (e) {
    console.error('Sign up error:', e);
    return { data: null, error: e };
  }
};

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const result = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      console.log('Sign in result:', result);
      return result;
    } catch (e) {
      console.error('Sign in error:', e);
      return { data: null, error: e };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      profile, 
      loading, 
      signUp, 
      signIn, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};