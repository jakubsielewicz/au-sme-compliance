/**
 * GET /api/uploads/[uploadId]/status
 *
 * Poll processing status for an upload.
 * Auth: required.
 * Next 15: params is a Promise.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../../src/api/adapter";
import { handleGetUploadStatus } from "../../../../../src/api/routes/uploads";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params;
  const apiReq = await toApiRequest(req, { params: { uploadId }, requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handleGetUploadStatus(apiReq);
  return toNextResponse(result);
}
