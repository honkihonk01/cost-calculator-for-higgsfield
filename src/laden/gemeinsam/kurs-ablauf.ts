import { type ExchangeRate, isCacheCurrent, parseEcbResponse, type RateCache } from "../../schema/index.ts";

// Ablauf des Kursabrufs (SPEC F4, Entscheidung 13) ohne Datei- und Netzzugriff. Node und Tauri liefern nur
// das Lesen und Schreiben des Zwischenspeichers und den Abruf; so verhalten sich Kommandozeile und App gleich.

export type RateIo = {
  readCache(): Promise<{ cache: RateCache | null; cacheError?: string }>;
  /** liefert eine Meldung, wenn das Speichern scheiterte */
  writeCache(rate: RateCache): Promise<string | undefined>;
  fetchEcb(timeoutMs: number): Promise<{ ok: true; value: RateCache } | { ok: false; error: string }>;
};

export type RateLookup = { rate: ExchangeRate | null; fetchError?: string; cacheError?: string };

export async function resolveRate(
  io: RateIo,
  options: { today: string; timeoutMs: number; manualRate?: number },
): Promise<RateLookup> {
  if (options.manualRate !== undefined) {
    return { rate: { value: options.manualRate, date: options.today, origin: "manual" } };
  }
  const { cache, cacheError } = await io.readCache();
  const withCacheError = cacheError === undefined ? {} : { cacheError };
  if (cache && isCacheCurrent(cache, options.today)) return { rate: { ...cache, origin: "ecb" } };
  const fetched = await io.fetchEcb(options.timeoutMs);
  if (fetched.ok) {
    const writeError = await io.writeCache(fetched.value);
    return {
      rate: { ...fetched.value, origin: "ecb" },
      ...(writeError === undefined ? {} : { cacheError: writeError }),
    };
  }
  return cache
    ? { rate: { ...cache, origin: "cached" }, fetchError: fetched.error, ...withCacheError }
    : { rate: null, fetchError: fetched.error, ...withCacheError };
}

/** Abruf mit Zeitlimit über eine beliebige fetch-Funktion (Node: global, Tauri: plugin-http). */
export async function fetchEcbWith(
  fetchFn: (url: string, init: { signal: AbortSignal }) => Promise<Response>,
  url: string,
  timeoutMs: number,
): Promise<{ ok: true; value: RateCache } | { ok: false; error: string }> {
  try {
    const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { ok: false, error: `Die Zentralbank antwortete mit Status ${response.status}.` };
    const rate = parseEcbResponse(await response.json());
    return rate ? { ok: true, value: rate } : { ok: false, error: "Die Antwort der Zentralbank enthielt keinen Kurs." };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut
        ? `Die Zentralbank hat nicht innerhalb von ${String(timeoutMs / 1000).replace(".", ",")} Sekunden geantwortet.`
        : "Die Zentralbank ist nicht erreichbar (keine Internetverbindung?).",
    };
  }
}

/** Heutiges Datum in der Zeitzone des Macs, `YYYY-MM-DD`. */
export function localToday(now = new Date()): string {
  return now.toLocaleDateString("sv-SE");
}

export const BROKEN_CACHE =
  "Der gespeicherte Kurs in cache/wechselkurs.json ist beschädigt und wird beim nächsten Abruf ersetzt.";
