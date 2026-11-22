import type { NextConfig } from "next";

/**
 * The case admin exists only when you run `npm run admin` on your own machine.
 * Its routes are named page.admin.tsx / route.admin.ts, and Next only treats them as routes
 * when "admin.tsx" / "admin.ts" are in pageExtensions — so `next build` (Vercel) never ships them.
 */
const adminEnabled = process.env.ADMIN === "1" && process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // The site and the admin run side by side: separate build folders, so they never overwrite each other's CSS
  distDir: adminEnabled ? ".next-admin" : ".next",
  pageExtensions: adminEnabled ? ["admin.tsx", "admin.ts", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
  // Pasted/uploaded prototypes always run sandboxed, even opened directly, so their scripts can't touch the site.
  // A sandboxed page has no origin, so its own module scripts need the CORS header.
  async headers() {
    return [
      {
        source: "/prototypes/custom/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "sandbox allow-scripts" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
