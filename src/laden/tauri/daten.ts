import { BaseDirectory, readTextFile } from "@tauri-apps/plugin-fs";
import { type AppError, checkPriceFiles, PRICE_FILES, type PriceData, type PriceFileKey } from "../../schema/index.ts";

// Dieselbe Prüfung wie in der Kommandozeile, gelesen über plugin-fs. Die App darf nur `~/Higgsfield-Kalkulator`
// lesen (src-tauri/capabilities/default.json); `HFCALC_DATA` gilt hier bewusst nicht (docs/ARCHITECTURE.md).

export const DATA_DIR = "Higgsfield-Kalkulator";
export const DATA_DIR_LABEL = `~/${DATA_DIR}`;
export const HOME = { baseDir: BaseDirectory.Home };

export type AppPrices = { ok: true; data: PriceData } | { ok: false; errors: AppError[] };

export async function loadPricesFromApp(): Promise<AppPrices> {
  const texts: Partial<Record<PriceFileKey, string>> = {};
  for (const [key, file] of Object.entries(PRICE_FILES) as [PriceFileKey, string][]) {
    try {
      texts[key] = await readTextFile(`${DATA_DIR}/preise/${file}`, HOME);
    } catch {
      // Fehlt die Datei oder ist sie nicht lesbar, meldet die Prüfung sie als fehlend.
    }
  }
  if (Object.keys(texts).length === 0) {
    return {
      ok: false,
      errors: [
        {
          code: "data-dir-missing",
          file: DATA_DIR_LABEL,
          message: "Im Datenordner liegen keine Preisdateien. Lege ihn im Terminal mit `hfcalc einrichten` an.",
        },
      ],
    };
  }
  const check = checkPriceFiles(texts);
  return check.ok ? { ok: true, data: check.data } : { ok: false, errors: check.errors };
}
