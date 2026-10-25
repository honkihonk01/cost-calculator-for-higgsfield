import { useRef } from "react";
import type { Note as NoteData } from "../../schema/index.ts";
import { useEinblenden } from "../bewegung/index.ts";

// B15 Hinweis: Farbe nur als Fläche und Punkt, Wort und Satz in Weiß (docs/UI-RULES.md); gleitet beim Erscheinen herein.

const WORDS: Record<NoteData["kind"], string> = {
  info: "HINWEIS",
  assumption: "ANNAHME",
  "no-price": "OHNE PREIS",
  covered: "GEDECKT",
  error: "FEHLER",
};

export function Note({ kind, text, id }: NoteData & { id?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEinblenden(ref);
  return (
    <p ref={ref} className={`note note--${kind}`} role="status" id={id}>
      <span className="note__word">{WORDS[kind]}</span>
      <span className="note__text">{text}</span>
    </p>
  );
}
