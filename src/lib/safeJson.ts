/**
 * #6: parse JSON that comes out of the database defensively. Inputs are Zod-validated
 * on the way in, but a corrupt/legacy/hand-edited column shouldn't crash a request deep
 * in a service. Returns the fallback on malformed JSON instead of throwing.
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
