/**
 * GET /api/billing/subscription
 *
 * Returns the current subscription status.
 * Auth: required.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../src/api/adapter";
import { handleGetSubscription } from "../../../../src/api/routes/billing";

export async function GET(req: NextRequest) {
  const apiReq = await toApiRequest(req, { requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleGetSubscription(apiReq);
  return toNextResponse(result);
}
