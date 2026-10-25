import Big from "big.js";
import type {
  AppError,
  ImageModel,
  ImageModelsFile,
  OneTimeAssets,
  Outcome,
  PlacedNote,
  SettingsFile,
} from "../schema/index.ts";
import { deNumber } from "./text.ts";

// Bilder eines Films (docs/DECISIONS.md, 2026-10-25): Storyboard (wahlweise), Lichtbilder und Referenzbilder
// je Clip (immer) und einmalig erzeugte Assets am Projektanfang (wahlweise).

export type ImageInputs = {
  /** fehlt, wenn das Storyboard aus ist */
  storyboardModelId?: string | undefined;
  clipImageModelId: string;
  clipImagesPerClip: number;
  /** fehlt, wenn die einmaligen Assets aus sind; sonst mit allen Werten (Standardwerte schon eingesetzt) */
  oneTimeAssets?: Required<OneTimeAssets> | undefined;
};

export type ImageCredits = {
  /** `null`, wenn das Storyboard aus ist */
  storyboard: { images: Big; credits: Big | null } | null;
  clipImages: { images: Big; credits: Big | null };
  /** `null`, wenn die einmaligen Assets aus sind */
  assets: { count: Big; images: Big; credits: Big | null } | null;
  /** alle Bilder zusammen; ohne Preis für einen Teil gibt es keine Summe (AC-F2-6) */
  totalCredits: Big | null;
};

export function computeImages(
  inputs: ImageInputs,
  clipCount: Big,
  imageModels: ImageModelsFile,
  settings: Pick<SettingsFile, "assetsPerPerson" | "assetsPerLocation">,
): Outcome<{ images: ImageCredits; notes: PlacedNote[] }> {
  const models = imageModels.models;
  const notes: PlacedNote[] = [];

  let storyboard: ImageCredits["storyboard"] = null;
  if (inputs.storyboardModelId !== undefined) {
    const model = models.find((candidate) => candidate.id === inputs.storyboardModelId);
    if (!model?.storyboard) {
      const choices = models.filter((candidate) => candidate.storyboard).map((candidate) => candidate.id);
      return fail(
        "storyboardModelId",
        `„${inputs.storyboardModelId}“ ist kein Bildmodell für das Storyboard. Erlaubt: ${choices.join(", ")}.`,
      );
    }
    const images = clipCount.times(imageModels.imagesPerClip);
    storyboard = { images, credits: priced(model, images, "das Storyboard", notes) };
  }

  const clipModel = models.find((candidate) => candidate.id === inputs.clipImageModelId);
  if (!clipModel) return unknownModel("clipImageModelId", inputs.clipImageModelId, models);
  const clipImageCount = clipCount.times(inputs.clipImagesPerClip);
  const clipImages = {
    images: clipImageCount,
    credits: priced(clipModel, clipImageCount, "die Lichtbilder und Referenzbilder je Clip", notes),
  };

  let assets: ImageCredits["assets"] = null;
  if (inputs.oneTimeAssets !== undefined) {
    const { modelId, people, locations, attemptsPerAsset } = inputs.oneTimeAssets;
    const model = models.find((candidate) => candidate.id === modelId);
    if (!model) return unknownModel("oneTimeAssets.modelId", modelId, models);
    const count = new Big(people)
      .times(settings.assetsPerPerson)
      .plus(new Big(locations).times(settings.assetsPerLocation));
    const images = count.times(attemptsPerAsset);
    assets = { count, images, credits: priced(model, images, "die einmaligen Assets", notes) };
    notes.push({
      kind: "assumption",
      area: "images",
      text: `Einmalige Assets: ${deNumber(people)} ${people === 1 ? "Person" : "Personen"} × ${deNumber(settings.assetsPerPerson)} und ${deNumber(locations)} ${locations === 1 ? "Ort" : "Orte"} × ${deNumber(settings.assetsPerLocation)} ergeben ${deNumber(count.toString())} Assets mit je ${deNumber(attemptsPerAsset)} Anläufen. Die Faktoren stammen aus einem Testfilm des Autors (5 Personen, 3 Orte, 43 Assets, knapp 8 Anläufe pro Asset).`,
    });
  }

  const parts = [storyboard?.credits ?? new Big(0), clipImages.credits, assets?.credits ?? new Big(0)];
  const totalCredits = parts.every((part): part is Big => part !== null)
    ? parts.reduce((sum, part) => sum.plus(part), new Big(0))
    : null;
  return { ok: true, value: { images: { storyboard, clipImages, assets, totalCredits }, notes } };
}

/** Bild-Credits, die mit der Clipanzahl wachsen (Storyboard und Bilder je Clip); `null` ohne Preis. */
export function scalingImageCredits(images: ImageCredits): Big | null {
  const storyboard = images.storyboard ? images.storyboard.credits : new Big(0);
  if (storyboard === null || images.clipImages.credits === null) return null;
  return storyboard.plus(images.clipImages.credits);
}

function priced(model: ImageModel, images: Big, purpose: string, notes: PlacedNote[]): Big | null {
  const price = model.pricePerImage;
  if (price.status === "known") return images.times(price.value);
  notes.push({ kind: "no-price", area: "images", text: `Für ${purpose} mit ${model.name} ist kein Preis hinterlegt.` });
  return null;
}

function unknownModel(field: string, id: string, models: ImageModel[]): { ok: false; errors: AppError[] } {
  return fail(field, `Das Bildmodell „${id}“ gibt es nicht. Erlaubt: ${models.map((model) => model.id).join(", ")}.`);
}

function fail(field: string, message: string): { ok: false; errors: AppError[] } {
  return { ok: false, errors: [{ code: "invalid-combination", field, message }] };
}
