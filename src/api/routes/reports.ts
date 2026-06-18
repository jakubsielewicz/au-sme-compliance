/**
 * Reports API Handlers
 *
 * Framework-agnostic handlers for report listing, retrieval, and PDF download.
 * Pairs with the uploads handlers; requires the full AuditReport JSON to have
 * been persisted to storage by handlePatchMapping.
 */

import { databaseClient, storageClient } from "../../integrations/supabase.stub";
import { makeErrorResponse, generateRequestId } from "../../lib/errors";
import { renderReportPdf } from "../../engine/pdfGenerator";
import type { ApiRequest, ApiResponse } from "./uploads";
import type { AuditReport } from "../../engine/reportBuilder";

// ---------------------------------------------------------------------------
// GET /uploads  (list for the authenticated account)
// ---------------------------------------------------------------------------

export async function handleListUploads(req: ApiRequest): Promise<ApiResponse> {
  const requestId = generateRequestId();
  const uploads = await databaseClient.listUploads(req.accountId);

  return {
    status: 200,
    body: {
      data: uploads.map((u) => ({
        upload_id: u.uploadId,
        filename: u.filename,
        award_code: u.awardCode,
        status: u.status,
        row_count: u.rowCount,
        uploaded_at: u.uploadedAt,
        purge_at: u.purgeAt,
      })),
      meta: { total: uploads.length },
      request_id: requestId,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /reports
// ---------------------------------------------------------------------------

export async function handleListReports(req: ApiRequest): Promise<ApiResponse> {
  const requestId = generateRequestId();
  const reports = await databaseClient.listReports(req.accountId);

  return {
    status: 200,
    body: {
      data: reports.map((r) => ({
        report_id: r.reportId,
        upload_id: r.uploadId,
        generated_at: r.generatedAt,
        rate_table_effective_date: r.rateTableEffectiveDate,
        employee_count_checked: r.employeeCountChecked,
        employee_count_gaps: r.employeeCountGaps,
        total_gap_weekly_aud: r.totalGapWeeklyAud,
        disclaimer_version: r.disclaimerVersion,
        purge_at: r.purgeAt,
      })),
      meta: { total: reports.length },
      request_id: requestId,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /reports/:reportId
// ---------------------------------------------------------------------------

export async function handleGetReport(req: ApiRequest): Promise<ApiResponse> {
  const requestId = generateRequestId();
  const reportId = req.params?.["reportId"];

  if (!reportId) {
    return {
      status: 400,
      body: makeErrorResponse("VALIDATION_ERROR", "reportId is required.", requestId),
    };
  }

  const storedReport = await databaseClient.getReport(reportId, req.accountId);
  if (!storedReport) {
    return {
      status: 404,
      body: makeErrorResponse("NOT_FOUND", "Report not found.", requestId),
    };
  }

  return {
    status: 200,
    body: {
      data: {
        report_id: storedReport.reportId,
        upload_id: storedReport.uploadId,
        generated_at: storedReport.generatedAt,
        rate_table_effective_date: storedReport.rateTableEffectiveDate,
        employee_count_checked: storedReport.employeeCountChecked,
        employee_count_gaps: storedReport.employeeCountGaps,
        total_gap_weekly_aud: storedReport.totalGapWeeklyAud,
        disclaimer_version: storedReport.disclaimerVersion,
        purge_at: storedReport.purgeAt,
      },
      request_id: requestId,
    },
  };
}

// ---------------------------------------------------------------------------
// GET /reports/:reportId/download  → returns Buffer (PDF) or an error ApiResponse
// ---------------------------------------------------------------------------

export interface DownloadResult {
  type: "pdf";
  buffer: Buffer;
  filename: string;
}

export type ReportDownloadResponse = ApiResponse | DownloadResult;

export async function handleDownloadReport(
  req: ApiRequest
): Promise<ReportDownloadResponse> {
  const requestId = generateRequestId();
  const reportId = req.params?.["reportId"];

  if (!reportId) {
    return {
      status: 400,
      body: makeErrorResponse("VALIDATION_ERROR", "reportId is required.", requestId),
    };
  }

  const storedReport = await databaseClient.getReport(reportId, req.accountId);
  if (!storedReport) {
    return {
      status: 404,
      body: makeErrorResponse("NOT_FOUND", "Report not found.", requestId),
    };
  }

  // Retrieve the full AuditReport JSON from storage
  let reportJson: AuditReport;
  try {
    const fileBuffer = await storageClient.getFile(
      storedReport.storagePathEncrypted
    );
    reportJson = JSON.parse(fileBuffer.toString("utf-8")) as AuditReport;
  } catch (err) {
    return {
      status: 500,
      body: makeErrorResponse(
        "INTERNAL_ERROR",
        "Report data could not be retrieved.",
        requestId
      ),
    };
  }

  // Render PDF
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderReportPdf(reportJson);
  } catch (err) {
    return {
      status: 500,
      body: makeErrorResponse(
        "INTERNAL_ERROR",
        "PDF could not be generated.",
        requestId
      ),
    };
  }

  const dateStr = new Date(storedReport.generatedAt)
    .toISOString()
    .slice(0, 10);

  return {
    type: "pdf",
    buffer: pdfBuffer,
    filename: `paycheck-${dateStr}.pdf`,
  };
}
