import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ session: null, user: null, profile: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only use onAuthStateChange — it fires INITIAL_SESSION on mount,
    // so we do NOT also need getSession(). This eliminates the race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Set a preliminary profile from metadata so redirects can happen immediately
        const metadata = currentUser.user_metadata;
        setProfile((prev: any) => ({
          id: currentUser.id,
          role: metadata?.role || 'counter',
          name: metadata?.name || '',
          ...(prev || {}) // Preserve existing data if any
        }));
        
        // Always stop loading once we have a user and basic metadata
        setLoading(false);

        // Fetch the real profile in the background to ensure consistency
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Safety timeout — if nothing happens within 5 seconds, stop loading
    const timeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn('Auth loading timed out, forcing load complete.');
        }
        return false;
      });
    }, 5000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
