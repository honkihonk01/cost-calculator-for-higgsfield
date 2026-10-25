import { deliveredResolutions } from "../kern/index.ts";
import {
  type Inputs,
  type PriceData,
  parseDuration,
  type Resolution,
  type SettingsFile,
  type VideoModel,
} from "../schema/index.ts";

// Zustand der Eingabespalte und seine Übersetzung in rohe Eingaben für calculate(). Keine Rechenlogik:
// geprüft und gerechnet wird ausschließlich im Rechenkern.

export type PriceLevel = "regular" | "discounted";
export type CreditOrigin = "start" | "live" | "manual" | "project";

export type FormState = {
  scopeMode: "duration" | "clips";
  durationText: string;
  clipsText: string;
  extraScenesPercent: number;
  modelId: string;
  resolution: Resolution | "";
  attemptsText: string;
  clipImageModelId: string;
  creditBalanceText: string;
  /** Herkunft des Credit-Stands: Startwert, live aus dem Higgsfield-Konto, von Hand oder aus einem Projekt */
  creditOrigin: CreditOrigin;
  /** Storyboard und einmalige Assets sind beim Start aus (docs/DECISIONS.md 2026-10-25) */
  storyboardEnabled: boolean;
  storyboardModelId: string;
  assetsEnabled: boolean;
  assetModelId: string;
  assetPeopleText: string;
  assetLocationsText: string;
  assetAttemptsText: string;
  clipImagesText: string;
  clipLengthText: string;
  discountEnabled: boolean;
  /** kommt aus einstellungen.json oder aus einem geladenen Projekt; in der Oberfläche nicht änderbar */
  discountPercent: number;
  discountModelIds: string[];
  discountResolutions: Resolution[];
  packagePriceLevel: PriceLevel;
  audioSurchargePercent: 0 | 50 | 100;
  manualRateText: string;
};

/** Feldnamen wie im Eingabe-Schema; daran hängen die Fehlermeldungen am Feld. */
export type FieldName =
  | "durationSeconds"
  | "clipCount"
  | "extraScenesPercent"
  | "modelId"
  | "resolution"
  | "attemptsPerClip"
  | "clipImageModelId"
  | "storyboardModelId"
  | "oneTimeAssets"
  | "oneTimeAssets.modelId"
  | "oneTimeAssets.people"
  | "oneTimeAssets.locations"
  | "oneTimeAssets.attemptsPerAsset"
  | "clipImagesPerClip"
  | "creditBalance"
  | "clipLengthSeconds"
  | "discount"
  | "manualExchangeRate";

/**
 * Frischer Start: alle Felder vorbelegt, damit rechts sofort ein Ergebnis steht (AC-F10-9). Pflichtfelder kommen aus
 * `startValues`, optionale Felder aus den übrigen Standardwerten in einstellungen.json (AC-F10-2).
 * ASSUMPTION: Der Aufschlag-Regler steht anfangs auf 25 %, weil ein Regler immer einen Wert zeigt (docs/DECISIONS.md).
 */
export function initialForm(settings: SettingsFile): FormState {
  const start = settings.startValues;
  return {
    scopeMode: "duration",
    durationText: formatDuration(start.durationSeconds),
    clipsText: "",
    extraScenesPercent: 25,
    modelId: start.modelId,
    resolution: start.resolution,
    attemptsText: String(start.attemptsPerClip),
    clipImageModelId: start.clipImageModelId,
    creditBalanceText: String(start.creditBalance),
    creditOrigin: "start",
    storyboardEnabled: false,
    storyboardModelId: start.storyboardModelId,
    assetsEnabled: false,
    assetModelId: start.assetModelId,
    assetPeopleText: String(settings.assetPeople),
    assetLocationsText: String(settings.assetLocations),
    assetAttemptsText: germanNumber(settings.attemptsPerAsset),
    clipImagesText: germanNumber(settings.clipImagesPerClip),
    clipLengthText: germanNumber(settings.clipLengthSeconds),
    discountEnabled: settings.discountEnabled,
    discountPercent: settings.discountPercent,
    discountModelIds: [...settings.discountScope.modelIds],
    discountResolutions: [...settings.discountScope.resolutions],
    packagePriceLevel: settings.packagePriceLevel,
    audioSurchargePercent: settings.audioSurchargePercent,
    manualRateText: "",
  };
}

/** Rohe Eingaben für calculate() und Fehler, die schon beim Lesen der Felder entstehen (zum Beispiel „3:75“). */
export function formToInputs(
  form: FormState,
  data: PriceData,
): { raw: Record<string, unknown>; parseErrors: Partial<Record<FieldName, string>> } {
  const raw: Record<string, unknown> = {};
  const parseErrors: Partial<Record<FieldName, string>> = {};
  if (form.scopeMode === "duration") {
    if (form.durationText.trim() !== "") {
      const duration = parseDuration(form.durationText);
      if (duration.ok) raw.durationSeconds = duration.seconds;
      else parseErrors.durationSeconds = duration.message;
    }
  } else if (form.clipsText.trim() !== "") {
    raw.clipCount = toNumber(form.clipsText);
  }
  raw.extraScenesPercent = form.extraScenesPercent;
  if (form.modelId !== "") raw.modelId = form.modelId;
  const model = findModel(data, form.modelId);
  // Beim Draft-Modell ist die Zielauflösung fest die Auflösung der Fertigstellung (SPEC Entscheidung 5).
  const resolution = model?.draft ? model.draft.finishResolution : form.resolution;
  if (resolution !== "") raw.resolution = resolution;
  if (form.attemptsText.trim() !== "") raw.attemptsPerClip = toNumber(form.attemptsText);
  if (form.clipImageModelId !== "") raw.clipImageModelId = form.clipImageModelId;
  raw.clipImagesPerClip = toNumber(form.clipImagesText);
  if (form.storyboardEnabled) {
    if (form.storyboardModelId !== "") raw.storyboardModelId = form.storyboardModelId;
    else parseErrors.storyboardModelId = "Wähle ein Bildmodell für das Storyboard oder schalte das Storyboard aus.";
  }
  if (form.assetsEnabled) {
    raw.oneTimeAssets = {
      ...(form.assetModelId !== "" ? { modelId: form.assetModelId } : {}),
      people: toNumber(form.assetPeopleText),
      locations: toNumber(form.assetLocationsText),
      attemptsPerAsset: toNumber(form.assetAttemptsText),
    };
    if (form.assetModelId === "") {
      parseErrors["oneTimeAssets.modelId"] =
        "Wähle ein Bildmodell für die einmaligen Assets oder schalte die Assets aus.";
    }
  }
  if (form.creditBalanceText.trim() !== "") raw.creditBalance = toNumber(form.creditBalanceText.replace(/\./g, ""));
  raw.clipLengthSeconds = toNumber(form.clipLengthText);
  raw.discount = {
    enabled: form.discountEnabled,
    percent: form.discountPercent,
    modelIds: form.discountModelIds,
    resolutions: form.discountResolutions,
  };
  raw.packagePriceLevel = form.packagePriceLevel;
  raw.audioSurchargePercent = form.audioSurchargePercent;
  if (form.manualRateText.trim() !== "") raw.manualExchangeRate = toNumber(form.manualRateText);
  return { raw, parseErrors };
}

/** Wie viele optionale Felder vom Standard abweichen; steht am zugeklappten Bereich (AC-F10-6). */
export function changedOptionalCount(form: FormState, settings: SettingsFile): number {
  const initial = initialForm(settings);
  const sameList = (a: string[], b: string[]) => [...a].sort().join(",") === [...b].sort().join(",");
  return [
    toNumber(form.clipLengthText) !== settings.clipLengthSeconds,
    toNumber(form.clipImagesText) !== settings.clipImagesPerClip,
    form.discountEnabled !== initial.discountEnabled ||
      form.discountPercent !== initial.discountPercent ||
      !sameList(form.discountModelIds, initial.discountModelIds) ||
      !sameList(form.discountResolutions, initial.discountResolutions),
    form.packagePriceLevel !== initial.packagePriceLevel,
    form.audioSurchargePercent !== initial.audioSurchargePercent,
    form.manualRateText.trim() !== "",
  ].filter(Boolean).length;
}

/**
 * Gespeicherte Eingaben eines Projekts zurück ins Formular (SPEC F9). Fehlende optionale Werte bekommen den Standard.
 * ASSUMPTION: Eine Dauer mit Sekundenbruchteil (nur über Kommandozeile oder MCP-Server möglich) wird auf ganze
 * Sekunden gerundet, weil das Feld nur M:SS kennt; der Hinweis sagt das (docs/DECISIONS.md).
 */
export function inputsToForm(inputs: Inputs, settings: SettingsFile): { form: FormState; notice: string | null } {
  const initial = initialForm(settings);
  const seconds = inputs.durationSeconds === undefined ? null : Math.round(inputs.durationSeconds);
  const form: FormState = {
    ...initial,
    scopeMode: inputs.clipCount === undefined ? "duration" : "clips",
    durationText: seconds === null ? "" : formatDuration(seconds),
    clipsText: inputs.clipCount === undefined ? "" : String(inputs.clipCount),
    extraScenesPercent: inputs.extraScenesPercent,
    modelId: inputs.modelId,
    resolution: inputs.resolution,
    attemptsText: String(inputs.attemptsPerClip),
    clipImageModelId: inputs.clipImageModelId,
    creditBalanceText: String(inputs.creditBalance),
    creditOrigin: "project",
    storyboardEnabled: inputs.storyboardModelId !== undefined,
    storyboardModelId: inputs.storyboardModelId ?? initial.storyboardModelId,
    ...(inputs.oneTimeAssets
      ? {
          assetsEnabled: true,
          assetModelId: inputs.oneTimeAssets.modelId,
          assetPeopleText: String(inputs.oneTimeAssets.people ?? settings.assetPeople),
          assetLocationsText: String(inputs.oneTimeAssets.locations ?? settings.assetLocations),
          assetAttemptsText: germanNumber(inputs.oneTimeAssets.attemptsPerAsset ?? settings.attemptsPerAsset),
        }
      : {}),
    clipImagesText:
      inputs.clipImagesPerClip === undefined ? initial.clipImagesText : germanNumber(inputs.clipImagesPerClip),
    clipLengthText:
      inputs.clipLengthSeconds === undefined ? initial.clipLengthText : germanNumber(inputs.clipLengthSeconds),
    ...(inputs.discount
      ? {
          discountEnabled: inputs.discount.enabled,
          discountPercent: inputs.discount.percent,
          discountModelIds: [...inputs.discount.modelIds],
          discountResolutions: [...inputs.discount.resolutions],
        }
      : {}),
    packagePriceLevel: inputs.packagePriceLevel ?? initial.packagePriceLevel,
    audioSurchargePercent: inputs.audioSurchargePercent ?? initial.audioSurchargePercent,
    manualRateText: inputs.manualExchangeRate === undefined ? "" : germanNumber(inputs.manualExchangeRate),
  };
  const rounded = seconds !== null && seconds !== inputs.durationSeconds;
  const notice = rounded
    ? `Die gespeicherte Dauer von ${germanNumber(inputs.durationSeconds ?? 0)} s steht im Feld auf ganze Sekunden gerundet als ${form.durationText}, weil das Feld nur Minuten und Sekunden kennt.`
    : null;
  return { form, notice };
}

/** Sekunden als „M:SS“, zum Beispiel 600 → „10:00“. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Sekunden für den Dauer-Regler; `null`, solange das Feld keine gültige Dauer enthält. */
export function durationSecondsOf(text: string): number | null {
  const parsed = parseDuration(text);
  return parsed.ok ? parsed.seconds : null;
}

export function findModel(data: PriceData, modelId: string): VideoModel | undefined {
  return data.videoModels.models.find((model) => model.id === modelId);
}

/** Auflösungen für das Menü: was das Modell liefert, sonst alle. */
export function resolutionChoices(data: PriceData, modelId: string): Resolution[] {
  const model = findModel(data, modelId);
  return model ? deliveredResolutions(model) : ["480p", "720p", "1080p", "4K"];
}

/** „7,5“ und „7.5“ sind dieselbe Zahl; was keine Zahl ist, bleibt Text und wird von der Prüfung gemeldet. */
export function toNumber(text: string): number | string {
  const trimmed = text.trim();
  const value = Number(trimmed.replace(",", "."));
  return trimmed === "" || Number.isNaN(value) ? text : value;
}

export function germanNumber(value: number): string {
  return String(value).replace(".", ",");
}
