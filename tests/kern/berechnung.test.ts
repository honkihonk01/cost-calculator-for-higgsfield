import Big from "big.js";
import { describe, expect, test } from "vitest";
import { calculate } from "../../src/kern/index.ts";
import { type ExchangeRate, type Result, resultSchema } from "../../src/schema/index.ts";
import { fixturePrices, STANDARD_RAW } from "../hilfen/preise.ts";

const RATE: ExchangeRate = { value: 1.08, date: "2026-10-09", origin: "manual" };

function run(changes: Record<string, unknown> = {}, rate: ExchangeRate | null = RATE): Result {
  const outcome = calculate({ ...STANDARD_RAW, ...changes }, fixturePrices(), rate);
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => `${error.field}: ${error.message}`).join("\n"));
  return outcome.value;
}

test("Standardbeispiel über calculate(): 30 Clips, 3.940 fehlende Credits, 374,63 €, Zahlen als exakter Text", () => {
  const result = run();
  expect(result.openSeconds).toBe("225");
  expect(result.clips).toEqual({ count: "30", lengthSeconds: "7.5", billedSecondsPerAttempt: "7.5" });
  expect(result.selected).toMatchObject({
    pathId: "seedance-2.5-draft@1080p",
    totalCredits: "5940",
    shortfall: "3940",
    packages: [{ credits: 4000, count: 1 }],
    usdNet: "340",
    usdGross: "404.6",
  });
  expect(result.images).toEqual({
    storyboard: null,
    clipImages: { images: "105", credits: "315" },
    assets: null,
    totalCredits: "315",
  });
  expect(new Big(result.selected.eur ?? 0).round(2).toString()).toBe("374.63");
  expect(result.recommendations.overall.sentence).toBe("Seedance 2.5 Draft plus 1080p über Credit-Pakete, 374,63 €");
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  expect(resultSchema.safeParse(result).success).toBe(true);
});

test("AC-F7-1 mitten im Projekt: 800 Credits, 12 offene Clips, 25 % → 15 Clips, 2.970 Bedarf, 2.170 fehlend", () => {
  const { durationSeconds: _ignored, ...withoutDuration } = STANDARD_RAW;
  const outcome = calculate({ ...withoutDuration, clipCount: 12, creditBalance: 800 }, fixturePrices(), RATE);
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) return;
  expect(outcome.value.clips.count).toBe("15");
  expect(outcome.value.selected.totalCredits).toBe("2970");
  expect(outcome.value.selected.shortfall).toBe("2170");
});

test("AC-F7-2 2.000 Credits reichen im Draft-Weg mit 3 Versuchen und Bildern je Clip mit Seedream 5.0 Pro für 75,8 s fertigen Film", () => {
  const result = run();
  expect(new Big(result.reach?.finishedSeconds ?? 0).round(1).toString()).toBe("75.8");
  expect(result.reach?.clips).toBe("10");
  expect(result.notes).toContainEqual(
    expect.objectContaining({ text: expect.stringContaining("etwa 75,8 s fertigen Film einschließlich aller Bilder") }),
  );
});

test("AC-F4-1 über calculate(): das Ergebnis nennt Kurs und Datum", () => {
  const ecb: ExchangeRate = { value: 1.0834, date: "2026-10-08", origin: "ecb" };
  const result = run({}, ecb);
  expect(result.exchangeRate).toEqual(ecb);
  expect(result.notes).toContainEqual(
    expect.objectContaining({ text: expect.stringMatching(/08\.10\.2026, 1,0834 \$ je 1 €/) }),
  );
});

test("AC-F4-3 über calculate(): ohne Kurs alle Credit- und Dollar-Werte, Euro fehlt mit Meldung, Vergleich in Dollar", () => {
  const result = run({}, null);
  expect(result.exchangeRate).toBeNull();
  expect(result.selected).toMatchObject({ totalCredits: "5940", usdNet: "340", usdGross: "404.6", eur: null });
  expect(result.paths.every((path) => path.status === "no-price" || path.creditsPerSecond !== null)).toBe(true);
  expect(result.recommendations.overall).toMatchObject({ eur: null, usd: "404.6" });
  expect(result.recommendations.overall.sentence).toContain("404,60 $");
  expect(result.notes).toContainEqual(expect.objectContaining({ text: expect.stringContaining("in Dollar") }));
});

describe("Eingaben und Standardwerte", () => {
  test("fehlende optionale Werte kommen aus einstellungen.json", () => {
    const result = run();
    expect(result.clips.lengthSeconds).toBe("7.5");
    expect(result.images.clipImages.images).toBe("105");
  });

  test("ungültige Eingaben ergeben Fehler mit Feld und kein Ergebnis", () => {
    const outcome = calculate({ ...STANDARD_RAW, attemptsPerClip: 0, unbekannt: 1 }, fixturePrices(), RATE);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.map((error) => error.field)).toEqual(expect.arrayContaining(["attemptsPerClip"]));
    expect(outcome.errors.find((error) => error.field === "attemptsPerClip")?.message).toBe(
      "Gib mindestens 1 Versuch an.",
    );
  });

  test("eine unzulässige Kombination ergibt kein Ergebnis (AC-F2-7 über calculate)", () => {
    expect(calculate({ ...STANDARD_RAW, modelId: "seedance-2.5", resolution: "4K" }, fixturePrices(), RATE).ok).toBe(
      false,
    );
  });

  test("gewählte Kombination ohne Preis: Ergebnis ohne Summe, mit Hinweis", () => {
    const result = run({ modelId: "seedance-2.0-mini", resolution: "720p" });
    expect(result.selected).toMatchObject({
      pathId: "seedance-2.0-mini@720p",
      totalCredits: null,
      eur: null,
      packages: [],
    });
    expect(result.reach).toBeNull();
    expect(result.notes).toContainEqual(expect.objectContaining({ kind: "no-price" }));
  });
});

test("Leistung: das Standardbeispiel rechnet in unter 50 ms", () => {
  const prices = fixturePrices();
  calculate(STANDARD_RAW, prices, RATE);
  const durations: number[] = [];
  for (let run = 0; run < 5; run += 1) {
    const start = performance.now();
    calculate(STANDARD_RAW, prices, RATE);
    durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);
  expect(durations[2]).toBeLessThan(50);
});

test("AC-F10-7 jeder allgemeine Hinweis nennt seinen Ort", () => {
  const result = run({ clipLengthSeconds: 3, modelId: "seedance-2.0-standard", resolution: "4K" });
  const byArea = (area: string) => result.notes.filter((note) => note.area === area).map((note) => note.text);
  expect(result.notes.every((note) => note.area !== undefined)).toBe(true);
  expect(byArea("clips")).toEqual([expect.stringContaining("Mindestlänge von 4 s")]);
  expect(byArea("paths")).toEqual([
    expect.stringContaining("Für Seedance 2.0 Standard · 4K ist kein Preis hinterlegt"),
  ]);
  expect(byArea("rate")).toEqual([expect.stringContaining("Wechselkurs manuell eingegeben")]);
  expect(result.notes.some((note) => /Pass/.test(note.text))).toBe(false);

  const standard = run();
  expect(standard.notes.filter((note) => note.area === "packages").map((note) => note.text)).toContainEqual(
    expect.stringContaining("Nach dem Kauf bleiben 60 Credits übrig"),
  );
  expect(standard.notes.filter((note) => note.area === "reach")).toHaveLength(1);
});

test("AC-F10-14 jeder Weg kennt den Unterschied brutto zu deiner Auswahl", () => {
  const result = run();
  const path = (id: string) => result.paths.find((entry) => entry.id === id);
  expect(path("seedance-2.5-draft@1080p")?.differenceToSelection).toEqual({ eur: "0", usd: "0" });
  // Enhanced Fast 720p: 2.677,5 Credits − 2.000 Kontostand → 700 Credits = 59,50 $ netto, 70,805 $ brutto
  expect(path("seedance-2.0-enhanced-fast@720p")?.differenceToSelection?.usd).toBe("-333.795");
  expect(Number(path("seedance-2.0-enhanced-fast@720p")?.differenceToSelection?.eur).toFixed(2)).toBe("-309.07");
});
