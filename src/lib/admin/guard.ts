/**
 * Second lock for the admin API (the first is pageExtensions in next.config.ts).
 * Rejects the request unless:
 *  - this is `npm run admin` (dev server with ADMIN=1),
 *  - it comes from the admin page itself: same-origin localhost request with the x-admin header.
 *    A random website you visit can't send that header to localhost without a CORS preflight,
 *    and the preflight fails because we never answer it.
 */
export function adminRequestError(req: Request): string | null {
  if (process.env.NODE_ENV !== "development" || process.env.ADMIN !== "1") return "Admin is disabled";
  if (req.headers.get("x-admin") !== "1") return "Missing admin header";
  const origin = req.headers.get("origin");
  if (!origin) return "Missing origin";
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return "Bad origin";
  }
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]") return "Admin works only on localhost";
  if (req.headers.get("sec-fetch-site") && req.headers.get("sec-fetch-site") !== "same-origin") return "Cross-site request";
  return null;
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
