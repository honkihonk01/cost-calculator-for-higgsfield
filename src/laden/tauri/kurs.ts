import { exists, mkdir, readTextFile, rename, writeTextFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { ECB_URL, type ExchangeRate, type RateCache, rateCacheSchema } from "../../schema/index.ts";
import { BROKEN_CACHE, fetchEcbWith, type RateLookup, resolveRate } from "../gemeinsam/index.ts";
import { DATA_DIR, HOME } from "./daten.ts";

// SPEC F4 in der App: derselbe Ablauf wie in der Kommandozeile, Zwischenspeicher über plugin-fs, Abruf über plugin-http.

const CACHE_FILE = `${DATA_DIR}/cache/wechselkurs.json`;

/** Gespeicherter Kurs ohne Abruf, damit die App sofort rechnen kann (SPEC Entscheidung 13). */
export async function cachedRateFromApp(): Promise<ExchangeRate | null> {
  const { cache } = await readCache();
  return cache ? { ...cache, origin: "cached" } : null;
}

export async function exchangeRateFromApp(options: {
  today: string;
  timeoutMs: number;
  manualRate?: number;
}): Promise<RateLookup> {
  return resolveRate(
    { readCache, writeCache, fetchEcb: (timeoutMs) => fetchEcbWith(fetch, ECB_URL, timeoutMs) },
    options,
  );
}

async function readCache(): Promise<{ cache: RateCache | null; cacheError?: string }> {
  if (!(await exists(CACHE_FILE, HOME).catch(() => false))) return { cache: null };
  try {
    const parsed = rateCacheSchema.safeParse(JSON.parse(await readTextFile(CACHE_FILE, HOME)));
    if (parsed.success) return { cache: parsed.data };
  } catch {
    // Kaputtes JSON oder nicht lesbar: unten als Meldung zurückgeben.
  }
  return { cache: null, cacheError: BROKEN_CACHE };
}

async function writeCache(rate: RateCache): Promise<string | undefined> {
  try {
    if (!(await exists(DATA_DIR, HOME))) return undefined;
    await mkdir(`${DATA_DIR}/cache`, { ...HOME, recursive: true });
    const temporary = `${CACHE_FILE}.tmp-${crypto.randomUUID()}`;
    await writeTextFile(temporary, `${JSON.stringify(rate, null, 2)}\n`, HOME);
    await rename(temporary, CACHE_FILE, { oldPathBaseDir: HOME.baseDir, newPathBaseDir: HOME.baseDir });
    return undefined;
  } catch (error) {
    return `Der Kurs ließ sich nicht speichern und wird beim nächsten Mal neu abgerufen: ${String(error)}`;
  }
}
