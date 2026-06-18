/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdfkit and its transitive deps (fontkit, restructure, iconv-lite) use
  // Node-only APIs. Mark them as server externals so Next.js passes them
  // through to Node at runtime instead of trying to bundle them with webpack.
  serverExternalPackages: ["pdfkit", "fontkit", "restructure", "iconv-lite"],

  // Strict mode for catching issues early
  reactStrictMode: true,

  // Disable powered-by header (secure default)
  poweredByHeader: false,

  // Security headers for the app shell
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
