import { spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const PROJECT_ROOT = resolve(import.meta.dirname, "../..");
export const FIXTURE_DATA = join(PROJECT_ROOT, "tests/fixtures/daten");

/** Frischer temporärer Ordner mit Home und einer Kopie der Testdaten; `cleanup` räumt ihn auf. */
export async function tempData(): Promise<{
  root: string;
  home: string;
  dataDir: string;
  cleanup: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), "hfcalc-test-"));
  const home = join(root, "home");
  const dataDir = join(root, "daten");
  await cp(FIXTURE_DATA, dataDir, { recursive: true });
  return { root, home, dataDir, cleanup: () => rm(root, { recursive: true, force: true }) };
}

export async function readText(dataDir: string, file: string): Promise<string> {
  return readFile(join(dataDir, "preise", file), "utf8");
}

export async function writeText(dataDir: string, file: string, text: string): Promise<void> {
  await writeFile(join(dataDir, "preise", file), text);
}

/** Ändert eine Preisdatei als JSON-Objekt. */
export async function editJson(dataDir: string, file: string, change: (json: Record<string, unknown>) => void) {
  const json = JSON.parse(await readText(dataDir, file)) as Record<string, unknown>;
  change(json);
  await writeText(dataDir, file, JSON.stringify(json, null, 2));
}

/** Startet `hfcalc` als echten Prozess mit temporärem HOME und Datenordner. */
export function runCli(args: string[], env: { home: string; dataDir?: string }) {
  const result = spawnSync(process.execPath, ["src/cli/main.ts", ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: env.home,
      ...(env.dataDir === undefined ? {} : { HFCALC_DATA: env.dataDir }),
    },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}
