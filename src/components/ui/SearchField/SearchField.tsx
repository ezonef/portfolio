import { forwardRef, type InputHTMLAttributes } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./SearchField.module.css";

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Figma: Show shortcut */
  shortcut?: string;
  label: string;
};

/** States from Figma map to CSS: Focused = :focus-within, Filled = input has a value. */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  { shortcut, label, className, ...input },
  ref,
) {
  return (
    <label className={[styles.field, className].filter(Boolean).join(" ")}>
      <span className="visually-hidden">{label}</span>
      <Icon name="search" className={styles.icon} />
      <input ref={ref} type="search" className={styles.input} {...input} />
      {shortcut && <kbd className={styles.kbd}>{shortcut}</kbd>}
    </label>
  );
});
