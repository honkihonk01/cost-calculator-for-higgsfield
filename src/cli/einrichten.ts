import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, chmod, constants, cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import { findDataDir, writeFileAtomic } from "../laden/node/index.ts";
import { EXIT_OTHER } from "./ausgabe.ts";
import {
  backupFile,
  type Change,
  ensureZshrcPath,
  SERVER_NAME,
  upsertCodexConfig,
  upsertDesktopConfig,
} from "./konfig.ts";

// `hfcalc einrichten` (SPEC F13): Datenordner, Bündel, Startbefehl, PATH und drei MCP-Einträge.

const NODE_CANDIDATES = ["/opt/homebrew/bin/node", "/opt/homebrew/opt/node@24/bin/node", "/usr/local/bin/node"];
const BUNDLE_FILES = ["hfcalc.mjs", "mcp.mjs"];

type Line = { ok: boolean; text: string };

export function registerSetup(program: Command): void {
  program
    .command("einrichten")
    .description(
      "Legt den Datenordner an (nie überschreibend), installiert hfcalc unabhängig vom Projektordner und trägt den MCP-Server in Claude Desktop, Codex und Claude Code ein.",
    )
    .action(async () => {
      const lines = await runSetup(process.env, new Date());
      process.stdout.write(`${lines.map((line) => `${line.ok ? "OK    " : "FEHLER"} ${line.text}`).join("\n")}\n`);
      if (lines.some((line) => !line.ok)) process.exitCode = EXIT_OTHER;
    });
}

export async function runSetup(env: NodeJS.ProcessEnv, now: Date): Promise<Line[]> {
  const home = env.HOME ?? "";
  // Ortszeit des Macs, damit die Sicherungskopie die Uhrzeit trägt, die der Nutzer auf der Uhr sah.
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const lines: Line[] = [];
  const step = async (label: string, work: () => Promise<string>) => {
    try {
      lines.push({ ok: true, text: `${label}: ${await work()}` });
    } catch (error) {
      lines.push({ ok: false, text: `${label}: ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  const bundleDir = dirname(fileURLToPath(import.meta.url));
  if (!(await isFile(join(bundleDir, "hfcalc.mjs"))) || !(await isFile(join(bundleDir, "mcp.mjs")))) {
    return [
      {
        ok: false,
        text: "Einrichtung: läuft nur aus dem Bündel. Starte sie im Projektordner mit `pnpm install:local`.",
      },
    ];
  }
  const node = await stableNode();
  const shareDir = join(home, ".local", "share", "higgsfield-kalkulator");
  const mcpPath = join(shareDir, "mcp.mjs");

  await step("Datenordner", () => createDataDir(findDataDir(env), join(bundleDir, "daten-vorlage"), env));
  await step("Programmdateien", async () => {
    await mkdir(shareDir, { recursive: true });
    for (const file of BUNDLE_FILES)
      await writeFileAtomic(join(shareDir, file), await readFile(join(bundleDir, file), "utf8"));
    await cp(join(bundleDir, "daten-vorlage"), join(shareDir, "daten-vorlage"), { recursive: true, force: true });
    return `kopiert nach ${shareDir}`;
  });
  await step("Startbefehl", async () => {
    const launcher = join(home, ".local", "bin", "hfcalc");
    await mkdir(dirname(launcher), { recursive: true });
    const script = `#!/bin/sh\n# Startbefehl des Higgsfield-Kostenkalkulators, angelegt von \`hfcalc einrichten\`.\nexec ${shellQuote(node.path)} ${shellQuote(join(shareDir, "hfcalc.mjs"))} "$@"\n`;
    await writeFileAtomic(launcher, script);
    await chmod(launcher, 0o755);
    return launcher;
  });
  await step("PATH", async () => {
    // Immer ~/.zshrc prüfen, nie den PATH dieses Aufrufs: Läuft die Einrichtung aus Claude Code oder einem anderen
    // Programm, das ~/.local/bin selbst mitbringt, fehlt der Ordner im Terminal trotzdem (docs/DECISIONS.md 2026-10-25).
    const change = await ensureZshrcPath(join(home, ".zshrc"), stamp);
    return change.changed
      ? `Zeile in ~/.zshrc ergänzt${backupNote(change)}; neues Terminalfenster öffnen, dann gilt \`hfcalc\``
      : "Zeile in ~/.zshrc ist schon vorhanden; neues Terminalfenster öffnen, dann gilt `hfcalc`";
  });
  await step("Claude Code", () => registerClaudeCode(env, home, node.path, mcpPath, stamp));
  await step("Claude Desktop", async () => {
    const path = join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
    return describe(await upsertDesktopConfig(path, node.path, [mcpPath], stamp), path, "Claude Desktop neu starten");
  });
  await step("Codex", async () => {
    const path = join(home, ".codex", "config.toml");
    return describe(await upsertCodexConfig(path, node.path, [mcpPath], stamp), path, "Codex neu starten");
  });
  lines.push({
    ok: true,
    text: node.stable
      ? `Node: ${node.path}`
      : `Node: ${node.path}. Nach einem Node-Update \`hfcalc einrichten\` erneut ausführen, weil dieser Pfad an die Node-Version gebunden ist.`,
  });
  return lines;
}

/** Legt den Datenordner nur an, wenn es ihn noch nicht gibt; erst in einem Zwischenordner, dann umbenennen (AC-F13-4). */
async function createDataDir(dataDir: string, template: string, env: NodeJS.ProcessEnv): Promise<string> {
  if (await exists(dataDir)) return `${dataDir} gibt es schon und bleibt unverändert`;
  const temporary = join(dirname(dataDir), `.${SERVER_NAME}-neu-${randomUUID()}`);
  try {
    await mkdir(temporary, { recursive: true });
    await cp(template, temporary, { recursive: true });
    await writeFile(join(temporary, ".gitignore"), "cache/\n");
    await rename(temporary, dataDir);
  } catch (error) {
    // Nur den eigenen, eben angelegten Zwischenordner wegräumen; einen halben Datenordner gibt es so nie.
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
  const git = (args: string[]) => spawnSync("git", args, { cwd: dataDir, env, encoding: "utf8" });
  if (git(["--version"]).status !== 0) return `${dataDir} mit Startdaten angelegt (ohne Git, weil Git fehlt)`;
  const identity =
    git(["config", "user.email"]).stdout.trim() === ""
      ? ["-c", "user.name=Higgsfield-Kalkulator", "-c", "user.email=hfcalc@localhost"]
      : [];
  for (const args of [
    ["init", "--quiet"],
    ["add", "--all"],
    [...identity, "commit", "--quiet", "-m", "Startdaten des Higgsfield-Kostenkalkulators"],
  ]) {
    const result = git(args);
    if (result.status !== 0) throw new Error(`${dataDir} angelegt, aber Git meldet: ${result.stderr.trim()}`);
  }
  return `${dataDir} mit Startdaten angelegt, Git-Repository mit erstem Commit`;
}

/** `claude mcp` für alle Projekte; ein vorhandener Eintrag wird erst entfernt, damit nie ein doppelter entsteht (AC-F13-2). */
async function registerClaudeCode(
  env: NodeJS.ProcessEnv,
  home: string,
  node: string,
  mcpPath: string,
  stamp: string,
): Promise<string> {
  const addArgs = ["mcp", "add", "--scope", "user", SERVER_NAME, "--", node, mcpPath];
  const claude = await findOnPath("claude", env.PATH ?? "");
  if (!claude) {
    return `Befehl \`claude\` nicht gefunden. Nachholen mit: claude ${addArgs.map(shellQuote).join(" ")}`;
  }
  const backup = await backupFile(join(home, ".claude.json"), stamp);
  const run = (args: string[]) => spawnSync(claude, args, { env, encoding: "utf8" });
  if (run(["mcp", "get", SERVER_NAME]).status === 0) {
    const removed = run(["mcp", "remove", "--scope", "user", SERVER_NAME]);
    if (removed.status !== 0) throw new Error(`alter Eintrag ließ sich nicht entfernen: ${removed.stderr.trim()}`);
  }
  const added = run(addArgs);
  if (added.status !== 0) throw new Error(`Eintrag fehlgeschlagen: ${added.stderr.trim()}`);
  return `für alle Projekte eingetragen${backup ? ` (Sicherung: ${backup})` : ""}`;
}

async function stableNode(): Promise<{ path: string; stable: boolean }> {
  for (const candidate of NODE_CANDIDATES) {
    if (await isFile(candidate)) return { path: candidate, stable: true };
  }
  return { path: process.execPath, stable: false };
}

async function findOnPath(command: string, path: string): Promise<string | null> {
  for (const directory of path.split(delimiter).filter((entry) => entry !== "")) {
    const candidate = join(directory, command);
    const executable = await access(candidate, constants.X_OK).then(
      () => true,
      () => false,
    );
    if (executable) return candidate;
  }
  return null;
}

function describe(change: Change, path: string, restart: string): string {
  return change.changed
    ? `eingetragen in ${path}${backupNote(change)}; ${restart}`
    : `Eintrag in ${path} ist schon aktuell`;
}

function backupNote(change: Change): string {
  return change.backup ? ` (Sicherung: ${change.backup})` : "";
}

function shellQuote(value: string): string {
  return /^[\w@%+=:,./-]+$/.test(value) ? value : `'${value.replace(/'/g, `'\\''`)}'`;
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

async function isFile(path: string): Promise<boolean> {
  return stat(path).then(
    (info) => info.isFile(),
    () => false,
  );
}
