import { z } from "zod";
import { inputsSchema } from "./eingaben.ts";
import { resultSchema } from "./ergebnis.ts";
import { asOfSchema, textField } from "./preis.ts";
import type { PriceData } from "./preise.ts";

// Projekt = ein Film in `<Datenordner>/projekte/<slug>.json` (docs/ARCHITECTURE.md, „Projekt“, SPEC F9).

const timestamp = z.iso.datetime({ offset: true, error: "Zeitpunkt im Format JJJJ-MM-TTThh:mm:ssZ erwartet." });

export const projectSchema = z.strictObject({
  name: textField("Projektname (name)"),
  createdAt: timestamp,
  updatedAt: timestamp,
  inputs: inputsSchema,
  snapshot: z.strictObject({
    result: resultSchema,
    /** jüngstes Stand-Datum aller Preise zum Zeitpunkt des Speicherns (AC-F9-2) */
    pricesAsOf: asOfSchema,
    savedAt: timestamp,
  }),
});
export type Project = z.infer<typeof projectSchema>;

/** Dateiname aus dem Projektnamen: „Die Route – Teil 2“ → `die-route-teil-2`. */
export function projectSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Jüngstes `asOf` aller Preise und der Qualitätswerte. */
export function newestPriceDate(data: PriceData): string {
  const dates: string[] = [data.quality.asOf];
  const collect = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) collect(item);
    } else if (node !== null && typeof node === "object") {
      if ("status" in node && "asOf" in node && typeof node.asOf === "string") dates.push(node.asOf);
      else for (const value of Object.values(node)) collect(value);
    }
  };
  collect([data.videoModels, data.imageModels, data.packages]);
  return dates.reduce((newest, date) => (date > newest ? date : newest));
}
