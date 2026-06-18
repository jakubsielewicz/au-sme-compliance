/**
 * GET /api/reports/[reportId]/download — stream the compliance report as PDF.
 *
 * Auth: required.
 * Returns application/pdf, not JSON.
 * Next 15: params is a Promise.
 */

import { type NextRequest, NextResponse } from "next/server";
import { toApiRequest, toNextResponse, isErrorResponse } from "../../../../../src/api/adapter";
import { handleDownloadReport } from "../../../../../src/api/routes/reports";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { reportId } = await params;
  const apiReq = await toApiRequest(req, { params: { reportId }, requireAuth: true });
  if (isErrorResponse(apiReq)) return toNextResponse(apiReq);

  const result = await handleDownloadReport(apiReq);

  // Check whether handler returned a PDF or an error ApiResponse
  if ("type" in result && result.type === "pdf") {
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.buffer.length),
      },
    });
  }

  // Narrow to ApiResponse for the error path
  const errorResult = result as import("../../../../../src/api/routes/uploads").ApiResponse;
  return toNextResponse(errorResult);
}
