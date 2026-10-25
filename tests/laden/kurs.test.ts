import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { exchangeRateNote, usdToEur } from "../../src/kern/index.ts";
import { cachePath, getExchangeRate, type RateOptions } from "../../src/laden/node/index.ts";
import { tempData } from "../hilfen/daten.ts";
import { fixturePrices } from "../hilfen/preise.ts";

// Nachgebaute Zentralbank: liefert das echte SDMX-JSON-Format, verzögert oder scheitert auf Wunsch.
type Mode = "ok" | "slow" | "error";
let mode: Mode = "ok";
let requests = 0;
let server: Server;
let url: string;
let env: Awaited<ReturnType<typeof tempData>>;

function ecbBody(value: number, date: string) {
  return JSON.stringify({
    dataSets: [{ series: { "0:0:0:0:0": { observations: { "0": [value, 0, 0, null, null] } } } }],
    structure: { dimensions: { observation: [{ id: "TIME_PERIOD", values: [{ id: date, name: date }] }] } },
  });
}

beforeEach(async () => {
  mode = "ok";
  requests = 0;
  env = await tempData();
  server = createServer((_request, response) => {
    requests += 1;
    if (mode === "error") {
      response.writeHead(500).end();
    } else if (mode === "slow") {
      setTimeout(() => response.writeHead(200).end(ecbBody(1.2, "2026-10-08")), 2000);
    } else {
      response.writeHead(200, { "content-type": "application/json" }).end(ecbBody(1.0834, "2026-10-08"));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await env.cleanup();
});

/** Donnerstag, 09.10.2026; der Server liefert den Kurs vom Vortag. */
function options(changes: Partial<RateOptions> = {}): RateOptions {
  return { dataDir: env.dataDir, today: "2026-10-09", timeoutMs: 1000, url, ...changes };
}

async function offlineUrl(): Promise<string> {
  const closed = createServer();
  await new Promise<void>((resolve) => closed.listen(0, "127.0.0.1", resolve));
  const address = `http://127.0.0.1:${(closed.address() as AddressInfo).port}/`;
  await new Promise<void>((resolve) => closed.close(() => resolve()));
  return address;
}

async function writeCache(value: number, date: string) {
  await mkdir(join(env.dataDir, "cache"), { recursive: true });
  await writeFile(cachePath(env.dataDir), JSON.stringify({ value, date }));
}

test("AC-F4-1 mit Verbindung gilt der Referenzkurs, das Ergebnis nennt Kurs und Datum", async () => {
  const lookup = await getExchangeRate(options());
  expect(lookup.rate).toEqual({ value: 1.0834, date: "2026-10-08", origin: "ecb" });
  expect(exchangeRateNote(lookup.rate).text).toContain("1,0834 $ je 1 €");
  expect(exchangeRateNote(lookup.rate).text).toContain("08.10.2026");
  expect(JSON.parse(await readFile(cachePath(env.dataDir), "utf8"))).toEqual({ value: 1.0834, date: "2026-10-08" });
});

test("AC-F4-2 ohne Verbindung gilt der gespeicherte Kurs mit Datum und dem Hinweis „offline“", async () => {
  await writeCache(1.07, "2026-10-01");
  const lookup = await getExchangeRate(options({ url: await offlineUrl() }));
  expect(lookup.rate).toEqual({ value: 1.07, date: "2026-10-01", origin: "cached" });
  expect(lookup.fetchError).toContain("nicht erreichbar");
  const note = exchangeRateNote(lookup.rate).text;
  expect(note).toContain("Offline");
  expect(note).toContain("01.10.2026");
});

test("AC-F4-3 ohne Verbindung, gespeicherten und manuellen Kurs fehlt der Kurs mit einer Meldung", async () => {
  const lookup = await getExchangeRate(options({ url: await offlineUrl() }));
  expect(lookup.rate).toBeNull();
  expect(exchangeRateNote(null).text).toContain("in Dollar");
});

test("AC-F4-4 ein manueller Kurs hat Vorrang und wird als „manuell“ genannt, ohne Abruf", async () => {
  await writeCache(1.07, "2026-10-09");
  const lookup = await getExchangeRate(options({ manualRate: 1.08 }));
  expect(lookup.rate).toEqual({ value: 1.08, date: "2026-10-09", origin: "manual" });
  expect(requests).toBe(0);
  expect(exchangeRateNote(lookup.rate).text).toContain("manuell");
});

describe("AC-F4-5 Zeitlimit", () => {
  test("AC-F4-5 das Zeitlimit aus den Einstellungen beträgt 5 Sekunden", () => {
    expect(fixturePrices().settings.ecbTimeoutMs).toBe(5000);
  });

  test("AC-F4-5 antwortet die Zentralbank nicht im Zeitlimit, gilt der gespeicherte Kurs wie offline", async () => {
    mode = "slow";
    await writeCache(1.07, "2026-10-01");
    const lookup = await getExchangeRate(options({ timeoutMs: 100 }));
    expect(lookup.rate).toEqual({ value: 1.07, date: "2026-10-01", origin: "cached" });
    expect(lookup.fetchError).toContain("0,1 Sekunden");
  });

  test("AC-F4-5 ohne gespeicherten Kurs führt das Zeitlimit zu „kein Kurs“", async () => {
    mode = "slow";
    expect((await getExchangeRate(options({ timeoutMs: 100 }))).rate).toBeNull();
  });
});

test("AC-F4-6 Kurs 1,08: 108 $ ergeben 100 €, weil der Kurs Dollar je 1 Euro bedeutet", () => {
  expect(usdToEur(new Big(108), { value: 1.08, date: "2026-10-09", origin: "manual" }).toString()).toBe("100");
  expect(usdToEur(new Big("374.255"), { value: 1.08, date: "2026-10-09", origin: "manual" }).round(2).toString()).toBe(
    "346.53",
  );
});

describe("Zwischenspeicher nach SPEC Entscheidung 13", () => {
  test("ein Kurs vom aktuellen Bankarbeitstag wird ohne Abruf verwendet", async () => {
    await writeCache(1.1, "2026-10-09");
    expect((await getExchangeRate(options())).rate).toEqual({ value: 1.1, date: "2026-10-09", origin: "ecb" });
    expect(requests).toBe(0);
  });

  test("am Sonntag gilt der Kurs vom Freitag als aktuell", async () => {
    await writeCache(1.1, "2026-10-09");
    await getExchangeRate(options({ today: "2026-10-11" }));
    expect(requests).toBe(0);
  });

  test("ein älterer Kurs wird neu abgerufen und ersetzt", async () => {
    await writeCache(1.1, "2026-10-07");
    expect((await getExchangeRate(options())).rate?.value).toBe(1.0834);
    expect(requests).toBe(1);
  });

  test("ein Fehlerstatus der Zentralbank wirkt wie offline", async () => {
    mode = "error";
    await writeCache(1.07, "2026-10-01");
    expect((await getExchangeRate(options())).rate?.origin).toBe("cached");
  });

  test("ein beschädigter Zwischenspeicher wird gemeldet und durch den neuen Kurs ersetzt", async () => {
    await mkdir(join(env.dataDir, "cache"), { recursive: true });
    await writeFile(cachePath(env.dataDir), "{ kaputt");
    const broken = await getExchangeRate(options({ url: await offlineUrl() }));
    expect(broken).toMatchObject({ rate: null, cacheError: expect.stringContaining("beschädigt") });
    const lookup = await getExchangeRate(options());
    expect(lookup.rate?.value).toBe(1.0834);
    const offline = await getExchangeRate(options({ url: await offlineUrl(), today: "2026-10-12" }));
    expect(offline.rate?.origin).toBe("cached");
  });

  test("ohne Datenordner wird nichts angelegt", async () => {
    const missing = join(env.root, "gibt-es-nicht");
    await getExchangeRate(options({ dataDir: missing }));
    await expect(stat(missing)).rejects.toThrow();
  });
});
