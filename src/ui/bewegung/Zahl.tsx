import { useLayoutEffect, useRef, useState } from "react";
import { halte, zaehle } from "./zahl.ts";
import { bewegt, tokenMs } from "./zeit.ts";

// Zahlentext, der bei jeder Änderung vom gerade sichtbaren zum neuen Wert zählt.
// Screenreader lesen nur den fertigen Text (unsichtbare Kopie); die zählende Fassung ist für sie verborgen,
// damit die aria-live-Ergebniskarte nicht jedes Zwischenbild ansagt. Ohne Bewegung steht nur der Text da.

export function Zahl({ text }: { text: string }) {
  const [bewegung] = useState(bewegt);
  const sichtbar = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = sichtbar.current;
    if (!el) return;
    // Erstes Bild: sofort der Text; danach vom gerade sichtbaren Stand weiterzählen.
    const von = el.textContent === "" ? text : el.textContent;
    zaehle(el, von, text, tokenMs("--duration-zaehlen"));
  }, [text]);

  useLayoutEffect(() => {
    const el = sichtbar.current;
    return () => {
      if (el) halte(el);
    };
  }, []);

  if (!bewegung) return <>{text}</>;
  return (
    <span className="zahl" data-zahl="">
      <span className="zahl__lesbar">{text}</span>
      <span ref={sichtbar} className="zahl__bild" aria-hidden="true" />
    </span>
  );
}

/** Für den Aufbau des Fensters: lässt eine Zahl-Komponente von 0 auf ihren Wert zählen. */
export function zaehleVonNull(zahl: Element, verzoegerung: number): void {
  const ziel = zahl.querySelector(".zahl__lesbar")?.textContent;
  const bild = zahl.querySelector(".zahl__bild");
  if (ziel && bild) zaehle(bild, null, ziel, tokenMs("--duration-zaehlen-aufbau"), verzoegerung);
}
