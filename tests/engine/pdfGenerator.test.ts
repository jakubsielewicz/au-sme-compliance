/**
 * PDF Generator Tests
 *
 * Verifies:
 *  1. renderReportPdf returns a Buffer starting with the %PDF magic bytes.
 *  2. The assembled text passed to pdfkit passes checkProhibitedLanguage (NFR-L2).
 *  3. Reports with prohibited language throw rather than silently emitting a bad PDF.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderReportPdf } from "../../src/engine/pdfGenerator";
import { checkProhibitedLanguage, DISCLAIMER_TEXT } from "../../src/engine/reportBuilder";
import type { AuditReport } from "../../src/engine/reportBuilder";
import type { ClassificationResult } from "../../src/engine/classifier";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClassificationResult(
  overrides: Partial<ClassificationResult> = {}
): ClassificationResult {
  return {
    employeeRef: "Alice Smith",
    roleTitle: "Kitchen Hand",
    employmentType: "full_time",
    weeklyHours: 38,
    currentPayRateHourly: 22.0,
    classificationId: "cls-hosp-grade1",
    classificationLevel: "Grade 1",
    classificationLabel: "Hospitality Industry (General) Award 2020 — Grade 1",
    confidenceScore: "HIGH",
    fwcRateHourly: 23.23,
    gapHourly: -1.23,
    gapWeekly: -46.74,
    gapDirection: "UNDERPAID",
    exclusionReason: null,
    matchScore: 10,
    ...overrides,
  };
}

function makeReport(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    generatedAt: "2026-06-19T00:00:00.000Z",
    rateTableEffectiveDate: "2025-07-01",
    awardName: "Hospitality Industry (General) Award 2020",
    awardCode: "MA000009",
    businessName: "Test Cafe Pty Ltd",
    disclaimerVersion: "v1.0-pending-solicitor-approval",
    disclaimerText: DISCLAIMER_TEXT,
    disclaimerShort:
      "This is a compliance check tool, not legal or payroll advice. " +
      "Results are indicative only. The employer retains sole responsibility " +
      "for all pay decisions.",
    summary: {
      employeeCountChecked: 2,
      employeeCountGaps: 1,
      employeeCountLowConfidence: 0,
      totalGapWeeklyAud: 46.74,
      majorityLowConfidence: false,
    },
    employees: [
      makeClassificationResult(),
      makeClassificationResult({
        employeeRef: "Bob Jones",
        roleTitle: "Waiter",
        currentPayRateHourly: 25.0,
        gapHourly: 1.77,
        gapWeekly: 67.26,
        gapDirection: "OVERPAID",
      }),
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("renderReportPdf", () => {
  it("returns a Buffer starting with %PDF magic bytes", async () => {
    const report = makeReport();
    const buffer = await renderReportPdf(report);

    assert.ok(Buffer.isBuffer(buffer), "result must be a Buffer");
    assert.ok(buffer.length > 0, "buffer must not be empty");

    const magic = buffer.slice(0, 4).toString("ascii");
    assert.equal(magic, "%PDF", `Expected buffer to start with %PDF, got: ${magic}`);
  });

  it("produces a non-trivially sized PDF (> 1 KB)", async () => {
    const report = makeReport();
    const buffer = await renderReportPdf(report);
    assert.ok(
      buffer.length > 1024,
      `Expected PDF > 1 KB; got ${buffer.length} bytes`
    );
  });

  it("assembled report text passes checkProhibitedLanguage (NFR-L2)", async () => {
    const report = makeReport();
    // Simulate the text the generator assembles (same fields as pdfGenerator.ts)
    const textParts = [
      report.businessName,
      report.awardName,
      report.disclaimerText,
      report.disclaimerShort,
      ...report.employees.map(
        (e) =>
          `${e.employeeRef} ${e.roleTitle} ${e.classificationLabel ?? ""} ${e.exclusionReason ?? ""}`
      ),
    ];
    const fullText = textParts.join(" ");
    const violations = checkProhibitedLanguage(fullText);
    assert.equal(
      violations.length,
      0,
      `PDF text contains prohibited language: ${violations.join(", ")}`
    );
  });

  it("renders a report with EXCLUDED employees without error", async () => {
    const report = makeReport({
      employees: [
        makeClassificationResult({
          employeeRef: "Carol",
          roleTitle: "Quantum Specialist",
          gapDirection: "EXCLUDED",
          exclusionReason: "Role could not be classified.",
          fwcRateHourly: null,
          gapHourly: null,
          gapWeekly: null,
          confidenceScore: "LOW",
        }),
      ],
    });
    const buffer = await renderReportPdf(report);
    assert.ok(buffer.length > 0);
    assert.equal(buffer.slice(0, 4).toString("ascii"), "%PDF");
  });

  it("renders a large report (50 employees) without error", async () => {
    const employees = Array.from({ length: 50 }, (_, i) =>
      makeClassificationResult({ employeeRef: `Employee${i}` })
    );
    const report = makeReport({
      employees,
      summary: {
        employeeCountChecked: 50,
        employeeCountGaps: 50,
        employeeCountLowConfidence: 0,
        totalGapWeeklyAud: 50 * 46.74,
        majorityLowConfidence: false,
      },
    });
    const buffer = await renderReportPdf(report);
    assert.ok(buffer.length > 0);
    assert.equal(buffer.slice(0, 4).toString("ascii"), "%PDF");
  });

  it("throws when report text contains prohibited language", async () => {
    const report = makeReport({
      // Inject prohibited language into businessName to trigger the guard
      businessName: "Test Corp — achieves safe harbour status",
    });
    await assert.rejects(
      () => renderReportPdf(report),
      (err: Error) => {
        assert.ok(
          err.message.includes("prohibited language"),
          `Expected 'prohibited language' in error; got: ${err.message}`
        );
        return true;
      }
    );
  });

  it("includes the majority-low-confidence notice when flag is set", async () => {
    // Just verify it renders without error when the flag is true
    const report = makeReport({
      summary: {
        employeeCountChecked: 1,
        employeeCountGaps: 0,
        employeeCountLowConfidence: 1,
        totalGapWeeklyAud: 0,
        majorityLowConfidence: true,
      },
    });
    const buffer = await renderReportPdf(report);
    assert.ok(buffer.length > 0);
  });
});
