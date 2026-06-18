"use client";

/**
 * History page — list of compliance check reports (US-07).
 *
 * Loads reports from GET /api/reports (auth: demo token).
 * Provides download link per report.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import DisclaimerBanner from "../components/DisclaimerBanner";
import { listReports, downloadReportPdf, type ReportSummary } from "../../lib/apiClient";

export default function HistoryPage() {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => setError("Could not load reports. Please refresh and try again."));
  }, []);

  async function handleDownload(reportId: string, generatedAt: string) {
    setDownloadingId(reportId);
    setDownloadError("");
    try {
      const dateStr = generatedAt.slice(0, 10);
      await downloadReportPdf(reportId, `paycheck-${dateStr}.pdf`);
    } catch {
      setDownloadError("PDF download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <main className="history-page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1>Compliance check history</h1>
        <Link href="/check" className="btn btn-primary">
          New check
        </Link>
      </div>

      <DisclaimerBanner />

      {/* Loading state */}
      {reports === null && !error && (
        <p className="text-muted">Loading reports…</p>
      )}

      {/* Error state */}
      {error && (
        <div className="banner banner-danger">{error}</div>
      )}

      {/* Download error */}
      {downloadError && (
        <p className="field-error" style={{ marginBottom: "1rem" }}>{downloadError}</p>
      )}

      {/* Empty state */}
      {reports !== null && reports.length === 0 && (
        <div className="empty-state">
          <p>No compliance checks yet.</p>
          <Link href="/check" className="btn btn-primary">
            Run your first check
          </Link>
        </div>
      )}

      {/* Reports table */}
      {reports !== null && reports.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employees checked</th>
                <th>Gaps found</th>
                <th>Total weekly gap (AUD)</th>
                <th>Rate table date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.report_id}>
                  <td>{new Date(r.generated_at).toLocaleDateString("en-AU", {
                    year: "numeric", month: "short", day: "numeric"
                  })}</td>
                  <td>{r.employee_count_checked}</td>
                  <td>
                    {r.employee_count_gaps > 0 ? (
                      <span className="badge badge-gap">{r.employee_count_gaps}</span>
                    ) : (
                      <span className="badge badge-ok">0</span>
                    )}
                  </td>
                  <td>
                    {r.total_gap_weekly_aud > 0 ? (
                      <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                        ${r.total_gap_weekly_aud.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: "var(--color-success)" }}>$0.00</span>
                    )}
                  </td>
                  <td>{r.rate_table_effective_date}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDownload(r.report_id, r.generated_at)}
                      disabled={downloadingId === r.report_id}
                    >
                      {downloadingId === r.report_id ? "Downloading…" : "Download PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted" style={{ marginTop: "1.5rem" }}>
        Reports are retained for 90 days from the check date.
        Rate table: FWC Annual Wage Review 2025-07-01.
        Verify before each pay run.
      </p>
    </main>
  );
}
