import { TOTAL_SELECTION_FILE, totalSelectionSchema } from "../../schema/index.ts";
import type { ProjectIo } from "./projekte-ablauf.ts";

// Gemerkte Auswahl der Gesamtkalkulation (SPEC F15) in `<Datenordner>/gesamtkalkulation.json`. Über dieselbe
// Ablage wie die Projekte, damit App und Tests dieselben Regeln nutzen: atomar schreiben, nur in einen
// vorhandenen Datenordner, nie löschen.

/** Namen der zuletzt angehakten Projekte; eine fehlende oder beschädigte Datei ergibt eine leere Auswahl mit Meldung. */
export async function readTotalSelectionWith(io: ProjectIo): Promise<{ names: string[]; error: string | null }> {
  let text: string | null;
  try {
    text = await io.readText(TOTAL_SELECTION_FILE);
  } catch (error) {
    return { names: [], error: `Die gemerkte Auswahl ließ sich nicht lesen: ${String(error)}` };
  }
  if (text === null) return { names: [], error: null };
  try {
    const parsed = totalSelectionSchema.safeParse(JSON.parse(text));
    if (parsed.success) return { names: parsed.data.projects, error: null };
  } catch {
    // fällt unten in dieselbe Meldung wie ungültiger Inhalt
  }
  return {
    names: [],
    error: `${TOTAL_SELECTION_FILE} ist beschädigt; die Auswahl beginnt leer und wird neu gespeichert.`,
  };
}

/** Speichert die Auswahl; ohne Datenordner wird nichts angelegt. Liefert eine Meldung, wenn das Schreiben scheitert. */
export async function saveTotalSelectionWith(io: ProjectIo, names: string[]): Promise<string | null> {
  try {
    if (!(await io.dataDirExists())) return null;
    await io.writeAtomic(TOTAL_SELECTION_FILE, `${JSON.stringify({ projects: names }, null, 2)}\n`);
    return null;
  } catch (error) {
    return `Die Auswahl ließ sich nicht speichern: ${String(error)}`;
  }
}
