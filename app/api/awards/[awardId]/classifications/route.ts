/**
 * GET /api/awards/[awardId]/classifications
 *
 * PUBLIC — no auth required.
 * Next 15: params is a Promise.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../../src/api/adapter";
import { handleGetAwardClassifications } from "../../../../../src/api/routes/awards";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ awardId: string }> }
) {
  const { awardId } = await params;
  const apiReq = await toApiRequest(req, { params: { awardId }, requireAuth: false });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = handleGetAwardClassifications(apiReq);
  return toNextResponse(result);
}
