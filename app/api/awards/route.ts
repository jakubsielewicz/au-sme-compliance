/**
 * GET /api/awards — list active awards.
 *
 * PUBLIC — no auth required.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../src/api/adapter";
import { handleListAwards } from "../../../src/api/routes/awards";

export async function GET(req: NextRequest) {
  const apiReq = await toApiRequest(req, { requireAuth: false });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = handleListAwards(apiReq);
  return toNextResponse(result);
}
