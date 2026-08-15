import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { DEMO_TRIP_PROTECTED_ERROR, isDemoTrip } from '@/lib/trips/demoTrips';

interface RouteContext {
  params: Promise<{ id: string; memberId: string }>;
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null } as const;
  return { supabase, user: data.user } as const;
}

// Hand the trip over to another member. Authorization (caller must be the
// current owner) is enforced in-DB by the transfer_trip_ownership RPC.
export async function POST(_request: NextRequest, context: RouteContext) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const { id, memberId } = await context.params;

  if (isDemoTrip(id)) {
    return NextResponse.json(
      { success: false, error: DEMO_TRIP_PROTECTED_ERROR },
      { status: 403 },
    );
  }

  try {
    const repo = createSupabaseRepository(supabase);
    const ownerId = await repo.transferOwnership(id, memberId);
    revalidatePath(`/trips/${id}`);
    revalidatePath('/trips');
    return NextResponse.json({ success: true, data: { ownerId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    const status = message === 'not_authorized' ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
