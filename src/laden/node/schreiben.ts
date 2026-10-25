import { randomUUID } from "node:crypto";
import { rename, rm, writeFile } from "node:fs/promises";

/** Schreibt atomar: erst in eine Zwischendatei im selben Ordner, dann umbenennen (docs/QUALITY.md, Datenverlust). */
export async function writeFileAtomic(path: string, text: string): Promise<void> {
  const temporary = `${path}.tmp-${randomUUID()}`;
  try {
    await writeFile(temporary, text, "utf8");
    await rename(temporary, path);
  } catch (error) {
    // Nur die eigene Zwischendatei wegräumen; die Zieldatei bleibt unberührt.
    await rm(temporary, { force: true });
    throw error;
  }
}
