import Big from "big.js";
import { describe, expect, test } from "vitest";
import { type CreditInputs, computeCredits, creditPlan, rankByValue, recommend } from "../../src/kern/index.ts";
import type { ExchangeRate, PriceData } from "../../src/schema/index.ts";
import { fixturePrices, STANDARD_INPUTS } from "../hilfen/preise.ts";

const RATE: ExchangeRate = { value: 1.08, date: "2026-10-09", origin: "manual" };

function recommendations(
  changes: Partial<CreditInputs & { creditBalance: number }> = {},
  rate: ExchangeRate | null = RATE,
  prices: PriceData = fixturePrices(),
) {
  const inputs = { ...STANDARD_INPUTS, creditBalance: 2000, ...changes };
  const credits = computeCredits(inputs, prices);
  if (!credits.ok) throw new Error(credits.errors.map((error) => error.message).join("\n"));
  const context = {
    images: credits.value.images,
    creditBalance: inputs.creditBalance,
    prices,
    priceLevel: "regular" as const,
    rate,
  };
  const plans = new Map(credits.value.paths.map((path) => [path.id, creditPlan(path, context)]));
  const fullPlans = new Map(
    credits.value.paths.map((path) => [path.id, creditPlan(path, { ...context, creditBalance: 0 })]),
  );
  return recommend({
    credits: credits.value,
    plans,
    fullPlans,
    ranking: rankByValue(credits.value.paths, fullPlans, prices.quality, rate),
    prices,
    rate,
    target: inputs.resolution,
    attemptsPerClip: inputs.attemptsPerClip,
  });
}

test("AC-F6-1 3 Versuche, Ziel 1080p: „Draft plus 1080p“, Schwelle bei 2 oder weniger Versuchen Seedance 2.0 Standard", () => {
  const path = recommendations().productionPath;
  expect(path.pathId).toBe("seedance-2.5-draft@1080p");
  expect(path.sentence).toContain("Draft plus 1080p");
  expect(path.threshold).toBe("bei 2 oder weniger Versuchen ist Seedance 2.0 Standard günstiger");
  expect(path.reason).toContain("„720p direkt“ mit 21 Credits je Sekunde am günstigsten, liefert aber nur 720p");
});

test("AC-F6-2 1 Versuch, Ziel 1080p: „Seedance 2.0 Standard in 1080p“", () => {
  const path = recommendations({ attemptsPerClip: 1 }).productionPath;
  expect(path.sentence).toContain("Seedance 2.0 Standard in 1080p");
  expect(path.threshold).toBe("ab 3 Versuchen ist Seedance 2.5 Draft plus 1080p günstiger");
});

test("AC-F6-3 fällt die Empfehlung auf Seedance 2.0, nennt sie den fehlenden Referenz-Workflow von Seedance 2.5", () => {
  expect(recommendations({ attemptsPerClip: 1 }).productionPath.reason).toContain("Referenz-Workflow von Seedance 2.5");
  expect(recommendations().productionPath.reason).not.toContain("Referenz-Workflow");
});

test("AC-F6-4 4 Versuche: Gleichstand „Draft plus 1080p“ und „720p direkt“ mit je 28, Draft wegen höherer Auflösung", () => {
  const reason = recommendations({ attemptsPerClip: 4 }).productionPath.reason;
  expect(reason).toContain("kosten „Draft plus 1080p“ und „720p direkt“ gleich viel, je 28 Credits je Sekunde");
  expect(reason).toContain("„Draft plus 1080p“ ist vorzuziehen, weil er 1080p statt 720p liefert");
});

test("AC-F6-5 Standardbeispiel: „Draft plus 1080p über Credit-Pakete, 374,63 €“, gerechnet mit deiner Auswahl", () => {
  const overall = recommendations().overall;
  expect(overall.sentence).toBe("Seedance 2.5 Draft plus 1080p über Credit-Pakete, 374,63 €");
  expect(overall.pathId).toBe("seedance-2.5-draft@1080p");
  expect(overall.eur?.round(2).toString()).toBe("374.63");
  expect(overall.usd?.toString()).toBe("404.6");
  expect(overall.reason).toContain("Gerechnet mit deiner Auswahl");
  expect(overall.plan).toMatchObject({ creditsNeeded: new Big(5940), packages: [{ credits: 4000, count: 1 }] });
  expect(overall.plan?.net.usd?.toString()).toBe("340");
});

test("AC-F6-7 die Gesamtempfehlung bleibt beim gewählten Videomodell; günstigere Modelle nur als Hinweis", () => {
  const overall = recommendations({ modelId: "seedance-2.5", resolution: "720p", attemptsPerClip: 5 }).overall;
  expect(overall.pathId).toBe("seedance-2.5@720p");
  expect(overall.notes).toEqual([
    expect.objectContaining({
      text: expect.stringContaining("Mit einem anderen Weg ginge es günstiger: Seedance 2.0"),
    }),
  ]);
});

test("AC-F6-8 Regression: die Versuche ändern nie Modell oder Auflösung der Zahl oben", () => {
  for (const [modelId, resolution] of [
    ["seedance-2.5", "480p"],
    ["seedance-2.5", "720p"],
    ["seedance-2.5-draft", "1080p"],
  ] as const) {
    for (let attemptsPerClip = 1; attemptsPerClip <= 20; attemptsPerClip += 1) {
      const overall = recommendations({ modelId, resolution, attemptsPerClip, creditBalance: 0 }).overall;
      expect(overall.pathId, `${modelId} ${resolution} bei ${attemptsPerClip} Versuchen`).toBe(
        `${modelId}@${resolution}`,
      );
    }
  }
});

describe("AC-F6-6 Weg ohne Preis", () => {
  test("AC-F6-6 erscheint als „ohne Preis“ und wird nie empfohlen", () => {
    const prices = fixturePrices();
    const draft = prices.videoModels.models.find((model) => model.id === "seedance-2.5-draft");
    if (!draft) throw new Error("Draft-Modell fehlt");
    draft.resolutions["480p"] = { status: "unknown", asOf: "2026-10-09", source: "Test" };
    const result = recommendations({}, RATE, prices);
    expect(result.productionPath.pathId).not.toBe("seedance-2.5-draft@1080p");
    expect(result.overall.pathId).not.toBe("seedance-2.5-draft@1080p");
    expect(result.productionPath.notes).toContainEqual(
      expect.objectContaining({ kind: "no-price", text: expect.stringContaining("Seedance 2.5 Draft plus 1080p") }),
    );
  });

  test("AC-F6-6 in den Startdaten stehen Mini 720p und Standard 4K als „ohne Preis“", () => {
    const note = recommendations().productionPath.notes.find((entry) => entry.kind === "no-price");
    expect(note?.text).toContain("Seedance 2.0 Mini in 720p");
    expect(note?.text).toContain("Seedance 2.0 Standard in 4K");
  });
});

describe("weitere Fälle der Gesamtempfehlung", () => {
  test("ohne Kurs vergleicht die Gesamtempfehlung in Dollar und nennt keinen Euro-Betrag", () => {
    const overall = recommendations({}, null).overall;
    expect(overall.eur).toBeNull();
    expect(overall.sentence).toBe("Seedance 2.5 Draft plus 1080p über Credit-Pakete, 404,60 $");
    expect(overall.notes).toContainEqual(expect.objectContaining({ text: expect.stringContaining("in Dollar") }));
  });

  test("deckt der Credit-Stand alles, kostet deine Auswahl nichts und es ist nichts zu kaufen", () => {
    const result = recommendations({ creditBalance: 20000 });
    expect(result.overall.sentence).toBe("Seedance 2.5 Draft plus 1080p über deinen Credit-Stand, 0,00 €");
    expect(result.overall.plan?.packages).toEqual([]);
  });
});
