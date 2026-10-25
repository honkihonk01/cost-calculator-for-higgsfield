import Big from "big.js";
import { describe, expect, test } from "vitest";
import { coverShortfall, type PurchaseInput } from "../../src/kern/index.ts";
import type { ExchangeRate, PackagesFile } from "../../src/schema/index.ts";
import { fixturePrices } from "../hilfen/preise.ts";

/** Paketmengen ohne Preise; die Preise je Paket prüft ein eigener Test. */
function sizes(packages: { credits: number; count: number }[]) {
  return packages.map(({ credits, count }) => ({ credits, count }));
}

const RATE: ExchangeRate = { value: 1.08, date: "2026-10-09", origin: "manual" };

function buy(changes: Partial<PurchaseInput> = {}) {
  const outcome = coverShortfall({
    needed: new Big(5655),
    creditBalance: 2000,
    packages: fixturePrices().packages,
    priceLevel: "regular",
    rate: RATE,
    ...changes,
  });
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => error.message).join("\n"));
  return outcome.value;
}

/** Eigene Paketliste für Gleichstands- und Währungsfälle. */
function packages(list: [credits: number, value: number, unit?: "USD" | "EUR"][]): PackagesFile {
  return {
    vatPercent: 19,
    expiryDays: 90,
    packages: list.map(([credits, value, unit = "USD"]) => {
      const price = { status: "known" as const, value, unit, asOf: "2026-10-09", source: "Test" };
      return { credits, regular: price, discounted: price };
    }),
  };
}

test("AC-F3-1 deckt der Credit-Stand den Bedarf, kostet es 0 € und die übrigen Credits werden genannt", () => {
  const result = buy({ creditBalance: 6000 });
  expect(result.shortfall.toString()).toBe("0");
  expect(result.eur?.toString()).toBe("0");
  expect(result.packages).toEqual([]);
  expect(result.leftoverCredits.toString()).toBe("345");
  expect(result.notes).toEqual([
    expect.objectContaining({ kind: "covered", text: expect.stringContaining("345 Credits") }),
  ]);
});

test("AC-F3-2 3.655 fehlende Credits zu regulären Preisen: 2.000 + 1.000 + 500 + 200 für 314,50 $ netto", () => {
  const result = buy();
  expect(result.shortfall.toString()).toBe("3655");
  expect(sizes(result.packages)).toEqual([
    { credits: 2000, count: 1 },
    { credits: 1000, count: 1 },
    { credits: 500, count: 1 },
    { credits: 200, count: 1 },
  ]);
  expect(result.usdNet.toString()).toBe("314.5");
});

test("AC-F3-3 erst Mehrwertsteuer (374,26 $), dann Umrechnung mit 1,08 (346,53 €)", () => {
  const result = buy();
  expect(result.usdGross.toString()).toBe("374.255");
  expect(result.usdGross.round(2).toString()).toBe("374.26");
  expect(result.eur?.round(2).toString()).toBe("346.53");
});

describe("AC-F3-4 Gleichstand", () => {
  test("AC-F3-4 bei gleichem Preis gewinnt die Kombination mit weniger Paketen", () => {
    const result = buy({
      needed: new Big(400),
      creditBalance: 0,
      packages: packages([
        [200, 10],
        [400, 20],
      ]),
    });
    expect(sizes(result.packages)).toEqual([{ credits: 400, count: 1 }]);
  });

  test("AC-F3-4 bei gleichem Preis und gleicher Paketzahl gewinnt der kleinere Überschuss", () => {
    const result = buy({
      needed: new Big(250),
      creditBalance: 0,
      packages: packages([
        [500, 10],
        [300, 10],
      ]),
    });
    expect(sizes(result.packages)).toEqual([{ credits: 300, count: 1 }]);
    expect(result.leftoverCredits.toString()).toBe("50");
  });

  test("AC-F3-4 im Standardfall schlägt 2.000 + 1.000 + 500 + 200 gleich teure Kombinationen mit mehr Paketen", () => {
    expect(buy().packages.reduce((sum, pack) => sum + pack.count, 0)).toBe(4);
  });
});

test("AC-F3-5 übrige Credits nach dem Kauf: Hinweis nennt Zahl und Verfall nach 90 Tagen", () => {
  const result = buy();
  expect(result.leftoverCredits.toString()).toBe("45");
  expect(result.notes).toContainEqual(
    expect.objectContaining({ kind: "info", text: expect.stringMatching(/45 Credits.*90 Tagen/) }),
  );
});

test("AC-F3-6 Preisstand „mit Rabatt“, 3.655 fehlende Credits: 182 $ netto, 216,58 $ brutto, 200,54 €", () => {
  const result = buy({ priceLevel: "discounted" });
  expect(result.usdNet.toString()).toBe("182");
  expect(result.usdGross.toString()).toBe("216.58");
  expect(result.eur?.round(2).toString()).toBe("200.54");
});

test("AC-F3-7 ein Euro-Preis (netto) bekommt nur die Mehrwertsteuer, kein Wechselkurs", () => {
  const euro = packages([[1000, 80, "EUR"]]);
  const withRate = buy({ needed: new Big(1000), creditBalance: 0, packages: euro });
  expect(withRate.eurNet.toString()).toBe("80");
  expect(withRate.eur?.toString()).toBe("95.2");
  const otherRate = buy({ needed: new Big(1000), creditBalance: 0, packages: euro, rate: { ...RATE, value: 2 } });
  expect(otherRate.eur?.toString()).toBe("95.2");
});

describe("weitere Fälle der Paketsuche", () => {
  test("gemischte Währungen werden in Euro verglichen", () => {
    const mixed = packages([
      [1000, 85],
      [1000, 70, "EUR"],
    ]);
    const result = buy({ needed: new Big(1000), creditBalance: 0, packages: mixed });
    expect(result.eurNet.toString()).toBe("70");
    expect(result.usdNet.toString()).toBe("0");
  });

  test("ohne Kurs: Dollar-Werte vollständig, Euro fehlt, Euro-Pakete fallen mit Hinweis weg", () => {
    const mixed = packages([
      [1000, 85],
      [1000, 70, "EUR"],
    ]);
    const result = buy({ needed: new Big(1000), creditBalance: 0, packages: mixed, rate: null });
    expect(result.usdGross.toString()).toBe("101.15");
    expect(result.eur).toBeNull();
    expect(result.notes).toContainEqual(expect.objectContaining({ text: expect.stringContaining("Euro-Preis") }));
  });

  test("Paketgrößen ohne Preis bleiben mit Hinweis außen vor", () => {
    expect(buy().notes).toContainEqual(
      expect.objectContaining({ kind: "no-price", text: expect.stringContaining("100.000") }),
    );
  });

  test("ein Fehlbetrag mit Nachkommastelle wird voll gedeckt: 2.027,5 Credits → 2.000 + 100", () => {
    const result = buy({ needed: new Big("2827.5"), creditBalance: 800 });
    expect(result.shortfall.toString()).toBe("2027.5");
    expect(sizes(result.packages)).toEqual([
      { credits: 2000, count: 1 },
      { credits: 100, count: 1 },
    ]);
    expect(result.usdNet.toString()).toBe("178.5");
    expect(result.leftoverCredits.toString()).toBe("72.5");
  });

  test("ein sehr großer Fehlbetrag wird exakt und schnell gelöst", () => {
    const start = performance.now();
    const result = buy({ needed: new Big(1_000_000), creditBalance: 0 });
    expect(performance.now() - start).toBeLessThan(2000);
    expect(result.creditsBought.toString()).toBe("1000000");
    expect(sizes(result.packages)).toEqual([{ credits: 5000, count: 200 }]);
  });
});

describe("AC-F3-8 günstigste Kaufvariante über alle Paketgrößen, auch gegen ein einzelnes größeres Paket", () => {
  const prices = fixturePrices().packages;
  // Paketpreise vom 25.10.2026 (Rabatt), wie in daten-vorlage/preise/pakete.json
  for (const [credits, value] of [
    [100, 6],
    [200, 12],
    [500, 29],
    [1000, 56],
    [2000, 105],
    [4000, 211],
    [5000, 250],
    [7000, 350],
    [9000, 450],
    [11000, 550],
  ] as const) {
    const pack = prices.packages.find((entry) => entry.credits === credits);
    if (pack) pack.discounted = { status: "known", value, unit: "USD", asOf: "2026-10-25", source: "Test" };
  }

  test("AC-F3-8 6.566 fehlende Credits: 5.000 + 1.000 + 500 + 100 für 341 $ schlagen 1 × 7.000 für 350 $", () => {
    const outcome = coverShortfall({
      needed: new Big(6566),
      creditBalance: 0,
      packages: prices,
      priceLevel: "discounted",
      rate: null,
    });
    if (!outcome.ok) throw new Error("keine Kombination");
    expect(sizes(outcome.value.packages)).toEqual([
      { credits: 5000, count: 1 },
      { credits: 1000, count: 1 },
      { credits: 500, count: 1 },
      { credits: 100, count: 1 },
    ]);
    expect(outcome.value.usdNet.toString()).toBe("341");
    expect(outcome.value.packages[0]).toMatchObject({ unitNet: new Big(250), currency: "USD" });
    expect(outcome.value.singlePackage).toMatchObject({ credits: 7000, unitNet: new Big(350) });
    expect(outcome.value.pricesAsOf).toBe("2026-10-25");
  });

  test("AC-F3-8 ist ein einzelnes größeres Paket günstiger, wird es gewählt", () => {
    const outcome = coverShortfall({
      needed: new Big(6900),
      creditBalance: 0,
      packages: prices,
      priceLevel: "discounted",
      rate: null,
    });
    if (!outcome.ok) throw new Error("keine Kombination");
    // 5.000 + 1.000 + 500 + 500 = 364 $ gegen 1 × 7.000 = 350 $
    expect(sizes(outcome.value.packages)).toEqual([{ credits: 7000, count: 1 }]);
    expect(outcome.value.singlePackage).toBeNull();
  });
});
