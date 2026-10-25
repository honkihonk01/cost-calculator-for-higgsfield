import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { calculate } from "../../src/kern/index.ts";
import { editJson, runCli, tempData } from "../hilfen/daten.ts";
import { fixturePrices } from "../hilfen/preise.ts";

let env: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  env = await tempData();
});
afterEach(async () => {
  await env.cleanup();
});

/** Standardbeispiel als Optionen; der feste Kurs verhindert jeden Netzabruf im Test. */
const STANDARD = [
  "--dauer",
  "3:00",
  "--aufschlag",
  "25",
  "--modell",
  "seedance-2.5-draft",
  "--aufloesung",
  "1080p",
  "--versuche",
  "3",
  "--bildmodell",
  "seedream-5.0-pro",
  "--credits",
  "2000",
  "--kurs",
  "1,08",
];

function without(flag: string): string[] {
  const index = STANDARD.indexOf(flag);
  return [...STANDARD.slice(0, index), ...STANDARD.slice(index + 2)];
}

test("AC-F11-1 hfcalc rechnen --json liefert das vollständige Ergebnis mit englischen Feldnamen und deutschen Texten", () => {
  const result = runCli(["rechnen", ...STANDARD, "--json"], env);
  expect(result.code).toBe(0);
  const json = JSON.parse(result.stdout) as Record<string, unknown>;
  expect(Object.keys(json)).toEqual([
    "openSeconds",
    "clips",
    "paths",
    "valueRanking",
    "images",
    "selected",
    "exchangeRate",
    "recommendations",
    "reach",
    "notes",
  ]);
  const expected = calculate(
    {
      durationSeconds: 180,
      extraScenesPercent: 25,
      modelId: "seedance-2.5-draft",
      resolution: "1080p",
      attemptsPerClip: 3,
      clipImageModelId: "seedream-5.0-pro",
      creditBalance: 2000,
      manualExchangeRate: 1.08,
    },
    fixturePrices(),
    { value: 1.08, date: (json.exchangeRate as { date: string }).date, origin: "manual" },
  );
  expect(expected.ok && json).toEqual(expected.ok && expected.value);
  expect((json.recommendations as { overall: { sentence: string } }).overall.sentence).toBe(
    "Seedance 2.5 Draft plus 1080p über Credit-Pakete, 374,63 €",
  );
});

describe("AC-F11-3 fehlender Pflichtwert", () => {
  test("AC-F11-3 fehlt --modell, endet der Befehl mit Exitcode 1 und nennt --modell", () => {
    const result = runCli(["rechnen", ...without("--modell")], env);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--modell");
    expect(result.stdout).toBe("");
  });

  test("AC-F11-3 ohne jede Angabe nennt der Befehl alle Pflichtwerte", () => {
    const result = runCli(["rechnen"], env);
    expect(result.code).toBe(1);
    for (const flag of ["--aufschlag", "--modell", "--aufloesung", "--versuche", "--bildmodell", "--credits"]) {
      expect(result.stderr).toContain(flag);
    }
  });

  test("AC-F11-3 ohne --dauer und ohne --clips nennt der Befehl --dauer", () => {
    const result = runCli(["rechnen", ...without("--dauer")], env);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--dauer: Gib an, was noch offen ist");
  });
});

test("AC-F11-4 hfcalc --help zeigt alle Parameter mit erlaubten Werten und Standardwerten", () => {
  const result = runCli(["--help"], env);
  expect(result.code).toBe(0);
  const help = result.stdout.replace(/\s+/g, " ");
  for (const flag of [
    "--dauer",
    "--clips",
    "--aufschlag",
    "--modell",
    "--aufloesung",
    "--versuche",
    "--bildmodell",
    "--credits",
    "--storyboard",
    "--assets",
    "--personen",
    "--orte",
    "--anlaeufe",
    "--bilder-je-clip",
    "--cliplaenge",
    "--rabatt",
    "--rabatt-modelle",
    "--rabatt-aufloesungen",
    "--paketpreise",
    "--audio",
    "--kurs",
    "--json",
  ]) {
    expect(help).toContain(flag);
  }
  for (const fragment of [
    "Erlaubt: seedance-2.5, seedance-2.5-draft",
    "Erlaubt: 480p, 720p, 1080p, 4K",
    "Erlaubt: seedream-5.0-flash, seedream-5.0-pro. Standard: aus",
    "Erlaubt: seedream-5.0-flash, seedream-5.0-pro, gpt-image-2.5-sunburst-high-1k",
    "0 bis 20. Standard: 3,5",
    "1 bis 50. Standard: 8",
    "je Person 3 Assets). Standard: 5",
    "je Ort 9 Assets). Standard: 3",
    "20 bis 50 in 5er-Schritten",
    "ganze Zahl 1 bis 20",
    "Standard: 7,5 s",
    "Standard: aus; Prozent 25",
    "Standard: seedance-2.5,seedance-2.5-draft",
    "Standard: 1080p",
    "rabatt (aktueller Preis bei Higgsfield) oder regulaer (durchgestrichener Normalpreis). Standard: regulaer",
    "0, 50 oder 100. Standard: 0",
    "Standard: Referenzkurs der EZB",
  ]) {
    expect(help).toContain(fragment);
  }
});

describe("weitere Fälle der Kommandozeile", () => {
  test("Textausgabe: oben die eine Antwort mit Euro-Betrag", () => {
    const result = runCli(["rechnen", ...STANDARD], env);
    expect(result.code).toBe(0);
    expect(result.stdout.split("\n").slice(0, 3)).toEqual([
      "KOSTEN DEINER AUSWAHL",
      "374,63 € (404,60 $)",
      "Seedance 2.5 Draft plus 1080p über Credit-Pakete, 374,63 €",
    ]);
    expect(result.stdout).toContain("Reichweite des Credit-Stands: 75,8 s fertiger Film, 10 Clips");
    expect(result.stdout).toContain("ZU KAUFEN (Paketpreise vom 09.10.2026)");
    expect(result.stdout).toContain("  1 × 4.000 Credits à 374,63 € (404,60 $) = 374,63 € (404,60 $)");
    expect(result.stdout).toContain("PRODUKTIONSWEGE NACH PREIS-LEISTUNG");
    expect(result.stdout).not.toContain("PÄSSE");
    expect(result.stdout).toContain("Storyboard: aus");
    expect(result.stdout).toContain("Lichtbilder und Referenzbilder je Clip: 105 Bilder, 315 Credits");
    expect(result.stdout).toContain("Einmalige Assets: aus");
  });

  test("--clips statt --dauer rechnet den offenen Rest", () => {
    const result = runCli(["rechnen", ...without("--dauer"), "--clips", "12", "--json"], env);
    expect(result.code).toBe(0);
    expect((JSON.parse(result.stdout) as { clips: { count: string } }).clips.count).toBe("15");
  });

  test("ungültige Werte nennen die Option und enden mit Exitcode 1", () => {
    const attempts = runCli(["rechnen", ...without("--versuche"), "--versuche", "0"], env);
    expect(attempts.code).toBe(1);
    expect(attempts.stderr).toContain("--versuche: Gib mindestens 1 Versuch an.");
    const duration = runCli(["rechnen", ...without("--dauer"), "--dauer", "3:75"], env);
    expect(duration.code).toBe(1);
    expect(duration.stderr).toContain("--dauer:");
    const combination = runCli(
      ["rechnen", ...without("--modell"), "--modell", "seedance-2.5", "--aufloesung", "4K"],
      env,
    );
    expect(combination.code).toBe(1);
    expect(combination.stderr).toContain("--aufloesung:");
  });

  test("AC-F2-8 AC-F2-10 --storyboard und --assets schalten Storyboard und einmalige Assets ein", () => {
    const args = [...STANDARD, "--storyboard", "seedream-5.0-flash", "--assets", "seedream-5.0-pro", "--json"];
    const json = JSON.parse(runCli(["rechnen", ...args], env).stdout) as { images: unknown };
    expect(json.images).toEqual({
      storyboard: { images: "60", credits: "30" },
      clipImages: { images: "105", credits: "315" },
      assets: { count: "42", images: "336", credits: "1008" },
      totalCredits: "1353",
    });
    const own = runCli(
      ["rechnen", ...STANDARD, "--assets", "seedream-5.0-flash", "--personen", "2", "--orte", "1"],
      env,
    );
    expect(own.stdout).toContain("Einmalige Assets: 15 Assets, 120 Bilder, 60 Credits");
    const lonely = runCli(["rechnen", ...STANDARD, "--personen", "2"], env);
    expect(lonely.code).toBe(1);
    expect(lonely.stderr).toContain("--assets:");
  });

  test("eine unbekannte Option wird auf Deutsch gemeldet", () => {
    const result = runCli(["rechnen", ...STANDARD, "--quatsch"], env);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unbekannte Option");
  });

  test("ungültige Daten enden mit Exitcode 2", async () => {
    await editJson(env.dataDir, "pakete.json", (json) => {
      (json as { vatPercent: unknown }).vatPercent = "19";
    });
    expect(runCli(["rechnen", ...STANDARD], env).code).toBe(2);
  });
});
