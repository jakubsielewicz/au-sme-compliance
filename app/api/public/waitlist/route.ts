/**
 * POST /api/public/waitlist — public waitlist sign-up.
 *
 * No auth required. Validates email against WaitlistSchema.
 * No persistence (stub) — Phase 4 will wire to a real DB table.
 */

import { type NextRequest, NextResponse } from "next/server";
import { WaitlistSchema, formatZodError } from "../../../../src/lib/validation";
import { generateRequestId } from "../../../../src/lib/errors";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body must be JSON.",
          request_id: requestId,
        },
      },
      { status: 400 }
    );
  }

  const parsed = WaitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid waitlist submission.",
          fields: formatZodError(parsed.error),
          request_id: requestId,
        },
      },
      { status: 400 }
    );
  }

  // Stub: no persistence yet.
  // TODO(Phase 4): insert into waitlist table via databaseClient.
  return NextResponse.json(
    { data: { joined: true }, request_id: requestId },
    { status: 200 }
  );
}
