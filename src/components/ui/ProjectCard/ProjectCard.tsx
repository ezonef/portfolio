import Image from "next/image";
import Link from "next/link";
import { Tag } from "../Tag/Tag";
import styles from "./ProjectCard.module.css";

export type ProjectCardProps = {
  href: string;
  cover: string;
  category: string;
  number: string;
  title: string;
  /** Figma: Show description */
  description?: string;
  meta: string;
  /** smaller cover for dense lists (modal) */
  compact?: boolean;
  onNavigate?: () => void;
};

export function ProjectCard({ href, cover, category, number, title, description, meta, compact, onNavigate }: ProjectCardProps) {
  return (
    <Link href={href} className={styles.card} onClick={onNavigate}>
      <div className={[styles.cover, compact && styles.compact].filter(Boolean).join(" ")}>
        <Image src={cover} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" className={styles.image} />
        <Tag>{category}</Tag>
        <Tag>{number}</Tag>
      </div>
      <div className={styles.caption}>
        <div className={styles.text}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        <p className={styles.meta}>
          {meta}
          <br />
          Open case →
        </p>
      </div>
    </Link>
  );
}
