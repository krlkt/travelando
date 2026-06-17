import { NextResponse, type NextRequest } from 'next/server';

const PLACES_API = 'https://places.googleapis.com/v1';
const DEFAULT_WIDTH = 400;
const MAX_WIDTH = 1600;

/**
 * Resolves a Google Places photo reference to its hosted image and redirects
 * the browser there, keeping the API key server-side. We ask Google to skip its
 * own redirect (`skipHttpRedirect`) so we get the `photoUri` as JSON, then 302
 * the client to that CDN URL — which is fetchable without the key and cacheable
 * by the browser.
 *
 * `name` must be a `places/{id}/photos/{ref}` resource name (validated to avoid
 * being used as an open proxy).
 */
export async function GET(request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'places_not_configured' },
      { status: 503 },
    );
  }

  const name = request.nextUrl.searchParams.get('name');
  if (!name || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    return NextResponse.json(
      { success: false, error: 'invalid_photo_name' },
      { status: 400 },
    );
  }

  const widthParam = Number(request.nextUrl.searchParams.get('w'));
  const maxWidthPx =
    Number.isFinite(widthParam) && widthParam > 0
      ? Math.min(Math.round(widthParam), MAX_WIDTH)
      : DEFAULT_WIDTH;

  try {
    const res = await fetch(
      `${PLACES_API}/${name}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`,
      { headers: { 'X-Goog-Api-Key': apiKey } },
    );

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'photo_fetch_failed' },
        { status: res.status },
      );
    }

    const json = (await res.json()) as { photoUri?: string };
    if (!json.photoUri) {
      return NextResponse.json(
        { success: false, error: 'photo_uri_missing' },
        { status: 502 },
      );
    }

    // Cache the redirect target briefly; the photoUri itself is short-lived.
    return NextResponse.redirect(json.photoUri, {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
