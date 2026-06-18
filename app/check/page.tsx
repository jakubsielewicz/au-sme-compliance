"use client";

/**
 * Check page — multi-step compliance check flow (US-04, US-05, US-06, US-07).
 *
 * Steps:
 *   1. Pick award + upload CSV file
 *   2. Map CSV columns to required fields
 *   3. Results: summary cards + per-employee table + PDF download
 */

import { useState, useRef } from "react";
import DisclaimerBanner from "../components/DisclaimerBanner";
import LowConfidenceBanner from "../components/LowConfidenceBanner";
import {
  listAwards,
  createUpload,
  submitMapping,
  getReportDetail,
  downloadReportPdf,
  type AwardSummary,
  type MappingResult,
  type ColumnMappingPayload,
} from "../../lib/apiClient";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "upload" | "mapping" | "results";

interface EmployeeResult {
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

// Target fields the user maps
const TARGET_FIELDS: Array<{
  key: keyof ColumnMappingPayload;
  label: string;
  required: boolean;
}> = [
  { key: "employee_ref", label: "Employee name / ID", required: true },
  { key: "role_title", label: "Job title / role", required: true },
  { key: "weekly_hours", label: "Weekly hours", required: true },
  { key: "current_pay_rate_hourly", label: "Hourly pay rate", required: true },
  { key: "employment_type", label: "Employment type", required: false },
];

// Auto-suggest rules: if CSV header lower-case contains any of these strings,
// pre-select this target field.
const AUTO_MATCH: Record<keyof ColumnMappingPayload, string[]> = {
  employee_ref: ["name", "employee", "ref", "id"],
  role_title: ["title", "role", "job", "position", "occupation"],
  weekly_hours: ["hours", "hrs", "weekly"],
  current_pay_rate_hourly: ["rate", "pay", "hourly", "wage", "salary"],
  employment_type: ["type", "employment", "contract"],
};

function autoMatch(
  headers: string[],
  targetKey: keyof ColumnMappingPayload
): string {
  const patterns = AUTO_MATCH[targetKey];
  for (const h of headers) {
    const lower = h.toLowerCase();
    if (patterns.some((p) => lower.includes(p))) return h;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCsvHeaders(csvText: string): string[] {
  const firstLine = csvText.split(/\r?\n/)[0] ?? "";
  return firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
}

function fmt(n: number | null | undefined, prefix = ""): string {
  if (n === null || n === undefined) return "—";
  return `${prefix}${n.toFixed(2)}`;
}

function ConfidenceBadge({ score }: { score: string }) {
  const cls =
    score === "HIGH"
      ? "badge badge-high"
      : score === "MEDIUM"
      ? "badge badge-medium"
      : "badge badge-low";
  return <span className={cls}>{score}</span>;
}

function GapBadge({ direction, gapWeekly }: { direction: string; gapWeekly: number | null }) {
  if (direction === "EXCLUDED") return <span className="badge badge-excluded">Excluded</span>;
  if (direction === "UNDERPAID")
    return (
      <span className="badge badge-gap">
        -${Math.abs(gapWeekly ?? 0).toFixed(2)}/wk
      </span>
    );
  if (direction === "OVERPAID")
    return (
      <span className="badge badge-ok">
        +${Math.abs(gapWeekly ?? 0).toFixed(2)}/wk
      </span>
    );
  return <span className="badge badge-ok">At rate</span>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CheckPage() {
  const [step, setStep] = useState<Step>("upload");

  // Step 1 state
  const [awards, setAwards] = useState<AwardSummary[] | null>(null);
  const [awardsError, setAwardsError] = useState("");
  const [selectedAward, setSelectedAward] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [uploadId, setUploadId] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [awardsLoading, setAwardsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [mapping, setMapping] = useState<Partial<ColumnMappingPayload>>({});
  const [mappingError, setMappingError] = useState("");
  const [mappingLoading, setMappingLoading] = useState(false);

  // Step 3 state
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);
  const [employees, setEmployees] = useState<EmployeeResult[]>([]);
  const [reportId, setReportId] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  // ── Load awards on first interaction ────────────────────────────────────
  async function ensureAwards() {
    if (awards !== null) return;
    setAwardsLoading(true);
    setAwardsError("");
    try {
      const data = await listAwards();
      setAwards(data);
      if (data.length > 0) setSelectedAward(data[0].code);
    } catch {
      setAwardsError("Could not load awards. Please refresh and try again.");
    } finally {
      setAwardsLoading(false);
    }
  }

  // ── File selection ───────────────────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setCsvHeaders([]);
    if (f) {
      await ensureAwards();
      const text = await f.text();
      const headers = parseCsvHeaders(text);
      setCsvHeaders(headers);
    }
  }

  // ── Step 1 → Step 2 (upload CSV) ────────────────────────────────────────
  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !selectedAward) return;

    setUploadLoading(true);
    setUploadError("");

    try {
      const result = await createUpload(file, selectedAward);
      setUploadId(result.upload_id);

      // Pre-populate mapping from auto-match
      const initialMapping: Partial<ColumnMappingPayload> = {};
      for (const f of TARGET_FIELDS) {
        const match = autoMatch(csvHeaders, f.key);
        if (match) initialMapping[f.key] = match;
      }
      setMapping(initialMapping);
      setStep("mapping");
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploadLoading(false);
    }
  }

  // ── Step 2 → Step 3 (submit mapping) ────────────────────────────────────
  async function handleMappingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMappingError("");

    // Validate required fields
    for (const f of TARGET_FIELDS) {
      if (f.required && !mapping[f.key]) {
        setMappingError(`Please map the "${f.label}" field before proceeding.`);
        return;
      }
    }

    setMappingLoading(true);
    try {
      const payload = mapping as ColumnMappingPayload;
      const result = await submitMapping(uploadId, payload);
      setMappingResult(result);
      setReportId(result.report_id);

      // Fetch the full per-employee breakdown for the results table (US-06).
      // Degrade gracefully — the PDF still carries the authoritative detail.
      try {
        const detail = await getReportDetail(result.report_id);
        setEmployees(detail.employees as EmployeeResult[]);
      } catch {
        setEmployees([]);
      }
      setStep("results");
    } catch (err) {
      setMappingError(
        err instanceof Error ? err.message : "Mapping failed. Please try again."
      );
    } finally {
      setMappingLoading(false);
    }
  }

  // ── PDF download ─────────────────────────────────────────────────────────
  async function handleDownloadPdf() {
    setPdfLoading(true);
    setPdfError("");
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadReportPdf(reportId, `paycheck-${dateStr}.pdf`);
    } catch {
      setPdfError("PDF download failed. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Step indicator ───────────────────────────────────────────────────────
  function StepIndicator() {
    const steps = ["1. Upload", "2. Map columns", "3. Results"];
    const current = step === "upload" ? 0 : step === "mapping" ? 1 : 2;
    return (
      <div className="steps" role="list" aria-label="Progress">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`step ${i === current ? "step-active" : i < current ? "step-done" : ""}`}
            role="listitem"
          >
            {s}
          </div>
        ))}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <main className="check-page">
      <h1 style={{ marginBottom: "1.5rem" }}>Compliance check</h1>
      <DisclaimerBanner />
      <StepIndicator />

      {/* ── Step 1: Upload ─────────────────────────────────────────────────── */}
      {step === "upload" && (
        <div className="card">
          <h2 style={{ marginBottom: "1rem" }}>Upload your payroll CSV</h2>
          <p className="text-muted text-sm" style={{ marginBottom: "1.25rem" }}>
            Export your payroll data as a CSV from Xero, MYOB, or any spreadsheet.
            Accepts files up to 5 MB / 500 rows.{" "}
            <a href="/sample-payroll.csv" download style={{ color: "var(--color-primary)" }}>
              Download sample CSV
            </a>
          </p>
          <form onSubmit={handleUploadSubmit}>
            <div className="form-group">
              <label htmlFor="award">
                Modern Award<span className="required">*</span>
              </label>
              {awardsLoading && <p className="text-sm text-muted">Loading awards…</p>}
              {awardsError && <p className="field-error">{awardsError}</p>}
              {!awardsLoading && !awardsError && awards === null && (
                <select
                  id="award"
                  onClick={() => ensureAwards()}
                  onChange={(e) => setSelectedAward(e.target.value)}
                  value={selectedAward}
                  required
                >
                  <option value="">Select an award…</option>
                </select>
              )}
              {awards !== null && (
                <select
                  id="award"
                  value={selectedAward}
                  onChange={(e) => setSelectedAward(e.target.value)}
                  required
                >
                  <option value="">Select an award…</option>
                  {awards.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.name} ({a.classification_count} classifications, rates effective{" "}
                      {a.current_rate_effective_date})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="csv-file">
                Payroll CSV file<span className="required">*</span>
              </label>
              <input
                id="csv-file"
                type="file"
                accept=".csv,text/csv"
                ref={fileRef}
                onChange={handleFileChange}
                required
              />
              {csvHeaders.length > 0 && (
                <p className="text-xs text-muted" style={{ marginTop: "0.3rem" }}>
                  Detected {csvHeaders.length} column{csvHeaders.length !== 1 ? "s" : ""}:{" "}
                  {csvHeaders.join(", ")}
                </p>
              )}
            </div>

            {uploadError && <p className="field-error" style={{ marginBottom: "0.75rem" }}>{uploadError}</p>}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploadLoading || !file || !selectedAward}
            >
              {uploadLoading ? "Uploading…" : "Continue to column mapping"}
            </button>
          </form>
        </div>
      )}

      {/* ── Step 2: Mapping ───────────────────────────────────────────────── */}
      {step === "mapping" && (
        <div className="card">
          <h2 style={{ marginBottom: "0.5rem" }}>Map your CSV columns</h2>
          <p className="text-muted text-sm" style={{ marginBottom: "1.25rem" }}>
            Tell us which of your CSV columns corresponds to each required field.
            We've pre-filled common matches — review and adjust as needed.
          </p>

          <form onSubmit={handleMappingSubmit}>
            <div className="mapping-grid">
              {TARGET_FIELDS.map((field) => (
                <div className="form-group" key={field.key}>
                  <label htmlFor={`map-${field.key}`}>
                    {field.label}
                    {field.required ? (
                      <span className="required">*</span>
                    ) : (
                      <span className="optional">(optional)</span>
                    )}
                  </label>
                  <select
                    id={`map-${field.key}`}
                    value={mapping[field.key] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({
                        ...prev,
                        [field.key]: e.target.value || undefined,
                      }))
                    }
                    required={field.required}
                  >
                    <option value="">— select column —</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {mappingError && (
              <p className="field-error" style={{ marginBottom: "0.75rem" }}>
                {mappingError}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setStep("upload")}
                disabled={mappingLoading}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={mappingLoading}
              >
                {mappingLoading ? "Running compliance check…" : "Run compliance check"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 3: Results ──────────────────────────────────────────────── */}
      {step === "results" && mappingResult && (
        <div>
          {/* Low-confidence banner (NFR-L3) */}
          {(mappingResult.summary.employeeCountLowConfidence > 0 ||
            mappingResult.summary.majorityLowConfidence) && (
            <LowConfidenceBanner
              employeeCount={mappingResult.summary.employeeCountLowConfidence}
            />
          )}

          {/* Summary cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card__value">
                {mappingResult.summary.employeeCountChecked}
              </div>
              <div className="summary-card__label">Employees checked</div>
            </div>
            <div
              className={`summary-card ${
                mappingResult.summary.employeeCountGaps > 0
                  ? "summary-card--gap"
                  : "summary-card--ok"
              }`}
            >
              <div className="summary-card__value">
                {mappingResult.summary.employeeCountGaps}
              </div>
              <div className="summary-card__label">Employees with gaps</div>
            </div>
            <div
              className={`summary-card ${
                mappingResult.summary.totalGapWeeklyAud > 0
                  ? "summary-card--gap"
                  : "summary-card--ok"
              }`}
            >
              <div className="summary-card__value">
                ${mappingResult.summary.totalGapWeeklyAud.toFixed(2)}
              </div>
              <div className="summary-card__label">Total weekly underpayment (AUD)</div>
            </div>
            {mappingResult.summary.employeeCountLowConfidence > 0 && (
              <div className="summary-card">
                <div className="summary-card__value" style={{ color: "var(--color-warning)" }}>
                  {mappingResult.summary.employeeCountLowConfidence}
                </div>
                <div className="summary-card__label">Low-confidence classifications</div>
              </div>
            )}
          </div>

          {/* Per-employee table placeholder */}
          {employees.length > 0 ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>Per-employee detail</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Role</th>
                      <th>Classification</th>
                      <th>Confidence</th>
                      <th>Current rate</th>
                      <th>FWC rate</th>
                      <th>Weekly gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.employeeRef}>
                        <td>{emp.employeeRef}</td>
                        <td>{emp.roleTitle}</td>
                        <td>
                          {emp.classificationLabel ?? (
                            <span className="text-muted">{emp.exclusionReason ?? "—"}</span>
                          )}
                        </td>
                        <td>
                          <ConfidenceBadge score={emp.confidenceScore} />
                        </td>
                        <td>{fmt(emp.currentPayRateHourly, "$")}/hr</td>
                        <td>{fmt(emp.fwcRateHourly, "$")}/hr</td>
                        <td>
                          <GapBadge direction={emp.gapDirection} gapWeekly={emp.gapWeekly} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="banner banner-info" style={{ marginBottom: "1.5rem" }}>
              Per-employee detail is available in the PDF report below. Download to see
              classification levels, confidence scores, and individual pay gaps.
            </div>
          )}

          {/* Download PDF */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1 }}>
              <h3>Audit-ready PDF report</h3>
              <p className="text-sm text-muted" style={{ margin: "0.25rem 0 0" }}>
                Includes per-employee classification detail, confidence scores, FWC rates,
                gaps, and the full disclaimer block. Stored for 90 days.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? "Generating…" : "Download PDF report"}
            </button>
          </div>

          {pdfError && <p className="field-error" style={{ marginTop: "0.5rem" }}>{pdfError}</p>}

          <div style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setStep("upload");
                setFile(null);
                setUploadId("");
                setMappingResult(null);
                setEmployees([]);
                setReportId("");
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Run another check
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
