import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { settlementDraftSchema } from '@/lib/trips/schemas';
import { DEMO_TRIP_PROTECTED_ERROR, isDemoTrip } from '@/lib/trips/demoTrips';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }
  const { id: tripId } = await context.params;
  try {
    const repo = createSupabaseRepository(supabase);
    const settlements = await repo.listSettlements(tripId);
    return NextResponse.json({ success: true, data: settlements });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }
  const { id: tripId } = await context.params;
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
  const parsed = settlementDraftSchema.safeParse({
    ...(body as object),
    tripId,
  });
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
    const settlement = await repo.addSettlement(parsed.data);
    return NextResponse.json(
      { success: true, data: settlement },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
