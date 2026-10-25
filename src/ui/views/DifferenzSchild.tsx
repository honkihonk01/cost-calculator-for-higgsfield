import { useLayoutEffect, useRef, useState } from "react";
import { formatMoney, type GrossText, grossChange } from "../../kern/index.ts";
import { bewegt } from "../bewegung/index.ts";

// Differenz-Schild am großen Preis (Wunsch vom Nutzer am 25.10.2026): Ändert sich der Preis, erscheint daneben
// kurz „+12,40 €“ oder „−12,40 €“, gerechnet gegen die Zahl, die vorher dastand. Es blendet schnell ein, steht eine
// Sekunde und blendet langsam aus (Zeiten in tokens.css). Die Differenz rechnet der Kern (grossChange).
// Für Screenreader verborgen: Die Ergebniskarte sagt den neuen Betrag ohnehin an.

type Schild = { nr: number; text: string; richtung: "plus" | "minus" };

export function DifferenzSchild({ gross }: { gross: GrossText | null }) {
  const vorher = useRef(gross);
  const [schild, setSchild] = useState<Schild | null>(null);

  useLayoutEffect(() => {
    const alt = vorher.current;
    vorher.current = gross;
    if (!alt || !gross || alt === gross || !bewegt()) return;
    const change = grossChange(alt, gross);
    if (!change) return;
    const minus = change.amount.startsWith("-");
    const betrag = formatMoney(minus ? change.amount.slice(1) : change.amount, change.unit);
    // Unter einem Cent zeigt die Anzeige keinen Unterschied, also auch kein Schild.
    if (formatMoney("0", change.unit) === betrag) return;
    setSchild((jetzt) => ({
      nr: (jetzt?.nr ?? 0) + 1,
      text: `${minus ? "−" : "+"}${betrag}`,
      richtung: minus ? "minus" : "plus",
    }));
  }, [gross]);

  if (!schild) return null;
  return (
    <span
      key={schild.nr}
      className={`differenz differenz--${schild.richtung}`}
      aria-hidden="true"
      // Nach dem langsamen Ausblenden verschwindet das Schild ganz.
      onAnimationEnd={(event) => event.animationName === "differenz-aus" && setSchild(null)}
    >
      {schild.text}
    </span>
  );
}
