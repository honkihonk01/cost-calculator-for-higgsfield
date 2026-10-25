#!/usr/bin/env node
import { Command, CommanderError } from "commander";
import { findDataDir, loadPrices } from "../laden/node/index.ts";
import { EXIT_INVALID_INPUT, EXIT_OTHER, failData } from "./ausgabe.ts";
import { registerSetup } from "./einrichten.ts";
import { pricesText } from "./preise.ts";
import { registerProjects } from "./projekte.ts";
import { registerCalculate } from "./rechnen.ts";

// Startpunkt von `hfcalc`. Die Daten werden vorab geladen, damit die Hilfe Modelle und Standardwerte nennen kann.

const TITLES: Record<string, string> = {
  "Usage:": "Aufruf:",
  "Options:": "Optionen:",
  "Commands:": "Befehle:",
  "Arguments:": "Argumente:",
  "Global Options:": "Allgemeine Optionen:",
};

const COMMANDER_ERRORS: Record<string, string> = {
  "commander.unknownOption": "Unbekannte Option",
  "commander.unknownCommand": "Unbekannter Befehl",
  "commander.optionMissingArgument": "Bei einer Option fehlt der Wert",
  "commander.missingArgument": "Es fehlt eine Angabe",
  "commander.excessArguments": "Zu viele Angaben",
  "commander.invalidArgument": "Ungültige Angabe",
};

const loaded = await loadPrices(findDataDir());

const program = new Command()
  .name("hfcalc")
  .description("Higgsfield-Kostenkalkulator: Kosten eines KI-Films in Credits und Euro für den noch offenen Umfang.")
  .helpOption("-h, --help", "Hilfe anzeigen")
  .helpCommand(false)
  .configureHelp({ styleTitle: (title) => TITLES[title] ?? title })
  .configureOutput({ outputError: () => {} })
  .exitOverride();

program
  .command("preise")
  .description("Listet alle Preise mit Wert, Währung, Stand-Datum und Quelle.")
  .option("--json", "Ausgabe als JSON für Agenten (alle Preisdateien)")
  .action((options: { json?: boolean }) => {
    if (!loaded.ok) return failData(loaded.dataDir, loaded.errors);
    process.stdout.write(
      options.json
        ? `${JSON.stringify({ dataDir: loaded.dataDir, ...loaded.data }, null, 2)}\n`
        : pricesText(loaded.data, loaded.dataDir),
    );
  });

program
  .command("daten")
  .description("Datenordner prüfen.")
  .command("pruefen")
  .description("Prüft alle Dateien im Datenordner. Exitcode 0 = gültig, 2 = ungültig.")
  .action(() => {
    if (!loaded.ok) return failData(loaded.dataDir, loaded.errors);
    process.stdout.write(`Die Daten in ${loaded.dataDir} sind gültig.\n`);
  });

const calculateCommand = registerCalculate(program, loaded);
registerProjects(program, loaded);
registerSetup(program);
// AC-F11-4: Schon `hfcalc --help` zeigt alle Parameter von `rechnen` mit erlaubten Werten und Standardwerten.
program.addHelpText("after", () => `\nhfcalc rechnen\n${calculateCommand.helpInformation()}`);
for (const command of [program, ...program.commands, ...program.commands.flatMap((entry) => entry.commands)]) {
  command
    .usage(command.commands.length > 0 ? "[optionen] [befehl]" : "[optionen]")
    .helpOption("-h, --help", "Hilfe anzeigen")
    .configureHelp({ styleTitle: (title) => TITLES[title] ?? title })
    .configureOutput({ outputError: () => {} })
    .exitOverride();
}

try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof CommanderError) {
    if (error.code !== "commander.helpDisplayed" && error.code !== "commander.help") {
      const detail = error.message.replace(/^error: /, "");
      process.stderr.write(`${COMMANDER_ERRORS[error.code] ?? "Fehler"}: ${detail}. Hilfe: hfcalc --help\n`);
      process.exitCode = EXIT_INVALID_INPUT;
    }
  } else {
    process.stderr.write(`Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = EXIT_OTHER;
  }
}
