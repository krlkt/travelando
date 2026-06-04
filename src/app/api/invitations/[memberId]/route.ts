import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';

interface RouteContext {
  params: Promise<{ memberId: string }>;
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null } as const;
  return { supabase, user: data.user } as const;
}

function errorStatus(message: string): number {
  return message === 'invitation_not_found' ? 404 : 500;
}

// Accept an invitation.
export async function POST(_request: NextRequest, context: RouteContext) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const { memberId } = await context.params;

  try {
    const repo = createSupabaseRepository(supabase);
    const tripId = await repo.acceptInvitation(memberId);
    revalidatePath('/trips');
    revalidatePath(`/trips/${tripId}`);
    return NextResponse.json({ success: true, data: { tripId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: errorStatus(message) },
    );
  }
}

// Decline an invitation (deletes the pending row).
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const { memberId } = await context.params;

  try {
    const repo = createSupabaseRepository(supabase);
    await repo.declineInvitation(memberId);
    revalidatePath('/trips');
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: errorStatus(message) },
    );
  }
}
