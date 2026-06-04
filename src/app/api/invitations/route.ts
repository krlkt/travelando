import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';

// Pending invitations addressed to the current user.
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  try {
    const repo = createSupabaseRepository(supabase);
    const invitations = await repo.listMyInvitations();
    return NextResponse.json({ success: true, data: invitations });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
