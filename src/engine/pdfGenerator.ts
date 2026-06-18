/**
 * PDF Report Generator
 *
 * Renders an AuditReport as a PDF using pdfkit.
 * Pure module — no network, no credentials.
 *
 * The assembled text is checked against checkProhibitedLanguage() before
 * finalising the document; an error is thrown if any violation is found.
 */

import PDFDocument from "pdfkit";
import { checkProhibitedLanguage } from "./reportBuilder";
import type { AuditReport } from "./reportBuilder";

/**
 * Render an AuditReport to a PDF Buffer.
 *
 * @throws Error if the assembled text contains prohibited language (NFR-L2).
 */
export async function renderReportPdf(report: AuditReport): Promise<Buffer> {
  // --- Pre-flight: check all text for prohibited language ---
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
  if (violations.length > 0) {
    throw new Error(
      `PDF contains prohibited language: ${violations.join(", ")}`
    );
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // --- Header ---
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("Pay Rate Compliance Check Report", { align: "center" });
    doc.moveDown(0.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Business: ${report.businessName}`, { align: "left" })
      .text(`Award: ${report.awardName} (${report.awardCode})`)
      .text(`Check date: ${formatDate(report.generatedAt)}`)
      .text(`FWC rate effective date: ${report.rateTableEffectiveDate}`);

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // --- Summary ---
    doc.fontSize(13).font("Helvetica-Bold").text("Summary");
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(
        `Employees checked: ${report.summary.employeeCountChecked}` +
          `   |   Gaps found: ${report.summary.employeeCountGaps}` +
          `   |   Total estimated underpayment (weekly): $${report.summary.totalGapWeeklyAud.toFixed(2)} AUD`
      );

    if (report.summary.majorityLowConfidence) {
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .font("Helvetica-Oblique")
        .fillColor("#cc0000")
        .text(
          "Note: More than 50% of employees could not be classified with high confidence. " +
            "Manual review is recommended before taking any action on these results."
        )
        .fillColor("black");
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // --- Employee table ---
    doc.fontSize(13).font("Helvetica-Bold").text("Employee Results");
    doc.moveDown(0.5);

    const COL = {
      ref: 50,
      classification: 140,
      confidence: 280,
      current: 340,
      fwc: 395,
      gap: 455,
    };

    // Table header
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .text("Employee Ref", COL.ref, doc.y, { continued: false, width: 85 });
    const headerY = doc.y - doc.currentLineHeight();
    doc.text("Classification / Level", COL.classification, headerY, {
      continued: false,
      width: 135,
    });
    doc.text("Confidence", COL.confidence, headerY, {
      continued: false,
      width: 55,
    });
    doc.text("Current $/hr", COL.current, headerY, {
      continued: false,
      width: 50,
    });
    doc.text("FWC $/hr", COL.fwc, headerY, { continued: false, width: 50 });
    doc.text("Weekly Gap $", COL.gap, headerY, {
      continued: false,
      width: 60,
    });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.2);

    // Table rows
    doc.fontSize(8).font("Helvetica");
    for (const emp of report.employees) {
      if (doc.y > 720) {
        doc.addPage();
      }

      const rowY = doc.y;
      const currentRate =
        emp.currentPayRateHourly !== null
          ? `$${emp.currentPayRateHourly.toFixed(2)}`
          : "N/A";
      const fwcRate =
        emp.fwcRateHourly !== null ? `$${emp.fwcRateHourly.toFixed(2)}` : "N/A";
      const weeklyGap =
        emp.gapWeekly !== null ? `$${emp.gapWeekly.toFixed(2)}` : "N/A";
      const classLabel =
        emp.gapDirection === "EXCLUDED"
          ? `Excluded: ${emp.exclusionReason ?? "unknown"}`
          : (emp.classificationLabel ?? "Unclassified");

      doc.text(truncate(emp.employeeRef, 14), COL.ref, rowY, {
        continued: false,
        width: 85,
      });
      doc.text(truncate(classLabel, 22), COL.classification, rowY, {
        continued: false,
        width: 135,
      });
      doc.text(emp.confidenceScore, COL.confidence, rowY, {
        continued: false,
        width: 55,
      });
      doc.text(currentRate, COL.current, rowY, { continued: false, width: 50 });
      doc.text(fwcRate, COL.fwc, rowY, { continued: false, width: 50 });
      doc.text(weeklyGap, COL.gap, rowY, { continued: false, width: 60 });
      doc.moveDown(0.1);
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // --- Results as at notice ---
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(`Results as at: ${formatDate(report.generatedAt)}`);
    doc.moveDown(0.3);

    // --- Full disclaimer ---
    doc.fontSize(8).font("Helvetica-Oblique").text(report.disclaimerText, {
      align: "justify",
    });

    doc.end();
  });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "…";
}
