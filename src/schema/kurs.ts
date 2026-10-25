import { z } from "zod";
import { asOfSchema, positiveNumber } from "./preis.ts";

// Wechselkurs (SPEC F4): Dollar je 1 Euro. Reine Teile, die Node- und Tauri-Ladeschicht gemeinsam nutzen.

export const ECB_URL =
  "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=jsondata";

export const exchangeRateSchema = z.strictObject({
  value: positiveNumber("Wechselkurs"),
  date: asOfSchema,
  origin: z.enum(["ecb", "cached", "manual"]),
});
/** `origin`: `ecb` = aktueller Referenzkurs, `cached` = gespeicherter Kurs ohne Verbindung (offline), `manual` = von Hand. */
export type ExchangeRate = z.infer<typeof exchangeRateSchema>;

/** Inhalt von `<Datenordner>/cache/wechselkurs.json` */
export const rateCacheSchema = z.strictObject({ value: positiveNumber("Wechselkurs"), date: asOfSchema });
export type RateCache = z.infer<typeof rateCacheSchema>;

const ecbResponseSchema = z.object({
  dataSets: z
    .array(
      z.object({
        series: z.record(z.string(), z.object({ observations: z.record(z.string(), z.array(z.unknown())) })),
      }),
    )
    .min(1),
  structure: z.object({
    dimensions: z.object({
      observation: z.array(z.object({ id: z.string(), values: z.array(z.object({ id: z.string() })) })),
    }),
  }),
});

/** Liest Kurs und Datum aus der SDMX-JSON-Antwort der Europäischen Zentralbank. */
export function parseEcbResponse(json: unknown): RateCache | null {
  const parsed = ecbResponseSchema.safeParse(json);
  if (!parsed.success) return null;
  const series = Object.values(parsed.data.dataSets[0].series)[0];
  const [index, observation] = Object.entries(series?.observations ?? {})[0] ?? [];
  const time = parsed.data.structure.dimensions.observation.find((dimension) => dimension.id === "TIME_PERIOD");
  const date = time?.values[Number(index)]?.id;
  const result = rateCacheSchema.safeParse({ value: observation?.[0], date });
  return result.success ? result.data : null;
}

/** Jüngster Bankarbeitstag bis `today` (Montag bis Freitag; Feiertage führen nur zu einem zusätzlichen Abruf). */
export function latestBusinessDay(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  const weekday = date.getUTCDay();
  const back = weekday === 0 ? 2 : weekday === 6 ? 1 : 0;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

/** Ein gespeicherter Kurs vom aktuellen Bankarbeitstag wird ohne Abruf verwendet (SPEC Entscheidung 13). */
export function isCacheCurrent(cache: RateCache, today: string): boolean {
  return cache.date >= latestBusinessDay(today);
}
