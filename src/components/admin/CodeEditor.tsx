"use client";

import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { html } from "@codemirror/lang-html";
import { bracketMatching, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { useEffect, useRef } from "react";
import styles from "./CodeEditor.module.css";

/** Every colour is a site token, so the editor follows the light and dark themes */
const theme = EditorView.theme({
  "&": { height: "100%", background: "var(--component-search-field-bg)", color: "var(--color-text-primary)", fontSize: "13px" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6", overflow: "auto" },
  ".cm-content": { padding: "12px 0", caretColor: "var(--component-search-field-caret)" },
  ".cm-line": { padding: "0 16px 0 8px" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--component-search-field-caret)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    background: "color-mix(in oklab, var(--color-text-primary) 18%, transparent)",
  },
  ".cm-activeLine": { background: "color-mix(in oklab, var(--color-text-primary) 4%, transparent)" },
  ".cm-gutters": { background: "transparent", border: 0, color: "var(--color-text-tertiary)" },
  ".cm-activeLineGutter": { background: "transparent", color: "var(--color-text-primary)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 16px", minWidth: "40px" },
  "&.cm-focused .cm-matchingBracket": { background: "color-mix(in oklab, var(--color-text-primary) 16%, transparent)" },
  ".cm-tooltip": {
    border: "1px solid var(--color-border-subtle)",
    borderRadius: "var(--radius-control)",
    background: "var(--color-bg-raised)",
    boxShadow: "var(--shadow-popover)",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete > ul": { fontFamily: "var(--font-mono)", fontSize: "12px" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { background: "var(--color-bg-hover)", color: "var(--color-text-primary)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.tagName, t.keyword, t.controlKeyword, t.moduleKeyword], color: "var(--color-text-primary)", fontWeight: "500" },
  { tag: [t.attributeName, t.propertyName, t.function(t.variableName)], color: "var(--color-text-secondary)" },
  { tag: [t.string, t.attributeValue, t.number, t.bool, t.color], color: "var(--color-text-primary)", opacity: "0.72" },
  { tag: [t.comment, t.angleBracket, t.bracket, t.separator, t.punctuation], color: "var(--color-text-tertiary)" },
]);

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** ⌘S / Ctrl+S */
  onSave: () => void;
  label: string;
};

/** HTML, with embedded CSS and JS: line numbers, highlighting, auto-closing tags and completion. */
export function CodeEditor({ value, onChange, onSave, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onSave });
  useEffect(() => {
    handlers.current = { onChange, onSave };
  });

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          foldGutter(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          closeBrackets(),
          autocompletion(),
          EditorState.tabSize.of(2),
          html(),
          theme,
          syntaxHighlighting(highlight),
          EditorView.contentAttributes.of({ "aria-label": label }),
          keymap.of([
            { key: "Mod-s", preventDefault: true, stopPropagation: true, run: () => (handlers.current.onSave(), true) },
            indentWithTab,
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap,
            ...foldKeymap,
            ...completionKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) handlers.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => editor.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- created once; outside changes are synced below
  }, []);

  // the saved code arrives after the editor opens
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return <div ref={host} className={styles.editor} />;
}
