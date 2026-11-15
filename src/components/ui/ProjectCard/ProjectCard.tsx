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
  onNavigate?: () => void;
};

/** Figma: ProjectCard — photo cover with Category + Number tags (Tone=Muted), title, description. */
export function ProjectCard({ href, cover, category, number, title, description, onNavigate }: ProjectCardProps) {
  return (
    <Link href={href} className={styles.card} onClick={onNavigate}>
      <div className={styles.cover}>
        <Image src={cover} alt="" fill sizes="(max-width: 760px) 100vw, 33vw" className={styles.image} />
        <div className={styles.tags}>
          <Tag tone="muted">{category}</Tag>
          <Tag tone="muted">{number}</Tag>
        </div>
      </div>
      <div className={styles.text}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </div>
    </Link>
  );
}
