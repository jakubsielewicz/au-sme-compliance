/**
 * GET /api/reports/[reportId] — retrieve report metadata.
 *
 * Auth: required.
 * Next 15: params is a Promise.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../src/api/adapter";
import { handleGetReport } from "../../../../src/api/routes/reports";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const apiReq = await toApiRequest(req, { params: { reportId }, requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleGetReport(apiReq);
  return toNextResponse(result);
}
