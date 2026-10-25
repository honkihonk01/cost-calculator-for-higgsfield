import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TotalProject } from "../kern/index.ts";
import {
  listProjectsWith,
  type ProjectIo,
  readProjectWith,
  readTotalSelectionWith,
  saveTotalSelectionWith,
} from "../laden/gemeinsam/index.ts";
import { type AppError, describeError } from "../schema/index.ts";
import type { CreditOrigin } from "./formular.ts";

// Zustand der Gesamtkalkulation (SPEC F15): alle gespeicherten Projekte, die gemerkte Auswahl und der Kontostand,
// der nur hier gilt. Gerechnet wird im Rechenkern (calculateTotal); hier wird nur gelesen, gemerkt und gehalten.

export type TotalState = {
  loading: boolean;
  projects: (TotalProject & { updatedAt: string })[];
  /** beschädigte Projektdateien und Lese- oder Schreibfehler der Auswahl */
  messages: string[];
  selected: string[];
  balanceText: string;
  balanceOrigin: CreditOrigin;
};

export function useTotal(io: ProjectIo, active: boolean) {
  const [state, setState] = useState<TotalState>({
    loading: false,
    projects: [],
    messages: [],
    selected: [],
    balanceText: "0",
    balanceOrigin: "start",
  });

  // Die Liste wird bei jedem Wechsel in die Gesamtkalkulation neu gelesen, wie das Projektmenü (AC-F9-6).
  useEffect(() => {
    if (!active) return;
    let current = true;
    setState((previous) => ({ ...previous, loading: true }));
    (async () => {
      const listed = await listProjectsWith(io);
      const projects: TotalState["projects"] = [];
      const messages: string[] = listed.errors.map((error: AppError) => describeError(error));
      for (const summary of listed.projects) {
        const read = await readProjectWith(io, summary.name, "");
        if (read.ok)
          projects.push({ name: read.value.name, inputs: read.value.inputs, updatedAt: read.value.updatedAt });
      }
      const remembered = await readTotalSelectionWith(io);
      if (remembered.error) messages.push(remembered.error);
      const names = new Set(projects.map((project) => project.name));
      if (!current) return;
      setState((previous) => ({
        ...previous,
        loading: false,
        projects: projects.sort((a, b) => a.name.localeCompare(b.name, "de")),
        messages,
        selected: remembered.names.filter((name) => names.has(name)),
      }));
    })();
    return () => {
      current = false;
    };
  }, [active, io]);

  const selectedRef = useRef(state.selected);
  selectedRef.current = state.selected;
  const toggle = useCallback(
    (name: string) => {
      const current = selectedRef.current;
      const selected = current.includes(name) ? current.filter((entry) => entry !== name) : [...current, name];
      setState((previous) => ({ ...previous, selected }));
      saveTotalSelectionWith(io, selected).then(
        (message) => message && setState((later) => ({ ...later, messages: [...later.messages, message] })),
      );
    },
    [io],
  );

  const setBalance = useCallback((balanceText: string, balanceOrigin: CreditOrigin) => {
    setState((previous) => ({ ...previous, balanceText, balanceOrigin }));
  }, []);

  /** Live-Stand aus Higgsfield: ersetzt den Startwert immer, eine eigene Eingabe nur beim ausdrücklichen Neuabruf. */
  const applyLive = useCallback((credits: number, force: boolean) => {
    setState((previous) =>
      force || previous.balanceOrigin === "start"
        ? { ...previous, balanceText: String(credits), balanceOrigin: "live" }
        : previous,
    );
  }, []);

  const selectedProjects = useMemo(
    () => state.projects.filter((project) => state.selected.includes(project.name)),
    [state.projects, state.selected],
  );
  return { state, toggle, setBalance, applyLive, selectedProjects };
}
