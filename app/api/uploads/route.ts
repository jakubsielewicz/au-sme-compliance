/**
 * POST /api/uploads  — create a new upload (multipart CSV)
 * GET  /api/uploads  — list uploads for the authenticated account
 *
 * Auth: required.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../src/api/adapter";
import { handleCreateUpload } from "../../../src/api/routes/uploads";
import { handleListUploads } from "../../../src/api/routes/reports";

export async function POST(req: NextRequest) {
  const apiReq = await toApiRequest(req, { requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleCreateUpload(apiReq);
  return toNextResponse(result);
}

export async function GET(req: NextRequest) {
  const apiReq = await toApiRequest(req, { requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleListUploads(apiReq);
  return toNextResponse(result);
}
