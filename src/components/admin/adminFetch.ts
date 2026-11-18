/** Every admin request carries x-admin — the API rejects requests without it (see lib/admin/guard.ts). */
export function adminFetch(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-admin", "1");
  return fetch(url, { ...init, headers, credentials: "same-origin" });
}
