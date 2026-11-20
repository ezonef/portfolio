import Image from "next/image";
import Link from "next/link";
import { Tag } from "../Tag/Tag";
import styles from "./ProjectCard.module.css";

export type ProjectCardProps = {
  href: string;
  cover: string;
  /** First tag of the case */
  tag?: string;
  title: string;
  /** Figma: Show description */
  description?: string;
  /** Extra tags — shown as a "+N" tag after the first tag */
  more?: number;
};

/** Figma: ProjectCard — photo cover with the case's tags (first tag + "+N", Tone=Muted), title, description. */
export function ProjectCard({ href, cover, tag, title, description, more }: ProjectCardProps) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cover}>
        <Image src={cover} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" className={styles.image} />
        {tag && (
          <div className={styles.tags}>
            <Tag tone="muted">{tag}</Tag>
            {!!more && <Tag tone="muted">+{more}</Tag>}
          </div>
        )}
      </div>
      <div className={styles.text}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </Link>
  );
}
