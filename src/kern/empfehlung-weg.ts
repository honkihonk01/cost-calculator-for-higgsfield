import type Big from "big.js";
import type { Note, Resolution } from "../schema/index.ts";
import { creditsPerSecondAt, type ProductionPath, resolutionRank } from "./credits.ts";
import { deNumber } from "./text.ts";

// Frage 1 aus docs/RECHENREGELN.md 5.1: welcher Produktionsweg, und ab wie vielen Versuchen sich das ändert.

export type Recommendation = { sentence: string; reason: string; threshold: string; notes: Note[] };
export type PathRecommendation = Recommendation & { pathId: string | null };

const MAX_ATTEMPTS = 20;

/** „Seedance 2.5 Draft plus 1080p“ bzw. „Seedance 2.0 Standard in 1080p“ */
export function pathPhrase(path: ProductionPath): string {
  return path.draft ? `${path.modelName} plus ${path.resolution}` : `${path.modelName} in ${path.resolution}`;
}

/** Kosten des ganzen offenen Umfangs bei `attempts` Versuchen, als Vergleichswert. */
function costAt(path: ProductionPath, attempts: number): Big | null {
  const perSecond = creditsPerSecondAt(path, attempts);
  return perSecond ? perSecond.times(path.clips.billedSecondsPerAttempt) : null;
}

/** Günstigster Weg mit mindestens der Zielauflösung; bei Gleichstand die höhere Auflösung (AC-F6-4). */
export function cheapestPath(paths: ProductionPath[], target: Resolution, attempts: number): ProductionPath | null {
  let best: { path: ProductionPath; cost: Big } | null = null;
  for (const path of paths) {
    const cost = costAt(path, attempts);
    if (cost === null || resolutionRank(path.resolution) < resolutionRank(target)) continue;
    const comparison = best ? cost.cmp(best.cost) : -1;
    if (
      comparison < 0 ||
      (best && comparison === 0 && resolutionRank(path.resolution) > resolutionRank(best.path.resolution))
    ) {
      best = { path, cost };
    }
  }
  return best?.path ?? null;
}

export function recommendProductionPath(
  paths: ProductionPath[],
  target: Resolution,
  attempts: number,
): PathRecommendation {
  const notes: Note[] = [];
  const withoutPrice = paths.filter((path) => path.status === "no-price");
  if (withoutPrice.length > 0) {
    notes.push({
      kind: "no-price",
      text: `Ohne Preis und deshalb nie empfohlen: ${withoutPrice.map(pathPhrase).join(", ")}.`,
    });
  }
  const best = cheapestPath(paths, target, attempts);
  if (!best?.creditsPerSecond) {
    return {
      pathId: null,
      sentence: `Für keinen Produktionsweg mit mindestens ${target} ist ein Preis hinterlegt.`,
      reason: "Ohne Preis lässt sich kein Weg empfehlen.",
      threshold: "Sobald ein Preis hinterlegt ist, entsteht eine Empfehlung.",
      notes,
    };
  }

  const reasons = [
    `${pathPhrase(best)} kostet ${deNumber(best.creditsPerSecond)} Credits je Sekunde fertigem Film bei ${attempts} ${attempts === 1 ? "Versuch" : "Versuchen"} pro Clip.`,
  ];
  const runnerUp = cheapestPath(
    paths.filter((path) => path.id !== best.id),
    target,
    attempts,
  );
  if (runnerUp?.creditsPerSecond) {
    reasons.push(
      `Nächstgünstig mit mindestens ${target}: ${pathPhrase(runnerUp)} mit ${deNumber(runnerUp.creditsPerSecond)} Credits je Sekunde.`,
    );
  }
  const family = familyComparison(paths, target);
  if (family) reasons.push(family);
  if (best.family === "seedance-2.0") {
    reasons.push(
      "Seedance 2.0 hat nicht den Referenz-Workflow von Seedance 2.5; die Empfehlung beruht allein auf dem Preis.",
    );
  }

  const cheaperLower = paths
    .filter((path) => path.creditsPerSecond && resolutionRank(path.resolution) < resolutionRank(target))
    .sort((a, b) => a.creditsPerSecond?.cmp(b.creditsPerSecond ?? 0) ?? 0)[0];
  if (cheaperLower?.creditsPerSecond?.lt(best.creditsPerSecond)) {
    notes.push({
      kind: "info",
      text: `Günstiger, aber nur in ${cheaperLower.resolution}: ${pathPhrase(cheaperLower)} mit ${deNumber(cheaperLower.creditsPerSecond)} Credits je Sekunde.`,
    });
  }
  return {
    pathId: best.id,
    sentence: `Produziere mit ${pathPhrase(best)}.`,
    reason: reasons.join(" "),
    threshold: threshold(paths, target, attempts, best),
    notes,
  };
}

/** Nächste Versuchszahl darunter und darüber, bei der ein anderer Weg günstiger wird. */
function threshold(paths: ProductionPath[], target: Resolution, attempts: number, best: ProductionPath): string {
  const parts: string[] = [];
  for (let count = attempts - 1; count >= 1; count -= 1) {
    const winner = cheapestPath(paths, target, count);
    if (winner && winner.id !== best.id) {
      parts.push(`bei ${count} oder weniger Versuchen ist ${shortName(winner, best)} günstiger`);
      break;
    }
  }
  for (let count = attempts + 1; count <= MAX_ATTEMPTS; count += 1) {
    const winner = cheapestPath(paths, target, count);
    if (winner && winner.id !== best.id) {
      parts.push(`ab ${count} Versuchen ist ${shortName(winner, best)} günstiger`);
      break;
    }
  }
  return parts.length > 0
    ? parts.join("; ")
    : `im Bereich von 1 bis ${MAX_ATTEMPTS} Versuchen bleibt ${pathPhrase(best)} am günstigsten`;
}

function shortName(path: ProductionPath, best: ProductionPath): string {
  return !path.draft && path.resolution === best.resolution ? path.modelName : pathPhrase(path);
}

/** Vergleich der Seedance-2.5-Wege untereinander (docs/RECHENREGELN.md 4.4), mit Gleichstand (AC-F6-4). */
function familyComparison(paths: ProductionPath[], target: Resolution): string | null {
  const family = paths.filter((path) => path.family === "seedance-2.5" && path.creditsPerSecond);
  if (family.length < 2) return null;
  const lowest = family.reduce((min, path) => (path.creditsPerSecond?.lt(min.creditsPerSecond ?? 0) ? path : min));
  const tied = family
    .filter((path) => path.creditsPerSecond?.eq(lowest.creditsPerSecond ?? 0))
    .sort((a, b) => resolutionRank(b.resolution) - resolutionRank(a.resolution));
  const name = (path: ProductionPath) =>
    path.draft ? `„Draft plus ${path.resolution}“` : `„${path.resolution} direkt“`;
  const value = deNumber(lowest.creditsPerSecond ?? 0);
  if (tied.length === 1) {
    const below =
      resolutionRank(lowest.resolution) < resolutionRank(target) ? `, liefert aber nur ${lowest.resolution}` : "";
    return `Unter den Seedance-2.5-Wegen ist ${name(lowest)} mit ${value} Credits je Sekunde am günstigsten${below}.`;
  }
  const [first, ...others] = tied;
  return `Unter den Seedance-2.5-Wegen kosten ${tied.map(name).join(" und ")} gleich viel, je ${value} Credits je Sekunde; ${name(first)} ist vorzuziehen, weil er ${first.resolution} statt ${others.map((path) => path.resolution).join(" oder ")} liefert.`;
}
