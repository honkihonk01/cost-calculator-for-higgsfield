import type { ReactNode } from "react";
import { useAufklappen, Zahl } from "../bewegung/index.ts";
import { Icon } from "./Icon.tsx";

// B13a Optionszeile als Akkordeon (docs/UI-RULES.md): zugeklappt Titel, Chips, Preis und Differenz zu deiner Auswahl,
// ohne Rahmen um die Zahl; aufgeklappt die Details.
// Natives <details>/<summary>, damit Tastatur und Screenreader ohne eigenen Code funktionieren (UI-RULES §15).
// Klappt weich auf und zu (useAufklappen); `data-flip` lässt die Zeile beim Umsortieren an ihren Platz gleiten.

export function OptionAccordion({
  title,
  chips,
  tile,
  highlight,
  pill,
  children,
}: {
  title: string;
  chips: string[];
  tile?: { value: string; below: string };
  highlight?: boolean;
  pill?: string;
  children: ReactNode;
}) {
  const ref = useAufklappen<HTMLDetailsElement>();
  return (
    <li data-flip={title}>
      <details ref={ref} className="option-acc" data-highlight={highlight ? "true" : undefined}>
        <summary className="option-acc__summary">
          <span className="option-acc__head">
            <span className="option__title">
              {title}
              {pill ? <span className="pill-lime">{pill}</span> : null}
            </span>
            {chips.length > 0 ? (
              <span className="option__chips">
                {chips.map((chip) => (
                  <span key={chip} className="meta-chip">
                    {chip}
                  </span>
                ))}
              </span>
            ) : null}
          </span>
          {tile ? (
            <span className="option-acc__price">
              <span className="option-acc__amount num">
                <Zahl text={tile.value} />
              </span>
              <span className="option-acc__below">
                <Zahl text={tile.below} />
              </span>
            </span>
          ) : null}
          <Icon name="chevronDown" className="option-acc__chevron" />
        </summary>
        <div>
          <div className="option-acc__body">{children}</div>
        </div>
      </details>
    </li>
  );
}
