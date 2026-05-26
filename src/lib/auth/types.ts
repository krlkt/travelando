import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
}

export function mapSupabaseUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    null;
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    avatarUrl,
    isAnonymous: user.is_anonymous === true,
  };
}
