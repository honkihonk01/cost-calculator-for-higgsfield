import type { z } from "zod";

/** Fehlerformat zwischen allen Schichten (docs/QUALITY.md, Stufe 1). */
export type AppError = {
  code: string;
  message: string;
  field?: string;
  file?: string;
};

/** Pfad wie `models[0].resolutions.720p.value`, damit der Nutzer die Stelle in der Datei findet. */
export function formatPath(path: ReadonlyArray<PropertyKey>): string {
  let text = "";
  for (const part of path) {
    if (typeof part === "number") {
      text += `[${part}]`;
    } else {
      text += text === "" ? String(part) : `.${String(part)}`;
    }
  }
  return text;
}

export function issuesToErrors(error: z.ZodError, file?: string): AppError[] {
  return error.issues.map((issue) => {
    const field = formatPath(issue.path);
    return {
      code: "invalid-value",
      message: issue.message,
      ...(field === "" ? {} : { field }),
      ...(file === undefined ? {} : { file }),
    };
  });
}

/** Einzeilige Darstellung für Terminal und Fehlerlisten. */
export function describeError(error: AppError): string {
  const place = [error.file, error.field].filter((part) => part !== undefined).join(" · ");
  return place === "" ? error.message : `${place}: ${error.message}`;
}

/** Ergebnis einer Prüfung oder Rechnung: entweder ein Wert oder eine Fehlerliste, nie beides. */
export type Outcome<T> = { ok: true; value: T } | { ok: false; errors: AppError[] };
