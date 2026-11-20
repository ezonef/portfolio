/** Shared bits of the "encrypted → decrypted" effect (home hero). */

export const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export const randomGlyph = () => CIPHER[(Math.random() * CIPHER.length) | 0];

/** One row of ciphertext like "8dKa824HDs .. 1fKa12jfj : aFdzxz", exactly `len` characters long. */
export function cipherRow(len: number) {
  let s = "";
  while (s.length < len) {
    const n = 4 + ((Math.random() * 11) | 0);
    for (let i = 0; i < n; i++) s += randomGlyph();
    s += Math.random() < 0.5 ? " .. " : " : ";
  }
  return s.slice(0, len);
}

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** ease-out cubic, close to the site's --ease-out */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
