import Big from "big.js";
import {
  type AppError,
  type Discount,
  type ImageModelsFile,
  type Outcome,
  type PlacedNote,
  type Price,
  RESOLUTIONS,
  type Resolution,
  type SettingsFile,
  type VideoModel,
  type VideoModelsFile,
} from "../schema/index.ts";
import { computeImages, type ImageCredits, type ImageInputs } from "./bilder.ts";
import { type ClipPlan, type ClipScope, planClips } from "./clips.ts";
import { deNumber } from "./text.ts";

// F2: Credit-Bedarf je Produktionsweg (docs/RECHENREGELN.md 4.4 und 4.4a, SPEC Entscheidungen 4, 5, 10, 11, 12).

export type CreditInputs = ClipScope &
  ImageInputs & {
    modelId: string;
    /** Zielauflösung; beim Draft-Modell immer die Auflösung der Fertigstellung */
    resolution: Resolution;
    attemptsPerClip: number;
    discount: Discount;
    audioSurchargePercent: number;
  };

export type ProductionPath = {
  /** `<modelId>@<Auflösung>`, beim Draft-Weg mit der Auflösung der Fertigstellung */
  id: string;
  label: string;
  modelId: string;
  modelName: string;
  family: VideoModel["family"];
  /** Draft-Weg: Versuche als Entwurf, danach die Fertigstellung */
  draft: boolean;
  resolution: Resolution;
  /** Credits je Sekunde und Versuch (beim Draft der Entwurf); mit `finishPrice` lässt sich jede Versuchszahl rechnen */
  attemptPrice: Big | null;
  /** Credits je Sekunde für die Fertigstellung, einmal je Clip; 0 bei direkten Wegen */
  finishPrice: Big | null;
  /** Credits je Sekunde fertigem Film, einschließlich aller Versuche und der Draft-Fertigstellung */
  creditsPerSecond: Big | null;
  videoCredits: Big | null;
  status: "ok" | "no-price";
  clips: ClipPlan;
};

export type CreditResult = {
  /** Clips des gewählten Modells */
  clips: ClipPlan;
  /** angezeigte Wege: ab 720p und die Zielauflösung; Wege ohne Preis am Ende */
  paths: ProductionPath[];
  selectedPathId: string;
  images: ImageCredits;
  notes: PlacedNote[];
};

export function resolutionRank(resolution: Resolution): number {
  return RESOLUTIONS.indexOf(resolution);
}

/** Auflösungen, die ein Modell als Ergebnis liefert; beim Draft-Modell nur die der Fertigstellung. */
export function deliveredResolutions(model: VideoModel): Resolution[] {
  if (model.draft) return [model.draft.finishResolution];
  return RESOLUTIONS.filter((resolution) => model.resolutions[resolution].status !== "unavailable");
}

export function computeCredits(
  inputs: CreditInputs,
  prices: { videoModels: VideoModelsFile; imageModels: ImageModelsFile; settings: SettingsFile },
): Outcome<CreditResult> {
  const models = prices.videoModels.models;
  const selectedModel = models.find((model) => model.id === inputs.modelId);
  if (!selectedModel) {
    return fail(
      "modelId",
      `Das Videomodell „${inputs.modelId}“ gibt es nicht. Erlaubt: ${models.map((m) => m.id).join(", ")}.`,
    );
  }
  const allowed = deliveredResolutions(selectedModel);
  if (!allowed.includes(inputs.resolution)) {
    const reason = selectedModel.draft
      ? `${selectedModel.name} liefert immer ${allowed[0]}: Versuche als Entwurf, danach die Fertigstellung in ${allowed[0]}.`
      : `${selectedModel.name} gibt es in ${allowed.join(", ")}.`;
    return fail("resolution", `${reason} Wähle eine dieser Auflösungen.`);
  }
  const selectedClips = planClips(inputs, selectedModel);
  if (!selectedClips.ok) return selectedClips;
  const images = computeImages(inputs, selectedClips.value.count, prices.imageModels, prices.settings);
  if (!images.ok) return images;

  const notes: PlacedNote[] = selectedClips.value.notes.map((note) => ({ ...note, area: "clips" }));
  const paths: ProductionPath[] = [];
  const tooShortModels: VideoModel[] = [];
  for (const model of models) {
    const clips = planClips(inputs, model);
    // ASSUMPTION: Ein Modell, das die Cliplänge nicht erzeugen kann, fehlt mit Hinweis im Vergleich (docs/DECISIONS.md).
    if (!clips.ok) {
      tooShortModels.push(model);
      continue;
    }
    for (const resolution of deliveredResolutions(model)) {
      if (resolutionRank(resolution) < resolutionRank("720p") && resolution !== inputs.resolution) continue;
      paths.push(buildPath(model, resolution, clips.value, inputs, models));
    }
  }
  for (const model of tooShortModels) {
    notes.push({
      kind: "info",
      area: "paths",
      text: `${model.name} erzeugt Clips bis ${deNumber(model.clipMaxSeconds)} s und fehlt deshalb im Vergleich der Produktionswege.`,
    });
  }
  paths.sort((a, b) => Number(a.status === "no-price") - Number(b.status === "no-price"));

  const selectedPathId = pathId(selectedModel, inputs.resolution);
  const selectedPath = paths.find((path) => path.id === selectedPathId);
  if (selectedPath?.status === "no-price") {
    notes.push({
      kind: "no-price",
      area: "paths",
      text: `Für ${selectedPath.label} ist kein Preis hinterlegt. Sobald du ihn am Generate-Button abliest, trägst du ihn in preise/videomodelle.json nach.`,
    });
  }

  notes.push(...images.value.notes);
  return {
    ok: true,
    value: { clips: selectedClips.value, paths, selectedPathId, images: images.value.images, notes },
  };
}

/** Gesamtbedarf eines Wegs: Video plus alle Bilder; ohne Preis gibt es keine Summe (AC-F2-6). */
export function totalCredits(path: ProductionPath, images: ImageCredits): Big | null {
  if (path.videoCredits === null || images.totalCredits === null) return null;
  return path.videoCredits.plus(images.totalCredits);
}

/** Credits je Sekunde fertigem Film bei einer beliebigen Versuchszahl; `null` ohne Preis. */
export function creditsPerSecondAt(
  path: Pick<ProductionPath, "attemptPrice" | "finishPrice">,
  attempts: number,
): Big | null {
  if (path.attemptPrice === null || path.finishPrice === null) return null;
  return path.attemptPrice.times(attempts).plus(path.finishPrice);
}

function pathId(model: VideoModel, resolution: Resolution): string {
  return `${model.id}@${resolution}`;
}

function buildPath(
  model: VideoModel,
  resolution: Resolution,
  clips: ClipPlan,
  inputs: CreditInputs,
  models: VideoModel[],
): ProductionPath {
  let attemptPrice: Big | null;
  let finishPrice: Big | null = new Big(0);
  let label: string;
  if (model.draft) {
    // Versuche in der Entwurfsauflösung, danach einmal je Clip die Fertigstellung (SPEC Entscheidung 5).
    // ASSUMPTION: Die Entwurfsauflösung ist die erste angebotene Auflösung des Draft-Modells (480p).
    const draftResolution = RESOLUTIONS.find((candidate) => model.resolutions[candidate].status !== "unavailable");
    const finishModel = models.find((candidate) => candidate.id === model.draft?.finishModelId);
    attemptPrice = draftResolution ? pricePerSecond(model, draftResolution, inputs) : null;
    finishPrice = finishModel ? pricePerSecond(finishModel, resolution, inputs) : null;
    label = `${model.name} + ${resolution}`;
  } else {
    attemptPrice = pricePerSecond(model, resolution, inputs);
    label = `${model.name} · ${resolution}`;
  }
  const perSecond = creditsPerSecondAt({ attemptPrice, finishPrice }, inputs.attemptsPerClip);
  return {
    id: pathId(model, resolution),
    label,
    modelId: model.id,
    modelName: model.name,
    family: model.family,
    draft: model.draft !== null,
    resolution,
    attemptPrice,
    finishPrice,
    creditsPerSecond: perSecond,
    videoCredits: perSecond ? clips.count.times(clips.billedSecondsPerAttempt).times(perSecond) : null,
    status: perSecond ? "ok" : "no-price",
    clips,
  };
}

/** Preis je generierter Sekunde mit Rabatt und Audio-Aufschlag; `null`, wenn kein Preis hinterlegt ist. */
export function pricePerSecond(
  model: VideoModel,
  resolution: Resolution,
  inputs: Pick<CreditInputs, "discount" | "audioSurchargePercent">,
): Big | null {
  const price: Price = model.resolutions[resolution];
  if (price.status !== "known") return null;
  let value = new Big(price.value);
  const { discount } = inputs;
  if (discount.enabled && discount.modelIds.includes(model.id) && discount.resolutions.includes(resolution)) {
    value = value.times(new Big(1).minus(new Big(discount.percent).div(100)));
  }
  if (model.audioSurchargeAllowed && inputs.audioSurchargePercent > 0) {
    value = value.times(new Big(1).plus(new Big(inputs.audioSurchargePercent).div(100)));
  }
  return value;
}

function fail(field: string, message: string): { ok: false; errors: AppError[] } {
  return { ok: false, errors: [{ code: "invalid-combination", field, message }] };
}
