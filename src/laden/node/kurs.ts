import { mkdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { ECB_URL, type RateCache, rateCacheSchema } from "../../schema/index.ts";
import { BROKEN_CACHE, fetchEcbWith, localToday, type RateLookup, resolveRate } from "../gemeinsam/index.ts";
import { writeFileAtomic } from "./schreiben.ts";

// SPEC F4 für Kommandozeile und MCP-Server: Zwischenspeicher im Datenordner, Abruf über das globale fetch.

export type RateOptions = {
  dataDir: string;
  /** heutiges Datum `YYYY-MM-DD`; die Uhr kommt von außen, damit Tests sie festlegen können */
  today: string;
  timeoutMs: number;
  manualRate?: number;
  url?: string;
};

export { localToday, type RateLookup };

export function cachePath(dataDir: string): string {
  return join(dataDir, "cache", "wechselkurs.json");
}

export async function getExchangeRate(options: RateOptions): Promise<RateLookup> {
  const { dataDir } = options;
  return resolveRate(
    {
      readCache: () => readCache(dataDir),
      writeCache: (rate) => writeCache(dataDir, rate),
      fetchEcb: (timeoutMs) => fetchEcbWith(fetch, options.url ?? ECB_URL, timeoutMs),
    },
    options,
  );
}

async function readCache(dataDir: string): Promise<{ cache: RateCache | null; cacheError?: string }> {
  let text: string;
  try {
    text = await readFile(cachePath(dataDir), "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return { cache: null };
    return { cache: null, cacheError: `Der gespeicherte Kurs ließ sich nicht lesen: ${String(error)}` };
  }
  try {
    const parsed = rateCacheSchema.safeParse(JSON.parse(text));
    if (parsed.success) return { cache: parsed.data };
  } catch {
    // Kaputtes JSON: unten als Meldung zurückgeben.
  }
  return { cache: null, cacheError: BROKEN_CACHE };
}

/** Speichert nur, wenn der Datenordner schon existiert; angelegt wird er ausschließlich von `hfcalc einrichten`. */
async function writeCache(dataDir: string, rate: RateCache): Promise<string | undefined> {
  const exists = await stat(dataDir).then(
    (info) => info.isDirectory(),
    () => false,
  );
  if (!exists) return undefined;
  try {
    await mkdir(join(dataDir, "cache"), { recursive: true });
    await writeFileAtomic(cachePath(dataDir), `${JSON.stringify(rate, null, 2)}\n`);
    return undefined;
  } catch (error) {
    return `Der Kurs ließ sich nicht speichern und wird beim nächsten Mal neu abgerufen: ${String(error)}`;
  }
}
