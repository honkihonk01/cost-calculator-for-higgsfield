import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { runCli, tempData } from "../hilfen/daten.ts";
import { callTool, connectMcp } from "../hilfen/mcp.ts";
import { STANDARD_RAW } from "../hilfen/preise.ts";

let env: Awaited<ReturnType<typeof tempData>>;
let client: Client;
beforeEach(async () => {
  env = await tempData();
  client = await connectMcp(env);
});
afterEach(async () => {
  await client.close();
  await env.cleanup();
});

const INPUTS = { ...STANDARD_RAW, manualExchangeRate: 1.08 };

test("AC-F12-1 ein Agent sieht fünf Werkzeuge, jeweils mit Beschreibung und Eingabeschema", async () => {
  const { tools } = await client.listTools();
  expect(tools.map((tool) => tool.name).sort()).toEqual([
    "kosten_berechnen",
    "preise_lesen",
    "projekt_lesen",
    "projekt_speichern",
    "projekte_auflisten",
  ]);
  for (const tool of tools) {
    expect(tool.description?.length ?? 0, tool.name).toBeGreaterThan(40);
    expect(tool.inputSchema.type, tool.name).toBe("object");
  }
  const calculateTool = tools.find((tool) => tool.name === "kosten_berechnen");
  const properties = calculateTool?.inputSchema.properties as Record<string, { description?: string }>;
  expect(properties.modelId?.description).toContain("Videomodell");
  expect(properties.manualExchangeRate?.description).toContain("Dollar je 1 Euro");
  expect(client.getInstructions()).toContain("„Dollar je 1 Euro“");
});

describe("AC-F12-3 ungültige Eingaben", () => {
  test("AC-F12-3 die Fehlermeldung nennt das Feld, und der Server läuft weiter", async () => {
    const invalid = await callTool(client, "kosten_berechnen", { ...INPUTS, attemptsPerClip: 0 });
    expect(invalid.isError).toBe(true);
    expect(invalid.text).toContain("attemptsPerClip");
    expect(invalid.text).toContain("Gib mindestens 1 Versuch an.");
    const valid = await callTool(client, "kosten_berechnen", INPUTS);
    expect(valid.isError).toBe(false);
    expect(JSON.parse(valid.text).recommendations.overall.sentence).toContain("374,63 €");
  });

  test("AC-F12-3 eine unzulässige Kombination nennt das Feld", async () => {
    const result = await callTool(client, "kosten_berechnen", { ...INPUTS, modelId: "seedance-2.5", resolution: "4K" });
    expect(result).toMatchObject({ isError: true });
    expect(result.text).toContain("resolution: Seedance 2.5 gibt es in 480p, 720p, 1080p.");
  });

  test("AC-F12-3 fehlender Pflichtwert und unbekanntes Projekt", async () => {
    const { creditBalance: _ignored, ...withoutBalance } = INPUTS;
    const missing = await callTool(client, "kosten_berechnen", withoutBalance);
    expect(missing.isError).toBe(true);
    expect(missing.text).toContain("creditBalance");
    const project = await callTool(client, "projekt_lesen", { name: "Gibt es nicht" });
    expect(project).toMatchObject({ isError: true });
    expect(project.text).toContain("gibt es nicht");
  });
});

test("AC-F9-5 ein gespeichertes Projekt liefert über MCP dieselben Eingaben und dasselbe Ergebnis wie über die Kommandozeile", async () => {
  const flags = [
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
  expect(runCli(["projekt", "speichern", "Die Route", ...flags], env).code).toBe(0);
  const viaCli = runCli(["projekt", "zeigen", "Die Route", "--json"], env).stdout.trimEnd();
  const viaMcp = await callTool(client, "projekt_lesen", { name: "Die Route" });
  expect(viaMcp.isError).toBe(false);
  expect(viaMcp.text).toBe(viaCli);
  const listed = JSON.parse((await callTool(client, "projekte_auflisten")).text);
  expect(listed.projects.map((project: { name: string }) => project.name)).toEqual(["Die Route"]);
});

describe("weitere Werkzeuge", () => {
  test("preise_lesen ist identisch mit hfcalc preise --json", async () => {
    const viaMcp = await callTool(client, "preise_lesen");
    expect(viaMcp.text).toBe(runCli(["preise", "--json"], env).stdout.trimEnd());
  });

  test("projekt_speichern speichert und überschreibt nur mit overwrite: true", async () => {
    const first = await callTool(client, "projekt_speichern", { name: "Agent-Film", inputs: INPUTS });
    expect(first.isError).toBe(false);
    const again = await callTool(client, "projekt_speichern", {
      name: "Agent-Film",
      inputs: { ...INPUTS, attemptsPerClip: 4 },
    });
    expect(again).toMatchObject({ isError: true });
    expect(again.text).toContain("Es wurde nichts überschrieben");
    const replaced = await callTool(client, "projekt_speichern", {
      name: "Agent-Film",
      inputs: { ...INPUTS, attemptsPerClip: 4 },
      overwrite: true,
    });
    expect(JSON.parse(replaced.text).inputs.attemptsPerClip).toBe(4);
    expect(runCli(["projekte"], env).stdout).toContain("Agent-Film");
  });
});

test("Leistung: kosten_berechnen antwortet ohne Netzabruf in unter 500 ms", async () => {
  await callTool(client, "kosten_berechnen", INPUTS);
  const start = performance.now();
  const result = await callTool(client, "kosten_berechnen", INPUTS);
  expect(result.isError).toBe(false);
  expect(performance.now() - start).toBeLessThan(500);
});
