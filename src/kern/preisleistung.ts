import Big from "big.js";
import type { ExchangeRate, Note, QualityFile } from "../schema/index.ts";
import type { ProductionPath } from "./credits.ts";
import type { PathRecommendation } from "./empfehlung-weg.ts";
import { pathPhrase } from "./empfehlung-weg.ts";
import { type Plan, planCost } from "./kaufplan.ts";
import { deMoney, deNumber } from "./text.ts";

// Preis-Leistungs-Ranking der Produktionswege (docs/DECISIONS.md 2026-10-25, SPEC Entscheidung 27): Qualität in
// Punkten = Punkte der Auflösung × Faktor des Modells (preise/qualitaet.json); sortiert nach Kosten brutto je Punkt.

export type QualityScore = { points: Big; resolutionPoints: Big; factor: Big };

export type ValueEntry = {
  pathId: string;
  quality: QualityScore | null;
  /** Kosten brutto je Qualitätspunkt, Euro mit Kurs, sonst Dollar; `null` ohne Preis oder ohne Qualitätsangabe */
  costPerPoint: Big | null;
};

/** Qualitätspunkte eines Wegs; beim Draft-Weg zählt die Auflösung der Fertigstellung. `null` ohne Modellfaktor. */
export function qualityOf(path: ProductionPath, quality: QualityFile): QualityScore | null {
  const factor = quality.modelFactors[path.modelId];
  if (factor === undefined) return null;
  const resolutionPoints = new Big(quality.resolutionPoints[path.resolution]);
  return { points: resolutionPoints.times(factor), resolutionPoints, factor: new Big(factor) };
}

/**
 * Alle Wege nach Preis-Leistung, bestes Verhältnis zuerst; bei Gleichstand mehr Qualität, dann weniger Kosten.
 * Wege ohne Preis oder ohne Qualitätsangabe stehen am Ende.
 */
export function rankByValue(
  paths: ProductionPath[],
  plans: Map<string, Plan | null>,
  quality: QualityFile,
  rate: ExchangeRate | null,
): ValueEntry[] {
  const entries = paths.map((path) => {
    const score = qualityOf(path, quality);
    const plan = plans.get(path.id);
    const cost = plan ? planCost(plan, rate) : null;
    return { pathId: path.id, quality: score, costPerPoint: score && cost ? cost.div(score.points) : null, cost };
  });
  entries.sort((a, b) => {
    if (a.costPerPoint === null || b.costPerPoint === null) {
      return Number(a.costPerPoint === null) - Number(b.costPerPoint === null);
    }
    return (
      a.costPerPoint.cmp(b.costPerPoint) ||
      (b.quality?.points ?? new Big(0)).cmp(a.quality?.points ?? new Big(0)) ||
      (a.cost ?? new Big(0)).cmp(b.cost ?? new Big(0))
    );
  });
  return entries.map(({ pathId, quality: score, costPerPoint }) => ({ pathId, quality: score, costPerPoint }));
}

/** Empfehlung der Vergleichsliste: das beste Preis-Leistungs-Verhältnis, nicht zwingend der günstigste Weg. */
export function recommendBestValue(
  ranking: ValueEntry[],
  paths: ProductionPath[],
  plans: Map<string, Plan | null>,
  rate: ExchangeRate | null,
): PathRecommendation {
  const [best, runnerUp] = ranking.filter((entry) => entry.costPerPoint !== null);
  const pathOf = (entry: ValueEntry) => paths.find((path) => path.id === entry.pathId);
  const bestPath = best ? pathOf(best) : undefined;
  if (!best?.costPerPoint || !best.quality || !bestPath) {
    return {
      pathId: null,
      sentence: "Für keinen Produktionsweg lässt sich das Preis-Leistungs-Verhältnis berechnen.",
      reason: "Dafür braucht jeder Weg einen Preis und einen Qualitätsfaktor in preise/qualitaet.json.",
      threshold: "Sobald Preis und Qualitätsfaktor hinterlegt sind, entsteht eine Empfehlung.",
      notes: [],
    };
  }
  const unit = rate ? "EUR" : "USD";
  const plan = plans.get(best.pathId);
  const cost = plan ? planCost(plan, rate) : null;
  const { quality } = best;
  const reasons = [
    `${pathPhrase(bestPath)} bringt ${deNumber(quality.points.toString())} Qualitätspunkte (${bestPath.resolution} = ${deNumber(quality.resolutionPoints.toString())} × Modellfaktor ${deNumber(quality.factor.toString())})${cost ? `; der ganze Film kostet so ${deMoney(cost, unit)} brutto, ohne Abzug deines Credit-Stands` : ""}, also ${deMoney(best.costPerPoint, unit)} je Punkt.`,
  ];
  const notes: Note[] = [];
  if (bestPath.family === "seedance-2.0") {
    notes.push({
      kind: "info",
      text: "Seedance 2.0 hat nicht den Referenz-Workflow von Seedance 2.5; das steckt im niedrigeren Modellfaktor.",
    });
  }
  const runnerPath = runnerUp ? pathOf(runnerUp) : undefined;
  return {
    pathId: best.pathId,
    sentence: `Bestes Preis-Leistungs-Verhältnis: ${pathPhrase(bestPath)}.`,
    reason: reasons.join(" "),
    threshold:
      runnerUp?.costPerPoint && runnerPath
        ? `nächstbestes Verhältnis: ${pathPhrase(runnerPath)} mit ${deMoney(runnerUp.costPerPoint, unit)} je Punkt, ${deMoney(runnerUp.costPerPoint.minus(best.costPerPoint), unit)} je Punkt mehr`
        : "es gibt keinen weiteren Weg mit Preis",
    notes,
  };
}
