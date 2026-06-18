/**
 * Report Persistence Round-Trip Tests
 *
 * Verifies the full cycle:
 *  1. Create an upload via handleCreateUpload.
 *  2. Patch mapping via handlePatchMapping → runs the engine, stores the
 *     full AuditReport JSON, and returns a report_id.
 *  3. Retrieve the stored report record via handleGetReport.
 *  4. Download and render as PDF via handleDownloadReport.
 *
 * Uses the in-memory stubs — no real DB/Storage/Stripe required.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  handleCreateUpload,
  handlePatchMapping,
} from "../../src/api/routes/uploads";
import {
  handleListUploads,
  handleListReports,
  handleGetReport,
  handleDownloadReport,
} from "../../src/api/routes/reports";
import type { ApiRequest } from "../../src/api/routes/uploads";

const ACCOUNT_ID = "rp_test_account";

function makeReq(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    accountId: ACCOUNT_ID,
    body: {},
    params: {},
    ...overrides,
  };
}

const VALID_CSV = [
  "Employee Name,Position,Ordinary Hours,Pay Rate,Employment Type",
  "Alice Smith,Kitchen Hand,38,22.00,full_time",
  "Bob Jones,Waiter,25,25.00,part_time",
].join("\n");

const VALID_MAPPING = {
  employee_ref: "Employee Name",
  role_title: "Position",
  weekly_hours: "Ordinary Hours",
  current_pay_rate_hourly: "Pay Rate",
  employment_type: "Employment Type",
};

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe("Report persistence round-trip", () => {
  it("stores the full AuditReport JSON and retrieves it", async () => {
    // Step 1: Upload
    const csvBuffer = Buffer.from(VALID_CSV);
    const uploadRes = await handleCreateUpload(
      makeReq({
        body: { award_code: "MA000009" },
        file: {
          buffer: csvBuffer,
          originalname: "payroll.csv",
          size: csvBuffer.length,
          mimetype: "text/csv",
        },
      })
    );
    assert.equal(uploadRes.status, 202);
    const uploadData = (uploadRes.body as Record<string, unknown>)[
      "data"
    ] as Record<string, unknown>;
    const uploadId = uploadData["upload_id"] as string;
    assert.ok(uploadId, "upload_id must be returned");

    // Step 2: Patch mapping → triggers engine + persistence
    const patchRes = await handlePatchMapping(
      makeReq({
        params: { uploadId },
        body: { mapping: VALID_MAPPING },
      })
    );
    assert.equal(patchRes.status, 200, `Patch failed: ${JSON.stringify(patchRes.body)}`);
    const patchData = (patchRes.body as Record<string, unknown>)["data"] as Record<
      string,
      unknown
    >;
    const reportId = patchData["report_id"] as string;
    assert.ok(reportId, "report_id must be returned after patch");
    assert.equal(patchData["status"], "complete");
    assert.ok(patchData["summary"], "summary must be present");

    // Step 3: Retrieve report metadata
    const getRes = await handleGetReport(
      makeReq({ params: { reportId } })
    );
    assert.equal(getRes.status, 200, `Get report failed: ${JSON.stringify(getRes.body)}`);
    const reportData = ((getRes.body as Record<string, unknown>)["data"]) as Record<
      string,
      unknown
    >;
    assert.equal(reportData["report_id"], reportId);
    assert.ok(reportData["generated_at"]);
    assert.equal(reportData["rate_table_effective_date"], "2025-07-01");
    assert.ok(
      typeof reportData["employee_count_checked"] === "number" &&
        reportData["employee_count_checked"] > 0
    );

    // Step 4: Download as PDF
    const downloadRes = await handleDownloadReport(
      makeReq({ params: { reportId } })
    );
    assert.ok("type" in downloadRes, "download result must have a type field");
    assert.equal((downloadRes as { type: string }).type, "pdf");
    const pdf = downloadRes as { type: "pdf"; buffer: Buffer; filename: string };
    assert.ok(Buffer.isBuffer(pdf.buffer), "buffer must be a Buffer");
    assert.equal(
      pdf.buffer.slice(0, 4).toString("ascii"),
      "%PDF",
      "PDF must start with %PDF"
    );
    assert.ok(
      pdf.filename.startsWith("paycheck-"),
      `filename must start with paycheck-; got ${pdf.filename}`
    );
  });

  it("listUploads returns uploads for the account", async () => {
    // Upload one more to ensure listing works
    const csvBuffer = Buffer.from(VALID_CSV);
    await handleCreateUpload(
      makeReq({
        body: { award_code: "MA000009" },
        file: {
          buffer: csvBuffer,
          originalname: "second.csv",
          size: csvBuffer.length,
          mimetype: "text/csv",
        },
      })
    );

    const listRes = await handleListUploads(makeReq());
    assert.equal(listRes.status, 200);
    const body = listRes.body as Record<string, unknown>;
    const data = body["data"] as unknown[];
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 1, "Should have at least one upload");
    const meta = body["meta"] as Record<string, unknown>;
    assert.equal(meta["total"], data.length);
  });

  it("listReports returns reports for the account", async () => {
    const listRes = await handleListReports(makeReq());
    assert.equal(listRes.status, 200);
    const body = listRes.body as Record<string, unknown>;
    const data = body["data"] as unknown[];
    assert.ok(Array.isArray(data));
    // At least 1 report from the round-trip test above (shared in-memory store)
    assert.ok(data.length >= 1, "Should have at least one report");
    const first = (data as Array<Record<string, unknown>>)[0];
    assert.ok(first["report_id"]);
    assert.ok(first["generated_at"]);
    assert.ok(typeof first["employee_count_checked"] === "number");
  });

  it("returns 404 for a report not belonging to the account", async () => {
    const res = await handleGetReport(
      makeReq({ params: { reportId: "nonexistent_report_xyz" } })
    );
    assert.equal(res.status, 404);
    const body = res.body as Record<string, unknown>;
    const error = body["error"] as Record<string, unknown>;
    assert.equal(error["code"], "NOT_FOUND");
  });

  it("download returns 404 for unknown report", async () => {
    const res = await handleDownloadReport(
      makeReq({ params: { reportId: "no_such_report" } })
    );
    assert.ok("status" in res);
    assert.equal((res as { status: number }).status, 404);
  });
});
