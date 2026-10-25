import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { writeFileAtomic } from "../laden/node/index.ts";

// Änderungen an fremden Konfigurationsdateien (docs/ARCHITECTURE.md, „Einträge durch hfcalc einrichten“):
// vorher Sicherungskopie, nur den eigenen Eintrag ersetzen, atomar schreiben, nichts löschen.

export const SERVER_NAME = "higgsfield-kalkulator";
export const ZSHRC_MARKER = "# higgsfield-kalkulator";

export type Change = { changed: boolean; backup: string | null };

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

/** `<datei>.bak-<Zeitstempel>`; eine vorhandene Sicherung wird nie überschrieben. */
export async function backupFile(path: string, stamp: string): Promise<string | null> {
  if (!(await exists(path))) return null;
  let target = `${path}.bak-${stamp}`;
  for (let index = 2; await exists(target); index += 1) target = `${path}.bak-${stamp}-${index}`;
  await copyFile(path, target);
  return target;
}

async function writeWithBackup(path: string, text: string, stamp: string): Promise<Change> {
  const before = (await exists(path)) ? await readFile(path, "utf8") : null;
  if (before === text) return { changed: false, backup: null };
  const backup = await backupFile(path, stamp);
  await mkdir(dirname(path), { recursive: true });
  await writeFileAtomic(path, text);
  return { changed: true, backup };
}

/** Claude Desktop: `mcpServers.higgsfield-kalkulator` setzen, alles andere bleibt. Ungültiges JSON wird nicht angefasst. */
export async function upsertDesktopConfig(
  path: string,
  command: string,
  args: string[],
  stamp: string,
): Promise<Change> {
  let config: Record<string, unknown> = {};
  if (await exists(path)) {
    const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Die Konfigurationsdatei enthält kein JSON-Objekt und bleibt unverändert.");
    }
    config = parsed as Record<string, unknown>;
  }
  const servers = config.mcpServers;
  const merged = {
    ...config,
    mcpServers: {
      ...(servers !== null && typeof servers === "object" && !Array.isArray(servers) ? servers : {}),
      [SERVER_NAME]: { command, args },
    },
  };
  return writeWithBackup(path, `${JSON.stringify(merged, null, 2)}\n`, stamp);
}

/** Codex: den Block `[mcp_servers.higgsfield-kalkulator]` (samt Unterabschnitten) ersetzen, alles andere bleibt. */
export async function upsertCodexConfig(path: string, command: string, args: string[], stamp: string): Promise<Change> {
  const before = (await exists(path)) ? await readFile(path, "utf8") : "";
  const ours = new RegExp(`^\\s*\\[\\s*mcp_servers\\.(?:"${SERVER_NAME}"|${SERVER_NAME})(?:\\.[^\\]]*)?\\s*\\]\\s*$`);
  const kept: string[] = [];
  let skipping = false;
  for (const line of before.split("\n")) {
    if (/^\s*\[/.test(line)) skipping = ours.test(line);
    if (!skipping) kept.push(line);
  }
  const block = [
    `[mcp_servers.${SERVER_NAME}]`,
    `command = ${tomlString(command)}`,
    `args = [${args.map(tomlString).join(", ")}]`,
  ].join("\n");
  const rest = kept.join("\n").trimEnd();
  return writeWithBackup(path, `${rest === "" ? "" : `${rest}\n\n`}${block}\n`, stamp);
}

/** Eine markierte Zeile in `~/.zshrc`, nur wenn sie noch fehlt. */
export async function ensureZshrcPath(path: string, stamp: string): Promise<Change> {
  const before = (await exists(path)) ? await readFile(path, "utf8") : "";
  if (before.split("\n").some((line) => line.includes(ZSHRC_MARKER))) return { changed: false, backup: null };
  const line = `export PATH="$HOME/.local/bin:$PATH" ${ZSHRC_MARKER}`;
  const separator = before === "" || before.endsWith("\n") ? "" : "\n";
  return writeWithBackup(path, `${before}${separator}${line}\n`, stamp);
}

function tomlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
