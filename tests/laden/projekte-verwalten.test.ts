import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { calculate } from "../../src/kern/index.ts";
import {
  type ProjectToSave,
  renameProjectWith,
  saveProjectWith,
  trashProjectWith,
} from "../../src/laden/gemeinsam/index.ts";
import { nodeProjectIo } from "../../src/laden/node/index.ts";
import { inputsSchema, newestPriceDate } from "../../src/schema/index.ts";
import { tempData } from "../hilfen/daten.ts";
import { fixturePrices, STANDARD_RAW } from "../hilfen/preise.ts";

// Löschen über den Papierkorb und Umbenennen (SPEC F9) gegen einen echten temporären Datenordner.

let env: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  env = await tempData();
});
afterEach(async () => {
  await env.cleanup();
});

const NOW = "2026-10-26T09:00:00.000Z";
const LATER = "2026-10-26T10:15:30.000Z";
const io = () => nodeProjectIo(env.dataDir);
const files = (folder: string) => readdir(join(env.dataDir, folder)).then((names) => names.sort());

function entry(name: string): ProjectToSave {
  const prices = fixturePrices();
  const inputs = inputsSchema.parse({ ...STANDARD_RAW, manualExchangeRate: 1.08 });
  const result = calculate(inputs, prices, { value: 1.08, date: "2026-10-09", origin: "manual" });
  if (!result.ok) throw new Error("Rechnung fehlgeschlagen");
  return { name, inputs, result: result.value, pricesAsOf: newestPriceDate(prices) };
}

async function save(name: string) {
  const saved = await saveProjectWith(io(), entry(name), { overwrite: false, now: NOW });
  if (!saved.ok) throw new Error("Speichern fehlgeschlagen");
}

test("AC-F9-7 Löschen verschiebt die Datei unverändert in den Papierkorb, nichts wird gelöscht", async () => {
  await save("Die Route");
  const before = await readFile(join(env.dataDir, "projekte", "die-route.json"), "utf8");
  const trashed = await trashProjectWith(io(), "Die Route", LATER);
  expect(trashed).toEqual({ ok: true, value: { trashedAs: "projekte/papierkorb/die-route.json" } });
  expect(await files("projekte")).toEqual(["papierkorb"]);
  expect(await readFile(join(env.dataDir, "projekte", "papierkorb", "die-route.json"), "utf8")).toBe(before);
});

test("AC-F9-7 ein zweites gleichnamiges Projekt im Papierkorb überschreibt das erste nicht", async () => {
  await save("Die Route");
  await trashProjectWith(io(), "Die Route", NOW);
  await save("Die Route");
  const second = await trashProjectWith(io(), "Die Route", LATER);
  expect(second.ok && second.value.trashedAs).toBe("projekte/papierkorb/die-route-2026-10-26T10-15-30-000Z.json");
  expect(await files("projekte/papierkorb")).toEqual(["die-route-2026-10-26T10-15-30-000Z.json", "die-route.json"]);
});

test("AC-F9-7 ein Projekt, das es nicht mehr gibt, ergibt eine verständliche Meldung", async () => {
  const trashed = await trashProjectWith(io(), "Gibt es nicht", NOW);
  expect(trashed.ok).toBe(false);
  expect(!trashed.ok && trashed.errors[0]?.message).toBe("Ein Projekt „Gibt es nicht“ gibt es nicht mehr.");
});

test("AC-F9-8 Umbenennen behält Eingaben und Erstellzeit, die alte Datei liegt im Papierkorb", async () => {
  await save("Die Route");
  const renamed = await renameProjectWith(io(), "Die Route", "Das Ende", LATER);
  expect(renamed.ok).toBe(true);
  expect(await files("projekte")).toEqual(["das-ende.json", "papierkorb"]);
  expect(await files("projekte/papierkorb")).toEqual(["die-route.json"]);
  const saved = JSON.parse(await readFile(join(env.dataDir, "projekte", "das-ende.json"), "utf8"));
  expect(saved.name).toBe("Das Ende");
  expect(saved.createdAt).toBe(NOW);
  expect(saved.updatedAt).toBe(LATER);
  expect(saved.inputs).toEqual(entry("x").inputs);
});

test("AC-F9-8 Umbenennen auf einen vorhandenen Namen ändert nichts", async () => {
  await save("Die Route");
  await save("Das Ende");
  const before = await readFile(join(env.dataDir, "projekte", "das-ende.json"), "utf8");
  const renamed = await renameProjectWith(io(), "Die Route", "das ende", LATER);
  expect(!renamed.ok && renamed.errors[0]?.code).toBe("project-exists");
  expect(await files("projekte")).toEqual(["das-ende.json", "die-route.json"]);
  expect(await readFile(join(env.dataDir, "projekte", "das-ende.json"), "utf8")).toBe(before);
});

test("AC-F9-8 nur die Schreibweise ändern: gleiche Datei, kein Papierkorb", async () => {
  await save("die route");
  const renamed = await renameProjectWith(io(), "die route", "Die Route", LATER);
  expect(renamed.ok && renamed.value.name).toBe("Die Route");
  expect(await files("projekte")).toEqual(["die-route.json"]);
});
