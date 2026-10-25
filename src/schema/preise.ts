import { z } from "zod";
import {
  asOfSchema,
  numberField,
  positiveInteger,
  positiveNumber,
  priceSchema,
  resolutionSchema,
  sourceSchema,
  textField,
} from "./preis.ts";

// Schemas der fünf Dateien in <Datenordner>/preise/ (docs/ARCHITECTURE.md, Abschnitt „Datenmodell“).

const idSchema = textField("Kennung (id)");

const videoModelSchema = z.strictObject({
  id: idSchema,
  name: textField("Anzeigename (name)"),
  family: z.enum(["seedance-2.5", "seedance-2.0"], {
    error: "Modellfamilie (family) muss „seedance-2.5“ oder „seedance-2.0“ sein.",
  }),
  clipMinSeconds: positiveNumber("Mindestlänge (clipMinSeconds)"),
  clipMaxSeconds: positiveNumber("Höchstlänge (clipMaxSeconds)"),
  resolutions: z.strictObject({
    "480p": priceSchema,
    "720p": priceSchema,
    "1080p": priceSchema,
    "4K": priceSchema,
  }),
  draft: z
    .strictObject({
      finishModelId: idSchema,
      finishResolution: resolutionSchema,
      finishWithinDays: positiveInteger("Frist der Fertigstellung (finishWithinDays)"),
    })
    .nullable(),
  audioSurchargeAllowed: z.boolean({ error: "audioSurchargeAllowed muss true oder false sein." }),
  badge: z.enum(["top", "new"], { error: "Kennzeichnung (badge) muss null, „top“ oder „new“ sein." }).nullable(),
});

export const videoModelsFileSchema = z.strictObject({
  models: z.array(videoModelSchema).min(1, { error: "Die Liste der Videomodelle ist leer." }),
});

const imageModelSchema = z.strictObject({
  id: idSchema,
  name: textField("Anzeigename (name)"),
  pricePerImage: priceSchema,
  storyboard: z.boolean({ error: "storyboard muss true oder false sein." }),
});

export const imageModelsFileSchema = z.strictObject({
  imagesPerClip: positiveInteger("Bilder je Clip (imagesPerClip)"),
  models: z.array(imageModelSchema).min(1, { error: "Die Liste der Bildmodelle ist leer." }),
});

const packageSchema = z.strictObject({
  credits: positiveInteger("Credits des Pakets (credits)"),
  regular: priceSchema,
  discounted: priceSchema,
});

export const packagesFileSchema = z.strictObject({
  vatPercent: numberField("Mehrwertsteuer (vatPercent)").min(0, { error: "Mehrwertsteuer darf nicht negativ sein." }),
  expiryDays: positiveInteger("Verfall in Tagen (expiryDays)"),
  packages: z.array(packageSchema).min(1, { error: "Die Liste der Credit-Pakete ist leer." }),
});

/** Qualitätspunkte für das Preis-Leistungs-Ranking (docs/DECISIONS.md 2026-10-25): Punkte = Auflösung × Modellfaktor. */
export const qualityFileSchema = z.strictObject({
  resolutionPoints: z.strictObject({
    "480p": positiveNumber("Punkte für 480p"),
    "720p": positiveNumber("Punkte für 720p"),
    "1080p": positiveNumber("Punkte für 1080p"),
    "4K": positiveNumber("Punkte für 4K"),
  }),
  modelFactors: z.record(idSchema, positiveNumber("Modellfaktor (modelFactors)")),
  asOf: asOfSchema,
  source: sourceSchema,
});

const priceLevelSchema = z.enum(["regular", "discounted"], {
  error: "Preisstand muss „regular“ oder „discounted“ sein.",
});

export const settingsFileSchema = z.strictObject({
  clipLengthSeconds: positiveNumber("Cliplänge (clipLengthSeconds)"),
  // Nur für die Unlimited-Pässe, die seit 25.10.2026 ausgebaut sind ; ältere Datenordner
  // tragen die beiden Felder noch, deshalb sind sie erlaubt, werden aber nicht benutzt.
  netHoursPerDay: positiveNumber("Netto-Stunden pro Tag (netHoursPerDay)").optional(),
  discountPercent: positiveNumber("Rabatt in Prozent (discountPercent)").max(100, {
    error: "Rabatt darf höchstens 100 % sein.",
  }),
  discountEnabled: z.boolean({ error: "discountEnabled muss true oder false sein." }),
  discountScope: z.strictObject({
    modelIds: z.array(idSchema),
    resolutions: z.array(resolutionSchema),
  }),
  packagePriceLevel: priceLevelSchema,
  passPriceLevel: priceLevelSchema.optional(),
  audioSurchargePercent: z.union([z.literal(0), z.literal(50), z.literal(100)], {
    error: "Audio-Aufschlag (audioSurchargePercent) muss 0, 50 oder 100 sein.",
  }),
  ecbTimeoutMs: positiveInteger("Zeitlimit der Zentralbank (ecbTimeoutMs)"),
  // Bilder (docs/DECISIONS.md 2026-10-25). Die Vorgaben gelten nur für Datenordner, die vor diesem Tag angelegt
  // wurden und die Felder noch nicht kennen; die Startdaten tragen dieselben Werte.
  clipImagesPerClip: numberField("Bilder je Clip (clipImagesPerClip)")
    .min(0, { error: "Bilder je Clip dürfen nicht negativ sein." })
    .default(3.5),
  attemptsPerAsset: positiveNumber("Anläufe pro Asset (attemptsPerAsset)").default(8),
  assetsPerPerson: numberField("Assets je Person (assetsPerPerson)")
    .min(0, { error: "Assets je Person dürfen nicht negativ sein." })
    .default(3),
  assetsPerLocation: numberField("Assets je Ort (assetsPerLocation)")
    .min(0, { error: "Assets je Ort dürfen nicht negativ sein." })
    .default(9),
  assetPeople: numberField("Personen beim Einschalten (assetPeople)")
    .int({ error: "Personen beim Einschalten (assetPeople) muss eine ganze Zahl sein." })
    .min(0, { error: "Personen beim Einschalten dürfen nicht negativ sein." })
    .default(5),
  assetLocations: numberField("Orte beim Einschalten (assetLocations)")
    .int({ error: "Orte beim Einschalten (assetLocations) muss eine ganze Zahl sein." })
    .min(0, { error: "Orte beim Einschalten dürfen nicht negativ sein." })
    .default(3),
  // Vorbelegung der Oberfläche beim ersten Öffnen, damit rechts sofort ein Ergebnis steht (docs/DECISIONS.md
  // 2026-10-25, „Startwerte“). Kommandozeile und MCP-Server nutzen sie nicht; dort bleiben die Pflichtwerte Pflicht.
  startValues: z
    .strictObject({
      durationSeconds: positiveNumber("Start: offene Dauer in Sekunden (startValues.durationSeconds)"),
      modelId: idSchema,
      resolution: resolutionSchema,
      attemptsPerClip: positiveInteger("Start: Versuche pro Clip (startValues.attemptsPerClip)"),
      clipImageModelId: idSchema,
      storyboardModelId: idSchema,
      assetModelId: idSchema,
      creditBalance: numberField("Start: Credit-Stand (startValues.creditBalance)")
        .int({ error: "Start: Credit-Stand (startValues.creditBalance) muss eine ganze Zahl sein." })
        .min(0, { error: "Start: Credit-Stand darf nicht negativ sein." }),
    })
    .default({
      durationSeconds: 600,
      modelId: "seedance-2.5",
      resolution: "480p",
      attemptsPerClip: 3,
      clipImageModelId: "seedream-5.0-pro",
      storyboardModelId: "seedream-5.0-flash",
      assetModelId: "seedream-5.0-pro",
      creditBalance: 0,
    }),
});

export type VideoModelsFile = z.infer<typeof videoModelsFileSchema>;
export type VideoModel = VideoModelsFile["models"][number];
export type ImageModelsFile = z.infer<typeof imageModelsFileSchema>;
export type ImageModel = ImageModelsFile["models"][number];
export type PackagesFile = z.infer<typeof packagesFileSchema>;
export type Package = PackagesFile["packages"][number];
export type QualityFile = z.infer<typeof qualityFileSchema>;
export type SettingsFile = z.infer<typeof settingsFileSchema>;

/** Alle Preisdateien nach erfolgreicher Prüfung. */
export type PriceData = {
  videoModels: VideoModelsFile;
  imageModels: ImageModelsFile;
  packages: PackagesFile;
  quality: QualityFile;
  settings: SettingsFile;
};
