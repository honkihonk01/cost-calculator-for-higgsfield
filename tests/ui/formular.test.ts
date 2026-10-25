import { describe, expect, test } from "vitest";
import { changedOptionalCount, formToInputs, initialForm, inputsToForm } from "../../src/ui/formular.ts";
import { fixturePrices } from "../hilfen/preise.ts";

const data = fixturePrices();
const start = initialForm(data.settings);

describe("Formular → rohe Eingaben", () => {
  test("AC-F10-2 der frische Start übernimmt die Standardwerte aus einstellungen.json", () => {
    expect(start).toMatchObject({
      clipLengthText: "7,5",
      discountEnabled: false,
      packagePriceLevel: "regular",
      audioSurchargePercent: 0,
      manualRateText: "",
    });
    expect(changedOptionalCount(start, data.settings)).toBe(0);
  });

  test("deutsches Komma, Tausenderpunkt im Credit-Stand und Dauer als M:SS", () => {
    const { raw, parseErrors } = formToInputs(
      { ...start, durationText: "3:00", creditBalanceText: "2.000", clipLengthText: "6,5", manualRateText: "1,08" },
      data,
    );
    expect(parseErrors).toEqual({});
    expect(raw).toMatchObject({
      durationSeconds: 180,
      creditBalance: 2000,
      clipLengthSeconds: 6.5,
      manualExchangeRate: 1.08,
    });
  });

  test("beim Draft-Modell ist die Zielauflösung immer 1080p", () => {
    const { raw } = formToInputs({ ...start, modelId: "seedance-2.5-draft", resolution: "720p" }, data);
    expect(raw.resolution).toBe("1080p");
  });

  test("Clips statt Dauer: nur die Clipanzahl geht an den Rechenkern", () => {
    const { raw } = formToInputs({ ...start, scopeMode: "clips", clipsText: "12", durationText: "3:00" }, data);
    expect(raw.clipCount).toBe(12);
    expect(raw.durationSeconds).toBeUndefined();
  });

  test("AC-F1-6 „3:75“ wird schon beim Lesen als Fehler am Feld erkannt", () => {
    expect(formToInputs({ ...start, durationText: "3:75" }, data).parseErrors.durationSeconds).toContain("59");
  });

  test("AC-F10-6 der Zähler zählt jedes abweichende optionale Feld genau einmal", () => {
    const changed = {
      ...start,
      clipLengthText: "6",
      discountEnabled: true,
      packagePriceLevel: "discounted" as const,
      audioSurchargePercent: 50 as const,
      manualRateText: "1,1",
      clipImagesText: "2",
    };
    expect(changedOptionalCount(changed, data.settings)).toBe(6);
    expect(changedOptionalCount({ ...start, clipLengthText: "7.5" }, data.settings)).toBe(0);
  });
});

describe("Storyboard und einmalige Assets im Formular", () => {
  test("AC-F2-8 AC-F2-10 beim Start aus: weder Storyboard noch Assets gehen an den Rechenkern", () => {
    expect(start).toMatchObject({ storyboardEnabled: false, assetsEnabled: false, clipImagesText: "3,5" });
    const { raw, parseErrors } = formToInputs(start, data);
    expect(raw.storyboardModelId).toBeUndefined();
    expect(raw.oneTimeAssets).toBeUndefined();
    expect(raw.clipImagesPerClip).toBe(3.5);
    expect(parseErrors).toEqual({});
  });

  test("eingeschaltet ohne Bildmodell gibt es eine Meldung am Feld", () => {
    const { parseErrors } = formToInputs(
      { ...start, storyboardEnabled: true, storyboardModelId: "", assetsEnabled: true, assetModelId: "" },
      data,
    );
    expect(parseErrors.storyboardModelId).toContain("Storyboard");
    expect(parseErrors["oneTimeAssets.modelId"]).toContain("Assets");
  });

  test("AC-F9-1 gespeicherte Eingaben mit Storyboard und Assets kommen vollständig zurück ins Formular", () => {
    const assets = { modelId: "seedream-5.0-pro", people: 2, locations: 4, attemptsPerAsset: 6.5 };
    const { form } = inputsToForm(
      {
        durationSeconds: 180,
        extraScenesPercent: 25,
        modelId: "seedance-2.5-draft",
        resolution: "1080p",
        attemptsPerClip: 3,
        clipImageModelId: "seedream-5.0-flash",
        clipImagesPerClip: 2,
        storyboardModelId: "seedream-5.0-pro",
        oneTimeAssets: assets,
        creditBalance: 2000,
      },
      data.settings,
    );
    expect(form).toMatchObject({ storyboardEnabled: true, assetsEnabled: true, assetAttemptsText: "6,5" });
    expect(formToInputs(form, data).raw).toMatchObject({
      clipImageModelId: "seedream-5.0-flash",
      clipImagesPerClip: 2,
      storyboardModelId: "seedream-5.0-pro",
      oneTimeAssets: assets,
    });
  });
});
