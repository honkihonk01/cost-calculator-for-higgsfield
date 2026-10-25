import Big from "big.js";
import type { ExchangeRate, Note, Outcome, PackagesFile } from "../schema/index.ts";
import { deNumber } from "./text.ts";

// F3: günstigste Paketkombination für den Fehlbetrag, Mehrwertsteuer vor der Umrechnung (docs/RECHENREGELN.md 4.2).

export type PriceLevel = "regular" | "discounted";

export type PurchaseInput = {
  /** gesamter Credit-Bedarf (Video + Bilder) */
  needed: Big;
  creditBalance: number;
  packages: PackagesFile;
  priceLevel: PriceLevel;
  rate: ExchangeRate | null;
};

export type Purchase = {
  /** fehlende Credits; 0, wenn der Credit-Stand reicht */
  shortfall: Big;
  /** gewählte Pakete mit Nettopreis je Paket in der Währung, in der Higgsfield sie notiert */
  packages: { credits: number; count: number; unitNet: Big; currency: "USD" | "EUR" }[];
  /**
   * Zum Vergleich das günstigste einzelne Paket, das den Fehlbetrag allein deckt; `null`, wenn die gewählte
   * Kombination schon dieses eine Paket ist oder kein einzelnes Paket reicht.
   */
  singlePackage: { credits: number; unitNet: Big; currency: "USD" | "EUR" } | null;
  /** jüngstes Stand-Datum der Paketpreise, mit denen gerechnet wurde */
  pricesAsOf: string | null;
  creditsBought: Big;
  /** Credits nach dem Kauf übrig: Credit-Stand + gekauft − Bedarf */
  leftoverCredits: Big;
  /** Summe der Dollar-Preise, netto und brutto */
  usdNet: Big;
  usdGross: Big;
  /** Summe der Euro-Preise netto (ohne Umrechnung, AC-F3-7) */
  eurNet: Big;
  /** gesamte Zusatzkosten in Euro brutto; `null` ohne Kurs, wenn Dollar-Preise dabei sind */
  eur: Big | null;
  notes: Note[];
};

type Candidate = { credits: number; units: number; currency: "USD" | "EUR"; net: Big; key: Big; asOf: string };

export function coverShortfall(input: PurchaseInput): Outcome<Purchase> {
  const { packages, rate } = input;
  const vat = new Big(1).plus(new Big(packages.vatPercent).div(100));
  const shortfall = maxBig(input.needed.minus(input.creditBalance), new Big(0));
  const notes: Note[] = [];

  if (shortfall.eq(0)) {
    const leftover = new Big(input.creditBalance).minus(input.needed);
    notes.push({
      kind: "covered",
      text: `Dein Credit-Stand deckt den Bedarf. Es bleiben ${deNumber(leftover)} Credits übrig, zusätzliche Kosten entstehen nicht.`,
    });
    const zero = new Big(0);
    return {
      ok: true,
      value: {
        shortfall,
        packages: [],
        singlePackage: null,
        pricesAsOf: null,
        creditsBought: zero,
        leftoverCredits: leftover,
        usdNet: zero,
        usdGross: zero,
        eurNet: zero,
        eur: zero,
        notes,
      },
    };
  }

  const priced = packages.packages.flatMap((pack) => {
    const price = pack[input.priceLevel];
    if (price.status !== "known" || (price.unit !== "USD" && price.unit !== "EUR")) return [];
    return [{ credits: pack.credits, currency: price.unit, net: new Big(price.value), asOf: price.asOf }];
  });
  const withoutPrice = packages.packages.filter((pack) => pack[input.priceLevel].status !== "known");
  if (withoutPrice.length > 0) {
    notes.push({
      kind: "no-price",
      text: `Ohne hinterlegten Preis und deshalb nicht berücksichtigt: Pakete mit ${withoutPrice.map((pack) => deNumber(pack.credits)).join(", ")} Credits.`,
    });
  }
  // Ohne Kurs wird in Dollar verglichen; Euro-Pakete fallen dann mit Hinweis weg (SPEC Entscheidung 13).
  const usable = rate === null ? priced.filter((pack) => pack.currency === "USD") : priced;
  if (rate === null && usable.length < priced.length) {
    notes.push({ kind: "info", text: "Ohne Wechselkurs bleiben Pakete mit Euro-Preis beim Vergleich außen vor." });
  }
  if (usable.length === 0) {
    return {
      ok: false,
      errors: [
        { code: "no-package", message: "Für keine Paketgröße ist ein Preis hinterlegt, mit dem sich rechnen lässt." },
      ],
    };
  }

  const unit = usable.map((pack) => pack.credits).reduce(gcd);
  const mixed = usable.some((pack) => pack.currency === "EUR") && usable.some((pack) => pack.currency === "USD");
  const candidates: Candidate[] = usable.map((pack) => ({
    ...pack,
    units: pack.credits / unit,
    // Vergleichswert: bei gemischten Währungen alles in Euro netto, sonst der Nettopreis selbst (exakt, ohne Division).
    key: mixed && rate && pack.currency === "USD" ? pack.net.div(rate.value) : pack.net,
  }));
  const chosen = cheapestCombination(candidates, shortfall.div(unit).round(0, Big.roundUp).toNumber());
  const single = candidates
    .filter((candidate) => shortfall.lte(candidate.credits))
    .sort((a, b) => a.key.cmp(b.key) || a.credits - b.credits)[0];
  const onlyThatOne = chosen.length === 1 && chosen[0]?.count === 1 && chosen[0].candidate === single;

  let usdNet = new Big(0);
  let eurNet = new Big(0);
  let creditsBought = new Big(0);
  for (const { candidate, count } of chosen) {
    const sum = candidate.net.times(count);
    if (candidate.currency === "USD") usdNet = usdNet.plus(sum);
    else eurNet = eurNet.plus(sum);
    creditsBought = creditsBought.plus(candidate.credits * count);
  }
  const usdGross = usdNet.times(vat);
  const eur = rate ? usdGross.div(rate.value).plus(eurNet.times(vat)) : null;
  const leftoverCredits = creditsBought.minus(shortfall);
  if (leftoverCredits.gt(0)) {
    notes.push({
      kind: "info",
      text: `Nach dem Kauf bleiben ${deNumber(leftoverCredits)} Credits übrig. Gekaufte Credits verfallen nach ${packages.expiryDays} Tagen.`,
    });
  }
  return {
    ok: true,
    value: {
      shortfall,
      packages: chosen
        .map(({ candidate, count }) => ({
          credits: candidate.credits,
          count,
          unitNet: candidate.net,
          currency: candidate.currency,
        }))
        .sort((a, b) => b.credits - a.credits),
      singlePackage:
        single && !onlyThatOne ? { credits: single.credits, unitNet: single.net, currency: single.currency } : null,
      pricesAsOf: usable.map((pack) => pack.asOf).reduce((newest, date) => (date > newest ? date : newest)),
      creditsBought,
      leftoverCredits,
      usdNet,
      usdGross,
      eurNet,
      eur,
      notes,
    },
  };
}

/**
 * Exakte Suche über alle Mengen von `target` bis `target + größtes Paket − 1` Einheiten (docs/QUALITY.md):
 * je Menge die günstigste Kombination, bei gleichem Preis die mit weniger Paketen; am Ende gewinnt
 * der niedrigste Preis, dann die geringere Paketzahl, dann der kleinere Überschuss (AC-F3-4).
 */
function cheapestCombination(candidates: Candidate[], target: number): { candidate: Candidate; count: number }[] {
  const size = target + Math.max(...candidates.map((candidate) => candidate.units));
  const cost: (Big | null)[] = new Array(size).fill(null);
  const count: number[] = new Array(size).fill(0);
  const last: number[] = new Array(size).fill(-1);
  cost[0] = new Big(0);
  for (let amount = 1; amount < size; amount += 1) {
    candidates.forEach((candidate, index) => {
      const before = amount - candidate.units;
      const base = before >= 0 ? cost[before] : null;
      if (base === null || base === undefined) return;
      const total = base.plus(candidate.key);
      const current = cost[amount];
      if (current === null || current === undefined || isBetter(total, count[before] + 1, current, count[amount])) {
        cost[amount] = total;
        count[amount] = count[before] + 1;
        last[amount] = index;
      }
    });
  }
  let best = -1;
  for (let amount = target; amount < size; amount += 1) {
    const total = cost[amount];
    if (total === null || total === undefined) continue;
    const bestTotal = best >= 0 ? cost[best] : null;
    // Bei gleichem Preis und gleicher Paketzahl bleibt die kleinere Menge, also der kleinere Überschuss.
    if (!bestTotal || isBetter(total, count[amount], bestTotal, count[best])) best = amount;
  }
  const counts = new Map<number, number>();
  for (let amount = best; amount > 0; amount -= candidates[last[amount]].units) {
    counts.set(last[amount], (counts.get(last[amount]) ?? 0) + 1);
  }
  return [...counts].map(([index, packageCount]) => ({ candidate: candidates[index], count: packageCount }));
}

function isBetter(cost: Big, packages: number, otherCost: Big, otherPackages: number): boolean {
  const comparison = cost.cmp(otherCost);
  return comparison < 0 || (comparison === 0 && packages < otherPackages);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function maxBig(a: Big, b: Big): Big {
  return a.gt(b) ? a : b;
}
