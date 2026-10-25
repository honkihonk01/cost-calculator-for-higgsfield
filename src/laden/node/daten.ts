import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { type AppError, checkPriceFiles, PRICE_FILES, type PriceData, type PriceFileKey } from "../../schema/index.ts";

export const DATA_DIR_NAME = "Higgsfield-Kalkulator";

/** Datenordner: `HFCALC_DATA`, sonst `~/Higgsfield-Kalkulator` (docs/ARCHITECTURE.md, Laufzeit-Orte). */
export function findDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = env.HFCALC_DATA?.trim();
  if (override) return override;
  return join(env.HOME?.trim() || homedir(), DATA_DIR_NAME);
}

export type LoadedPrices =
  | { ok: true; dataDir: string; data: PriceData }
  | { ok: false; dataDir: string; errors: AppError[] };

/** Liest alle Preisdateien und prüft sie. Fehlende Dateien fehlen im Ergebnis, die Prüfung meldet sie. */
export async function loadPrices(dataDir: string): Promise<LoadedPrices> {
  const texts: Partial<Record<PriceFileKey, string>> = {};
  const readErrors: AppError[] = [];
  for (const [key, fileName] of Object.entries(PRICE_FILES) as [PriceFileKey, string][]) {
    try {
      texts[key] = await readFile(join(dataDir, "preise", fileName), "utf8");
    } catch (error) {
      if (!isMissing(error)) {
        readErrors.push({
          code: "read-failed",
          file: `preise/${fileName}`,
          message: `Die Datei ließ sich nicht lesen: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }
  if (Object.keys(texts).length === 0 && readErrors.length === 0) {
    return {
      ok: false,
      dataDir,
      errors: [
        {
          code: "data-dir-missing",
          file: dataDir,
          message: "Im Datenordner liegen keine Preisdateien. Lege ihn mit `hfcalc einrichten` an.",
        },
      ],
    };
  }
  const check = checkPriceFiles(texts);
  if (readErrors.length > 0) {
    // Unlesbare Dateien nicht zusätzlich als „fehlt“ melden.
    const unreadable = new Set(readErrors.map((error) => error.file));
    const others = check.ok ? [] : check.errors.filter((error) => !unreadable.has(error.file));
    return { ok: false, dataDir, errors: [...readErrors, ...others] };
  }
  return check.ok ? { ok: true, dataDir, data: check.data } : { ok: false, dataDir, errors: check.errors };
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
