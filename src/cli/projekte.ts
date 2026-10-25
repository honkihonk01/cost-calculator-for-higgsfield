import type { Command } from "commander";
import { type LoadedPrices, listProjects, readProject, saveProject } from "../laden/node/index.ts";
import { type AppError, describeError, type Inputs, newestPriceDate, type Project } from "../schema/index.ts";
import { EXIT_INVALID_DATA, EXIT_INVALID_INPUT, EXIT_OTHER, failData } from "./ausgabe.ts";
import { formatDate, formatNumber } from "./format.ts";
import { addCalculateOptions, type CalculateOptions, calculateFromOptions } from "./rechnen.ts";
import { resultText } from "./rechnen-text.ts";

// SPEC F9: `hfcalc projekte`, `hfcalc projekt zeigen <name>`, `hfcalc projekt speichern <name>`.

export function registerProjects(program: Command, loaded: LoadedPrices): void {
  program
    .command("projekte")
    .description("Listet alle gespeicherten Projekte, neueste zuerst.")
    .option("--json", "Ausgabe als JSON für Agenten")
    .action(async (options: { json?: boolean }) => {
      const { projects, errors } = await listProjects(loaded.dataDir);
      for (const error of errors) process.stderr.write(`Hinweis: ${describeError(error)}\n`);
      if (options.json) {
        process.stdout.write(`${JSON.stringify({ dataDir: loaded.dataDir, projects, errors }, null, 2)}\n`);
        return;
      }
      if (projects.length === 0) {
        process.stdout.write(
          "Noch keine Projekte. Speichern mit: hfcalc projekt speichern <name> [Optionen wie bei rechnen]\n",
        );
        return;
      }
      const lines = projects.flatMap((project) => [
        `${project.name} · gespeichert ${formatDate(project.updatedAt.slice(0, 10))} · Preise vom ${formatDate(project.pricesAsOf)}`,
        `  ${project.overall}`,
      ]);
      process.stdout.write(`${lines.join("\n")}\n`);
    });

  const group = program.command("projekt").description("Ein Projekt zeigen oder speichern.");

  group
    .command("zeigen")
    .description("Zeigt Eingaben und gespeichertes Ergebnis eines Projekts.")
    .argument("<name>", "Name des Projekts")
    .option("--json", "Ausgabe als JSON für Agenten (Projektdatei unverändert)")
    .action(async (name: string, options: { json?: boolean }) => {
      const project = await readProject(loaded.dataDir, name);
      if (!project.ok) return fail(project.errors);
      process.stdout.write(
        options.json ? `${JSON.stringify(project.value, null, 2)}\n` : projectText(project.value, loaded),
      );
    });

  const save = group
    .command("speichern")
    .description(
      "Rechnet mit denselben Optionen wie `hfcalc rechnen` und speichert Eingaben, Ergebnis und Preisstand unter dem Namen.",
    )
    .argument("<name>", "Name des Projekts");
  addCalculateOptions(save, loaded);
  save
    .option("--ueberschreiben", "ein vorhandenes Projekt gleichen Namens ersetzen (gilt als Bestätigung)")
    .option("--json", "gespeichertes Projekt als JSON ausgeben")
    .action(async (name: string, options: CalculateOptions & { ueberschreiben?: boolean }) => {
      if (!loaded.ok) return failData(loaded.dataDir, loaded.errors);
      const calculated = await calculateFromOptions(options, loaded, "hfcalc projekt speichern --help");
      if (!calculated) return;
      const saved = await saveProject(
        loaded.dataDir,
        { name, inputs: calculated.inputs, result: calculated.result, pricesAsOf: newestPriceDate(loaded.data) },
        { overwrite: options.ueberschreiben === true, now: new Date().toISOString() },
      );
      if (!saved.ok) return fail(saved.errors);
      process.stdout.write(
        options.json
          ? `${JSON.stringify(saved.value, null, 2)}\n`
          : `Gespeichert: „${saved.value.name}“\n  ${saved.value.snapshot.result.recommendations.overall.sentence}\n`,
      );
    });
}

function fail(errors: AppError[]): void {
  for (const error of errors) process.stderr.write(`${describeError(error)}\n`);
  const code = errors[0]?.code;
  process.exitCode =
    code === "data-dir-missing" || code === "invalid-value" || code === "invalid-json"
      ? EXIT_INVALID_DATA
      : code === "write-failed" || code === "read-failed"
        ? EXIT_OTHER
        : EXIT_INVALID_INPUT;
}

function projectText(project: Project, loaded: LoadedPrices): string {
  const header = [
    `PROJEKT „${project.name}“`,
    `  angelegt ${formatDate(project.createdAt.slice(0, 10))}, gespeichert ${formatDate(project.updatedAt.slice(0, 10))}, Preise vom ${formatDate(project.snapshot.pricesAsOf)}`,
    "",
    "EINGABEN",
    ...inputLines(project.inputs).map((line) => `  ${line}`),
    "",
    "GESPEICHERTES ERGEBNIS",
  ];
  const body = loaded.ok
    ? resultText(project.snapshot.result)
    : `${project.snapshot.result.recommendations.overall.sentence}\n`;
  return `${header.join("\n")}\n${body}`;
}

function inputLines(inputs: Inputs): string[] {
  const open =
    inputs.durationSeconds !== undefined
      ? `${Math.floor(inputs.durationSeconds / 60)}:${String(inputs.durationSeconds % 60).padStart(2, "0")} (Dauer)`
      : `${formatNumber(inputs.clipCount ?? 0)} Clips`;
  const lines = [
    `Noch offen: ${open}`,
    `Aufschlag: ${formatNumber(inputs.extraScenesPercent)} %`,
    `Videomodell: ${inputs.modelId}`,
    `Auflösung: ${inputs.resolution}`,
    `Versuche pro Clip: ${formatNumber(inputs.attemptsPerClip)}`,
    `Storyboard: ${inputs.storyboardModelId ?? "aus"}`,
    `Bildmodell für Bilder je Clip: ${inputs.clipImageModelId}`,
    `Einmalige Assets: ${inputs.oneTimeAssets ? assetsLine(inputs.oneTimeAssets) : "aus"}`,
    `Credit-Stand: ${formatNumber(inputs.creditBalance)} Credits`,
  ];
  if (inputs.clipImagesPerClip !== undefined) lines.push(`Bilder je Clip: ${formatNumber(inputs.clipImagesPerClip)}`);
  if (inputs.clipLengthSeconds !== undefined) lines.push(`Cliplänge: ${formatNumber(inputs.clipLengthSeconds)} s`);
  if (inputs.discount !== undefined) {
    lines.push(
      `Rabatt: ${inputs.discount.enabled ? `${formatNumber(inputs.discount.percent)} % auf ${inputs.discount.modelIds.join(", ")} in ${inputs.discount.resolutions.join(", ")}` : "aus"}`,
    );
  }
  if (inputs.packagePriceLevel !== undefined) lines.push(`Preisstand Pakete: ${level(inputs.packagePriceLevel)}`);
  if (inputs.audioSurchargePercent !== undefined) lines.push(`Audio-Aufschlag: ${inputs.audioSurchargePercent} %`);
  if (inputs.manualExchangeRate !== undefined) {
    lines.push(`Wechselkurs manuell: ${formatNumber(inputs.manualExchangeRate)} $ je 1 €`);
  }
  return lines;
}

function assetsLine(assets: NonNullable<Inputs["oneTimeAssets"]>): string {
  const parts = [assets.modelId];
  if (assets.people !== undefined) parts.push(`${formatNumber(assets.people)} Personen`);
  if (assets.locations !== undefined) parts.push(`${formatNumber(assets.locations)} Orte`);
  if (assets.attemptsPerAsset !== undefined) parts.push(`${formatNumber(assets.attemptsPerAsset)} Anläufe pro Asset`);
  return parts.join(", ");
}

function level(value: "regular" | "discounted"): string {
  return value === "regular" ? "regulär" : "mit Rabatt";
}
