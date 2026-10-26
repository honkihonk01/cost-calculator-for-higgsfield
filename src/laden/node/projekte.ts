import { mkdir, readdir, readFile, rename, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AppError, Outcome, Project } from "../../schema/index.ts";
import {
  listProjectsWith,
  PROJECT_FOLDER,
  type ProjectIo,
  type ProjectSummary,
  type ProjectToSave,
  readProjectWith,
  saveProjectWith,
} from "../gemeinsam/index.ts";
import { writeFileAtomic } from "./schreiben.ts";

// SPEC F9 für Kommandozeile und MCP-Server: Regeln in src/laden/gemeinsam, hier nur das Dateisystem von Node.

export type { ProjectSummary, ProjectToSave };

export function listProjects(dataDir: string): Promise<{ projects: ProjectSummary[]; errors: AppError[] }> {
  return listProjectsWith(nodeProjectIo(dataDir));
}

export function readProject(dataDir: string, name: string): Promise<Outcome<Project>> {
  return readProjectWith(nodeProjectIo(dataDir), name, "Alle Projekte zeigt `hfcalc projekte`.");
}

/** Speichert atomar. Existiert der Name schon, nur mit `overwrite` (AC-F9-3); dann bleibt `createdAt` erhalten. */
export function saveProject(
  dataDir: string,
  entry: ProjectToSave,
  options: { overwrite: boolean; now: string },
): Promise<Outcome<Project>> {
  return saveProjectWith(nodeProjectIo(dataDir), entry, options);
}

/** Dateizugriff auf die Projekte eines Datenordners; auch für Oberflächentests gegen echte temporäre Ordner. */
export function nodeProjectIo(dataDir: string): ProjectIo {
  return {
    dataDirLabel: dataDir,
    listFiles: () => readdir(join(dataDir, PROJECT_FOLDER)).catch(missingAsNull),
    readText: (file) => readFile(join(dataDir, file), "utf8").catch(missingAsNull),
    // Fehlt der Datenordner, heißt das „gibt es nicht“ und kein Lesefehler (wie in der App über plugin-fs).
    dataDirExists: () =>
      stat(dataDir).then(
        (info) => info.isDirectory(),
        (error) => missingAsNull(error) ?? false,
      ),
    writeAtomic: async (file, text) => {
      await mkdir(join(dataDir, PROJECT_FOLDER), { recursive: true });
      await writeFileAtomic(join(dataDir, file), text);
    },
    moveFile: async (from, to) => {
      await mkdir(dirname(join(dataDir, to)), { recursive: true });
      await rename(join(dataDir, from), join(dataDir, to));
    },
  };
}

function missingAsNull(error: unknown): null {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
  throw error;
}
