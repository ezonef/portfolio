import styles from "./PrototypeFrame.module.css";

/** A pasted or uploaded HTML prototype. Sandboxed: its scripts run, but can't reach the site around it. */
export function EmbedFrame({ src, title }: { src: string; title: string }) {
  return <iframe src={src} title={title} sandbox="allow-scripts" className={styles.embed} />;
}
