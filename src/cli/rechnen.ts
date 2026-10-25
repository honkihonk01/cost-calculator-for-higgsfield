import type { Command } from "commander";
import { validateInputs } from "../kern/index.ts";
import { calculateWithRate, type LoadedPrices } from "../laden/node/index.ts";
import { type AppError, type Inputs, parseDuration, RESOLUTIONS, type Result } from "../schema/index.ts";
import { EXIT_INVALID_INPUT, failData, failInput } from "./ausgabe.ts";
import { formatNumber } from "./format.ts";
import { resultText } from "./rechnen-text.ts";

// `hfcalc rechnen` (SPEC F11): jede Eingabe als Option, Ausgabe als Text oder JSON.

export type CalculateOptions = Partial<Record<OptionKey, string>> & { json?: boolean };
type Options = CalculateOptions;
type OptionKey = (typeof OPTIONS)[number]["key"];

/** Optionen mit Feld im Rechenkern; `required` = Pflichtangabe (die Dauer prüft der Kern: Dauer oder Clips). */
const OPTIONS = [
  { key: "dauer", flag: "--dauer <M:SS>", field: "durationSeconds", required: false },
  { key: "clips", flag: "--clips <anzahl>", field: "clipCount", required: false },
  { key: "aufschlag", flag: "--aufschlag <prozent>", field: "extraScenesPercent", required: true },
  { key: "modell", flag: "--modell <id>", field: "modelId", required: true },
  { key: "aufloesung", flag: "--aufloesung <auflösung>", field: "resolution", required: true },
  { key: "versuche", flag: "--versuche <anzahl>", field: "attemptsPerClip", required: true },
  { key: "bildmodell", flag: "--bildmodell <id>", field: "clipImageModelId", required: true },
  { key: "credits", flag: "--credits <anzahl>", field: "creditBalance", required: true },
  { key: "storyboard", flag: "--storyboard <id>", field: "storyboardModelId", required: false },
  { key: "assets", flag: "--assets <id>", field: "oneTimeAssets.modelId", required: false },
  { key: "personen", flag: "--personen <anzahl>", field: "oneTimeAssets.people", required: false },
  { key: "orte", flag: "--orte <anzahl>", field: "oneTimeAssets.locations", required: false },
  { key: "anlaeufe", flag: "--anlaeufe <anzahl>", field: "oneTimeAssets.attemptsPerAsset", required: false },
  { key: "bilderJeClip", flag: "--bilder-je-clip <anzahl>", field: "clipImagesPerClip", required: false },
  { key: "cliplaenge", flag: "--cliplaenge <sekunden>", field: "clipLengthSeconds", required: false },
  { key: "rabatt", flag: "--rabatt <prozent>", field: "discount", required: false },
  { key: "rabattModelle", flag: "--rabatt-modelle <ids>", field: "discount.modelIds", required: false },
  { key: "rabattAufloesungen", flag: "--rabatt-aufloesungen <liste>", field: "discount.resolutions", required: false },
  { key: "paketpreise", flag: "--paketpreise <stand>", field: "packagePriceLevel", required: false },
  { key: "audio", flag: "--audio <prozent>", field: "audioSurchargePercent", required: false },
  { key: "kurs", flag: "--kurs <dollar-je-euro>", field: "manualExchangeRate", required: false },
] as const;

export function registerCalculate(program: Command, loaded: LoadedPrices): Command {
  const command = program
    .command("rechnen")
    .description(
      "Rechnet die Kosten für den offenen Umfang: Pflicht sind --dauer oder --clips, dazu --aufschlag, --modell, --aufloesung, --versuche, --bildmodell und --credits. Storyboard (--storyboard) und einmalige Assets (--assets) sind aus, bis du sie angibst.",
    );
  addCalculateOptions(command, loaded);
  command.option("--json", "Ergebnis als JSON für Agenten (englische Feldnamen, deutsche Texte)");
  command.action(async (options: Options) => {
    if (!loaded.ok) return failData(loaded.dataDir, loaded.errors);
    const calculated = await calculateFromOptions(options, loaded, "hfcalc rechnen --help");
    if (!calculated) return;
    process.stdout.write(
      options.json ? `${JSON.stringify(calculated.result, null, 2)}\n` : resultText(calculated.result),
    );
  });
  return command;
}

/** Alle Eingabe-Optionen von `rechnen`; `projekt speichern` nutzt dieselben. */
export function addCalculateOptions(command: Command, loaded: LoadedPrices): Command {
  const descriptions = describeOptions(loaded);
  for (const option of OPTIONS) command.option(option.flag, descriptions[option.key]);
  return command;
}

/** Prüft die Optionen, holt den Kurs und rechnet; meldet Fehler selbst und liefert dann `null`. */
export async function calculateFromOptions(
  options: Options,
  loaded: Extract<LoadedPrices, { ok: true }>,
  helpHint: string,
): Promise<{ inputs: Inputs; result: Result } | null> {
  const missing = OPTIONS.filter((option) => option.required && options[option.key] === undefined);
  if (missing.length > 0) {
    process.stderr.write(
      `Es fehlen Pflichtangaben: ${missing.map((option) => option.flag.split(" ")[0]).join(", ")}. Alle Optionen: ${helpHint}\n`,
    );
    process.exitCode = EXIT_INVALID_INPUT;
    return null;
  }
  const built = buildInputs(options, loaded.data.settings);
  if (!built.ok) return reject(built.errors);
  const checked = validateInputs(built.value);
  if (!checked.ok) return reject(checked.errors);

  const { outcome, cacheError } = await calculateWithRate(checked.value, loaded.data, loaded.dataDir);
  if (cacheError) process.stderr.write(`Hinweis: ${cacheError}\n`);
  if (!outcome.ok) return reject(outcome.errors);
  return { inputs: checked.value, result: outcome.value };
}

function reject(errors: AppError[]): null {
  failInput(errors, fieldToFlag);
  return null;
}

type Settings = Extract<LoadedPrices, { ok: true }>["data"]["settings"];

function buildInputs(
  options: Options,
  settings: Settings,
): { ok: true; value: Record<string, unknown> } | { ok: false; errors: AppError[] } {
  const raw: Record<string, unknown> = {};
  if (options.dauer !== undefined) {
    const duration = parseDuration(options.dauer);
    if (!duration.ok)
      return { ok: false, errors: [{ code: "invalid-value", field: "durationSeconds", message: duration.message }] };
    raw.durationSeconds = duration.seconds;
  }
  const numbers = {
    clips: "clipCount",
    aufschlag: "extraScenesPercent",
    versuche: "attemptsPerClip",
    credits: "creditBalance",
    cliplaenge: "clipLengthSeconds",
    audio: "audioSurchargePercent",
    kurs: "manualExchangeRate",
    bilderJeClip: "clipImagesPerClip",
  } as const;
  for (const [key, field] of Object.entries(numbers) as [keyof typeof numbers, string][]) {
    if (options[key] !== undefined) raw[field] = toNumber(options[key]);
  }
  if (options.modell !== undefined) raw.modelId = options.modell.trim();
  if (options.storyboard !== undefined) raw.storyboardModelId = options.storyboard.trim();
  if (options.bildmodell !== undefined) raw.clipImageModelId = options.bildmodell.trim();
  if ([options.assets, options.personen, options.orte, options.anlaeufe].some((value) => value !== undefined)) {
    const assets: Record<string, unknown> = {};
    if (options.assets !== undefined) assets.modelId = options.assets.trim();
    if (options.personen !== undefined) assets.people = toNumber(options.personen);
    if (options.orte !== undefined) assets.locations = toNumber(options.orte);
    if (options.anlaeufe !== undefined) assets.attemptsPerAsset = toNumber(options.anlaeufe);
    raw.oneTimeAssets = assets;
  }
  if (options.aufloesung !== undefined) raw.resolution = toResolution(options.aufloesung);
  if (options.paketpreise !== undefined) raw.packagePriceLevel = toPriceLevel(options.paketpreise);
  if (options.rabatt !== undefined || options.rabattModelle !== undefined || options.rabattAufloesungen !== undefined) {
    raw.discount = {
      enabled: options.rabatt !== undefined ? true : settings.discountEnabled,
      percent: options.rabatt !== undefined ? toNumber(options.rabatt) : settings.discountPercent,
      modelIds: options.rabattModelle !== undefined ? toList(options.rabattModelle) : settings.discountScope.modelIds,
      resolutions:
        options.rabattAufloesungen !== undefined
          ? toList(options.rabattAufloesungen).map(toResolution)
          : settings.discountScope.resolutions,
    };
  }
  return { ok: true, value: raw };
}

function describeOptions(loaded: LoadedPrices): Record<OptionKey, string> {
  const data = loaded.ok ? loaded.data : null;
  const settings = data?.settings;
  const standard = (value: string | undefined) =>
    value === undefined ? "Standard aus einstellungen.json" : `Standard: ${value}`;
  const models = data ? data.videoModels.models.map((model) => model.id).join(", ") : "siehe hfcalc preise";
  const imageIds = (storyboardOnly: boolean) =>
    data
      ? data.imageModels.models
          .filter((model) => !storyboardOnly || model.storyboard)
          .map((model) => model.id)
          .join(", ")
      : "siehe hfcalc preise";
  const level = (value: string | undefined) =>
    value === undefined ? undefined : value === "regular" ? "regulaer" : "rabatt";
  return {
    dauer: "noch offene Dauer als M:SS, „3“ (Minuten) oder „180s“; Pflicht, wenn --clips fehlt",
    clips: "noch offene Clips, ganze Zahl 1 bis 1.000; statt --dauer",
    aufschlag:
      "Pflicht: Aufschlag für Zwischenszenen, Inserts und Korrekturclips in Prozent, 20 bis 50 in 5er-Schritten",
    modell: `Pflicht: Videomodell. Erlaubt: ${models}`,
    aufloesung: `Pflicht: Zielauflösung. Erlaubt: ${RESOLUTIONS.join(", ")}; beim Draft-Modell immer 1080p`,
    versuche: "Pflicht: Versuche pro Clip, ganze Zahl 1 bis 20",
    bildmodell: `Pflicht: Bildmodell für die Lichtbilder und Referenzbilder je Clip. Erlaubt: ${imageIds(false)}`,
    credits: "Pflicht: aktueller Credit-Stand, ganze Zahl ab 0",
    storyboard: `schaltet das Storyboard ein (${data?.imageModels.imagesPerClip ?? 2} Bilder je Clip) mit diesem Bildmodell. Erlaubt: ${imageIds(true)}. Standard: aus`,
    assets: `schaltet die einmalig erzeugten Assets (Figuren, Orte, Gegenstände) ein, mit diesem Bildmodell. Erlaubt: ${imageIds(false)}. Standard: aus`,
    personen: `Personen im Film, für die einmaligen Assets (je Person ${settings ? formatNumber(settings.assetsPerPerson) : "3"} Assets). ${standard(settings && formatNumber(settings.assetPeople))}`,
    orte: `Orte im Film, für die einmaligen Assets (je Ort ${settings ? formatNumber(settings.assetsPerLocation) : "9"} Assets). ${standard(settings && formatNumber(settings.assetLocations))}`,
    anlaeufe: `Anläufe pro einmaligem Asset, 1 bis 50. ${standard(settings && formatNumber(settings.attemptsPerAsset))}`,
    bilderJeClip: `Lichtbilder und Referenzbilder je Clip einschließlich Fehlversuchen, 0 bis 20. ${standard(settings && formatNumber(settings.clipImagesPerClip))}`,
    cliplaenge: `durchschnittliche Cliplänge in Sekunden, 1 bis 20. ${standard(settings && `${formatNumber(settings.clipLengthSeconds)} s`)}`,
    rabatt: `schaltet den Rabatt auf Generierungspreise ein, mit Prozentwert (0 bis 100). ${standard(settings && (settings.discountEnabled ? `an, ${formatNumber(settings.discountPercent)} %` : `aus; Prozent ${formatNumber(settings.discountPercent)}`))}`,
    rabattModelle: `Videomodelle im Rabatt, durch Komma getrennt. ${standard(settings?.discountScope.modelIds.join(","))}`,
    rabattAufloesungen: `Auflösungen im Rabatt, durch Komma getrennt (${RESOLUTIONS.join(", ")}). ${standard(settings?.discountScope.resolutions.join(","))}`,
    paketpreise: `Preisstand der Credit-Pakete: rabatt (aktueller Preis bei Higgsfield) oder regulaer (durchgestrichener Normalpreis). ${standard(level(settings?.packagePriceLevel))}`,
    audio: `Audio-Aufschlag für Seedance 2.0 in Prozent: 0, 50 oder 100. ${standard(settings && String(settings.audioSurchargePercent))}`,
    kurs: "Wechselkurs von Hand in Dollar je 1 Euro, zum Beispiel 1,08; hat Vorrang vor dem Kurs der Zentralbank. Standard: Referenzkurs der EZB",
  };
}

function fieldToFlag(field: string | undefined): string | undefined {
  if (field === undefined) return undefined;
  const option = OPTIONS.find((candidate) => field === candidate.field || field.startsWith(`${candidate.field}.`));
  return option?.flag.split(" ")[0] ?? field;
}

/** Deutsche Schreibweise „7,5“ ist erlaubt; was keine Zahl ist, meldet die Prüfung mit dem Feld. */
function toNumber(text: string): number | string {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() === "" || Number.isNaN(value) ? text : value;
}

function toResolution(text: string): string {
  const trimmed = text.trim();
  return RESOLUTIONS.find((resolution) => resolution.toLowerCase() === trimmed.toLowerCase()) ?? trimmed;
}

function toPriceLevel(text: string): string {
  const value = text.trim().toLowerCase();
  if (value === "regulaer" || value === "regulär" || value === "regular") return "regular";
  if (value === "rabatt" || value === "discounted") return "discounted";
  return text;
}

function toList(text: string): string[] {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}
