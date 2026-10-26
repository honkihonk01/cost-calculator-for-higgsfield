import { useState } from "react";
import {
  readProjectWith,
  readTotalSelectionWith,
  renameProjectWith,
  saveProjectWith,
  saveTotalSelectionWith,
  trashProjectWith,
} from "../laden/gemeinsam/index.ts";
import { describeError, newestPriceDate, type Result } from "../schema/index.ts";
import { FIELD_LABELS, inputsForSaving } from "./bewertung.ts";
import { type FieldName, type FormState, inputsToForm } from "./formular.ts";
import type { DataSource, PricesResult } from "./quelle.ts";
import type { SaveOutcome } from "./views/Projekte.tsx";

// Projekte im Einzelprojekt (SPEC F9): laden, speichern, Änderungen direkt speichern, umbenennen und in den
// Papierkorb legen. Gelesen und geschrieben wird über die gemeinsame Ablage; hier wird nur der Zustand gehalten.

export type ProjectMessage = { kind: "error" | "info"; text: string };

export function useProjects({
  source,
  prices,
  form,
  result,
  setForm,
  setTouched,
}: {
  source: DataSource;
  prices: PricesResult | null;
  form: FormState | null;
  result: Result | null;
  setForm: (form: FormState) => void;
  setTouched: (fields: ReadonlySet<FieldName>) => void;
}) {
  const [project, setProject] = useState<string | null>(null);
  const [message, setMessage] = useState<ProjectMessage | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  /** Rückmeldung unter den Speicherknöpfen */
  const [status, setStatus] = useState<ProjectMessage | null>(null);
  const io = source.projects;

  const load = async (name: string) => {
    if (!prices?.ok) return;
    const loaded = await readProjectWith(io, name, "Das Projektmenü zeigt alle Projekte.");
    if (!loaded.ok) {
      setMessage({ kind: "error", text: loaded.errors.map(describeError).join(" ") });
      return;
    }
    const { form: next, notice } = inputsToForm(loaded.value.inputs, prices.data.settings);
    setForm(next);
    // Alle Felder gelten als berührt, damit ein Projekt, das nicht mehr zu den Preisdaten passt, sofort auffällt.
    setTouched(new Set(Object.keys(FIELD_LABELS) as FieldName[]));
    setProject(loaded.value.name);
    setMessage(notice ? { kind: "info", text: notice } : null);
    setStatus(null);
  };

  const save = async (name: string, overwrite: boolean): Promise<SaveOutcome> => {
    const inputs = prices?.ok && form ? inputsForSaving(form, prices.data) : null;
    if (!prices?.ok || !inputs || !result) {
      return { ok: false, exists: false, message: "Erst wenn alle Felder gültig sind, lässt sich speichern." };
    }
    const saved = await saveProjectWith(
      io,
      { name, inputs, result, pricesAsOf: newestPriceDate(prices.data) },
      { overwrite, now: source.now() },
    );
    if (saved.ok) {
      setStatus({
        kind: "info",
        text:
          overwrite && saved.value.name === project
            ? `Änderungen an „${project}“ gespeichert.`
            : `Gespeichert als „${saved.value.name}“.`,
      });
      setProject(saved.value.name);
      return { ok: true };
    }
    const exists = saved.errors.some((error) => error.code === "project-exists");
    return { ok: false, exists, message: saved.errors.map((error) => error.message).join(" ") };
  };

  /** Änderungen am geladenen Projekt direkt in seine Datei schreiben, ohne Rückfrage (SPEC Entscheidung 32). */
  const saveChanges = async () => {
    if (!project) return;
    const outcome = await save(project, true);
    if (!outcome.ok) setStatus({ kind: "error", text: outcome.message });
  };

  const rename = async (newName: string): Promise<string | null> => {
    if (!project) return "Es ist kein Projekt geladen.";
    const renamed = await renameProjectWith(io, project, newName, source.now());
    if (!renamed.ok) return renamed.errors.map((error) => error.message).join(" ");
    // Die gemerkte Auswahl der Gesamtkalkulation zieht den neuen Namen nach, damit das Projekt angehakt bleibt.
    const remembered = await readTotalSelectionWith(io);
    if (remembered.names.includes(project)) {
      await saveTotalSelectionWith(
        io,
        remembered.names.map((name) => (name === project ? renamed.value.name : name)),
      );
    }
    setProject(renamed.value.name);
    setStatus(null);
    setMessage({ kind: "info", text: `Das Projekt heißt jetzt „${renamed.value.name}“.` });
    return null;
  };

  const trash = async (): Promise<string | null> => {
    if (!project) return "Es ist kein Projekt geladen.";
    const trashed = await trashProjectWith(io, project, source.now());
    if (!trashed.ok) return trashed.errors.map((error) => error.message).join(" ");
    setMessage({
      kind: "info",
      text: `„${project}“ liegt jetzt im Papierkorb (${source.dataDirLabel}/${trashed.value.trashedAs}). Die Eingaben bleiben stehen, bis du etwas änderst.`,
    });
    setProject(null);
    setStatus(null);
    return null;
  };

  return { project, message, status, saveOpen, setSaveOpen, load, save, saveChanges, rename, trash };
}
