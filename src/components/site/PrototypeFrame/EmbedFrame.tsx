import { frameUrl } from "@/data/case-types";
import styles from "./PrototypeFrame.module.css";

/** A pasted or uploaded HTML prototype. Sandboxed: its scripts run, but can't reach the site around it. */
export function EmbedFrame({ src, title }: { src: string; title: string }) {
  return <iframe src={src} title={title} sandbox="allow-scripts" className={styles.embed} />;
}

/** A Figma file or a live page. It runs on its own origin; a site that refuses frames can still be opened by its link. */
export function LinkFrame({ url, title }: { url: string; title: string }) {
  return (
    <iframe
      src={frameUrl(url)}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      allow="fullscreen"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      className={styles.embed}
    />
  );
}
