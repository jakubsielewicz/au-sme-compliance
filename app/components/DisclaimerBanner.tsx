"use client";

/**
 * DisclaimerBanner — short form disclaimer (NFR-L2: tool not adviser).
 * Shown on check, results, and history screens.
 */

// DISCLAIMER_SHORT from reportBuilder — imported to avoid duplication
const DISCLAIMER_SHORT =
  "This is a compliance check tool, not legal or payroll advice. " +
  "Results are indicative only. The employer retains sole responsibility " +
  "for all pay decisions.";

export default function DisclaimerBanner() {
  return (
    <div className="banner banner-info" style={{ marginBottom: "1rem" }}>
      <strong style={{ fontWeight: 700 }}>Disclaimer: </strong>
      {DISCLAIMER_SHORT}
    </div>
  );
}
