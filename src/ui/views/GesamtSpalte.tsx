import { deDate } from "../../kern/index.ts";
import { Note } from "../components/index.ts";
import type { useLiveCredits } from "../creditstand.ts";
import type { useTotal } from "../gesamt.ts";
import { CreditStand } from "./CreditStand.tsx";

// Eingabespalte der Gesamtkalkulation (SPEC F15): gespeicherte Projekte zum Anhaken und der Kontostand, der nur
// hier gilt. Natives Kontrollkästchen statt eigenem Baustein (UI-RULES §15).

export function GesamtSpalte({
  total,
  credit,
}: {
  total: ReturnType<typeof useTotal>;
  credit: ReturnType<typeof useLiveCredits>;
}) {
  const { state, toggle, setBalance } = total;
  return (
    <div className="input-form">
      <section className="field-group" aria-label="Projekte für die Gesamtkalkulation">
        <span className="group-label">Projekte für die Gesamtkalkulation</span>
        {state.loading && state.projects.length === 0 ? (
          <p className="credit-status">Projekte werden gelesen …</p>
        ) : null}
        {!state.loading && state.projects.length === 0 ? (
          <Note
            kind="info"
            text="Noch keine Projekte gespeichert. Rechne einen Film unter „Einzelprojekt“ und speichere ihn mit „Als Projekt speichern“."
          />
        ) : null}
        {state.projects.length > 0 ? (
          <ul className="check-list">
            {state.projects.map((project) => (
              <li key={project.name}>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={state.selected.includes(project.name)}
                    onChange={() => toggle(project.name)}
                  />
                  <span className="check-row__name">{project.name}</span>
                  <span className="check-row__hint">{deDate(project.updatedAt.slice(0, 10))}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}
        {state.messages.map((message) => (
          <Note key={message} kind="error" text={message} />
        ))}
      </section>

      <CreditStand
        label="Aktueller Kontostand für die Gesamtkalkulation"
        value={state.balanceText}
        origin={state.balanceOrigin}
        onChange={(value) => setBalance(value, "manual")}
        credit={credit}
      />
      <p className="credit-status">
        Der Kontostand zählt nur hier und nur einmal; die in den Projekten gespeicherten Kontostände bleiben außen vor.
      </p>
    </div>
  );
}
