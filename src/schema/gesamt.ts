import { z } from "zod";
import { numberField, textField } from "./preis.ts";

// Gesamtkalkulation (SPEC F15): Kontostand, der nur dort gilt, und die gemerkte Auswahl der Projekte in
// `<Datenordner>/gesamtkalkulation.json`.

export const totalBalanceSchema = numberField("Kontostand")
  .int({ error: "Gib den Kontostand als ganze Zahl an." })
  .min(0, { error: "Der Kontostand darf nicht negativ sein." });

export const totalSelectionSchema = z.strictObject({
  /** Namen der angehakten Projekte */
  projects: z.array(textField("Projektname")),
});
export type TotalSelection = z.infer<typeof totalSelectionSchema>;

export const TOTAL_SELECTION_FILE = "gesamtkalkulation.json";
