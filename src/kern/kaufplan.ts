import Big from "big.js";
import type { ExchangeRate, PriceData } from "../schema/index.ts";
import type { ImageCredits } from "./bilder.ts";
import { type ProductionPath, totalCredits } from "./credits.ts";
import { coverShortfall, type PriceLevel } from "./pakete.ts";
import { usdToEur } from "./waehrung.ts";

// Kaufplan eines Produktionswegs (docs/DECISIONS.md 2026-10-25): welche Credit-Pakete der Nutzer kaufen muss, was
// jedes Paket und alle zusammen brutto kosten, und zum Vergleich das günstigste einzelne Paket.

/** Betrag brutto; `eur` ohne Kurs nur bei Euro-Preisen, `usd` nur bei Dollar-Preisen. */
export type Gross = { eur: Big | null; usd: Big | null };

export type PlanPackage = { credits: number; count: number; unitGross: Gross; lineGross: Gross };

export type Plan = {
  pathId: string;
  /** alle Credits des Wegs (Video und Bilder), die über Credit-Stand und Pakete gedeckt werden müssen */
  creditsNeeded: Big;
  /** fehlende Credits nach Abzug des Credit-Stands */
  shortfall: Big;
  packages: PlanPackage[];
  leftoverCredits: Big;
  gross: Gross;
  /** netto nur für die eine Zahl oben in der App (SPEC Entscheidung 25) */
  net: Gross;
  /** günstigstes einzelnes Paket, das allein reicht, zum Vergleich mit der gewählten Kombination */
  singlePackage: { credits: number; gross: Gross } | null;
  /** jüngstes Stand-Datum der benutzten Paketpreise; `null`, wenn nichts zu kaufen ist */
  pricesAsOf: string | null;
};

export type PlanContext = {
  images: ImageCredits;
  creditBalance: number;
  prices: PriceData;
  priceLevel: PriceLevel;
  rate: ExchangeRate | null;
};

/** Kaufplan über Credit-Pakete; `null` ohne Preis. */
export function creditPlan(path: ProductionPath, context: PlanContext): Plan | null {
  const needed = totalCredits(path, context.images);
  return needed === null ? null : planForCredits(needed, path.id, context);
}

/** Kaufplan für eine beliebige Credit-Menge, zum Beispiel die Summe mehrerer Projekte (src/kern/gesamt.ts). */
export function planForCredits(needed: Big, pathId: string, context: Omit<PlanContext, "images">): Plan | null {
  const { prices, rate } = context;
  const purchase = coverShortfall({
    needed,
    creditBalance: context.creditBalance,
    packages: prices.packages,
    priceLevel: context.priceLevel,
    rate,
  });
  if (!purchase.ok) return null;
  const bought = purchase.value;
  const vat = new Big(1).plus(new Big(prices.packages.vatPercent).div(100));
  const gross = (net: Big, currency: "USD" | "EUR"): Gross => {
    const amount = net.times(vat);
    return currency === "EUR" ? { eur: amount, usd: null } : { eur: rate ? usdToEur(amount, rate) : null, usd: amount };
  };
  const hasEur = bought.eurNet.gt(0);
  const hasUsd = bought.usdNet.gt(0);
  const total = (usd: Big, eur: Big): Gross => ({
    eur: rate ? usdToEur(usd, rate).plus(eur) : hasUsd ? null : eur,
    usd: hasEur ? null : usd,
  });
  return {
    pathId,
    creditsNeeded: needed,
    shortfall: bought.shortfall,
    packages: bought.packages.map((pack) => {
      const unit = gross(pack.unitNet, pack.currency);
      return {
        credits: pack.credits,
        count: pack.count,
        unitGross: unit,
        lineGross: gross(pack.unitNet.times(pack.count), pack.currency),
      };
    }),
    leftoverCredits: bought.leftoverCredits,
    gross: total(bought.usdGross, bought.eurNet.times(vat)),
    net: total(bought.usdNet, bought.eurNet),
    singlePackage: bought.singlePackage
      ? {
          credits: bought.singlePackage.credits,
          gross: gross(bought.singlePackage.unitNet, bought.singlePackage.currency),
        }
      : null,
    pricesAsOf: bought.pricesAsOf,
  };
}

/** Vergleichswert eines Plans: Euro mit Kurs, sonst Dollar; `null`, wenn er sich so nicht vergleichen lässt. */
export function planCost(plan: Plan, rate: ExchangeRate | null): Big | null {
  return rate ? plan.gross.eur : plan.gross.usd;
}
