import { Tabs } from "radix-ui";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import type { Note as NoteData } from "../../schema/index.ts";
import { staffeln, useMarkierung, Zahl } from "../bewegung/index.ts";
import { Note } from "./hinweis.tsx";

// Hinweisliste, Wertzeile und Ergebnis-Reiter (docs/UI-RULES.md); B13a Akkordeon in akkordeon.tsx.

export function NoteList({ notes }: { notes: NoteData[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="notes">
      {notes.map((note) => (
        <Note key={note.text} kind={note.kind} text={note.text} />
      ))}
    </div>
  );
}

/** Wertzeile im Reiter „Details“: Beschriftung links, Wert mit Einheit rechts. */
export function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="value-row">
      <dt>{label}</dt>
      <dd className="num">
        <Zahl text={value} />
      </dd>
    </div>
  );
}

export type ResultTab = { value: string; label: string; content: ReactNode };

/**
 * Ergebnis-Reiter als Pill-Reiter (B4) auf Radix Tabs; immer nur ein Inhalt sichtbar (AC-F10-7).
 * Beim Wechsel gleitet die Markierung, und der neue Inhalt erscheint Element für Element (UI-RULES §11).
 */
export function ResultTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: ResultTab[];
  value: string;
  onChange: (value: string) => void;
}) {
  const wurzel = useRef<HTMLDivElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  useMarkierung(liste);
  const erstes = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: staffelt bewusst bei jedem Reiterwechsel
  useLayoutEffect(() => {
    if (erstes.current) {
      erstes.current = false;
      return;
    }
    // Radix setzt den Inhalt des neuen Reiters erst im nächsten Durchgang ein; vor dem ersten Bild ist er da.
    const bild = requestAnimationFrame(() => {
      const panel = wurzel.current?.querySelector('.result-tabs__panel[data-state="active"]');
      if (panel) staffeln(panel);
    });
    return () => cancelAnimationFrame(bild);
  }, [value]);
  return (
    <Tabs.Root ref={wurzel} className="result-tabs" value={value} onValueChange={onChange}>
      <Tabs.List ref={liste} className="pills" aria-label="Ergebnis im Einzelnen">
        {tabs.map((tab) => (
          <Tabs.Trigger key={tab.value} value={tab.value}>
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab) => (
        <Tabs.Content key={tab.value} value={tab.value} className="result-tabs__panel">
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
