'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { mapSupabaseUser, type AuthUser } from './types';

interface AuthMethodResult {
  needsEmailConfirmation: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signInWithPassword: (input: {
    email: string;
    password: string;
  }) => Promise<void>;
  signUpWithPassword: (input: {
    email: string;
    password: string;
  }) => Promise<AuthMethodResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function buildCallbackUrl(next?: string): string {
  if (typeof window === 'undefined') return '/auth/callback';
  const origin = window.location.origin;
  const safeNext = next && next.startsWith('/') ? next : '/trips';
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [client] = useState<SupabaseClient>(() => createClient());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let active = true;

    client.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ? mapSupabaseUser(data.user) : null);
      setLoading(false);
    });

    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ? mapSupabaseUser(session.user) : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [client]);

  const signInWithGoogle = useCallback(
    async (redirectTo?: string) => {
      const callback = buildCallbackUrl(redirectTo);

      // Always use signInWithOAuth — even when an anonymous session exists.
      // linkIdentity would fail with "identity_already_exists" if the
      // Google account is already tied to a permanent user (the common
      // case for returning users). Supabase's OAuth flow will replace the
      // anonymous session automatically.
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback },
      });
      if (error) throw error;
    },
    [client],
  );

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      const { error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.refresh();
    },
    [client, router],
  );

  const signUpWithPassword = useCallback(
    async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }): Promise<AuthMethodResult> => {
      const currentUser = (await client.auth.getUser()).data.user;

      if (currentUser?.is_anonymous) {
        const { error } = await client.auth.updateUser({ email, password });
        if (error) throw error;
        return { needsEmailConfirmation: true };
      }

      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: buildCallbackUrl('/trips') },
      });
      if (error) throw error;

      const needsEmailConfirmation = !data.session;
      if (!needsEmailConfirmation) router.refresh();
      return { needsEmailConfirmation };
    },
    [client, router],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch('/auth/signout', { method: 'POST' });
    } finally {
      await client.auth.signOut();
      router.refresh();
    }
  }, [client, router]);

  const resetPassword = useCallback(
    async (email: string) => {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/update-password`
          : '/update-password';
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
    },
    [client],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    [client],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      user,
      loading,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      resetPassword,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
