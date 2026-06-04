import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { tripPatchSchema } from '@/lib/trips/schemas';
import { DEMO_TRIP_PROTECTED_ERROR, isDemoTrip } from '@/lib/trips/demoTrips';

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null } as const;
  return { supabase, user: data.user } as const;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  try {
    const repo = createSupabaseRepository(supabase);
    const trip = await repo.findById(id);
    if (!trip) {
      return NextResponse.json(
        { success: false, error: 'not_found' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: trip });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { supabase, user } = await requireUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const { id } = await context.params;

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

  const parsed = tripPatchSchema.safeParse(body);
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
    const trip = await repo.update(id, parsed.data);
    revalidatePath('/trips');
    revalidatePath(`/trips/${id}`);
    return NextResponse.json({ success: true, data: trip });
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

  const { id } = await context.params;

  if (isDemoTrip(id)) {
    return NextResponse.json(
      { success: false, error: DEMO_TRIP_PROTECTED_ERROR },
      { status: 403 },
    );
  }

  try {
    const repo = createSupabaseRepository(supabase);
    await repo.remove(id);
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
