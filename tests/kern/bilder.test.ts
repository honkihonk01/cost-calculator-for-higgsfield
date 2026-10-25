import { describe, expect, test } from "vitest";
import { type CreditInputs, calculate, computeCredits } from "../../src/kern/index.ts";
import type { PriceData } from "../../src/schema/index.ts";
import { fixturePrices, STANDARD_INPUTS, STANDARD_RAW } from "../hilfen/preise.ts";

const RATE = { value: 1.08, date: "2026-10-09", origin: "manual" as const };
const RED_KEY_ASSETS = { modelId: "seedream-5.0-pro", people: 5, locations: 3, attemptsPerAsset: 8 };

function images(changes: Partial<CreditInputs> = {}, prices: PriceData = fixturePrices()) {
  const outcome = computeCredits({ ...STANDARD_INPUTS, ...changes }, prices);
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => error.message).join("\n"));
  return outcome.value;
}

function result(raw: Record<string, unknown>) {
  const outcome = calculate(raw, fixturePrices(), RATE);
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => error.message).join("\n"));
  return outcome.value;
}

describe("AC-F2-8 Storyboard ist ausgeschaltet, solange es nicht gewählt ist", () => {
  test("AC-F2-8 ohne Bildmodell für das Storyboard entsteht kein Storyboard-Posten", () => {
    const value = result({ ...STANDARD_RAW });
    expect(value.images.storyboard).toBeNull();
    expect(value.images.totalCredits).toBe("315");
  });

  test("AC-F2-8 eingeschaltet kommt das Storyboard zu den Bildern je Clip dazu", () => {
    const value = result({ ...STANDARD_RAW, storyboardModelId: "seedream-5.0-flash" });
    expect(value.images.storyboard).toEqual({ images: "60", credits: "30" });
    expect(value.images.totalCredits).toBe("345");
    expect(value.selected.totalCredits).toBe("5970");
  });

  test("AC-F2-8 ein Bildmodell ohne Storyboard-Freigabe wird mit Feld abgelehnt", () => {
    const outcome = calculate(
      { ...STANDARD_RAW, storyboardModelId: "gpt-image-2.5-flare-high-1k" },
      fixturePrices(),
      RATE,
    );
    expect(outcome.ok ? undefined : outcome.errors[0].field).toBe("storyboardModelId");
  });
});

describe("AC-F2-9 Lichtbilder und Referenzbilder je Clip", () => {
  test("AC-F2-9 30 Clips × 3,5 Bilder mit Seedream 5.0 Pro: 105 Bilder, 315 Credits", () => {
    const value = images();
    expect(value.images.clipImages.images.toString()).toBe("105");
    expect(value.images.clipImages.credits?.toString()).toBe("315");
  });

  test("AC-F2-9 ohne Angabe gilt der Standardwert 3,5 aus einstellungen.json, mit Angabe der eigene Wert", () => {
    expect(result({ ...STANDARD_RAW }).images.clipImages).toEqual({ images: "105", credits: "315" });
    const flash = result({ ...STANDARD_RAW, clipImageModelId: "seedream-5.0-flash", clipImagesPerClip: 2 });
    expect(flash.images.clipImages).toEqual({ images: "60", credits: "30" });
    expect(result({ ...STANDARD_RAW, clipImagesPerClip: 0 }).images.clipImages).toEqual({ images: "0", credits: "0" });
  });

  test("AC-F2-9 das Bildmodell für die Bilder je Clip ist Pflicht und muss es geben", () => {
    const { clipImageModelId: _omitted, ...withoutModel } = STANDARD_RAW;
    const missing = calculate(withoutModel, fixturePrices(), RATE);
    expect(missing.ok ? undefined : missing.errors[0].field).toBe("clipImageModelId");
    const unknown = calculate({ ...STANDARD_RAW, clipImageModelId: "midjourney" }, fixturePrices(), RATE);
    expect(unknown.ok ? undefined : unknown.errors[0].message).toContain("seedream-5.0-pro");
  });

  test("AC-F2-9 ein Bildmodell ohne Preis ergibt „kein Preis hinterlegt“ und keine Summe", () => {
    const prices = fixturePrices();
    const pro = prices.imageModels.models.find((model) => model.id === "seedream-5.0-pro");
    if (pro) pro.pricePerImage = { status: "unknown", asOf: "2026-10-09", source: "Test" };
    const value = images({}, prices);
    expect(value.images.clipImages.credits).toBeNull();
    expect(value.images.totalCredits).toBeNull();
    expect(value.notes).toContainEqual(
      expect.objectContaining({ kind: "no-price", area: "images", text: expect.stringContaining("kein Preis") }),
    );
  });
});

describe("AC-F2-10 einmalig erzeugte Assets", () => {
  test("AC-F2-10 aus, solange nicht eingeschaltet", () => {
    expect(result({ ...STANDARD_RAW }).images.assets).toBeNull();
  });

  test("AC-F2-10 5 Personen und 3 Orte ergeben 42 Assets, × 8 Anläufe = 336 Bilder, mit Seedream 5.0 Pro 1.008 Credits", () => {
    const value = result({ ...STANDARD_RAW, oneTimeAssets: RED_KEY_ASSETS });
    expect(value.images.assets).toEqual({ count: "42", images: "336", credits: "1008" });
    expect(value.images.totalCredits).toBe("1323");
    expect(value.selected.totalCredits).toBe("6948");
    expect(value.notes).toContainEqual(
      expect.objectContaining({ kind: "assumption", area: "images", text: expect.stringContaining("42 Assets") }),
    );
  });

  test("AC-F2-10 fehlen Personen, Orte und Anläufe, gelten die Standardwerte aus einstellungen.json", () => {
    const value = result({ ...STANDARD_RAW, oneTimeAssets: { modelId: "seedream-5.0-pro" } });
    expect(value.images.assets).toEqual({ count: "42", images: "336", credits: "1008" });
  });

  test("AC-F2-10 eigene Werte: 2 Personen, 1 Ort, 4 Anläufe mit Seedream 5.0 Flash", () => {
    const assets = { modelId: "seedream-5.0-flash", people: 2, locations: 1, attemptsPerAsset: 4 };
    // (2 × 3 + 1 × 9) = 15 Assets × 4 = 60 Bilder × 0,5 = 30 Credits
    expect(result({ ...STANDARD_RAW, oneTimeAssets: assets }).images.assets).toEqual({
      count: "15",
      images: "60",
      credits: "30",
    });
  });

  test("AC-F2-10 ohne Bildmodell oder mit unbekanntem Modell gibt es eine Meldung mit Feld", () => {
    const missing = calculate({ ...STANDARD_RAW, oneTimeAssets: { people: 5 } }, fixturePrices(), RATE);
    expect(missing.ok ? undefined : missing.errors[0].field).toBe("oneTimeAssets.modelId");
    const unknown = calculate({ ...STANDARD_RAW, oneTimeAssets: { modelId: "x" } }, fixturePrices(), RATE);
    expect(unknown.ok ? undefined : unknown.errors[0].field).toBe("oneTimeAssets.modelId");
  });
});

test("AC-F7-4 einmalige Assets gehen zuerst vom Credit-Stand ab: 2.000 − 1.008 Credits reichen für 37,6 s", () => {
  const value = result({ ...STANDARD_RAW, oneTimeAssets: RED_KEY_ASSETS });
  // (2.000 − 1.008) × 225 s ÷ (5.625 Video + 315 Bilder je Clip)
  expect(Number(value.reach?.finishedSeconds).toFixed(1)).toBe("37.6");
  expect(value.reach?.clips).toBe("5");
  const poor = result({ ...STANDARD_RAW, creditBalance: 500, oneTimeAssets: RED_KEY_ASSETS });
  expect(poor.reach).toEqual({ finishedSeconds: "0", clips: "0" });
});
