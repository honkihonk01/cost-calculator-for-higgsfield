import { formatCredits } from "../../kern/index.ts";
import type { PriceData, Result } from "../../schema/index.ts";
import { Zahl } from "../bewegung/index.ts";
import { Note, NoteList, ResultTabs } from "../components/index.ts";
import { grossText, netText, notesIn, pathLabel, paymentText } from "./anzeige.ts";
import { DifferenzSchild } from "./DifferenzSchild.tsx";
import { DetailsTab, PathsTab } from "./ErgebnisReiter.tsx";
import { PaketTabelle } from "./Kaufplan.tsx";

// Ergebnisbereich (docs/UI-RULES.md, Abschnitt A): oben genau eine Antwort, darunter Reiter für Produktionswege
// und Details (AC-F10-7). Bei ungültigen Feldern die Meldung statt veralteter Zahlen (AC-F10-3).

export type ResultView =
  | { state: "loading" }
  | { state: "data-error"; messages: string[] }
  | { state: "invalid"; messages: string[] }
  | { state: "incomplete"; missing: string[] }
  | { state: "ready"; result: Result; data: PriceData; rateLoading: boolean };

export const RESULT_TABS = [
  { value: "wege", label: "Produktionswege" },
  { value: "details", label: "Details" },
] as const;

export function Ergebnisbereich({
  view,
  tab,
  onTabChange,
}: {
  view: ResultView;
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  return (
    <div className="result-area__inner">
      {view.state === "loading" ? <p className="placeholder">Preisdaten werden geladen …</p> : null}
      {view.state === "data-error" || view.state === "invalid" ? (
        <div className="notes" aria-live="polite">
          {view.messages.map((message) => (
            <Note key={message} kind="error" text={message} />
          ))}
        </div>
      ) : null}
      {view.state === "incomplete" ? (
        <Note kind="info" text={`Gib noch an: ${view.missing.join(", ")}. Dann erscheint hier sofort das Ergebnis.`} />
      ) : null}
      {view.state === "ready" ? (
        <>
          <Answer result={view.result} rateLoading={view.rateLoading} />
          <ResultTabs
            value={tab}
            onChange={onTabChange}
            tabs={[
              { ...RESULT_TABS[0], content: <PathsTab result={view.result} /> },
              { ...RESULT_TABS[1], content: <DetailsTab result={view.result} /> },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * B12: die Kosten deiner Auswahl (gewähltes Video- und Bildmodell), groß brutto, klein netto und Credits, darunter
 * die Pakete als Tabelle (AC-F10-7, AC-F10-12). Begründungen stehen aufgeklappt in der Liste darunter.
 * Zahlen zählen bei jeder Änderung, neben dem Preis erscheint kurz die Differenz (UI-RULES §11).
 */
function Answer({ result, rateLoading }: { result: Result; rateLoading: boolean }) {
  const { overall } = result.recommendations;
  const plan = overall.plan;
  // Ohne Kurs betrifft der Kurs-Hinweis die Zahl oben (in Dollar statt Euro), deshalb steht er dann hier.
  const rateNotes = result.exchangeRate === null && !rateLoading ? notesIn(result, "rate") : [];
  return (
    <section className="answer" aria-label="Kosten deiner Auswahl">
      <div className="card answer__card" aria-live="polite" aria-atomic="true">
        <p className="answer__label">Deine Auswahl</p>
        {plan ? (
          <>
            <p className="answer__title">
              {pathLabel(result, plan.pathId)} {paymentText(plan)}
            </p>
            <p className="answer__value num">
              <Zahl text={grossText(plan)} />
              <DifferenzSchild gross={plan.gross} />
            </p>
            <p className="answer__meta num">
              <Zahl
                text={`netto ${netText(plan)} · ${formatCredits(plan.creditsNeeded)} Bedarf${plan.shortfall === "0" ? "" : `, davon ${formatCredits(plan.shortfall)} fehlend`}`}
              />
            </p>
            <PaketTabelle plan={plan} />
          </>
        ) : (
          <p className="answer__title">{overall.sentence}</p>
        )}
      </div>
      {rateLoading && result.exchangeRate === null ? (
        <Note kind="info" text="Der Wechselkurs wird abgerufen. Bis dahin stehen die Beträge in Dollar." />
      ) : null}
      <NoteList notes={rateNotes} />
    </section>
  );
}
