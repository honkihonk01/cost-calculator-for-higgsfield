import { calculate, validateInputs } from "../kern/index.ts";
import type { AppError, ExchangeRate, Inputs, PriceData, Result } from "../schema/index.ts";
import { type FieldName, type FormState, formToInputs, toNumber } from "./formular.ts";

// Verbindet Formular und Rechenkern: Fehler je Feld oder ein Ergebnis, nie beides (AC-F10-3).

export const FIELD_LABELS: Record<FieldName, string> = {
  durationSeconds: "Noch offen",
  clipCount: "Noch offen",
  extraScenesPercent: "Zwischenszenen und Inserts",
  modelId: "Videomodell",
  resolution: "Auflösung",
  attemptsPerClip: "Versuche pro Clip",
  clipImageModelId: "Bildmodell für Bilder je Clip",
  storyboardModelId: "Bildmodell für das Storyboard",
  oneTimeAssets: "Einmalige Assets",
  "oneTimeAssets.modelId": "Bildmodell für die Assets",
  "oneTimeAssets.people": "Personen im Film",
  "oneTimeAssets.locations": "Orte im Film",
  "oneTimeAssets.attemptsPerAsset": "Anläufe pro Asset",
  clipImagesPerClip: "Bilder je Clip",
  creditBalance: "Credit-Stand",
  clipLengthSeconds: "Cliplänge",
  discount: "Rabatt",
  manualExchangeRate: "Wechselkurs von Hand",
};

export type Evaluation = {
  /** Fehler aus dem Lesen und Prüfen der Felder; am Feld erst sichtbar, wenn es berührt wurde */
  inputErrors: Partial<Record<FieldName, string>>;
  /** Fehler aus der Kombination (zum Beispiel Cliplänge zu lang für das Modell); immer sichtbar */
  combinationErrors: Partial<Record<FieldName, string>>;
  /** Fehler ohne Feld in der Eingabespalte; erscheinen nur im Ergebnisbereich */
  otherErrors: string[];
  result: Result | null;
};

export function evaluate(form: FormState, data: PriceData, rate: ExchangeRate | null, today: string): Evaluation {
  const { raw, parseErrors } = formToInputs(form, data);
  const validated = validateInputs(raw);
  const checked = validated.ok ? { fields: {}, others: [] } : byField(validated.errors);
  const inputErrors: Partial<Record<FieldName, string>> = { ...checked.fields, ...parseErrors };
  // Zod prüft „Dauer oder Clips“ erst, wenn alle anderen Felder gültig sind; fehlt beides, hier sofort melden.
  if (raw.durationSeconds === undefined && raw.clipCount === undefined && !parseErrors.durationSeconds) {
    inputErrors.durationSeconds ??= "Gib an, was noch offen ist: die Dauer (MM:SS) oder die Zahl der Clips.";
  }
  if (!validated.ok || Object.keys(parseErrors).length > 0) {
    return { inputErrors, combinationErrors: {}, otherErrors: checked.others, result: null };
  }
  const outcome = calculate(validated.value, data, effectiveRate(form, rate, today));
  if (outcome.ok) return { inputErrors: {}, combinationErrors: {}, otherErrors: [], result: outcome.value };
  const combination = byField(outcome.errors);
  return { inputErrors: {}, combinationErrors: combination.fields, otherErrors: combination.others, result: null };
}

/** Geprüfte Eingaben zum Speichern als Projekt; `null`, solange ein Feld ungültig ist. */
export function inputsForSaving(form: FormState, data: PriceData): Inputs | null {
  const { raw, parseErrors } = formToInputs(form, data);
  const validated = validateInputs(raw);
  return validated.ok && Object.keys(parseErrors).length === 0 ? validated.value : null;
}

/** Ein gültiger Kurs von Hand hat Vorrang und braucht keinen Abruf (AC-F4-4). */
export function effectiveRate(form: FormState, rate: ExchangeRate | null, today: string): ExchangeRate | null {
  const manual = toNumber(form.manualRateText);
  return typeof manual === "number" && manual > 0 ? { value: manual, date: today, origin: "manual" } : rate;
}

function byField(errors: AppError[]): { fields: Partial<Record<FieldName, string>>; others: string[] } {
  const fields: Partial<Record<FieldName, string>> = {};
  const others: string[] = [];
  for (const error of errors) {
    // Erst der genaue Pfad (zum Beispiel „oneTimeAssets.people“), sonst das oberste Feld (zum Beispiel „discount“).
    const path = error.field ?? "";
    const field = isFieldName(path) ? path : (path.split(/[.[]/)[0] ?? "");
    if (isFieldName(field)) fields[field] ??= error.message;
    else others.push(error.message);
  }
  return { fields, others };
}

function isFieldName(field: string): field is FieldName {
  return field in FIELD_LABELS;
}
