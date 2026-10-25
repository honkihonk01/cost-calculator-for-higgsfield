import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CreditInputs } from "../../src/kern/index.ts";
import { checkPriceFiles, PRICE_FILES, type PriceData, type PriceFileKey } from "../../src/schema/index.ts";
import { FIXTURE_DATA } from "./daten.ts";

/** Geprüfte Preisdaten aus `tests/fixtures/daten`; jeder Aufruf liefert eine eigene Kopie zum Verändern. */
export function fixturePrices(): PriceData {
  const texts: Partial<Record<PriceFileKey, string>> = {};
  for (const [key, file] of Object.entries(PRICE_FILES) as [PriceFileKey, string][]) {
    texts[key] = readFileSync(join(FIXTURE_DATA, "preise", file), "utf8");
  }
  const check = checkPriceFiles(texts);
  if (!check.ok) throw new Error(check.errors.map((error) => error.message).join("\n"));
  return check.data;
}

/** Standardbeispiel aus docs/SPEC.md, soweit es den Credit-Bedarf betrifft. */
export const STANDARD_INPUTS: CreditInputs = {
  durationSeconds: 180,
  extraScenesPercent: 25,
  clipLengthSeconds: 7.5,
  modelId: "seedance-2.5-draft",
  resolution: "1080p",
  attemptsPerClip: 3,
  clipImageModelId: "seedream-5.0-pro",
  clipImagesPerClip: 3.5,
  discount: { enabled: false, percent: 25, modelIds: ["seedance-2.5", "seedance-2.5-draft"], resolutions: ["1080p"] },
  audioSurchargePercent: 0,
};

/** Standardbeispiel als rohe Eingabe für `calculate()`; optionale Werte kommen aus `einstellungen.json`. */
export const STANDARD_RAW = {
  durationSeconds: 180,
  extraScenesPercent: 25,
  modelId: "seedance-2.5-draft",
  resolution: "1080p",
  attemptsPerClip: 3,
  clipImageModelId: "seedream-5.0-pro",
  creditBalance: 2000,
} as const;
