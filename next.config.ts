import type { NextConfig } from "next";

/**
 * The case admin exists only when you run `npm run admin` on your own machine.
 * Its routes are named page.admin.tsx / route.admin.ts, and Next only treats them as routes
 * when "admin.tsx" / "admin.ts" are in pageExtensions — so `next build` (Vercel) never ships them.
 */
const adminEnabled = process.env.ADMIN === "1" && process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  pageExtensions: adminEnabled ? ["admin.tsx", "admin.ts", "tsx", "ts", "jsx", "js"] : ["tsx", "ts", "jsx", "js"],
};

export default nextConfig;
