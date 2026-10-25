import { z } from "zod";
import { exchangeRateSchema } from "./kurs.ts";

// Ergebnis von calculate() als JSON (docs/ARCHITECTURE.md, „Ergebnis“). Zahlen sind exakte Dezimaltexte.
// Der Rechenkern prüft beim Übersetzen, dass sein Ergebnis zu diesem Schema passt (src/kern/berechnung.ts).

export const NOTE_KINDS = ["info", "assumption", "no-price", "covered", "error"] as const;

export const noteSchema = z.strictObject({
  kind: z.enum(NOTE_KINDS),
  text: z.string().min(1),
});
export type Note = z.infer<typeof noteSchema>;

/** Wohin ein allgemeiner Hinweis gehört; die Oberfläche zeigt ihn dort an (UI-RULES 0.8). */
export const NOTE_AREAS = ["clips", "images", "paths", "rate", "packages", "reach"] as const;
export type NoteArea = (typeof NOTE_AREAS)[number];

/** Hinweis mit Ort. In älteren Projektdateien darf `area` fehlen. */
export const placedNoteSchema = noteSchema.extend({
  area: z.enum(NOTE_AREAS).optional(),
});
export type PlacedNote = Note & { area: NoteArea };

const decimal = z.string().regex(/^-?\d+(\.\d+)?(e[+-]?\d+)?$/, { error: "Zahl als exakter Dezimaltext erwartet." });
const maybeDecimal = decimal.nullable();

const gross = z.strictObject({ eur: maybeDecimal, usd: maybeDecimal });

/** Kaufplan eines Produktionswegs: Pakete mit Preis je Paket, Summe brutto, Vergleichspaket (src/kern/kaufplan.ts) */
const planSchema = z.strictObject({
  pathId: z.string(),
  creditsNeeded: decimal,
  shortfall: decimal,
  packages: z.array(z.strictObject({ credits: z.number(), count: z.number(), unitGross: gross, lineGross: gross })),
  leftoverCredits: decimal,
  gross,
  net: gross,
  singlePackage: z.strictObject({ credits: z.number(), gross }).nullable(),
  pricesAsOf: z.string().nullable(),
});

const qualitySchema = z.strictObject({ points: decimal, resolutionPoints: decimal, factor: decimal });

const recommendationFields = {
  sentence: z.string(),
  reason: z.string(),
  threshold: z.string(),
  notes: z.array(noteSchema),
};

export const resultSchema = z.strictObject({
  openSeconds: decimal,
  clips: z.strictObject({ count: decimal, lengthSeconds: decimal, billedSecondsPerAttempt: decimal }),
  paths: z.array(
    z.strictObject({
      id: z.string(),
      label: z.string(),
      modelId: z.string(),
      resolution: z.string(),
      creditsPerSecond: maybeDecimal,
      videoCredits: maybeDecimal,
      status: z.enum(["ok", "no-price"]),
      plan: planSchema.nullable(),
      quality: qualitySchema.nullable(),
      costPerQualityPoint: maybeDecimal,
      differenceToSelection: gross.nullable(),
    }),
  ),
  valueRanking: z.array(z.string()),
  /** Bilder (docs/ARCHITECTURE.md, „Ergebnis“); `storyboard` und `assets` sind `null`, wenn sie ausgeschaltet sind */
  images: z.strictObject({
    storyboard: z.strictObject({ images: decimal, credits: maybeDecimal }).nullable(),
    clipImages: z.strictObject({ images: decimal, credits: maybeDecimal }),
    assets: z.strictObject({ count: decimal, images: decimal, credits: maybeDecimal }).nullable(),
    totalCredits: maybeDecimal,
  }),
  selected: z.strictObject({
    pathId: z.string(),
    totalCredits: maybeDecimal,
    shortfall: maybeDecimal,
    packages: z.array(
      z.strictObject({ credits: z.number(), count: z.number(), unitNet: decimal, currency: z.enum(["USD", "EUR"]) }),
    ),
    singlePackage: z
      .strictObject({ credits: z.number(), unitNet: decimal, currency: z.enum(["USD", "EUR"]) })
      .nullable(),
    pricesAsOf: z.string().nullable(),
    creditsBought: maybeDecimal,
    leftoverCredits: maybeDecimal,
    usdNet: maybeDecimal,
    usdGross: maybeDecimal,
    eurNet: maybeDecimal,
    eur: maybeDecimal,
  }),
  exchangeRate: exchangeRateSchema.nullable(),
  recommendations: z.strictObject({
    productionPath: z.strictObject({ ...recommendationFields, pathId: z.string().nullable() }),
    bestValue: z.strictObject({ ...recommendationFields, pathId: z.string().nullable() }),
    overall: z.strictObject({
      ...recommendationFields,
      pathId: z.string().nullable(),
      eur: maybeDecimal,
      usd: maybeDecimal,
      plan: planSchema.nullable(),
    }),
  }),
  reach: z.strictObject({ finishedSeconds: decimal, clips: decimal }).nullable(),
  notes: z.array(placedNoteSchema),
});

export type Result = z.infer<typeof resultSchema>;
