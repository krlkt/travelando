import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');

  // If the browser submitted a form (no fetch), redirect home.
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/html')) {
    return NextResponse.redirect(new URL('/', request.url), { status: 303 });
  }
  return NextResponse.json({ success: true });
}
