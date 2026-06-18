/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session.
 * Auth: required.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../src/api/adapter";
import { handleCreateCheckout } from "../../../../src/api/routes/billing";

export async function POST(req: NextRequest) {
  const apiReq = await toApiRequest(req, { requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleCreateCheckout(apiReq);
  return toNextResponse(result);
}
