import { afterEach, beforeEach, expect, test } from "vitest";
import { editJson, readText, runCli, tempData } from "../hilfen/daten.ts";

let env: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  env = await tempData();
});
afterEach(async () => {
  await env.cleanup();
});

const germanNumber = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 20 });

type PriceLike = { status: string; value?: number; unit?: string; asOf: string; source: string };

/** Sammelt jeden Preis aus einer Datei, unabhängig davon, wo er steht. */
function collectPrices(node: unknown, found: PriceLike[] = []): PriceLike[] {
  if (Array.isArray(node)) {
    for (const item of node) collectPrices(item, found);
  } else if (node !== null && typeof node === "object") {
    if ("status" in node && "asOf" in node) found.push(node as PriceLike);
    else for (const value of Object.values(node)) collectPrices(value, found);
  }
  return found;
}

test("AC-F8-1 hfcalc preise zeigt jeden Preis mit Wert, Währung, Stand-Datum und Quelle", async () => {
  const result = runCli(["preise"], env);
  expect(result.code).toBe(0);
  const lines = result.stdout.split("\n");

  const prices: PriceLike[] = [];
  for (const file of ["videomodelle.json", "bildmodelle.json", "pakete.json"]) {
    collectPrices(JSON.parse(await readText(env.dataDir, file)), prices);
  }
  expect(lines.filter((line) => line.includes(" · Stand ")).length).toBe(prices.length);

  const unitWord: Record<string, string> = {
    credits_per_second: "Credits je Sekunde",
    credits_per_image: "Credits je Bild",
    USD: "$",
    EUR: "€",
  };
  for (const price of prices) {
    const [year, month, day] = price.asOf.split("-");
    const tail = ` · Stand ${day}.${month}.${year} · Quelle: ${price.source}`;
    const valueText =
      price.status === "known"
        ? germanNumber.format(price.value ?? Number.NaN)
        : price.status === "unknown"
          ? "kein Preis hinterlegt"
          : "gibt es nicht";
    const match = lines.find((line) => line.includes(valueText) && line.endsWith(tail));
    expect(match, `${valueText}${tail}`).toBeDefined();
    if (price.status === "known" && price.unit) expect(match).toContain(unitWord[price.unit]);
  }

  expect(lines).toContain(
    "    720p: 4,5 Credits je Sekunde · Stand 09.10.2026 · Quelle: higgsfield.ai/blog/seedance-2-0-pricing-2026 (docs/RECHENREGELN.md 3.2)",
  );
  expect(lines).toContain(
    "    regulär: 8,50 $ · Stand 09.10.2026 · Quelle: Kauf-Fenster „Credits aufladen“ im Konto, Tarif Ultra (docs/SPEC.md, Entscheidung 1)",
  );
});

test("AC-F8-5 ein neues Videomodell erscheint ohne Code-Änderung in hfcalc preise", async () => {
  await editJson(env.dataDir, "videomodelle.json", (json) => {
    const models = (json as { models: Record<string, unknown>[] }).models;
    models.push({ ...structuredClone(models[0]), id: "seedance-2.6", name: "Seedance 2.6", badge: null });
  });
  await editJson(env.dataDir, "qualitaet.json", (json) => {
    (json as { modelFactors: Record<string, number> }).modelFactors["seedance-2.6"] = 1;
  });
  const result = runCli(["preise"], env);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("  Seedance 2.6 (seedance-2.6, Clips 4 bis 30 s)");
});

test("AC-F8-6 hfcalc daten pruefen endet bei gültigen Daten mit Exitcode 0", () => {
  const result = runCli(["daten", "pruefen"], env);
  expect(result.code).toBe(0);
  expect(result.stdout).toContain("sind gültig");
});

test("AC-F8-6 hfcalc daten pruefen endet bei ungültigen Daten mit Exitcode 2 und nennt Datei und Feld", async () => {
  await editJson(env.dataDir, "pakete.json", (json) => {
    (json as { packages: { regular: Record<string, unknown> }[] }).packages[0].regular.value = 0;
  });
  const result = runCli(["daten", "pruefen"], env);
  expect(result.code).toBe(2);
  expect(result.stderr).toContain("preise/pakete.json · packages[0].regular.value");
});

test("AC-F8-6 hfcalc daten pruefen endet ohne Datenordner mit Exitcode 2", () => {
  const result = runCli(["daten", "pruefen"], { home: env.home });
  expect(result.code).toBe(2);
  expect(result.stderr).toContain("hfcalc einrichten");
});

test("hfcalc preise --json liefert alle Preisdateien mit englischen Feldnamen", () => {
  const result = runCli(["preise", "--json"], env);
  expect(result.code).toBe(0);
  const json = JSON.parse(result.stdout) as Record<string, unknown>;
  expect(Object.keys(json)).toEqual(["dataDir", "videoModels", "imageModels", "packages", "quality", "settings"]);
});
