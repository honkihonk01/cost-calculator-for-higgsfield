import {
  type AppError,
  describeError,
  type Inputs,
  issuesToErrors,
  type Outcome,
  type Project,
  projectSchema,
  projectSlug,
  type Result,
} from "../../schema/index.ts";

// SPEC F9 ohne Datei- und Netzzugriff: Liste, Lesen und Speichern von Projekten. Node (Kommandozeile, MCP-Server)
// und Tauri (App) liefern nur das Lesen und Schreiben; so gelten überall dieselben Regeln zum Überschreiben.

export type ProjectIo = {
  /** Dateinamen im Projektordner; `null`, wenn es den Ordner nicht gibt. Andere Lesefehler werfen. */
  listFiles(): Promise<string[] | null>;
  /** Inhalt einer Datei relativ zum Datenordner; `null`, wenn es sie nicht gibt. Andere Lesefehler werfen. */
  readText(file: string): Promise<string | null>;
  dataDirExists(): Promise<boolean>;
  /** legt den Projektordner bei Bedarf an und schreibt atomar */
  writeAtomic(file: string, text: string): Promise<void>;
  /** wie der Datenordner in Meldungen heißt */
  dataDirLabel: string;
};

export type ProjectSummary = {
  name: string;
  file: string;
  updatedAt: string;
  pricesAsOf: string;
  /** Satz der Gesamtempfehlung zum Zeitpunkt des Speicherns */
  overall: string;
};

export type ProjectToSave = { name: string; inputs: Inputs; result: Result; pricesAsOf: string };

export const PROJECT_FOLDER = "projekte";

/** Alle Projekte, neueste zuerst. Eine beschädigte Datei ergibt eine Meldung; die anderen bleiben nutzbar (AC-F9-4). */
export async function listProjectsWith(io: ProjectIo): Promise<{ projects: ProjectSummary[]; errors: AppError[] }> {
  let files: string[] | null;
  try {
    files = await io.listFiles();
  } catch (error) {
    return {
      projects: [],
      errors: [
        {
          code: "read-failed",
          file: PROJECT_FOLDER,
          message: `Der Projektordner ließ sich nicht lesen: ${String(error)}`,
        },
      ],
    };
  }
  const projects: ProjectSummary[] = [];
  const errors: AppError[] = [];
  for (const name of (files ?? []).filter((file) => file.endsWith(".json")).sort()) {
    const file = `${PROJECT_FOLDER}/${name}`;
    const loaded = await readProjectFile(io, file);
    if (loaded.ok) {
      const { value } = loaded;
      projects.push({
        name: value.name,
        file,
        updatedAt: value.updatedAt,
        pricesAsOf: value.snapshot.pricesAsOf,
        overall: value.snapshot.result.recommendations.overall.sentence,
      });
    } else {
      const first = loaded.errors[0];
      errors.push({
        code: "invalid-project",
        file,
        message:
          `Die Projektdatei ist beschädigt und wird übersprungen. ${first ? describeError({ ...first, file: undefined }) : ""}`.trim(),
      });
    }
  }
  projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return { projects, errors };
}

/** `missingHint` sagt, wo die Liste aller Projekte zu finden ist (Kommandozeile oder App). */
export async function readProjectWith(io: ProjectIo, name: string, missingHint: string): Promise<Outcome<Project>> {
  const slug = projectSlug(name);
  if (slug === "") return invalidName(name);
  const loaded = await readProjectFile(io, `${PROJECT_FOLDER}/${slug}.json`);
  if (!loaded.ok && loaded.errors[0]?.code === "project-missing") {
    return fail("project-missing", `Ein Projekt „${name}“ gibt es nicht. ${missingHint}`);
  }
  return loaded;
}

/** Speichert atomar. Existiert der Name schon, nur mit `overwrite` (AC-F9-3); dann bleibt `createdAt` erhalten. */
export async function saveProjectWith(
  io: ProjectIo,
  entry: ProjectToSave,
  options: { overwrite: boolean; now: string },
): Promise<Outcome<Project>> {
  const slug = projectSlug(entry.name);
  if (slug === "") return invalidName(entry.name);
  if (!(await io.dataDirExists().catch(() => false))) {
    return fail(
      "data-dir-missing",
      `Den Datenordner ${io.dataDirLabel} gibt es nicht. Lege ihn mit \`hfcalc einrichten\` an.`,
    );
  }
  const file = `${PROJECT_FOLDER}/${slug}.json`;
  const existing = await readProjectFile(io, file);
  const exists = existing.ok || existing.errors[0]?.code !== "project-missing";
  if (exists && !options.overwrite) {
    const known = existing.ok ? `„${existing.value.name}“` : "mit diesem Namen";
    return fail(
      "project-exists",
      `Ein Projekt ${known} gibt es schon (${file}). Es wurde nichts überschrieben. Zum Überschreiben ausdrücklich bestätigen (Kommandozeile: --ueberschreiben).`,
    );
  }
  const project: Project = {
    name: entry.name.trim(),
    createdAt: existing.ok ? existing.value.createdAt : options.now,
    updatedAt: options.now,
    inputs: entry.inputs,
    snapshot: { result: entry.result, pricesAsOf: entry.pricesAsOf, savedAt: options.now },
  };
  const checked = projectSchema.safeParse(project);
  if (!checked.success) return { ok: false, errors: issuesToErrors(checked.error, file) };
  try {
    await io.writeAtomic(file, `${JSON.stringify(checked.data, null, 2)}\n`);
  } catch (error) {
    return fail("write-failed", `Das Projekt ließ sich nicht speichern: ${String(error)}`, file);
  }
  return { ok: true, value: checked.data };
}

async function readProjectFile(io: ProjectIo, file: string): Promise<Outcome<Project>> {
  let text: string | null;
  try {
    text = await io.readText(file);
  } catch (error) {
    return fail("read-failed", `Die Projektdatei ließ sich nicht lesen: ${String(error)}`, file);
  }
  if (text === null) return fail("project-missing", "Die Projektdatei gibt es nicht.", file);
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail("invalid-json", "Die Datei ist kein gültiges JSON.", file);
  }
  const parsed = projectSchema.safeParse(json);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, errors: issuesToErrors(parsed.error, file) };
}

function invalidName(name: string): { ok: false; errors: AppError[] } {
  return fail("invalid-name", `„${name}“ taugt nicht als Projektname. Verwende Buchstaben oder Ziffern.`);
}

function fail(code: string, message: string, file?: string): { ok: false; errors: AppError[] } {
  return { ok: false, errors: [{ code, message, ...(file === undefined ? {} : { file }) }] };
}
