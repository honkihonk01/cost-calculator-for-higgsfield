import { z } from "zod";

// Deutsche Standardmeldungen für alle Fälle, die keine eigene Meldung haben.
z.config(z.locales.de());

export {
  checkScope,
  type Discount,
  type DurationParse,
  discountSchema,
  type Inputs,
  inputsSchema,
  type OneTimeAssets,
  oneTimeAssetsSchema,
  parseDuration,
  productionFields,
  type ScopeInputs,
  scopeFields,
  scopeInputsSchema,
} from "./eingaben.ts";
export {
  NOTE_AREAS,
  NOTE_KINDS,
  type Note,
  type NoteArea,
  noteSchema,
  type PlacedNote,
  placedNoteSchema,
  type Result,
  resultSchema,
} from "./ergebnis.ts";
export { type AppError, describeError, formatPath, issuesToErrors, type Outcome } from "./fehler.ts";
export { TOTAL_SELECTION_FILE, type TotalSelection, totalBalanceSchema, totalSelectionSchema } from "./gesamt.ts";
export {
  ECB_URL,
  type ExchangeRate,
  exchangeRateSchema,
  isCacheCurrent,
  latestBusinessDay,
  parseEcbResponse,
  type RateCache,
  rateCacheSchema,
} from "./kurs.ts";
export { PRICE_UNITS, type Price, RESOLUTIONS, type Resolution, resolutionSchema } from "./preis.ts";
export type {
  ImageModel,
  ImageModelsFile,
  Package,
  PackagesFile,
  PriceData,
  QualityFile,
  SettingsFile,
  VideoModel,
  VideoModelsFile,
} from "./preise.ts";
export {
  checkPriceFiles,
  PRICE_FILES,
  type PriceCheck,
  type PriceFileKey,
  type PriceFileTexts,
  priceFilePath,
} from "./preise-pruefen.ts";
export { newestPriceDate, type Project, projectSchema, projectSlug } from "./projekt.ts";
