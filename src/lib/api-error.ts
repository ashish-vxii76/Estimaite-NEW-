import { NextResponse } from "next/server";

/**
 * #7: turn thrown domain/validation errors into clean HTTP responses instead of
 * raw 500s (which can leak a stack). State-machine / segregation-of-duties errors
 * map to 409 Conflict; input/config validation maps to 400; anything unrecognised
 * is a genuine 500 with a generic body (details go to the server log only).
 */
export function apiError(e: unknown): NextResponse {
  const message = e instanceof Error ? e.message : "Unexpected error";

  const conflict =
    /two-person|cannot \w+ from|only draft or returned|reviewer cannot|record you created|before capturing|changed elsewhere/i;
  const badRequest =
    /invalid estimation config|is required|must (be|sum|equal|keep)|between 0 and|negative|overlap/i;

  if (conflict.test(message)) return NextResponse.json({ error: message }, { status: 409 });
  if (badRequest.test(message)) return NextResponse.json({ error: message }, { status: 400 });

  console.error("[api] unhandled error:", e);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

/** Wrap an async route handler so any throw becomes a mapped response, not a raw 500. */
export function withApiError<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (e) {
      return apiError(e);
    }
  };
}
