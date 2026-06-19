import { NextRequest, NextResponse } from "next/server";

/**
 * Nonce-based Content-Security-Policy for the App Router.
 *
 * Why middleware and not vercel.json: a per-request nonce can only be generated
 * at request time, and — unlike vercel.json headers — middleware also runs under
 * `next dev`, so the CSP is verifiable locally before deploy.
 *
 * 'strict-dynamic' lets Next's nonced bootstrap script load its own chunks; the
 * browser then ignores host/'self' script sources (kept for older browsers).
 * Inline style *attributes* cannot carry a nonce, so style-src keeps
 * 'unsafe-inline' (low risk relative to scripts). 'unsafe-eval' is dev-only (HMR).
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  // Pass the nonce + CSP into the request so Next applies the nonce to the
  // scripts it renders, then set the CSP on the response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // All document routes except static assets and JSON API routes.
    // Skip prefetch requests so prefetched payloads aren't nonce-mismatched.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
