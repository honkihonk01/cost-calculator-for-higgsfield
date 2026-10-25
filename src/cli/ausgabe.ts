import { type AppError, describeError } from "../schema/index.ts";

// Exitcodes (docs/ARCHITECTURE.md): 0 Erfolg · 1 ungültige Eingabe · 2 ungültige Daten · 3 sonstiger Fehler.
export const EXIT_INVALID_INPUT = 1;
export const EXIT_INVALID_DATA = 2;
export const EXIT_OTHER = 3;

export function failData(dataDir: string, errors: AppError[]): void {
  const list = errors.map((error) => `  - ${describeError(error)}`).join("\n");
  process.stderr.write(`Die Daten in ${dataDir} sind ungültig (${errors.length} Fehler):\n${list}\n`);
  process.exitCode = EXIT_INVALID_DATA;
}

/** Eingabefehler mit der Option, die der Nutzer ändern muss, statt des englischen Feldnamens. */
export function failInput(errors: AppError[], fieldToOption: (field: string | undefined) => string | undefined): void {
  const list = errors.map((error) => {
    const option = fieldToOption(error.field);
    return `  - ${option ? `${option}: ` : ""}${error.message}`;
  });
  process.stderr.write(`Ungültige Eingabe:\n${list.join("\n")}\n`);
  process.exitCode = EXIT_INVALID_INPUT;
}
