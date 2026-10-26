import { type Outcome, type Project, projectSchema, projectSlug } from "../../schema/index.ts";
import { fail, invalidName, PROJECT_FOLDER, type ProjectIo, readProjectFile } from "./projekte-ablauf.ts";

// Projekte löschen und umbenennen (SPEC F9, AC-F9-7 und AC-F9-8). „Löschen“ verschiebt die Datei in den Papierkorb
// `projekte/papierkorb/`, weil die App nie Dateien löscht; dort bleibt sie wiederherstellbar.

export const TRASH_FOLDER = `${PROJECT_FOLDER}/papierkorb`;

/**
 * Verschiebt ein Projekt in den Papierkorb. Die Datei behält ihren Namen, damit sie sich durch Zurücklegen in den
 * Ordner `projekte/` wiederherstellen lässt; liegt dort schon eine gleichnamige, kommt der Zeitpunkt dazu.
 */
export async function trashProjectWith(
  io: ProjectIo,
  name: string,
  now: string,
): Promise<Outcome<{ trashedAs: string }>> {
  const slug = projectSlug(name);
  if (slug === "") return invalidName(name);
  const file = `${PROJECT_FOLDER}/${slug}.json`;
  if ((await io.readText(file).catch(() => null)) === null) {
    return fail("project-missing", `Ein Projekt „${name}“ gibt es nicht mehr.`, file);
  }
  let trashedAs: string;
  try {
    trashedAs = await trashTarget(io, slug, now);
    await io.moveFile(file, trashedAs);
  } catch (error) {
    return fail("move-failed", `Das Projekt ließ sich nicht in den Papierkorb verschieben: ${String(error)}`, file);
  }
  return { ok: true, value: { trashedAs } };
}

/**
 * Benennt ein Projekt um: Die Datei mit dem neuen Namen entsteht atomar, `createdAt` bleibt; die alte Datei kommt in
 * den Papierkorb. Einen anderen vorhandenen Namen überschreibt das Umbenennen nie.
 */
export async function renameProjectWith(
  io: ProjectIo,
  oldName: string,
  newName: string,
  now: string,
): Promise<Outcome<Project>> {
  const oldSlug = projectSlug(oldName);
  const newSlug = projectSlug(newName);
  if (newSlug === "") return invalidName(newName);
  const oldFile = `${PROJECT_FOLDER}/${oldSlug}.json`;
  const newFile = `${PROJECT_FOLDER}/${newSlug}.json`;
  const old = await readProjectFile(io, oldFile);
  if (!old.ok) return old;
  if (newSlug !== oldSlug && (await io.readText(newFile).catch(() => null)) !== null) {
    return fail(
      "project-exists",
      `Ein Projekt mit dem Namen „${newName.trim()}“ gibt es schon. Es wurde nichts geändert.`,
    );
  }
  const renamed = projectSchema.safeParse({ ...old.value, name: newName.trim(), updatedAt: now });
  if (!renamed.success) return fail("invalid-name", `„${newName}“ taugt nicht als Projektname.`);
  try {
    await io.writeAtomic(newFile, `${JSON.stringify(renamed.data, null, 2)}\n`);
    if (newSlug !== oldSlug) await io.moveFile(oldFile, await trashTarget(io, oldSlug, now));
  } catch (error) {
    return fail("write-failed", `Das Projekt ließ sich nicht umbenennen: ${String(error)}`, oldFile);
  }
  return { ok: true, value: renamed.data };
}

async function trashTarget(io: ProjectIo, slug: string, now: string): Promise<string> {
  const plain = `${TRASH_FOLDER}/${slug}.json`;
  const taken = (await io.readText(plain).catch(() => null)) !== null;
  return taken ? `${TRASH_FOLDER}/${slug}-${now.replace(/[:.]/g, "-")}.json` : plain;
}
