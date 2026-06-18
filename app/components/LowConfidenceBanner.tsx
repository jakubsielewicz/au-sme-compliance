"use client";

/**
 * LowConfidenceBanner — NFR-L3 warning shown when any employee is LOW confidence
 * or when summary.majorityLowConfidence is true.
 */

interface Props {
  employeeCount: number;
}

export default function LowConfidenceBanner({ employeeCount }: Props) {
  return (
    <div className="banner banner-warning" style={{ marginBottom: "1rem" }}>
      <strong style={{ fontWeight: 700 }}>Low-confidence classifications detected </strong>
      — {employeeCount} employee{employeeCount !== 1 ? "s" : ""}{" "}
      could not be confidently mapped to an award classification. For these employees,
      we recommend verifying the award with the{" "}
      <a
        href="https://www.fairwork.gov.au/find-my-award"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "inherit", fontWeight: 600, textDecoration: "underline" }}
      >
        FWO Find My Award tool
      </a>{" "}
      before relying on this result.
    </div>
  );
}
