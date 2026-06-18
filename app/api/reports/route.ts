/**
 * GET /api/reports — list reports for the authenticated account.
 *
 * Auth: required.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../src/api/adapter";
import { handleListReports } from "../../../src/api/routes/reports";

export async function GET(req: NextRequest) {
  const apiReq = await toApiRequest(req, { requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleListReports(apiReq);
  return toNextResponse(result);
}
