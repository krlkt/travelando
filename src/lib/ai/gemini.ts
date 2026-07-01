/**
 * Minimal Google Gemini client for structured (JSON) generation. Kept tiny and
 * dependency-free: one `generateJson` call that asks the model to emit JSON
 * matching a schema and returns the parsed value. Mirrors the off-switch +
 * graceful-degradation style of the Places integration — callers always have a
 * non-LLM fallback, so any failure here is non-fatal.
 */

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/** Master off-switch — set GEMINI_RECOMMENDATIONS=false to skip the LLM tier. */
export function geminiEnabled(): boolean {
  return (
    process.env.GEMINI_RECOMMENDATIONS !== 'false' &&
    Boolean(process.env.GOOGLE_GEMINI_API_KEY)
  );
}

/** A Gemini `responseSchema` (OpenAPI-subset). Loosely typed by design. */
export type GeminiSchema = Record<string, unknown>;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

/**
 * Sends `prompt` to Gemini constrained to `responseSchema` and returns the
 * parsed JSON. Throws on transport, HTTP or parse failure so the caller can fall
 * back to the rule-based ranking.
 */
export async function generateJson(
  apiKey: string,
  prompt: string,
  responseSchema: GeminiSchema,
): Promise<unknown> {
  const res = await fetch(`${GEMINI_API}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.4,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`gemini_error: ${text}`);
  }

  const json = (await res.json()) as GeminiResponse;
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('gemini_empty_response');
  return JSON.parse(text);
}
