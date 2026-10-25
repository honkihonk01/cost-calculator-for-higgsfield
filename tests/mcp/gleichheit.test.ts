import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { calculate } from "../../src/kern/index.ts";
import { localToday } from "../../src/laden/node/index.ts";
import { runCli, tempData } from "../hilfen/daten.ts";
import { callTool, connectMcp } from "../hilfen/mcp.ts";
import { fixturePrices } from "../hilfen/preise.ts";

// AC-F11-2 und AC-F12-2: dieselben Eingaben durch Rechenkern, `hfcalc rechnen --json` und `kosten_berechnen`
// ergeben textgleiches JSON (docs/TESTING.md, Gleichheitstest: Standardbeispiel und drei Grenzfälle).

const SCOPE = ["--aufschlag", "25", "--bildmodell", "seedream-5.0-pro", "--kurs", "1,08"];
const DISCOUNT = {
  enabled: true,
  percent: 25,
  modelIds: ["seedance-2.5", "seedance-2.5-draft"],
  resolutions: ["1080p"],
};

const CASES = [
  {
    name: "Standardbeispiel",
    flags: [
      ...SCOPE,
      "--dauer",
      "3:00",
      "--modell",
      "seedance-2.5-draft",
      "--aufloesung",
      "1080p",
      "--versuche",
      "3",
      "--credits",
      "2000",
    ],
    inputs: {
      durationSeconds: 180,
      modelId: "seedance-2.5-draft",
      resolution: "1080p",
      attemptsPerClip: 3,
      creditBalance: 2000,
    },
  },
  {
    name: "Grenzfall mitten im Projekt: 12 offene Clips, 800 Credits, Storyboard und einmalige Assets an",
    flags: [
      ...SCOPE,
      "--storyboard",
      "seedream-5.0-flash",
      "--assets",
      "gpt-image-2.5-flare-high-2k",
      "--personen",
      "2",
      "--anlaeufe",
      "6,5",
      "--bilder-je-clip",
      "2,5",
      "--clips",
      "12",
      "--modell",
      "seedance-2.5-draft",
      "--aufloesung",
      "1080p",
      "--versuche",
      "3",
      "--credits",
      "800",
    ],
    inputs: {
      storyboardModelId: "seedream-5.0-flash",
      oneTimeAssets: { modelId: "gpt-image-2.5-flare-high-2k", people: 2, attemptsPerAsset: 6.5 },
      clipImagesPerClip: 2.5,
      clipCount: 12,
      modelId: "seedance-2.5-draft",
      resolution: "1080p",
      attemptsPerClip: 3,
      creditBalance: 800,
    },
  },
  {
    name: "Grenzfall Rabatt, Ton und Rabattpreise der Pakete bei Seedance 2.0 Standard in 720p",
    flags: [
      ...SCOPE,
      "--dauer",
      "1:30",
      "--modell",
      "seedance-2.0-standard",
      "--aufloesung",
      "720p",
      "--versuche",
      "2",
      "--credits",
      "0",
      "--rabatt",
      "25",
      "--audio",
      "50",
      "--paketpreise",
      "rabatt",
    ],
    inputs: {
      durationSeconds: 90,
      modelId: "seedance-2.0-standard",
      resolution: "720p",
      attemptsPerClip: 2,
      creditBalance: 0,
      discount: DISCOUNT,
      audioSurchargePercent: 50,
      packagePriceLevel: "discounted",
    },
  },
  {
    name: "Grenzfall Auswahl ohne Preis und Clips unter 4 s",
    flags: [
      ...SCOPE,
      "--clips",
      "40",
      "--modell",
      "seedance-2.0-mini",
      "--aufloesung",
      "720p",
      "--versuche",
      "5",
      "--credits",
      "100000",
      "--cliplaenge",
      "3",
    ],
    inputs: {
      clipCount: 40,
      modelId: "seedance-2.0-mini",
      resolution: "720p",
      attemptsPerClip: 5,
      creditBalance: 100000,
      clipLengthSeconds: 3,
    },
  },
] as const;

let env: Awaited<ReturnType<typeof tempData>>;
let client: Client;
beforeAll(async () => {
  env = await tempData();
  client = await connectMcp(env);
});
afterAll(async () => {
  await client.close();
  await env.cleanup();
});

describe("AC-F11-2 und AC-F12-2 Gleichheit der drei Bedienwege", () => {
  for (const testCase of CASES) {
    test(`AC-F11-2 AC-F12-2 ${testCase.name}`, async () => {
      const inputs = {
        ...testCase.inputs,
        extraScenesPercent: 25,
        clipImageModelId: "seedream-5.0-pro",
        manualExchangeRate: 1.08,
      };
      const kern = calculate(inputs, fixturePrices(), { value: 1.08, date: localToday(), origin: "manual" });
      expect(kern.ok).toBe(true);
      if (!kern.ok) return;
      const viaKern = JSON.stringify(kern.value, null, 2);

      const cli = runCli(["rechnen", ...testCase.flags, "--json"], env);
      expect(cli.code, cli.stderr).toBe(0);
      const viaMcp = await callTool(client, "kosten_berechnen", inputs);
      expect(viaMcp.isError, viaMcp.text).toBe(false);

      expect(cli.stdout.trimEnd()).toBe(viaKern);
      expect(viaMcp.text).toBe(viaKern);
    });
  }
});
