/**
 * PATCH /api/uploads/[uploadId]/mapping
 *
 * Confirms column mapping and triggers the compliance check.
 * Auth: required.
 * Next 15: params is a Promise.
 */

import { type NextRequest } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../../src/api/adapter";
import { handlePatchMapping } from "../../../../../src/api/routes/uploads";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await params;
  const apiReq = await toApiRequest(req, { params: { uploadId }, requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);
  const result = await handlePatchMapping(apiReq);
  return toNextResponse(result);
}
