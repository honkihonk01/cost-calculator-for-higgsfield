import { z } from "zod";
import { numberField, resolutionSchema, textField } from "./preis.ts";

// Eingaben für den offenen Umfang (SPEC F1): genau eines von Dauer und Clipanzahl, dazu Aufschlag und Cliplänge.
// Weitere Eingaben (Modell, Versuche, Credit-Stand …) kommen in den folgenden Schritten dazu.

export const scopeFields = {
  durationSeconds: numberField("Offene Dauer")
    .gt(0, { error: "Die offene Dauer muss länger als 0:00 sein." })
    .optional(),
  clipCount: numberField("Offene Clips")
    .int({ error: "Gib die offenen Clips als ganze Zahl an." })
    .min(1, { error: "Gib mindestens 1 offenen Clip an." })
    .max(1000, { error: "Mehr als 1.000 offene Clips sind nicht vorgesehen." })
    .optional(),
  clipLengthSeconds: numberField("Cliplänge")
    .min(1, { error: "Die Cliplänge muss mindestens 1 s betragen." })
    .max(20, { error: "Die Cliplänge darf höchstens 20 s betragen." })
    .optional(),
  extraScenesPercent: numberField("Aufschlag")
    .min(20, { error: "Der Aufschlag beträgt mindestens 20 %." })
    .max(50, { error: "Der Aufschlag beträgt höchstens 50 %." })
    .multipleOf(5, { error: "Den Aufschlag in 5er-Schritten angeben (20, 25, 30 … 50 %)." }),
};

/** Genau eines von Dauer und Clipanzahl (AC-F1-6). Wird an jedes Schema gehängt, das `scopeFields` enthält. */
export function checkScope(value: { durationSeconds?: number; clipCount?: number }, context: z.RefinementCtx): void {
  const hasDuration = value.durationSeconds !== undefined;
  const hasClips = value.clipCount !== undefined;
  if (!hasDuration && !hasClips) {
    context.addIssue({
      code: "custom",
      path: ["durationSeconds"],
      message: "Gib an, was noch offen ist: die Dauer (MM:SS) oder die Zahl der Clips.",
    });
  } else if (hasDuration && hasClips) {
    context.addIssue({
      code: "custom",
      path: ["durationSeconds"],
      message: "Gib entweder die offene Dauer oder die offenen Clips an, nicht beides.",
    });
  }
}

export const scopeInputsSchema = z.strictObject(scopeFields).superRefine(checkScope);
export type ScopeInputs = z.infer<typeof scopeInputsSchema>;

export const discountSchema = z.strictObject({
  enabled: z.boolean({ error: "Rabatt an oder aus (enabled) muss true oder false sein." }),
  percent: numberField("Rabatt in Prozent")
    .gt(0, { error: "Der Rabatt muss größer als 0 % sein." })
    .max(100, { error: "Der Rabatt darf höchstens 100 % sein." }),
  modelIds: z.array(textField("Videomodell im Rabatt")),
  resolutions: z.array(resolutionSchema),
});
export type Discount = z.infer<typeof discountSchema>;

/** Einmalig erzeugte Assets (Figuren, Orte, Gegenstände); Zahl der Assets = Personen × Faktor + Orte × Faktor. */
export const oneTimeAssetsSchema = z.strictObject({
  modelId: textField("Bildmodell für die einmaligen Assets (oneTimeAssets.modelId)"),
  people: numberField("Personen im Film")
    .int({ error: "Gib die Personen als ganze Zahl an." })
    .min(0, { error: "Die Zahl der Personen darf nicht negativ sein." })
    .max(100, { error: "Mehr als 100 Personen sind nicht vorgesehen." })
    .optional(),
  locations: numberField("Orte im Film")
    .int({ error: "Gib die Orte als ganze Zahl an." })
    .min(0, { error: "Die Zahl der Orte darf nicht negativ sein." })
    .max(100, { error: "Mehr als 100 Orte sind nicht vorgesehen." })
    .optional(),
  attemptsPerAsset: numberField("Anläufe pro Asset")
    .min(1, { error: "Gib mindestens 1 Anlauf pro Asset an." })
    .max(50, { error: "Mehr als 50 Anläufe pro Asset sind nicht vorgesehen." })
    .optional(),
});
export type OneTimeAssets = z.infer<typeof oneTimeAssetsSchema>;

/** Eingaben für den Credit-Bedarf (SPEC F2). Ob Modell und Auflösung zusammenpassen, prüft der Rechenkern gegen die Preisdaten. */
export const productionFields = {
  modelId: textField("Videomodell (modelId)"),
  resolution: resolutionSchema,
  attemptsPerClip: numberField("Versuche pro Clip")
    .int({ error: "Gib die Versuche pro Clip als ganze Zahl an." })
    .min(1, { error: "Gib mindestens 1 Versuch an." })
    .max(20, { error: "Mehr als 20 Versuche pro Clip sind nicht vorgesehen." }),
  /** Nur angegeben, wenn das Storyboard mitgerechnet wird; fehlt es, ist das Storyboard aus. */
  storyboardModelId: textField("Bildmodell für das Storyboard (storyboardModelId)").optional(),
  clipImageModelId: textField("Bildmodell für Lichtbilder und Referenzbilder je Clip (clipImageModelId)"),
  clipImagesPerClip: numberField("Bilder je Clip")
    .min(0, { error: "Die Bilder je Clip dürfen nicht negativ sein." })
    .max(20, { error: "Mehr als 20 Bilder je Clip sind nicht vorgesehen." })
    .optional(),
  /** Nur angegeben, wenn die einmaligen Assets mitgerechnet werden; fehlt der Block, sind sie aus. */
  oneTimeAssets: oneTimeAssetsSchema.optional(),
  discount: discountSchema.optional(),
  audioSurchargePercent: z
    .union([z.literal(0), z.literal(50), z.literal(100)], {
      error: "Der Audio-Aufschlag beträgt 0, 50 oder 100 %.",
    })
    .optional(),
};

export type DurationParse = { ok: true; seconds: number } | { ok: false; message: string };

/** Liest „3:00“, „3“ (Minuten) und „180s“ (docs/UI-RULES.md §8). Sekunden nach dem Doppelpunkt nur 00 bis 59. */
export function parseDuration(text: string): DurationParse {
  const value = text.trim();
  const hint = "Gib die Dauer als M:SS ein, zum Beispiel 3:00, oder als 180s.";
  let seconds: number;
  const clock = /^(\d+):(\d{2})$/.exec(value);
  const plainSeconds = /^(\d+)\s*s$/i.exec(value);
  if (clock) {
    const secondsPart = Number(clock[2]);
    if (secondsPart > 59) {
      return { ok: false, message: `„${value}“ ist keine gültige Dauer: Die Sekunden gehen nur bis 59. ${hint}` };
    }
    seconds = Number(clock[1]) * 60 + secondsPart;
  } else if (plainSeconds) {
    seconds = Number(plainSeconds[1]);
  } else if (/^\d+$/.test(value)) {
    seconds = Number(value) * 60;
  } else {
    return { ok: false, message: value === "" ? `Die Dauer fehlt. ${hint}` : `„${value}“ ist keine Dauer. ${hint}` };
  }
  return seconds > 0 ? { ok: true, seconds } : { ok: false, message: "Die offene Dauer muss länger als 0:00 sein." };
}

const priceLevelInput = z.enum(["regular", "discounted"], {
  error: "Preisstand muss „regular“ (regulär) oder „discounted“ (mit Rabatt) sein.",
});

/** Beschreibungen für Agenten; erscheinen im Eingabeschema des MCP-Werkzeugs `kosten_berechnen`. */
const DESCRIPTIONS = {
  durationSeconds:
    "Noch offene Filmdauer in Sekunden (180 = 3:00). Genau eines von durationSeconds und clipCount angeben.",
  clipCount: "Noch offene Clips, ganze Zahl 1 bis 1.000. Genau eines von durationSeconds und clipCount angeben.",
  clipLengthSeconds:
    "Durchschnittliche Cliplänge in Sekunden, 1 bis 20. Fehlt der Wert, gilt einstellungen.json (7,5).",
  extraScenesPercent:
    "Pflicht: Aufschlag für Zwischenszenen, Inserts und Korrekturclips in Prozent, 20 bis 50 in 5er-Schritten; gilt für Dauer und Clips.",
  modelId: "Pflicht: Videomodell, Kennung aus preise_lesen (videoModels), zum Beispiel seedance-2.5-draft.",
  resolution: "Pflicht: Zielauflösung 480p, 720p, 1080p oder 4K; beim Draft-Modell immer 1080p.",
  attemptsPerClip: "Pflicht: durchschnittliche Versuche pro Clip, ganze Zahl 1 bis 20.",
  storyboardModelId:
    "Nur angeben, wenn das Storyboard mitgerechnet werden soll (2 Bilder je Clip): Bildmodell mit storyboard: true, zum Beispiel seedream-5.0-flash. Fehlt der Wert, ist das Storyboard aus.",
  clipImageModelId:
    "Pflicht: Bildmodell für die Lichtbilder und Referenzbilder, die für jeden Clip neu entstehen, Kennung aus preise_lesen (imageModels), zum Beispiel seedream-5.0-pro.",
  clipImagesPerClip:
    "Bilder je Clip einschließlich Fehlversuchen, 0 bis 20; fehlt der Wert, gilt einstellungen.json (3,5, gemessen an einem Testfilm des Autors).",
  oneTimeAssets:
    "Nur angeben, wenn die einmalig erzeugten Assets (Figuren, Orte, Gegenstände am Projektanfang) mitgerechnet werden sollen. modelId ist Pflicht; people und locations (Personen und Orte im Film) sowie attemptsPerAsset fehlen = einstellungen.json (5 Personen, 3 Orte, 8 Anläufe). Assets = Personen × 3 + Orte × 9.",
  discount: "Rabatt auf Generierungspreise; fehlt er, gilt einstellungen.json (aus).",
  audioSurchargePercent: "Audio-Aufschlag für Seedance 2.0 in Prozent: 0, 50 oder 100.",
  creditBalance: "Pflicht: aktueller Credit-Stand im Higgsfield-Konto, ganze Zahl ab 0.",
  packagePriceLevel:
    "Preisstand der Credit-Pakete: discounted (aktueller Rabattpreis bei Higgsfield, Standard) oder regular (durchgestrichener Normalpreis).",
  manualExchangeRate:
    "Wechselkurs von Hand in Dollar je 1 Euro, zum Beispiel 1.08; ohne Angabe gilt der Referenzkurs der EZB.",
} as const;

/** Alle Eingaben (docs/ARCHITECTURE.md, „Eingaben“). Fehlende optionale Werte füllt der Rechenkern aus `einstellungen.json`. */
export const inputsSchema = z
  .strictObject({
    durationSeconds: scopeFields.durationSeconds.describe(DESCRIPTIONS.durationSeconds),
    clipCount: scopeFields.clipCount.describe(DESCRIPTIONS.clipCount),
    clipLengthSeconds: scopeFields.clipLengthSeconds.describe(DESCRIPTIONS.clipLengthSeconds),
    extraScenesPercent: scopeFields.extraScenesPercent.describe(DESCRIPTIONS.extraScenesPercent),
    modelId: productionFields.modelId.describe(DESCRIPTIONS.modelId),
    resolution: productionFields.resolution.describe(DESCRIPTIONS.resolution),
    attemptsPerClip: productionFields.attemptsPerClip.describe(DESCRIPTIONS.attemptsPerClip),
    storyboardModelId: productionFields.storyboardModelId.describe(DESCRIPTIONS.storyboardModelId),
    clipImageModelId: productionFields.clipImageModelId.describe(DESCRIPTIONS.clipImageModelId),
    clipImagesPerClip: productionFields.clipImagesPerClip.describe(DESCRIPTIONS.clipImagesPerClip),
    oneTimeAssets: productionFields.oneTimeAssets.describe(DESCRIPTIONS.oneTimeAssets),
    discount: productionFields.discount.describe(DESCRIPTIONS.discount),
    audioSurchargePercent: productionFields.audioSurchargePercent.describe(DESCRIPTIONS.audioSurchargePercent),
    creditBalance: numberField("Credit-Stand")
      .int({ error: "Gib den Credit-Stand als ganze Zahl an." })
      .min(0, { error: "Der Credit-Stand darf nicht negativ sein." })
      .describe(DESCRIPTIONS.creditBalance),
    packagePriceLevel: priceLevelInput.optional().describe(DESCRIPTIONS.packagePriceLevel),
    manualExchangeRate: numberField("Wechselkurs")
      .gt(0, { error: "Der Wechselkurs muss größer als 0 sein (Dollar je 1 Euro, zum Beispiel 1.08)." })
      .optional()
      .describe(DESCRIPTIONS.manualExchangeRate),
  })
  .superRefine(checkScope);

export type Inputs = z.infer<typeof inputsSchema>;
