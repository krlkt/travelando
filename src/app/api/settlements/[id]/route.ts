import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseRepository } from '@/lib/trips/supabaseRepository';
import { settlementUpdateSchema } from '@/lib/trips/schemas';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'invalid_json' },
      { status: 400 },
    );
  }
  const parsed = settlementUpdateSchema.safeParse(body);
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
    const settlement = await repo.updateSettlement(id, parsed.data);
    return NextResponse.json({ success: true, data: settlement });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  try {
    const repo = createSupabaseRepository(supabase);
    await repo.removeSettlement(id);
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
