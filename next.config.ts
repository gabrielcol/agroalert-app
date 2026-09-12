import type { NextConfig } from "next";

// Validate env at build/boot (throws on missing required vars).
import "./src/env";

const isDev = process.env.NODE_ENV !== "production";

// The Better Auth client posts to NEXT_PUBLIC_BETTER_AUTH_URL. Normally this is
// the app's own origin (covered by connect-src 'self'), but if it's ever a
// separate origin the sign-in/session requests must be allowlisted in the CSP.
function authOrigin(): string | null {
  const url =
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy. `frame-src 'none'` + `frame-ancestors 'none'` block
 * clickjacking of the signed-in pages.
 *
 * In development Next's HMR needs `'unsafe-eval'` and a websocket connection, so
 * the policy is relaxed there; production gets the strict form. `'unsafe-inline'`
 * on script/style stays in both because Next injects inline bootstrap scripts and
 * the app ships inline styles (Tailwind) without a nonce pipeline.
 *
 * RESIDUAL RISK / follow-up: keeping `'unsafe-inline'` in `script-src` means the
 * CSP does not by itself stop an injected inline `<script>`. Removing it requires
 * a per-request nonce (Next 16 `proxy.ts` generating a nonce + `strict-dynamic`,
 * with pages forced dynamic). If you render user-supplied HTML, sanitize it on
 * write and render — there is no sanitizer in this template.
 */
const authSrc = authOrigin();
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://images.unsplash.com",
  "media-src 'self'",
  "font-src 'self' data:",
  // tRPC is same-origin; add the Better Auth origin in case it differs; dev
  // also needs the HMR websocket.
  `connect-src 'self'${authSrc ? ` ${authSrc}` : ""}${isDev ? " ws: wss:" : ""}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Geolocation stays first-party only: the teren step's locate button
    // (issue 0004) reads the phone's position; camera and microphone stay off.
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  // HSTS only in production — local dev/e2e runs over plain HTTP.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  images: {
    // Shadcn Studio MCP components use Unsplash images.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
