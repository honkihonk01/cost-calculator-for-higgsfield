import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { runCli, tempData } from "../hilfen/daten.ts";

let env: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  env = await tempData();
});
afterEach(async () => {
  await env.cleanup();
});

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

test("AC-F9-1 über die Kommandozeile: gespeichert, in einem neuen Aufruf gelistet, Eingaben identisch", () => {
  expect(runCli(["projekt", "speichern", "Die Route", ...STANDARD], env).code).toBe(0);
  const list = JSON.parse(runCli(["projekte", "--json"], env).stdout) as { projects: { name: string }[] };
  expect(list.projects.map((project) => project.name)).toEqual(["Die Route"]);
  const shown = JSON.parse(runCli(["projekt", "zeigen", "Die Route", "--json"], env).stdout) as { inputs: unknown };
  expect(shown.inputs).toEqual({
    durationSeconds: 180,
    extraScenesPercent: 25,
    modelId: "seedance-2.5-draft",
    resolution: "1080p",
    attemptsPerClip: 3,
    clipImageModelId: "seedream-5.0-pro",
    creditBalance: 2000,
    manualExchangeRate: 1.08,
  });
});

test("AC-F9-2 über die Kommandozeile: die Datei enthält Ergebnis und Preisstand", async () => {
  runCli(["projekt", "speichern", "Die Route", ...STANDARD], env);
  const file = JSON.parse(await readFile(join(env.dataDir, "projekte", "die-route.json"), "utf8"));
  expect(file.snapshot.pricesAsOf).toBe("2026-10-25");
  expect(file.snapshot.result.recommendations.overall.sentence).toBe(
    "Seedance 2.5 Draft plus 1080p über Credit-Pakete, 374,63 €",
  );
});

test("AC-F9-3 über die Kommandozeile: ohne --ueberschreiben Exitcode 1 und unveränderte Datei, mit ersetzt", async () => {
  runCli(["projekt", "speichern", "Die Route", ...STANDARD], env);
  const path = join(env.dataDir, "projekte", "die-route.json");
  const before = await readFile(path, "utf8");
  const refused = runCli(["projekt", "speichern", "Die Route", ...STANDARD, "--versuche", "5"], env);
  expect(refused.code).toBe(1);
  expect(refused.stderr).toContain("Es wurde nichts überschrieben");
  expect(await readFile(path, "utf8")).toBe(before);
  const confirmed = runCli(
    ["projekt", "speichern", "Die Route", ...STANDARD, "--versuche", "5", "--ueberschreiben"],
    env,
  );
  expect(confirmed.code).toBe(0);
  expect(JSON.parse(await readFile(path, "utf8")).inputs.attemptsPerClip).toBe(5);
});

test("AC-F9-4 über die Kommandozeile: Meldung zur beschädigten Datei, die anderen Projekte erscheinen", async () => {
  runCli(["projekt", "speichern", "Die Route", ...STANDARD], env);
  await writeFile(join(env.dataDir, "projekte", "kaputt.json"), "{");
  const result = runCli(["projekte"], env);
  expect(result.code).toBe(0);
  expect(result.stderr).toContain("projekte/kaputt.json");
  expect(result.stdout).toContain("Die Route · gespeichert");
});

test("ein unbekanntes Projekt endet mit Exitcode 1 und Hinweis", () => {
  const result = runCli(["projekt", "zeigen", "Gibt es nicht"], env);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain("gibt es nicht");
});
