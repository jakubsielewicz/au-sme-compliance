/**
 * Landing page — US-01
 *
 * Pricing, how-it-works, verbatim disclaimer visible above fold, waitlist form.
 * Server component (no "use client") — form submission is handled client-side
 * via the WaitlistForm component.
 */

import Link from "next/link";
import WaitlistForm from "./components/WaitlistForm";

const DISCLAIMER_VERBATIM =
  "This tool generates evidence of a pay-rate compliance check. It does not " +
  "constitute legal advice or payroll advice, and does not achieve safe-harbour " +
  "status under the Voluntary Small Business Wage Compliance Code.";

export default function HomePage() {
  return (
    <main>
      {/* Disclaimer — visible without scrolling on desktop (NFR-L2, US-01) */}
      <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "0.6rem 1rem" }}>
        <div className="container" style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p style={{ fontSize: "0.82rem", color: "#78350f", margin: 0 }}>
            <strong>Important: </strong>{DISCLAIMER_VERBATIM}
          </p>
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <span className="hero__eyebrow">For Australian SME Employers</span>
        <h1 className="hero__headline">
          Modern Award Pay Compliance — without the guesswork
        </h1>
        <p className="hero__sub">
          Upload your payroll CSV, map columns once, and get an audit-ready PDF report
          showing exactly how your employees' pay compares to the current Fair Work
          Commission rates. Built for hospitality, retail, and professional services SMEs.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/check" className="btn btn-primary btn-lg">
            Start a compliance check
          </Link>
          <a href="#waitlist" className="btn btn-outline btn-lg">
            Join the waitlist
          </a>
        </div>
      </section>

      {/* How it works */}
      <section className="how-it-works">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2>How it works</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginTop: "0.4rem", marginBottom: 0 }}>
            Three steps from payroll CSV to audit-ready report
          </p>
        </div>
        <div className="how-it-works__grid">
          <div>
            <div className="how-step__num">1</div>
            <div className="how-step__title">Upload your payroll CSV</div>
            <p className="how-step__desc">
              Export from Xero, MYOB, or any spreadsheet. Select the relevant
              modern award for your business.
            </p>
          </div>
          <div>
            <div className="how-step__num">2</div>
            <div className="how-step__title">Map your columns</div>
            <p className="how-step__desc">
              Tell us which columns contain employee name, role, hours, and hourly rate.
              We auto-suggest common header names.
            </p>
          </div>
          <div>
            <div className="how-step__num">3</div>
            <div className="how-step__title">Download your audit report</div>
            <p className="how-step__desc">
              Get a PDF showing every employee's classification, confidence score,
              current FWC rate, and any pay gap — dated and disclaimer-stamped.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing-section">
        <h2>Simple, transparent pricing</h2>
        <p className="pricing-section__sub">Annual billing saves 10% on all plans.</p>
        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-card__tier">Starter</div>
            <div className="pricing-card__price">$49<span>/mo</span></div>
            <div className="pricing-card__note">or $44/mo billed annually</div>
            <ul className="pricing-card__features">
              <li>Up to 5 employees per check</li>
              <li>1 active award</li>
              <li>PDF audit reports</li>
              <li>14-day free trial</li>
              <li>Email support</li>
            </ul>
            <Link href="/check" className="btn btn-outline w-full">
              Start free trial
            </Link>
          </div>
          <div className="pricing-card pricing-card--featured">
            <div className="pricing-card__badge">Most Popular</div>
            <div className="pricing-card__tier">Pro</div>
            <div className="pricing-card__price">$79<span>/mo</span></div>
            <div className="pricing-card__note">or $71/mo billed annually</div>
            <ul className="pricing-card__features">
              <li>Up to 500 employees per check</li>
              <li>All 3 supported awards</li>
              <li>PDF audit reports</li>
              <li>90-day report history</li>
              <li>14-day free trial</li>
              <li>Priority support</li>
            </ul>
            <Link href="/check" className="btn btn-primary w-full">
              Start free trial
            </Link>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "1rem" }}>
          All plans include a 14-day free trial. No credit card required to start.
          Annual billing discount applied at checkout.
        </p>
      </section>

      {/* Disclaimer block */}
      <div style={{ padding: "1.5rem 1rem", background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        <div className="disclaimer-block">
          <strong>Legal disclaimer</strong>
          {DISCLAIMER_VERBATIM} Results are as at the rate table date shown in each report.
          Award rates are updated annually each July. Verify before each pay run.
          The employer retains sole responsibility for all pay decisions.
        </div>
      </div>

      {/* Waitlist */}
      <section className="waitlist-section" id="waitlist">
        <div style={{ textAlign: "center", maxWidth: "500px", margin: "0 auto" }}>
          <h2>Get early access</h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
            We're in private preview. Join the waitlist and we'll notify you when
            your spot opens.
          </p>
          <WaitlistForm />
        </div>
      </section>
    </main>
  );
}
