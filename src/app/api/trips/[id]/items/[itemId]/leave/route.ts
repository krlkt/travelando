import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteContext {
  params: Promise<{ id: string; itemId: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { success: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  const userId = userData.user.id;
  const { id: tripId, itemId } = await context.params;

  // Read the current item with the session client so RLS confirms the user
  // actually has access to it right now.
  const { data: item, error: fetchError } = await supabase
    .from('trip_items')
    .select('private_to_user_ids')
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      { success: false, error: fetchError.message },
      { status: 500 },
    );
  }
  if (!item) {
    return NextResponse.json(
      { success: false, error: 'not_found' },
      { status: 404 },
    );
  }

  const currentIds: string[] = item.private_to_user_ids ?? [];
  if (!currentIds.includes(userId)) {
    return NextResponse.json(
      { success: false, error: 'not_in_private_list' },
      { status: 403 },
    );
  }

  const newIds = currentIds.filter((id) => id !== userId);

  // Use the admin client to bypass the WITH CHECK RLS constraint — the access
  // check above (session client SELECT succeeded + user is in the list) is the
  // authorisation gate.
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('trip_items')
    .update({ private_to_user_ids: newIds.length > 0 ? newIds : null })
    .eq('id', itemId)
    .eq('trip_id', tripId);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: updateError.message },
      { status: 500 },
    );
  }

  revalidatePath(`/trips/${tripId}`);
  return NextResponse.json({ success: true });
}
