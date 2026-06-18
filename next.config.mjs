/** @type {import('next').NextConfig} */
const nextConfig = {
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
