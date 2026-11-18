"use client";

import { forwardRef, useCallback, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string };

/** Textarea that grows with its text — long descriptions wrap down instead of scrolling sideways. */
export const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea({ value, rows = 1, ...rest }, outer) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const setRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inner.current = el;
      if (typeof outer === "function") outer(el);
      else if (outer) outer.current = el;
    },
    [outer],
  );

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return <textarea ref={setRef} rows={rows} value={value} {...rest} />;
});
