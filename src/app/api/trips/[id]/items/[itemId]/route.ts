import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { itemPatchSchema } from '@/lib/trips/schemas';
import { DEMO_TRIP_PROTECTED_ERROR, isDemoTrip } from '@/lib/trips/demoTrips';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
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

  const { id: tripId, itemId } = await context.params;

  if (isDemoTrip(tripId)) {
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

  const parsed = itemPatchSchema.safeParse(body);
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

  if (parsed.data.privateToUserIds && parsed.data.privateToUserIds.length > 0) {
    const { data: members } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .not('user_id', 'is', null);
    const validUserIds = new Set(
      (members ?? []).map((m) => m.user_id as string),
    );
    const invalid = parsed.data.privateToUserIds.filter(
      (uid) => !validUserIds.has(uid),
    );
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: 'invalid_private_member_ids' },
        { status: 400 },
      );
    }
  }

  try {
    const repo = createSupabaseRepository(supabase);
    const item = await repo.updateItem(tripId, itemId, parsed.data);
    revalidatePath(`/trips/${tripId}`);
    return NextResponse.json({ success: true, ...(item && { data: item }) });
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

  const { id: tripId, itemId } = await context.params;

  if (isDemoTrip(tripId)) {
    return NextResponse.json(
      { success: false, error: DEMO_TRIP_PROTECTED_ERROR },
      { status: 403 },
    );
  }

  try {
    const repo = createSupabaseRepository(supabase);
    await repo.removeItem(tripId, itemId);
    revalidatePath(`/trips/${tripId}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
