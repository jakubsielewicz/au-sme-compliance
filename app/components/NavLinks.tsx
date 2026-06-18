"use client";

/**
 * NavLinks — client component so we can use usePathname for active link styling.
 * CSP-safe: no inline scripts.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <ul className="site-nav__links" role="list">
      <li>
        <Link href="/" className={isActive("/") ? "active" : ""}>
          Home
        </Link>
      </li>
      <li>
        <Link href="/check" className={isActive("/check") ? "active" : ""}>
          Check
        </Link>
      </li>
      <li>
        <Link href="/history" className={isActive("/history") ? "active" : ""}>
          History
        </Link>
      </li>
    </ul>
  );
}
