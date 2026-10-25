import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { calculate } from "../../src/kern/index.ts";
import { listProjects, type ProjectToSave, readProject, saveProject } from "../../src/laden/node/index.ts";
import { inputsSchema, newestPriceDate, projectSlug } from "../../src/schema/index.ts";
import { tempData } from "../hilfen/daten.ts";
import { fixturePrices, STANDARD_RAW } from "../hilfen/preise.ts";

let env: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  env = await tempData();
});
afterEach(async () => {
  await env.cleanup();
});

const NOW = "2026-10-09T18:00:00.000Z";
const LATER = "2026-10-10T09:30:00.000Z";

function entry(name: string, changes: Record<string, unknown> = {}): ProjectToSave {
  const prices = fixturePrices();
  const inputs = inputsSchema.parse({ ...STANDARD_RAW, manualExchangeRate: 1.08, ...changes });
  const result = calculate(inputs, prices, { value: 1.08, date: "2026-10-09", origin: "manual" });
  if (!result.ok) throw new Error("Rechnung fehlgeschlagen");
  return { name, inputs, result: result.value, pricesAsOf: newestPriceDate(prices) };
}

const fileOf = (slug: string) => join(env.dataDir, "projekte", `${slug}.json`);

test("AC-F9-1 ein gespeichertes Projekt erscheint beim nächsten Laden in der Liste, mit identischen Eingaben", async () => {
  const saved = await saveProject(env.dataDir, entry("Die Route"), { overwrite: false, now: NOW });
  expect(saved.ok).toBe(true);
  const list = await listProjects(env.dataDir);
  expect(list.errors).toEqual([]);
  expect(list.projects).toEqual([
    {
      name: "Die Route",
      file: "projekte/die-route.json",
      updatedAt: NOW,
      pricesAsOf: "2026-10-25",
      overall: "Seedance 2.5 Draft plus 1080p über Credit-Pakete, 374,63 €",
    },
  ]);
  const read = await readProject(env.dataDir, "Die Route");
  expect(read.ok && read.value.inputs).toEqual(entry("Die Route").inputs);
});

test("AC-F9-2 die Projektdatei enthält Eingaben, Ergebnis und Preisstand zum Zeitpunkt des Speicherns", async () => {
  await saveProject(env.dataDir, entry("Die Route"), { overwrite: false, now: NOW });
  const file = JSON.parse(await readFile(fileOf("die-route"), "utf8"));
  expect(Object.keys(file)).toEqual(["name", "createdAt", "updatedAt", "inputs", "snapshot"]);
  expect(file.snapshot.pricesAsOf).toBe("2026-10-25");
  expect(file.snapshot.savedAt).toBe(NOW);
  expect(file.snapshot.result.selected.shortfall).toBe("3940");
  expect(file.snapshot.result).toEqual(entry("Die Route").result);
});

describe("AC-F9-3 nichts wird ohne Bestätigung überschrieben", () => {
  test("AC-F9-3 gleicher Name ohne Bestätigung: Meldung, die Datei bleibt Byte für Byte gleich", async () => {
    await saveProject(env.dataDir, entry("Die Route"), { overwrite: false, now: NOW });
    const before = await readFile(fileOf("die-route"), "utf8");
    const second = await saveProject(env.dataDir, entry("Die Route", { attemptsPerClip: 5 }), {
      overwrite: false,
      now: LATER,
    });
    expect(second.ok).toBe(false);
    expect(second.ok ? undefined : second.errors[0]).toMatchObject({ code: "project-exists" });
    expect(await readFile(fileOf("die-route"), "utf8")).toBe(before);
  });

  test("AC-F9-3 ein anders geschriebener Name mit gleichem Dateinamen zählt als vorhanden", async () => {
    await saveProject(env.dataDir, entry("Die Route"), { overwrite: false, now: NOW });
    const second = await saveProject(env.dataDir, entry("die  ROUTE!"), { overwrite: false, now: LATER });
    expect(second.ok ? "" : second.errors[0].message).toContain("„Die Route“ gibt es schon");
  });

  test("AC-F9-3 mit Bestätigung wird ersetzt; das Anlagedatum bleibt erhalten", async () => {
    await saveProject(env.dataDir, entry("Die Route"), { overwrite: false, now: NOW });
    const replaced = await saveProject(env.dataDir, entry("Die Route", { attemptsPerClip: 5 }), {
      overwrite: true,
      now: LATER,
    });
    expect(replaced.ok && replaced.value).toMatchObject({
      createdAt: NOW,
      updatedAt: LATER,
      inputs: { attemptsPerClip: 5 },
    });
    expect(await readdir(join(env.dataDir, "projekte"))).toEqual(["die-route.json"]);
  });
});

describe("AC-F9-4 beschädigte Projektdatei", () => {
  test("AC-F9-4 kaputtes JSON und fehlende Felder ergeben je eine Meldung, die anderen Projekte bleiben nutzbar", async () => {
    await saveProject(env.dataDir, entry("Die Route"), { overwrite: false, now: NOW });
    await writeFile(join(env.dataDir, "projekte", "kaputt.json"), "{ nicht fertig");
    await writeFile(join(env.dataDir, "projekte", "unvollstaendig.json"), JSON.stringify({ name: "Alt" }));
    const list = await listProjects(env.dataDir);
    expect(list.projects.map((project) => project.name)).toEqual(["Die Route"]);
    expect(list.errors).toEqual([
      expect.objectContaining({ code: "invalid-project", file: "projekte/kaputt.json" }),
      expect.objectContaining({ code: "invalid-project", file: "projekte/unvollstaendig.json" }),
    ]);
    expect((await readProject(env.dataDir, "Die Route")).ok).toBe(true);
  });
});

describe("Schutz vor Datenverlust und Randfälle", () => {
  test("nach dem Speichern bleibt keine Zwischendatei liegen", async () => {
    await saveProject(env.dataDir, entry("A"), { overwrite: false, now: NOW });
    await saveProject(env.dataDir, entry("A"), { overwrite: true, now: LATER });
    expect(await readdir(join(env.dataDir, "projekte"))).toEqual(["a.json"]);
  });

  test("ohne Datenordner wird nichts angelegt", async () => {
    const missing = join(env.root, "gibt-es-nicht");
    const saved = await saveProject(missing, entry("A"), { overwrite: false, now: NOW });
    expect(saved.ok ? "" : saved.errors[0].code).toBe("data-dir-missing");
    await expect(readdir(missing)).rejects.toThrow();
  });

  test("ohne Projektordner ist die Liste leer, ein unbekanntes Projekt wird verständlich gemeldet", async () => {
    expect(await listProjects(env.dataDir)).toEqual({ projects: [], errors: [] });
    const read = await readProject(env.dataDir, "Gibt es nicht");
    expect(read.ok ? "" : read.errors[0].message).toContain("hfcalc projekte");
  });

  test("Dateinamen aus Projektnamen", () => {
    expect(projectSlug("Die Route – Teil 2")).toBe("die-route-teil-2");
    expect(projectSlug("Größe & Übermut")).toBe("groesse-uebermut");
    expect(projectSlug("!!!")).toBe("");
  });
});
