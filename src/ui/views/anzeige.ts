import Big from "big.js";
import { deDate, formatDecimal, formatMoney } from "../../kern/index.ts";
import type { NoteArea, PlacedNote, Result } from "../../schema/index.ts";

// Aufbereitung des Ergebnisses für die Anzeige: Beträge mit Einheit, Hinweise an ihrem Ort, Reihenfolge.
// Gerechnet wird hier nichts; alle Zahlen und die Reihenfolge stammen aus calculate(). Euro-Beträge sind brutto.

/** Euro, wenn vorhanden, sonst Dollar; ohne beides „kein Betrag“. */
export function amountText(eur: string | null, usd: string | null): string {
  if (eur !== null) return formatMoney(eur, "EUR");
  if (usd !== null) return formatMoney(usd, "USD");
  return "kein Betrag";
}

/** Allgemeine Hinweise eines Orts. */
export function notesIn(result: Result, area: NoteArea): PlacedNote[] {
  return result.notes.filter((note): note is PlacedNote => note.area === area);
}

export function pathLabel(result: Result, pathId: string | null): string {
  return result.paths.find((path) => path.id === pathId)?.label ?? pathId ?? "";
}

export type PlanData = NonNullable<Result["paths"][number]["plan"]>;
export type PathData = Result["paths"][number];

/** „über Credit-Pakete“ oder, wenn nichts zu kaufen ist, „über deinen Credit-Stand“. */
export function paymentText(plan: PlanData): string {
  return plan.shortfall === "0" ? "über deinen Credit-Stand" : "über Credit-Pakete";
}

/** Bruttobetrag eines Plans; Euro, sonst Dollar. */
export function grossText(plan: PlanData): string {
  return amountText(plan.gross.eur, plan.gross.usd);
}

/** Nettobetrag eines Plans; nur für die eine Zahl oben (SPEC Entscheidung 25). */
export function netText(plan: PlanData): string {
  return amountText(plan.net.eur, plan.net.usd);
}

/** „Paketpreise vom 25.10.2026“; ohne Kauf leer. */
export function pricesAsOfText(plan: PlanData): string | null {
  return plan.pricesAsOf ? `Paketpreise vom ${deDate(plan.pricesAsOf)}` : null;
}

/** „3 Punkte · 580,72 € je Punkt“ für die Chips der Vergleichsliste. */
export function valueText(result: Result, path: PathData): string | null {
  if (!path.quality || !path.costPerQualityPoint) return null;
  const unit = result.exchangeRate ? "EUR" : "USD";
  return `${formatDecimal(path.quality.points, 2)} Punkte · ${formatMoney(path.costPerQualityPoint, unit)} je Punkt`;
}

/** Wege in der Reihenfolge des Rechenkerns (Preis-Leistung), nur mit Preis; Wege ohne Preis getrennt. */
export function pathsByValue(result: Result) {
  const ranked = result.valueRanking
    .map((id) => result.paths.find((path) => path.id === id))
    .filter((path): path is PathData => path !== undefined && path.status === "ok" && path.plan !== null);
  return { ranked, withoutPrice: result.paths.filter((path) => path.status === "no-price") };
}

/** „+312,45 € zu deiner Auswahl“, „−120,00 € zu deiner Auswahl“ oder „deine Auswahl“ (SPEC Entscheidung 29). */
export function differenceText(result: Result, path: PathData): string {
  if (path.id === result.selected.pathId) return "deine Auswahl";
  const difference = path.differenceToSelection;
  const value = difference?.eur ?? difference?.usd ?? null;
  if (value === null) return "kein Vergleich möglich";
  const amount = new Big(value);
  if (amount.eq(0)) return "gleich teuer wie deine Auswahl";
  const unit = difference?.eur !== null && difference?.eur !== undefined ? "EUR" : "USD";
  return `${amount.gt(0) ? "+" : "−"}${formatMoney(amount.abs().toString(), unit)} zu deiner Auswahl`;
}
