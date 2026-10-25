import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { findDataDir, loadPrices } from "../../src/laden/node/index.ts";
import type { AppError, PriceData } from "../../src/schema/index.ts";
import { editJson, FIXTURE_DATA, PROJECT_ROOT, readText, tempData, writeText } from "../hilfen/daten.ts";

type Loose = Record<string, unknown>;
type ModelsJson = { models: (Loose & { resolutions: Record<string, Loose> })[] };

let env: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  env = await tempData();
});
afterEach(async () => {
  await env.cleanup();
});

async function loadErrors(): Promise<AppError[]> {
  const loaded = await loadPrices(env.dataDir);
  if (loaded.ok) throw new Error("Die Daten hätten ungültig sein müssen.");
  return loaded.errors;
}

async function loadData(dataDir = env.dataDir): Promise<PriceData> {
  const loaded = await loadPrices(dataDir);
  if (!loaded.ok) throw new Error(loaded.errors.map((error) => error.message).join("\n"));
  return loaded.data;
}

describe("AC-F8-2 Komma statt Punkt", () => {
  test("AC-F8-2 Zahl als Text „4,5“: Meldung nennt Datei und Feld, es wird nicht gerechnet", async () => {
    await editJson(env.dataDir, "videomodelle.json", (json) => {
      (json as ModelsJson).models[2].resolutions["720p"].value = "4,5";
    });
    const errors = await loadErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      file: "preise/videomodelle.json",
      field: "models[2].resolutions.720p.value",
    });
    expect(errors[0].message).toContain("4.5");
  });

  test("AC-F8-2 Zahl 4,5 ohne Anführungszeichen: Meldung nennt Datei, Feld und Zeile", async () => {
    const text = await readText(env.dataDir, "videomodelle.json");
    await writeText(env.dataDir, "videomodelle.json", text.replace('"value": 4.5,', '"value": 4,5,'));
    const errors = await loadErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: "invalid-json", file: "preise/videomodelle.json", field: "value" });
    expect(errors[0].message).toMatch(/Zeile \d+/);
  });
});

describe("AC-F8-3 Stand-Datum und Quelle sind Pflicht", () => {
  test("AC-F8-3 fehlendes Stand-Datum lässt die Prüfung mit Meldung scheitern", async () => {
    await editJson(env.dataDir, "pakete.json", (json) => {
      delete (json as { packages: { regular: Loose }[] }).packages[3].regular.asOf;
    });
    const errors = await loadErrors();
    expect(errors).toEqual([
      expect.objectContaining({ file: "preise/pakete.json", field: "packages[3].regular.asOf" }),
    ]);
    expect(errors[0].message).toContain("Stand-Datum");
  });

  test("AC-F8-3 fehlende Quelle lässt die Prüfung mit Meldung scheitern", async () => {
    await editJson(env.dataDir, "pakete.json", (json) => {
      delete (json as { packages: { regular: Loose }[] }).packages[0].regular.source;
    });
    const errors = await loadErrors();
    expect(errors).toEqual([
      expect.objectContaining({ file: "preise/pakete.json", field: "packages[0].regular.source" }),
    ]);
    expect(errors[0].message).toContain("Quelle");
  });

  test("AC-F8-3 leere Quelle gilt als fehlend", async () => {
    await editJson(env.dataDir, "bildmodelle.json", (json) => {
      (json as { models: { pricePerImage: Loose }[] }).models[0].pricePerImage.source = "  ";
    });
    const errors = await loadErrors();
    expect(errors[0]).toMatchObject({ file: "preise/bildmodelle.json", field: "models[0].pricePerImage.source" });
  });

  test("AC-F8-3 auch ein unbekannter Preis braucht Stand und Quelle", async () => {
    await editJson(env.dataDir, "videomodelle.json", (json) => {
      delete (json as ModelsJson).models[2].resolutions["480p"].asOf;
    });
    const errors = await loadErrors();
    expect(errors[0]).toMatchObject({ field: "models[2].resolutions.480p.asOf" });
  });
});

test("AC-F8-4 Preis 0 lässt die Prüfung scheitern und empfiehlt „unknown“", async () => {
  await editJson(env.dataDir, "videomodelle.json", (json) => {
    (json as ModelsJson).models[0].resolutions["720p"].value = 0;
  });
  const errors = await loadErrors();
  expect(errors).toEqual([
    expect.objectContaining({ file: "preise/videomodelle.json", field: "models[0].resolutions.720p.value" }),
  ]);
  expect(errors[0].message).toContain("unknown");
});

test("AC-F8-5 ein neues Videomodell mit vorhandenen Regeln wird ohne Code-Änderung geladen", async () => {
  await editJson(env.dataDir, "videomodelle.json", (json) => {
    const models = (json as ModelsJson).models;
    models.push({ ...structuredClone(models[0]), id: "seedance-2.6", name: "Seedance 2.6", badge: null });
  });
  // Für das Preis-Leistungs-Ranking braucht jedes Modell einen Qualitätsfaktor, ebenfalls nur in den Daten.
  await editJson(env.dataDir, "qualitaet.json", (json) => {
    (json as { modelFactors: Record<string, number> }).modelFactors["seedance-2.6"] = 1;
  });
  const data = await loadData();
  const added = data.videoModels.models.find((model) => model.id === "seedance-2.6");
  expect(added?.name).toBe("Seedance 2.6");
  expect(added?.resolutions["1080p"]).toMatchObject({ status: "known", value: 16 });
});

describe("Verweise zwischen den Dateien", () => {
  test("ein Qualitätsfaktor für ein unbekanntes Videomodell ist ein Prüffehler mit Datei und Feld", async () => {
    await editJson(env.dataDir, "qualitaet.json", (json) => {
      (json as { modelFactors: Record<string, number> }).modelFactors["seedance-9"] = 1;
    });
    expect(await loadErrors()).toEqual([
      expect.objectContaining({
        code: "unknown-reference",
        file: "preise/qualitaet.json",
        field: "modelFactors.seedance-9",
      }),
    ]);
  });

  test("fehlt einem Videomodell der Qualitätsfaktor, nennt die Prüfung das Modell", async () => {
    await editJson(env.dataDir, "qualitaet.json", (json) => {
      delete (json as { modelFactors: Record<string, number> }).modelFactors["seedance-2.0-mini"];
    });
    expect((await loadErrors())[0]?.message).toContain("seedance-2.0-mini");
  });

  test("eine Draft-Fertigstellung mit unbekanntem Modell ist ein Prüffehler", async () => {
    await editJson(env.dataDir, "videomodelle.json", (json) => {
      (json as ModelsJson).models[1].draft = {
        finishModelId: "gibt-es-nicht",
        finishResolution: "1080p",
        finishWithinDays: 7,
      };
    });
    expect(await loadErrors()).toEqual([
      expect.objectContaining({ code: "unknown-reference", field: "models[1].draft.finishModelId" }),
    ]);
  });

  test("doppelte Modell-Kennung ist ein Prüffehler", async () => {
    await editJson(env.dataDir, "videomodelle.json", (json) => {
      const models = (json as ModelsJson).models;
      models.push(structuredClone(models[0]));
    });
    expect(await loadErrors()).toEqual([expect.objectContaining({ code: "duplicate", field: "models[5].id" })]);
  });
});

describe("Datenordner finden und lesen", () => {
  test("HFCALC_DATA hat Vorrang, sonst gilt ~/Higgsfield-Kalkulator", () => {
    expect(findDataDir({ HFCALC_DATA: "/tmp/anders", HOME: "/Users/test" })).toBe("/tmp/anders");
    expect(findDataDir({ HOME: "/Users/test" })).toBe("/Users/test/Higgsfield-Kalkulator");
  });

  test("ein fehlender Datenordner meldet, wie er angelegt wird", async () => {
    const loaded = await loadPrices(join(env.root, "gibt-es-nicht"));
    expect(loaded.ok).toBe(false);
    expect(loaded.ok ? [] : loaded.errors).toEqual([expect.objectContaining({ code: "data-dir-missing" })]);
  });

  test("eine fehlende Datei wird mit Namen gemeldet", async () => {
    await rm(join(env.dataDir, "preise", "qualitaet.json"));
    expect(await loadErrors()).toEqual([
      expect.objectContaining({ code: "file-missing", file: "preise/qualitaet.json" }),
    ]);
  });
});

describe("Startdaten", () => {
  test("daten-vorlage ist gültig und entspricht RECHENREGELN 3 sowie SPEC Entscheidungen 1, 2 und 24", async () => {
    const data = await loadData(join(PROJECT_ROOT, "daten-vorlage"));
    const model = (id: string) => data.videoModels.models.find((candidate) => candidate.id === id);
    expect(model("seedance-2.5")?.resolutions).toMatchObject({
      "480p": { value: 3 },
      "720p": { value: 7 },
      "1080p": { value: 16 },
      "4K": { status: "unavailable" },
    });
    expect(model("seedance-2.5-draft")?.draft).toEqual({
      finishModelId: "seedance-2.5",
      finishResolution: "1080p",
      finishWithinDays: 7,
    });
    expect(model("seedance-2.0-standard")?.resolutions).toMatchObject({
      "480p": { status: "unknown" },
      "720p": { value: 4.5 },
      "1080p": { value: 9 },
      "4K": { status: "unknown" },
    });
    expect(model("seedance-2.0-enhanced-fast")?.resolutions["720p"]).toMatchObject({ value: 3.5 });

    const known = data.packages.packages.filter((pack) => pack.regular.status === "known");
    expect(known.map((pack) => pack.credits)).toEqual([100, 200, 500, 1000, 2000, 4000, 5000, 7000, 9000, 11000]);
    // SPEC Entscheidung 24: Preise vom 25.10.2026 aus dem Kauf-Fenster
    expect(data.packages.packages.find((pack) => pack.credits === 1000)).toMatchObject({
      regular: { value: 85 },
      discounted: { value: 56 },
    });
    expect(data.packages.packages.find((pack) => pack.credits === 11000)).toMatchObject({
      regular: { value: 935 },
      discounted: { value: 550 },
    });
    const unknownSizes = data.packages.packages.filter((pack) => pack.regular.status === "unknown");
    expect(unknownSizes.map((pack) => pack.credits)).toEqual([13000, 15000, 17000, 19000, 21000, 23000, 25000, 100000]);
    expect(data.packages.vatPercent).toBe(19);

    expect(data.quality.modelFactors).toEqual({
      "seedance-2.5": 1,
      "seedance-2.5-draft": 1,
      "seedance-2.0-standard": 0.8,
      "seedance-2.0-enhanced-fast": 0.7,
      "seedance-2.0-mini": 0.6,
    });
    expect(data.settings).toMatchObject({
      clipLengthSeconds: 7.5,
      discountEnabled: false,
      packagePriceLevel: "discounted",
    });
  });

  test("die Testdaten sind eine unveränderte Kopie der Startdaten, nur mit den Paketpreisen vom 09.10.2026", async () => {
    // Die Prüfwerte der Spezifikation (zum Beispiel AC-F3-6, AC-F5-1) beruhen auf den Paketpreisen vom 09.10.2026;
    // die Startdaten tragen seit 25.10.2026 die neuen Preise (docs/DECISIONS.md).
    // Ebenso rechnen die Testdaten mit dem regulären Preisstand, auf dem die Prüfwerte beruhen; die Startdaten stehen
    // seit 25.10.2026 auf dem Rabattpreis.
    const settings = async (root: string) => {
      const json = JSON.parse(await readFile(join(root, "einstellungen.json"), "utf8"));
      delete json.packagePriceLevel;
      return json;
    };
    expect(await settings(join(FIXTURE_DATA, "preise"))).toEqual(
      await settings(join(PROJECT_ROOT, "daten-vorlage/preise")),
    );
    const files = (await readdir(join(PROJECT_ROOT, "daten-vorlage/preise"))).filter(
      (file) => file !== "pakete.json" && file !== "einstellungen.json",
    );
    const fixturePackages = JSON.parse(await readFile(join(FIXTURE_DATA, "preise", "pakete.json"), "utf8"));
    expect(fixturePackages.packages.find((pack: { credits: number }) => pack.credits === 1000).discounted.value).toBe(
      49,
    );
    for (const file of files) {
      const original = await readFile(join(PROJECT_ROOT, "daten-vorlage/preise", file), "utf8");
      expect(await readFile(join(FIXTURE_DATA, "preise", file), "utf8"), file).toBe(original);
    }
  });
});
