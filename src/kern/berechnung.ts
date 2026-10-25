import type Big from "big.js";
import {
  type ExchangeRate,
  type Inputs,
  inputsSchema,
  issuesToErrors,
  type Note,
  type NoteArea,
  type Outcome,
  type PlacedNote,
  type PriceData,
  type Result,
} from "../schema/index.ts";
import type { ImageCredits } from "./bilder.ts";
import { computeCredits, totalCredits } from "./credits.ts";
import { type Recommendations, recommend } from "./empfehlung.ts";
import { creditPlan, type Gross, type Plan } from "./kaufplan.ts";
import { coverShortfall, type Purchase } from "./pakete.ts";
import { type QualityScore, rankByValue } from "./preisleistung.ts";
import { computeReach, type Reach } from "./rest.ts";
import { exchangeRateNote } from "./waehrung.ts";

// Einzige Einstiegsstelle des Rechenkerns für Oberfläche, Kommandozeile und MCP-Server (docs/ARCHITECTURE.md).

/** Ergebnis mit big.js-Zahlen; über die Grenze geht es als `Result` mit Zahlen als Text. */
type ResultValues = {
  openSeconds: Big;
  clips: { count: Big; lengthSeconds: Big; billedSecondsPerAttempt: Big };
  paths: {
    id: string;
    label: string;
    modelId: string;
    resolution: string;
    creditsPerSecond: Big | null;
    videoCredits: Big | null;
    status: "ok" | "no-price";
    /** Kauf über Credit-Pakete für diesen Weg; `null` ohne Preis */
    plan: Plan | null;
    /** Qualitätspunkte und Kosten brutto je Punkt für den ganzen Film, ohne Abzug des Credit-Stands (Entscheidung 27) */
    quality: QualityScore | null;
    costPerQualityPoint: Big | null;
    /** Kosten brutto dieses Wegs minus Kosten brutto deiner Auswahl; positiv = teurer (SPEC Entscheidung 29) */
    differenceToSelection: Gross | null;
  }[];
  /** Kennungen der Wege nach Preis-Leistung, bestes Verhältnis zuerst */
  valueRanking: string[];
  images: ImageCredits;
  selected: { pathId: string; totalCredits: Big | null } & (Omit<Purchase, "notes"> | NoPurchase);
  exchangeRate: ExchangeRate | null;
  recommendations: Recommendations;
  reach: Reach | null;
  notes: PlacedNote[];
};

type NoPurchase = { [K in keyof Omit<Purchase, "notes" | "packages">]: null } & { packages: [] };

/** Zahlen als exakter Dezimaltext, alles andere unverändert. */
export type Serialized<T> = T extends Big
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

export function validateInputs(raw: unknown): Outcome<Inputs> {
  const parsed = inputsSchema.safeParse(raw);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, errors: issuesToErrors(parsed.error) };
}

export function calculate(raw: unknown, prices: PriceData, rate: ExchangeRate | null): Outcome<Result> {
  const validated = validateInputs(raw);
  if (!validated.ok) return validated;
  const inputs = validated.value;
  const { settings } = prices;
  const resolved = {
    ...inputs,
    clipLengthSeconds: inputs.clipLengthSeconds ?? settings.clipLengthSeconds,
    discount: inputs.discount ?? {
      enabled: settings.discountEnabled,
      percent: settings.discountPercent,
      modelIds: settings.discountScope.modelIds,
      resolutions: settings.discountScope.resolutions,
    },
    audioSurchargePercent: inputs.audioSurchargePercent ?? settings.audioSurchargePercent,
    clipImagesPerClip: inputs.clipImagesPerClip ?? settings.clipImagesPerClip,
    oneTimeAssets: inputs.oneTimeAssets && {
      modelId: inputs.oneTimeAssets.modelId,
      people: inputs.oneTimeAssets.people ?? settings.assetPeople,
      locations: inputs.oneTimeAssets.locations ?? settings.assetLocations,
      attemptsPerAsset: inputs.oneTimeAssets.attemptsPerAsset ?? settings.attemptsPerAsset,
    },
    packagePriceLevel: inputs.packagePriceLevel ?? settings.packagePriceLevel,
  };

  const credits = computeCredits(resolved, prices);
  if (!credits.ok) return credits;
  const { paths, images, selectedPathId, clips } = credits.value;
  const selectedPath = paths.find((path) => path.id === selectedPathId);
  const total = selectedPath ? totalCredits(selectedPath, images) : null;

  const notes: PlacedNote[] = [...credits.value.notes, ...placed("rate", [exchangeRateNote(rate)])];
  let selected: ResultValues["selected"];
  if (total === null) {
    selected = { pathId: selectedPathId, totalCredits: null, ...emptyPurchase() };
  } else {
    const purchase = coverShortfall({
      needed: total,
      creditBalance: resolved.creditBalance,
      packages: prices.packages,
      priceLevel: resolved.packagePriceLevel,
      rate,
    });
    if (!purchase.ok) return purchase;
    const { notes: purchaseNotes, ...values } = purchase.value;
    notes.push(...placed("packages", purchaseNotes));
    selected = { pathId: selectedPathId, totalCredits: total, ...values };
  }

  const planContext = {
    images,
    creditBalance: resolved.creditBalance,
    prices,
    priceLevel: resolved.packagePriceLevel,
    rate,
  };
  const plans = new Map(paths.map((path) => [path.id, creditPlan(path, planContext)]));
  // Preis-Leistung für den ganzen Film, ohne Abzug des Credit-Stands, damit das Guthaben die Reihenfolge nicht verzerrt.
  const fullPlans = new Map(paths.map((path) => [path.id, creditPlan(path, { ...planContext, creditBalance: 0 })]));
  const ranking = rankByValue(paths, fullPlans, prices.quality, rate);
  const rankOf = new Map(ranking.map((entry) => [entry.pathId, entry]));
  const { reach, note } = computeReach(selectedPath, images, resolved.creditBalance);
  if (note) notes.push(...placed("reach", [note]));

  const values: ResultValues = {
    openSeconds: clips.openSeconds,
    clips: {
      count: clips.count,
      lengthSeconds: clips.lengthSeconds,
      billedSecondsPerAttempt: clips.billedSecondsPerAttempt,
    },
    paths: paths.map((path) => ({
      id: path.id,
      label: path.label,
      modelId: path.modelId,
      resolution: path.resolution,
      creditsPerSecond: path.creditsPerSecond,
      videoCredits: path.videoCredits,
      status: path.status,
      plan: plans.get(path.id) ?? null,
      quality: rankOf.get(path.id)?.quality ?? null,
      costPerQualityPoint: rankOf.get(path.id)?.costPerPoint ?? null,
      differenceToSelection: difference(plans.get(path.id) ?? null, plans.get(selectedPathId) ?? null),
    })),
    valueRanking: ranking.map((entry) => entry.pathId),
    images,
    selected,
    exchangeRate: rate,
    recommendations: recommend({
      credits: credits.value,
      plans,
      ranking,
      fullPlans,
      prices,
      rate,
      target: resolved.resolution,
      attemptsPerClip: resolved.attemptsPerClip,
    }),
    reach,
    notes,
  };
  // big.js schreibt sich in JSON als exakter Dezimaltext; so wird das Ergebnis reines JSON.
  return { ok: true, value: matchesSchema(JSON.parse(JSON.stringify(values)) as Serialized<ResultValues>) };
}

/** Unterschied brutto zwischen zwei Kaufplänen, je Währung nur, wenn beide Beträge vorliegen. */
function difference(plan: Plan | null, selected: Plan | null): Gross | null {
  if (!plan || !selected) return null;
  const minus = (a: Big | null, b: Big | null) => (a && b ? a.minus(b) : null);
  return { eur: minus(plan.gross.eur, selected.gross.eur), usd: minus(plan.gross.usd, selected.gross.usd) };
}

/** Prüft beim Übersetzen, dass das Ergebnis des Kerns zum Schema `resultSchema` passt. */
function matchesSchema(result: Serialized<ResultValues>): Result {
  return result;
}

/** Ort der allgemeinen Hinweise für die Oberfläche (docs/ARCHITECTURE.md, Ergebnisfeld `notes`). */
function placed(area: NoteArea, notes: Note[]): PlacedNote[] {
  return notes.map((note) => ({ ...note, area }));
}

function emptyPurchase(): NoPurchase {
  return {
    shortfall: null,
    packages: [],
    singlePackage: null,
    pricesAsOf: null,
    creditsBought: null,
    leftoverCredits: null,
    usdNet: null,
    usdGross: null,
    eurNet: null,
    eur: null,
  };
}
