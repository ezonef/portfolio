/**
 * Scroll to an element with our own easing instead of the browser's "smooth" (which is fast,
 * linear-ish and differs per browser). Ease-in-out: the page starts moving gently, travels,
 * then settles — it reads as one deliberate move. Duration grows with distance but stays short.
 * Any wheel / touch / key press hands control back to the user immediately.
 */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function smoothScrollTo(target: HTMLElement) {
  const header = document.querySelector("header");
  const offset = header && getComputedStyle(header).position.match(/sticky|fixed/) ? header.offsetHeight : 0;
  const from = window.scrollY;
  const to = Math.max(0, target.getBoundingClientRect().top + from - offset);
  const distance = to - from;
  if (Math.abs(distance) < 2) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, to);
    return;
  }

  const duration = Math.min(900, Math.max(450, 350 + Math.abs(distance) * 0.25));
  const start = performance.now();
  let frame = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
  };
  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);

  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, from + distance * ease(t));
    if (t < 1) frame = requestAnimationFrame(tick);
    else stop();
  };
  frame = requestAnimationFrame(tick);
}
