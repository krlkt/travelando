import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './client';

let inFlight: Promise<void> | null = null;

/**
 * Make sure the browser has a Supabase session. Falls back to anonymous
 * sign-in so visitors get an `auth.uid()` without a login UI. Idempotent —
 * concurrent calls share one in-flight request.
 *
 * Requires "Anonymous sign-ins" enabled in Supabase Auth → Providers.
 */
export function ensureAnonSession(
  client: SupabaseClient = createClient(),
): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const { data, error } = await client.auth.getUser();
    if (!error && data.user) return;

    const { error: signInError } = await client.auth.signInAnonymously();
    if (signInError) {
      throw new Error(
        `anonymous sign-in failed: ${signInError.message}. ` +
          'Enable "Anonymous sign-ins" in Supabase Auth → Providers.',
      );
    }
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
