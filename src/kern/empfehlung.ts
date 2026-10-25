import type Big from "big.js";
import type { ExchangeRate, Note, PriceData, Resolution } from "../schema/index.ts";
import type { CreditResult } from "./credits.ts";
import { type PathRecommendation, pathPhrase, type Recommendation, recommendProductionPath } from "./empfehlung-weg.ts";
import { type Plan, planCost } from "./kaufplan.ts";
import { recommendBestValue, type ValueEntry } from "./preisleistung.ts";
import { deMoney } from "./text.ts";

// Bündelung der Empfehlungen (docs/DECISIONS.md 2026-10-25, SPEC Entscheidungen 23, 26 und 27).
// Oben steht immer deine Auswahl: gewähltes Videomodell in der gewählten Auflösung über Credit-Pakete. Die
// Unlimited-Pässe sind ausgebaut ; bezahlt wird nur noch über den Credit-Stand und Pakete.

export type OverallRecommendation = Recommendation & {
  pathId: string | null;
  /** tatsächliche Zusatzkosten brutto; `eur` ist `null` ohne Kurs (AC-F4-3) */
  eur: Big | null;
  usd: Big | null;
  /** was konkret zu kaufen ist; `null` ohne Preis */
  plan: Plan | null;
};

export type Recommendations = {
  /** günstigster Weg mit mindestens der Zielauflösung, nach Credits je Sekunde (Frage 1, AC-F6-1 bis AC-F6-4) */
  productionPath: PathRecommendation;
  /** bestes Preis-Leistungs-Verhältnis über alle angezeigten Wege; Empfehlung der Vergleichsliste */
  bestValue: PathRecommendation;
  overall: OverallRecommendation;
};

export function recommend(params: {
  credits: CreditResult;
  plans: Map<string, Plan | null>;
  ranking: ValueEntry[];
  /** Pläne ohne Abzug des Credit-Stands, Grundlage des Preis-Leistungs-Rankings */
  fullPlans: Map<string, Plan | null>;
  prices: PriceData;
  rate: ExchangeRate | null;
  target: Resolution;
  attemptsPerClip: number;
}): Recommendations {
  const { credits, plans, rate, target } = params;
  return {
    productionPath: recommendProductionPath(credits.paths, target, params.attemptsPerClip),
    bestValue: recommendBestValue(params.ranking, credits.paths, params.fullPlans, rate),
    overall: recommendOverall(credits, plans, rate),
  };
}

/** Kosten deiner Auswahl; ein günstigerer anderer Weg erscheint nur als Hinweis (Kommandozeile, MCP-Server). */
function recommendOverall(
  credits: CreditResult,
  plans: Map<string, Plan | null>,
  rate: ExchangeRate | null,
): OverallRecommendation {
  const path = credits.paths.find((candidate) => candidate.id === credits.selectedPathId);
  const plan = plans.get(credits.selectedPathId) ?? null;
  const cost = plan ? planCost(plan, rate) : null;
  if (!path || !plan || !cost) {
    return {
      pathId: null,
      eur: null,
      usd: null,
      plan: null,
      sentence: "Für deine Auswahl ist kein Preis hinterlegt.",
      reason: "Ohne Preis lässt sich nicht sagen, was deine Auswahl kostet.",
      threshold: "Sobald der Preis hinterlegt ist, steht hier der Betrag.",
      notes: [],
    };
  }
  const unit = rate ? "EUR" : "USD";
  const way = plan.shortfall.eq(0) ? "über deinen Credit-Stand" : "über Credit-Pakete";
  const notes: Note[] = [];
  const cheapest = credits.paths
    .flatMap((candidate) => {
      const candidatePlan = plans.get(candidate.id);
      const candidateCost = candidatePlan ? planCost(candidatePlan, rate) : null;
      return candidateCost ? [{ candidate, cost: candidateCost }] : [];
    })
    .sort((a, b) => a.cost.cmp(b.cost))[0];
  if (cheapest && cheapest.candidate.id !== path.id && cheapest.cost.lt(cost)) {
    notes.push({
      kind: "info",
      text: `Mit einem anderen Weg ginge es günstiger: ${pathPhrase(cheapest.candidate)} über Credit-Pakete für ${deMoney(cheapest.cost, unit)}.`,
    });
  }
  if (!rate) notes.push({ kind: "info", text: "Ohne Wechselkurs stehen alle Beträge in Dollar." });
  return {
    pathId: path.id,
    eur: plan.gross.eur,
    usd: plan.gross.usd,
    plan,
    sentence: `${pathPhrase(path)} ${way}, ${deMoney(cost, unit)}`,
    reason:
      "Gerechnet mit deiner Auswahl. Die Pakete sind die günstigste Kombination aller Paketgrößen mit Preis, auch im Vergleich mit einem einzelnen größeren Paket.",
    threshold: "die Pakete ändern sich, sobald der Fehlbetrag eine Paketgrenze überschreitet",
    notes,
  };
}
