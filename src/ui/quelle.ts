import type { CreditLookup, ProjectIo } from "../laden/gemeinsam/index.ts";
import type { AppError, ExchangeRate, PriceData } from "../schema/index.ts";

// Datenquelle der Oberfläche. In der App liefert sie src/laden/tauri, in Tests liefern sie Testdaten
// und ein echter temporärer Datenordner (docs/TESTING.md).

export type PricesResult = { ok: true; data: PriceData } | { ok: false; errors: AppError[] };

export type DataSource = {
  /** wie der Datenordner in Meldungen heißt, zum Beispiel „~/Higgsfield-Kalkulator“ */
  dataDirLabel: string;
  loadPrices(): Promise<PricesResult>;
  /** gespeicherter Kurs ohne Abruf, damit sofort gerechnet werden kann */
  cachedRate(): Promise<ExchangeRate | null>;
  exchangeRate(options: { today: string; timeoutMs: number }): Promise<{ rate: ExchangeRate | null }>;
  /** Credit-Stand live aus dem Higgsfield-Konto (AC-F10-11) */
  creditBalance(): Promise<CreditLookup>;
  /** Projekte im Datenordner (SPEC F9) */
  projects: ProjectIo;
  today(): string;
  /** Zeitpunkt für `updatedAt` beim Speichern, ISO 8601 */
  now(): string;
};
