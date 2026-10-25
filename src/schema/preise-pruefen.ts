import type { z } from "zod";
import { type AppError, issuesToErrors } from "./fehler.ts";
import {
  imageModelsFileSchema,
  type PriceData,
  packagesFileSchema,
  qualityFileSchema,
  settingsFileSchema,
  videoModelsFileSchema,
} from "./preise.ts";

// Prüft die Preisdateien aus Text. Liest selbst keine Dateien, damit Kommandozeile, MCP-Server und App
// dieselbe Prüfung nutzen; das Lesen übernimmt die jeweilige Ladeschicht.

export const PRICE_FILES = {
  videoModels: "videomodelle.json",
  imageModels: "bildmodelle.json",
  packages: "pakete.json",
  quality: "qualitaet.json",
  settings: "einstellungen.json",
} as const;

export type PriceFileKey = keyof typeof PRICE_FILES;
export type PriceFileTexts = Partial<Record<PriceFileKey, string>>;
export type PriceCheck = { ok: true; data: PriceData } | { ok: false; errors: AppError[] };

const SCHEMAS: { [K in PriceFileKey]: z.ZodType<PriceData[K]> } = {
  videoModels: videoModelsFileSchema,
  imageModels: imageModelsFileSchema,
  packages: packagesFileSchema,
  quality: qualityFileSchema,
  settings: settingsFileSchema,
};

export function priceFilePath(key: PriceFileKey): string {
  return `preise/${PRICE_FILES[key]}`;
}

export function checkPriceFiles(texts: PriceFileTexts): PriceCheck {
  const errors: AppError[] = [];
  const parsed: Partial<PriceData> = {};
  for (const key of Object.keys(PRICE_FILES) as PriceFileKey[]) {
    const result = checkFile(key, texts[key]);
    if (result.ok) {
      Object.assign(parsed, { [key]: result.value });
    } else {
      errors.push(...result.errors);
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  const data = parsed as PriceData;
  const referenceErrors = checkReferences(data);
  return referenceErrors.length > 0 ? { ok: false, errors: referenceErrors } : { ok: true, data };
}

function checkFile<K extends PriceFileKey>(
  key: K,
  text: string | undefined,
): { ok: true; value: PriceData[K] } | { ok: false; errors: AppError[] } {
  const file = priceFilePath(key);
  if (text === undefined) {
    return { ok: false, errors: [{ code: "file-missing", file, message: "Die Datei fehlt im Datenordner." }] };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    return { ok: false, errors: [jsonSyntaxError(file, text, error)] };
  }
  const result = SCHEMAS[key].safeParse(json);
  return result.success ? { ok: true, value: result.data } : { ok: false, errors: issuesToErrors(result.error, file) };
}

/** Benennt bei kaputtem JSON Zeile und das Feld davor; häufigste Ursache ist ein Komma in einer Zahl. */
function jsonSyntaxError(file: string, text: string, error: unknown): AppError {
  const detail = error instanceof Error ? error.message : String(error);
  const position = Number(/position (\d+)/.exec(detail)?.[1] ?? Number.NaN);
  const base =
    "Die Datei ist kein gültiges JSON. Häufige Ursache: Komma statt Punkt in einer Zahl, zum Beispiel 4,5 statt 4.5.";
  if (Number.isNaN(position)) {
    return { code: "invalid-json", file, message: `${base} (${detail})` };
  }
  const before = text.slice(0, position);
  const line = before.split("\n").length;
  const keys = [...before.matchAll(/"([^"\\]+)"\s*:/g)];
  const field = keys.at(-1)?.[1];
  return {
    code: "invalid-json",
    file,
    message: `${base} Fehler in Zeile ${line}.`,
    ...(field === undefined ? {} : { field }),
  };
}

function checkReferences(data: PriceData): AppError[] {
  const errors: AppError[] = [];
  const videoFile = priceFilePath("videoModels");
  const videoIds = new Set<string>();
  data.videoModels.models.forEach((model, index) => {
    if (videoIds.has(model.id)) {
      errors.push(duplicate(videoFile, `models[${index}].id`, model.id));
    }
    videoIds.add(model.id);
    if (model.clipMinSeconds > model.clipMaxSeconds) {
      errors.push({
        code: "invalid-value",
        file: videoFile,
        field: `models[${index}].clipMinSeconds`,
        message: "Die Mindestlänge ist größer als die Höchstlänge.",
      });
    }
  });

  data.videoModels.models.forEach((model, index) => {
    if (model.draft === null) return;
    const field = `models[${index}].draft.finishModelId`;
    const finishModel = data.videoModels.models.find((candidate) => candidate.id === model.draft?.finishModelId);
    if (finishModel === undefined) {
      errors.push(unknownReference(videoFile, field, model.draft.finishModelId));
    } else if (finishModel.resolutions[model.draft.finishResolution].status === "unavailable") {
      errors.push({
        code: "unknown-reference",
        file: videoFile,
        field: `models[${index}].draft.finishResolution`,
        message: `Das Modell „${finishModel.id}“ bietet ${model.draft.finishResolution} nicht an; die Fertigstellung ist so nicht möglich.`,
      });
    }
  });

  const imageFile = priceFilePath("imageModels");
  const imageIds = new Set<string>();
  data.imageModels.models.forEach((model, index) => {
    if (imageIds.has(model.id)) errors.push(duplicate(imageFile, `models[${index}].id`, model.id));
    imageIds.add(model.id);
  });
  if (!data.imageModels.models.some((model) => model.storyboard)) {
    errors.push({
      code: "invalid-value",
      file: imageFile,
      field: "models",
      message: "Kein Bildmodell ist für das Storyboard freigegeben (storyboard: true).",
    });
  }

  const packageFile = priceFilePath("packages");
  const packageSizes = new Set<number>();
  data.packages.packages.forEach((pack, index) => {
    if (packageSizes.has(pack.credits)) errors.push(duplicate(packageFile, `packages[${index}].credits`, pack.credits));
    packageSizes.add(pack.credits);
  });

  const qualityFile = priceFilePath("quality");
  for (const id of Object.keys(data.quality.modelFactors)) {
    if (!videoIds.has(id)) errors.push(unknownReference(qualityFile, `modelFactors.${id}`, id));
  }
  for (const model of data.videoModels.models) {
    if (data.quality.modelFactors[model.id] === undefined) {
      errors.push({
        code: "invalid-value",
        file: qualityFile,
        field: "modelFactors",
        message: `Für das Videomodell „${model.id}“ fehlt der Qualitätsfaktor; ohne ihn lässt sich der Weg nicht nach Preis-Leistung einordnen.`,
      });
    }
  }

  data.settings.discountScope.modelIds.forEach((id, index) => {
    if (!videoIds.has(id)) {
      errors.push(unknownReference(priceFilePath("settings"), `discountScope.modelIds[${index}]`, id));
    }
  });
  return errors;
}

function unknownReference(file: string, field: string, id: string): AppError {
  return {
    code: "unknown-reference",
    file,
    field,
    message: `Das Videomodell „${id}“ gibt es in preise/videomodelle.json nicht.`,
  };
}

function duplicate(file: string, field: string, value: string | number): AppError {
  return { code: "duplicate", file, field, message: `Der Wert „${value}“ kommt mehrfach vor; er muss eindeutig sein.` };
}
