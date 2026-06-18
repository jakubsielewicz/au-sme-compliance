/**
 * Compliance Check Engine — Public API
 *
 * Orchestrates: CSV parse → validate → classify → gap-calc → audit report.
 * Pure module: no network, no DB, no credentials.
 */

export { validateCsvFile, parseCsv, parseCsvLine } from "./csvParser";
export type { ColumnMapping, EmployeeRow, ParseResult, ParseError, CsvValidationResult } from "./csvParser";

export { classifyEmployee, classifyAll } from "./classifier";
export type { ClassificationResult, ConfidenceScore, GapDirection, ClassifyOptions } from "./classifier";

export {
  buildAuditReport,
  checkProhibitedLanguage,
  DISCLAIMER_TEXT,
  DISCLAIMER_SHORT,
  DISCLAIMER_VERSION,
} from "./reportBuilder";
export type { AuditReport, AuditReportSummary } from "./reportBuilder";

export { AWARDS, AWARD_CLASSIFICATIONS, AWARD_RATES, RATE_TABLE_EFFECTIVE_DATE } from "../fixtures/awards";
export type { Award, AwardClassification, AwardRate, EmploymentType } from "../fixtures/awards";

import { validateCsvFile, parseCsv } from "./csvParser";
import { classifyAll } from "./classifier";
import { buildAuditReport } from "./reportBuilder";
import type { ColumnMapping } from "./csvParser";
import type { AuditReport } from "./reportBuilder";
import { AWARDS } from "../fixtures/awards";

export interface RunCheckOptions {
  csvContent: string;
  fileSizeBytes: number;
  awardCode: string;
  mapping: ColumnMapping;
  businessName: string;
  checkDate?: string;
}

export interface RunCheckResult {
  success: boolean;
  report: AuditReport | null;
  errors: Array<{ field: string | null; message: string; rowIndex?: number | null }>;
}

/**
 * Run the full compliance check pipeline.
 * This is the single entry point for the API layer.
 */
export function runComplianceCheck(options: RunCheckOptions): RunCheckResult {
  const { csvContent, fileSizeBytes, awardCode, mapping, businessName, checkDate } = options;

  // 1. Validate file
  const fileValidation = validateCsvFile(csvContent, fileSizeBytes);
  if (!fileValidation.valid) {
    return {
      success: false,
      report: null,
      errors: fileValidation.errors.map((e) => ({
        field: e.field,
        message: e.message,
        rowIndex: e.rowIndex,
      })),
    };
  }

  // 2. Look up award
  const award = AWARDS.find((a) => a.code === awardCode && a.isActive);
  if (!award) {
    return {
      success: false,
      report: null,
      errors: [{ field: "award_code", message: `Award "${awardCode}" is not supported.` }],
    };
  }

  // 3. Parse CSV
  const parseResult = parseCsv(csvContent, mapping);
  if (parseResult.rows.length === 0) {
    return {
      success: false,
      report: null,
      errors: [
        ...parseResult.errors.map((e) => ({
          field: e.field,
          message: e.message,
          rowIndex: e.rowIndex,
        })),
        { field: null, message: "No valid employee rows could be parsed from the CSV." },
      ],
    };
  }

  // 4. Classify and calculate gaps
  const results = classifyAll(parseResult.rows, awardCode);

  // 5. Build audit report
  const report = buildAuditReport({
    results,
    awardName: award.name,
    awardCode,
    businessName,
    checkDate,
  });

  return {
    success: true,
    report,
    errors: parseResult.errors.map((e) => ({
      field: e.field,
      message: e.message,
      rowIndex: e.rowIndex,
    })),
  };
}
