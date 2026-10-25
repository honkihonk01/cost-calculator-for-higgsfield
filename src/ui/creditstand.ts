import { useCallback, useEffect, useRef, useState } from "react";
import type { DataSource } from "./quelle.ts";

// Credit-Stand live aus dem Higgsfield-Konto (AC-F10-11). Beim Start wird einmal abgerufen; ein von Hand
// eingetragener Stand bleibt stehen, bis der Nutzer den Live-Stand ausdrücklich übernimmt.

export type CreditStatus =
  | { state: "loading" }
  | { state: "live"; time: string }
  | { state: "failed"; message: string };

/**
 * `apply(credits, force)`: trägt den Live-Stand ins Formular ein. `force` ist beim ausdrücklichen Neuabruf gesetzt;
 * beim ersten Abruf ersetzt der Live-Stand nur den Startwert, nie eine eigene Eingabe.
 */
export function useLiveCredits(
  source: DataSource,
  ready: boolean,
  apply: (credits: number, force: boolean) => void,
): { status: CreditStatus; refresh: () => void } {
  const [status, setStatus] = useState<CreditStatus>({ state: "loading" });
  const applyRef = useRef(apply);
  applyRef.current = apply;

  const fetchCredits = useCallback(
    (force: boolean) => {
      setStatus({ state: "loading" });
      let active = true;
      source.creditBalance().then(
        (lookup) => {
          if (!active) return;
          if (lookup.ok) {
            applyRef.current(lookup.credits, force);
            setStatus({ state: "live", time: clockTime(source.now()) });
          } else {
            setStatus({ state: "failed", message: lookup.message });
          }
        },
        (error: unknown) => active && setStatus({ state: "failed", message: String(error) }),
      );
      return () => {
        active = false;
      };
    },
    [source],
  );

  useEffect(() => (ready ? fetchCredits(false) : undefined), [ready, fetchCredits]);
  const refresh = useCallback(() => void fetchCredits(true), [fetchCredits]);
  return { status, refresh };
}

/** „2026-10-25T10:12:00.000Z“ → „10:12“ in der Ortszeit des Macs. */
function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
