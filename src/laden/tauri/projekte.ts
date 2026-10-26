import { exists, mkdir, readDir, readTextFile, rename, writeTextFile } from "@tauri-apps/plugin-fs";
import { PROJECT_FOLDER, type ProjectIo } from "../gemeinsam/index.ts";
import { DATA_DIR, DATA_DIR_LABEL, HOME } from "./daten.ts";

// SPEC F9 in der App: dieselben Regeln wie in der Kommandozeile (src/laden/gemeinsam), Dateien über plugin-fs.
// Die App löscht nie: Scheitert das Umbenennen, bleibt die Zwischendatei liegen, die Zieldatei ist unberührt.

export const appProjectIo: ProjectIo = {
  dataDirLabel: DATA_DIR_LABEL,
  listFiles: async () => {
    const folder = `${DATA_DIR}/${PROJECT_FOLDER}`;
    if (!(await exists(folder, HOME))) return null;
    return (await readDir(folder, HOME)).filter((entry) => entry.isFile).map((entry) => entry.name);
  },
  readText: async (file) => {
    const path = `${DATA_DIR}/${file}`;
    return (await exists(path, HOME)) ? readTextFile(path, HOME) : null;
  },
  dataDirExists: () => exists(DATA_DIR, HOME),
  writeAtomic: async (file, text) => {
    await mkdir(`${DATA_DIR}/${PROJECT_FOLDER}`, { ...HOME, recursive: true });
    const path = `${DATA_DIR}/${file}`;
    const temporary = `${path}.tmp-${crypto.randomUUID()}`;
    await writeTextFile(temporary, text, HOME);
    await rename(temporary, path, { oldPathBaseDir: HOME.baseDir, newPathBaseDir: HOME.baseDir });
  },
  moveFile: async (from, to) => {
    await mkdir(`${DATA_DIR}/${to.slice(0, to.lastIndexOf("/"))}`, { ...HOME, recursive: true });
    await rename(`${DATA_DIR}/${from}`, `${DATA_DIR}/${to}`, {
      oldPathBaseDir: HOME.baseDir,
      newPathBaseDir: HOME.baseDir,
    });
  },
};
