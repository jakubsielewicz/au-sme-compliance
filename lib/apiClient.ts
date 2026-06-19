"use client";

/**
 * Client-side API helper.
 *
 * Injects the demo bearer token on all protected calls.
 * TODO(Phase 4): replace demo token with real Supabase Auth session.
 */

// Demo token accepted by the stub auth middleware (validateAuth splits on "_";
// UUIDs use "-" so the split correctly yields the UUID parts).
//   accountId → 00000000-0000-0000-0000-0000000000a1  (matches accounts.id seed row)
//   userId    → 00000000-0000-0000-0000-0000000000a2  (matches users.id seed row)
// This makes account_id a valid FK in the real Supabase DB while remaining
// a no-op for the in-memory stub.
// TODO(Phase 4b): replace with real Supabase Auth session token.
const DEMO_TOKEN = "valid_00000000-0000-0000-0000-0000000000a1_00000000-0000-0000-0000-0000000000a2";

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${DEMO_TOKEN}` };
}

// ---------------------------------------------------------------------------
// Awards
// ---------------------------------------------------------------------------

export interface AwardSummary {
  award_id: string;
  code: string;
  name: string;
  classification_count: number;
  current_rate_effective_date: string;
}

export async function listAwards(): Promise<AwardSummary[]> {
  const res = await fetch("/api/awards");
  if (!res.ok) throw new Error("Failed to load awards");
  const json = (await res.json()) as { data: AwardSummary[] };
  return json.data;
}

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export interface UploadResponse {
  upload_id: string;
  status: string;
  filename: string;
  row_count: number;
  award_code: string;
}

export async function createUpload(
  file: File,
  awardCode: string
): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("award_code", awardCode);

  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ??
      "Upload failed";
    throw new Error(msg);
  }
  return (json as { data: UploadResponse }).data;
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

export interface ColumnMappingPayload {
  employee_ref: string;
  role_title: string;
  weekly_hours: string;
  current_pay_rate_hourly: string;
  employment_type?: string;
}

export interface MappingResult {
  upload_id: string;
  report_id: string;
  status: string;
  summary: {
    employeeCountChecked: number;
    employeeCountGaps: number;
    employeeCountLowConfidence: number;
    totalGapWeeklyAud: number;
    majorityLowConfidence: boolean;
  };
}

export async function submitMapping(
  uploadId: string,
  mapping: ColumnMappingPayload
): Promise<MappingResult> {
  const res = await fetch(`/api/uploads/${uploadId}/mapping`, {
    method: "PATCH",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mapping }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } }).error?.message ??
      "Mapping failed";
    throw new Error(msg);
  }
  return (json as { data: MappingResult }).data;
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportSummary {
  report_id: string;
  upload_id: string;
  generated_at: string;
  rate_table_effective_date: string;
  employee_count_checked: number;
  employee_count_gaps: number;
  total_gap_weekly_aud: number;
  disclaimer_version: string;
  purge_at: string;
}

export async function listReports(): Promise<ReportSummary[]> {
  const res = await fetch("/api/reports", {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load reports");
  const json = (await res.json()) as { data: ReportSummary[] };
  return json.data;
}

export async function getReport(reportId: string): Promise<ReportSummary> {
  const res = await fetch(`/api/reports/${reportId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Report not found");
  const json = (await res.json()) as { data: ReportSummary };
  return json.data;
}

export interface EmployeeDetail {
  employeeRef: string;
  roleTitle: string;
  classificationLevel: string | null;
  classificationLabel: string | null;
  confidenceScore: "HIGH" | "MEDIUM" | "LOW";
  currentPayRateHourly: number | null;
  fwcRateHourly: number | null;
  gapHourly: number | null;
  gapWeekly: number | null;
  gapDirection: "UNDERPAID" | "OVERPAID" | "AT_RATE" | "EXCLUDED";
  exclusionReason: string | null;
}

export interface ReportDetail extends ReportSummary {
  award_name: string | null;
  award_code: string | null;
  business_name: string | null;
  employees: EmployeeDetail[];
}

/**
 * Fetch a report including the full per-employee breakdown (US-06/US-07).
 * The list endpoint stays lightweight; this one reads the persisted detail.
 */
export async function getReportDetail(reportId: string): Promise<ReportDetail> {
  const res = await fetch(`/api/reports/${reportId}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Report not found");
  const json = (await res.json()) as { data: ReportDetail };
  return json.data;
}

/**
 * Download the PDF for a given report.
 * Fetches as blob (because the endpoint requires auth header, which rules
 * out a plain <a href> link), then triggers a browser download.
 */
export async function downloadReportPdf(
  reportId: string,
  filename = "paycheck-report.pdf"
): Promise<void> {
  const res = await fetch(`/api/reports/${reportId}/download`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Could not download report");

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
