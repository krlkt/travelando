import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseUser, type AuthUser } from './types';

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return mapSupabaseUser(data.user);
}

export async function requireRealUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user || user.isAnonymous) {
    throw new Error('unauthorized');
  }
  return user;
}
