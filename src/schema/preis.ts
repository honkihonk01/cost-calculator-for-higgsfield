import { z } from "zod";

// Bausteine, die alle Preisdateien gemeinsam nutzen (docs/ARCHITECTURE.md, Abschnitt „Preis“).

export const RESOLUTIONS = ["480p", "720p", "1080p", "4K"] as const;
export const resolutionSchema = z.enum(RESOLUTIONS, {
  error: (issue) =>
    issue.input === undefined ? "Wähle eine Auflösung." : `Auflösung muss eine von ${RESOLUTIONS.join(", ")} sein.`,
});

/** Zahl mit verständlicher Meldung, wenn sie fehlt oder als Text mit Komma eingetragen ist. */
export function numberField(label: string) {
  return z.number({
    error: (issue) =>
      issue.input === undefined
        ? `${label} fehlt.`
        : `${label} muss eine Zahl sein. Dezimalzahlen mit Punkt schreiben, zum Beispiel 4.5 statt „4,5“.`,
  });
}

export function positiveNumber(label: string) {
  return numberField(label).gt(0, { error: `${label} muss größer als 0 sein.` });
}

export function positiveInteger(label: string) {
  return numberField(label)
    .int({ error: `${label} muss eine ganze Zahl sein.` })
    .gt(0, { error: `${label} muss größer als 0 sein.` });
}

export function textField(label: string) {
  return z
    .string({ error: (issue) => (issue.input === undefined ? `${label} fehlt.` : `${label} muss ein Text sein.`) })
    .trim()
    .min(1, { error: `${label} ist leer.` });
}

export const asOfSchema = z.iso.date({
  error: (issue) =>
    issue.input === undefined
      ? "Stand-Datum (asOf) fehlt. Jeder Wert braucht das Datum, an dem er abgelesen wurde, im Format JJJJ-MM-TT."
      : "Stand-Datum (asOf) muss das Format JJJJ-MM-TT haben, zum Beispiel 2026-10-09.",
});

export const sourceSchema = z
  .string({
    error: (issue) =>
      issue.input === undefined
        ? "Quelle (source) fehlt. Jeder Wert braucht eine Quelle, zum Beispiel „Kauf-Fenster Credits aufladen“."
        : "Quelle (source) muss ein Text sein.",
  })
  .trim()
  .min(1, { error: "Quelle (source) ist leer. Trage ein, woher der Wert stammt." });

export const PRICE_UNITS = ["credits_per_second", "credits_per_image", "USD", "EUR"] as const;
const unitSchema = z.enum(PRICE_UNITS, {
  error: `Einheit (unit) muss eine von ${PRICE_UNITS.join(", ")} sein.`,
});

const knownPriceSchema = z.strictObject({
  status: z.literal("known"),
  value: numberField("Preis (value)").gt(0, {
    error:
      "Ein Preis von 0 ist nicht erlaubt. Ist der Preis nicht bekannt, trage status „unknown“ ein und lass value weg.",
  }),
  unit: unitSchema,
  asOf: asOfSchema,
  source: sourceSchema,
});

const unknownPriceSchema = z.strictObject({
  status: z.literal("unknown"),
  unit: unitSchema.optional(),
  asOf: asOfSchema,
  source: sourceSchema,
});

const unavailablePriceSchema = z.strictObject({
  status: z.literal("unavailable"),
  asOf: asOfSchema,
  source: sourceSchema,
});

export const priceSchema = z.discriminatedUnion(
  "status",
  [knownPriceSchema, unknownPriceSchema, unavailablePriceSchema],
  {
    error: "Status (status) muss „known“, „unknown“ oder „unavailable“ sein.",
  },
);

export type Resolution = z.infer<typeof resolutionSchema>;
export type Price = z.infer<typeof priceSchema>;
