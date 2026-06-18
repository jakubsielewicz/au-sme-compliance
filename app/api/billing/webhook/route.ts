/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint.
 * NO auth check (Stripe signs the payload instead).
 * Raw body is read before any JSON parsing; signature verified by the handler.
 */

import { type NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "../../../../src/api/routes/billing";
import { toNextResponse } from "../../../../src/api/adapter";

// Disable Next.js body parsing so we can read the raw bytes for Stripe signature verification.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";

  const result = await handleStripeWebhook({ rawBody: raw, signature, webhookSecret });
  return toNextResponse(result);
}
