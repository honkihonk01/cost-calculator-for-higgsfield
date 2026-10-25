import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { readTotalSelectionWith, saveTotalSelectionWith } from "../../src/laden/gemeinsam/index.ts";
import { nodeProjectIo } from "../../src/laden/node/index.ts";
import { tempData } from "../hilfen/daten.ts";

// Gemerkte Auswahl der Gesamtkalkulation gegen einen echten temporären Datenordner (docs/TESTING.md).

let data: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  data = await tempData();
});
afterEach(async () => {
  await data.cleanup();
});

test("AC-F15-7 die Auswahl wird im Datenordner gemerkt und wieder gelesen", async () => {
  const io = nodeProjectIo(data.dataDir);
  expect(await readTotalSelectionWith(io)).toEqual({ names: [], error: null });
  expect(await saveTotalSelectionWith(io, ["Projekt 1", "Projekt 3"])).toBeNull();
  expect(await readTotalSelectionWith(io)).toEqual({ names: ["Projekt 1", "Projekt 3"], error: null });
  expect(JSON.parse(await readFile(join(data.dataDir, "gesamtkalkulation.json"), "utf8"))).toEqual({
    projects: ["Projekt 1", "Projekt 3"],
  });
  // atomar geschrieben: keine Zwischendatei bleibt liegen
  expect((await readdir(data.dataDir)).filter((file) => file.includes(".tmp"))).toEqual([]);
});

test("AC-F15-7 eine beschädigte Datei ergibt eine leere Auswahl mit Meldung", async () => {
  await writeFile(join(data.dataDir, "gesamtkalkulation.json"), "{ kaputt");
  const read = await readTotalSelectionWith(nodeProjectIo(data.dataDir));
  expect(read.names).toEqual([]);
  expect(read.error).toContain("beschädigt");
});

test("AC-F15-7 ohne Datenordner wird nichts angelegt", async () => {
  const missing = join(data.root, "gibt-es-nicht");
  expect(await saveTotalSelectionWith(nodeProjectIo(missing), ["Projekt 1"])).toBeNull();
  expect(await readdir(data.root)).not.toContain("gibt-es-nicht");
});
