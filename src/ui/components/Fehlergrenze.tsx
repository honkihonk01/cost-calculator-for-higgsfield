import { Component, type ReactNode } from "react";
import { Note } from "./hinweis.tsx";

// Fehlergrenze um Eingabespalte und Ergebnisbereich: kein weißes Fenster (docs/QUALITY.md, Fehlerbehandlung).
// React bietet Fehlergrenzen nur als Klassenkomponente an.

type State = { message: string | null };

export class ErrorBoundary extends Component<{ area: string; children: ReactNode }, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  override render() {
    if (this.state.message === null) return this.props.children;
    return (
      <Note
        kind="error"
        text={`${this.props.area} ist auf einen Fehler gestoßen: ${this.state.message}. Starte die App neu; bleibt der Fehler, hilft „hfcalc daten pruefen“ im Terminal.`}
      />
    );
  }
}
