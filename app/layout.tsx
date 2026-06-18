import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import NavLinks from "./components/NavLinks";

export const metadata: Metadata = {
  title: "Modern Award Pay Compliance Checker",
  description:
    "Check your employees' pay rates against Fair Work Commission modern award rates.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav" aria-label="Main navigation">
          <div className="site-nav__inner">
            <a href="/" className="site-nav__brand">
              AwardCheck AU
            </a>
            <NavLinks />
          </div>
        </nav>
        {children}
        <footer className="site-footer">
          <p>
            AwardCheck AU — Modern Award Pay Compliance Checker &mdash; Not legal advice &mdash;
            Rates effective 2025-07-01 &mdash; Verify before each pay run.
          </p>
        </footer>
      </body>
    </html>
  );
}
