import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next');
  const errorDescription = url.searchParams.get('error_description');

  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/trips';

  if (errorDescription) {
    const fallback = new URL('/login', url.origin);
    fallback.searchParams.set('error', errorDescription);
    return NextResponse.redirect(fallback);
  }

  if (!code) {
    return NextResponse.redirect(new URL(safeNext, url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const fallback = new URL('/login', url.origin);
    fallback.searchParams.set('error', error.message);
    return NextResponse.redirect(fallback);
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
