import type { TotalResult } from "../../kern/index.ts";
import { formatCredits } from "../../kern/index.ts";
import type { AppError } from "../../schema/index.ts";
import { Zahl } from "../bewegung/index.ts";
import { Note, NoteList } from "../components/index.ts";
import { KostenZahlen, PaketTabelle } from "./Kaufplan.tsx";

// Ergebnis der Gesamtkalkulation (SPEC F15): oben die Kosten aller ausgewählten Projekte zusammen, groß brutto,
// darunter etwas kleiner die Credits, klein netto, mit Pakettabelle; darunter die Projekte mit ihrem Credit-Bedarf,
// Summe, Kontostand und Fehlbetrag, damit sich nachvollziehen lässt, wie die Zahl oben entsteht.

export type TotalView =
  | { state: "empty" }
  | { state: "invalid"; errors: AppError[] }
  | { state: "ready"; result: TotalResult; rateLoading: boolean; hasRate: boolean };

export function GesamtErgebnis({ view }: { view: TotalView }) {
  if (view.state === "empty") {
    return (
      <Note kind="info" text="Hake links mindestens ein gespeichertes Projekt an; dann erscheint hier die Summe." />
    );
  }
  if (view.state === "invalid") {
    return (
      <div className="notes" aria-live="polite">
        {view.errors.map((error) => (
          <Note key={error.message} kind="error" text={error.message} />
        ))}
      </div>
    );
  }
  const { result } = view;
  const { plan } = result;
  const counted = result.projects.filter((project) => project.credits !== null).length;
  return (
    <div className="result-area__inner">
      <section className="answer" aria-label="Kosten der Gesamtkalkulation">
        <div className="card answer__card" aria-live="polite" aria-atomic="true">
          <p className="answer__label">Gesamtkalkulation</p>
          <p className="answer__title">
            {counted === 1 ? "1 Projekt" : `${counted} Projekte`} zusammen über Credit-Pakete
          </p>
          {plan ? (
            <>
              <KostenZahlen plan={plan} credits={result.totalCredits} />
              <PaketTabelle plan={plan} />
            </>
          ) : (
            <p className="answer__meta">Für keine Paketgröße ist ein Preis hinterlegt.</p>
          )}
        </div>
        {view.rateLoading && !view.hasRate ? (
          <Note kind="info" text="Der Wechselkurs wird abgerufen. Bis dahin stehen die Beträge in Dollar." />
        ) : null}
      </section>

      <section className="value-group" aria-label="Credit-Bedarf der Projekte">
        <table className="buy-table">
          <caption>Credit-Bedarf der Projekte, ohne ihre gespeicherten Kontostände</caption>
          <thead>
            <tr>
              <th scope="col">Projekt</th>
              <th scope="col">Weg</th>
              <th scope="col">Credit-Bedarf</th>
            </tr>
          </thead>
          <tbody>
            {result.projects.map((project) => (
              <tr key={project.name}>
                <td>{project.name}</td>
                <td>{project.pathLabel ?? "–"}</td>
                <td className="num">
                  {project.credits === null ? "nicht in der Summe" : <Zahl text={formatCredits(project.credits)} />}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Summe
              </th>
              <td className="num">
                <Zahl text={formatCredits(result.totalCredits)} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>
                Abzüglich Kontostand
              </th>
              <td className="num">
                <Zahl text={`−${formatCredits(String(result.creditBalance))}`} />
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={2}>
                Nachzukaufen
              </th>
              <td className="num">
                <Zahl text={formatCredits(plan?.shortfall ?? result.totalCredits)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </section>
      <NoteList notes={result.notes} />
    </div>
  );
}
