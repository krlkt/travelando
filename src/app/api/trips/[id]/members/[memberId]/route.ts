import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { tripMemberPatchSchema } from '@/lib/trips/schemas';
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

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const parsed = tripMemberPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'validation_failed',
        details: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const repo = createSupabaseRepository(supabase);
    const member = await repo.updateMember(id, memberId, parsed.data);
    revalidatePath(`/trips/${id}`);
    return NextResponse.json({ success: true, data: member });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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
    await repo.removeMember(id, memberId);
    revalidatePath(`/trips/${id}`);
    revalidatePath('/trips');
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
