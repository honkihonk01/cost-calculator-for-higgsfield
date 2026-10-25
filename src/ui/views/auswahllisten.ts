import { deliveredResolutions, deNumber } from "../../kern/index.ts";
import { type PriceData, RESOLUTIONS, type Resolution, type VideoModel } from "../../schema/index.ts";
import type { PickerModel } from "../components/index.ts";

// Auswahllisten der Eingabespalte, abgeleitet aus den Preisdaten. Ein neues Modell in videomodelle.json
// erscheint deshalb ohne Code-Änderung im Modellwähler (AC-F8-5).

/** „seedance-2.5“ → „Seedance 2.5“ */
export function familyLabel(family: string): string {
  return family.replace(/^seedance-/, "Seedance ");
}

export function modelGroups(data: PriceData): { label: string; models: PickerModel[] }[] {
  const groups = new Map<string, PickerModel[]>();
  for (const model of data.videoModels.models) {
    const list = groups.get(model.family) ?? [];
    list.push(pickerModel(model));
    groups.set(model.family, list);
  }
  return [...groups].map(([family, models]) => ({ label: familyLabel(family), models }));
}

function pickerModel(model: VideoModel): PickerModel {
  const offered = RESOLUTIONS.filter((resolution) => model.resolutions[resolution].status !== "unavailable");
  const priced = offered.some((resolution) => model.resolutions[resolution].status === "known");
  const resolutions = model.draft
    ? `${offered[0] ?? ""} → ${model.draft.finishResolution}`
    : offered.length > 1
      ? `${offered[0]}–${offered[offered.length - 1]}`
      : (offered[0] ?? "");
  const meta = [resolutions, `${deNumber(model.clipMinSeconds)}–${deNumber(model.clipMaxSeconds)} s`];
  return {
    id: model.id,
    name: model.name,
    badge: model.badge,
    meta,
    disabledReason: priced ? null : "kein Preis hinterlegt",
  };
}

export function resolutionOptions(
  model: VideoModel | undefined,
): { value: Resolution; label: string; hint?: string }[] {
  const choices = model ? deliveredResolutions(model) : [...RESOLUTIONS];
  return choices.map((resolution) => {
    const unknown = model?.resolutions[resolution].status === "unknown";
    return unknown
      ? { value: resolution, label: resolution, hint: "ohne Preis" }
      : { value: resolution, label: resolution };
  });
}

export function storyboardOptions(data: PriceData): { value: string; title: string; description: string }[] {
  const perClip = data.imageModels.imagesPerClip;
  return data.imageModels.models
    .filter((model) => model.storyboard)
    .map((model) => ({
      value: model.id,
      title: model.name,
      description:
        model.pricePerImage.status === "known"
          ? `${deNumber(model.pricePerImage.value)} Credits je Bild, ${perClip} Bilder je Clip`
          : "kein Preis hinterlegt",
    }));
}

/** Alle Bildmodelle für die Bilder je Clip und die einmaligen Assets, jeweils mit Preis je Bild. */
export function imageOptions(data: PriceData): { value: string; title: string; description: string }[] {
  return data.imageModels.models.map((model) => ({
    value: model.id,
    title: model.name,
    description:
      model.pricePerImage.status === "known"
        ? `${deNumber(model.pricePerImage.value)} Credits je Bild`
        : "kein Preis hinterlegt",
  }));
}

/** Modellfamilien für „Rabatt gilt für“; ein Chip schaltet alle Modelle der Familie. */
export function discountFamilies(data: PriceData): { family: string; label: string; modelIds: string[] }[] {
  const families = new Map<string, string[]>();
  for (const model of data.videoModels.models) {
    families.set(model.family, [...(families.get(model.family) ?? []), model.id]);
  }
  return [...families].map(([family, modelIds]) => ({ family, label: familyLabel(family), modelIds }));
}

/** Anzeige der Auflösung beim Draft-Modell: Entwurf → Fertigstellung, zum Beispiel „480p → 1080p“. */
export function draftDisplay(model: VideoModel): string | undefined {
  if (!model.draft) return undefined;
  const draftResolution = RESOLUTIONS.find((resolution) => model.resolutions[resolution].status !== "unavailable");
  return `${draftResolution ?? ""} → ${model.draft.finishResolution}`;
}
