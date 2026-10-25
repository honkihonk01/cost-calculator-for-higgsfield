import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { PROJECT_ROOT } from "../hilfen/daten.ts";

// AC-F13-*: `hfcalc einrichten` aus dem Bündel gegen ein temporäres HOME. `claude` ist ein Ersatzskript,
// das seine Aufrufe protokolliert (docs/TESTING.md); Git ist das echte Git des Macs.

let bundle: string;
let home: string;
const NAME = "higgsfield-kalkulator";

beforeAll(async () => {
  bundle = await mkdtemp(join(tmpdir(), "hfcalc-buendel-"));
  const built = spawnSync(process.execPath, ["scripts/bundle-cli.ts", bundle], { cwd: PROJECT_ROOT, encoding: "utf8" });
  if (built.status !== 0) throw new Error(built.stderr);
}, 120_000);
afterAll(async () => {
  await rm(bundle, { recursive: true, force: true });
});
beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), "hfcalc-home-"));
  await mkdir(join(home, "bin"));
  const fake = `#!/bin/sh
echo "$*" >> "$HOME/claude-aufrufe.log"
case "$1 $2" in
  "mcp get") [ -f "$HOME/.claude-eintrag" ] && exit 0 || exit 1 ;;
  "mcp add") touch "$HOME/.claude-eintrag" ;;
  "mcp remove") rm -f "$HOME/.claude-eintrag" ;;
esac
exit 0
`;
  await writeFile(join(home, "bin", "claude"), fake);
  await chmod(join(home, "bin", "claude"), 0o755);
});
afterEach(async () => {
  await rm(home, { recursive: true, force: true });
});

function setup(options: { withClaude?: boolean; script?: string; extraPath?: string } = {}) {
  const path = `${options.extraPath ? `${options.extraPath}:` : ""}${options.withClaude === false ? "" : `${join(home, "bin")}:`}/usr/bin:/bin`;
  return spawnSync(process.execPath, [options.script ?? join(bundle, "hfcalc.mjs"), "einrichten"], {
    env: { HOME: home, PATH: path },
    encoding: "utf8",
  });
}

const desktopPath = () => join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json");
const codexPath = () => join(home, ".codex", "config.toml");
const mcpPath = () => join(home, ".local", "share", NAME, "mcp.mjs");
const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const claudeLog = async () => (await readFile(join(home, "claude-aufrufe.log"), "utf8")).trim().split("\n");
const git = (args: string[]) =>
  spawnSync("git", args, {
    cwd: join(home, "Higgsfield-Kalkulator"),
    encoding: "utf8",
    env: { HOME: home, PATH: "/usr/bin:/bin" },
  });

describe("AC-F13-1 frische Installation", () => {
  test("AC-F13-1 der MCP-Server steht in Claude Desktop, in Codex und bei Claude Code für alle Projekte", async () => {
    const result = setup();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    const desktop = await readJson(desktopPath());
    expect(desktop.mcpServers[NAME].args).toEqual([mcpPath()]);
    const node = desktop.mcpServers[NAME].command as string;
    expect(node.startsWith("/")).toBe(true);
    expect(await readFile(codexPath(), "utf8")).toBe(
      `[mcp_servers.${NAME}]\ncommand = "${node}"\nargs = ["${mcpPath()}"]\n`,
    );
    expect(await claudeLog()).toEqual([`mcp get ${NAME}`, `mcp add --scope user ${NAME} -- ${node} ${mcpPath()}`]);
  });

  test("AC-F13-1 ohne den Befehl claude nennt die Einrichtung den Befehl zum Nachholen", () => {
    const result = setup({ withClaude: false });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Nachholen mit: claude mcp add --scope user ${NAME} --`);
  });
});

test("AC-F11-5 die Zeile in ~/.zshrc entsteht auch, wenn der aufrufende Prozess ~/.local/bin schon im PATH hat", async () => {
  // Regression 25.10.2026: Aus Claude Code heraus meldete die Einrichtung „schon im PATH“ und schrieb nichts,
  // im Terminal fehlte `hfcalc` danach („command not found“).
  const result = setup({ extraPath: join(home, ".local", "bin") });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  expect(await readFile(join(home, ".zshrc"), "utf8")).toContain(
    'export PATH="$HOME/.local/bin:$PATH" # higgsfield-kalkulator',
  );
  expect(result.stdout).toContain("Zeile in ~/.zshrc ergänzt");
});

test("AC-F13-2 eine zweite Einrichtung erzeugt keine doppelten Einträge", async () => {
  setup();
  const second = setup();
  expect(second.status).toBe(0);
  expect(Object.keys((await readJson(desktopPath())).mcpServers)).toEqual([NAME]);
  expect((await readFile(codexPath(), "utf8")).match(/\[mcp_servers\.higgsfield-kalkulator\]/g)).toHaveLength(1);
  expect((await readFile(join(home, ".zshrc"), "utf8")).match(/# higgsfield-kalkulator/g)).toHaveLength(1);
  expect((await claudeLog()).slice(2).map((line) => line.split(" ").slice(0, 2).join(" "))).toEqual([
    "mcp get",
    "mcp remove",
    "mcp add",
  ]);
  expect(second.stdout).toContain("ist schon aktuell");
});

test("AC-F13-3 fremde Einträge bleiben unverändert, vorher entsteht je eine Sicherungskopie", async () => {
  const desktop = { mcpServers: { anderer: { command: "/bin/echo", args: ["x"] } }, globalShortcut: "Cmd+K" };
  await mkdir(join(home, "Library", "Application Support", "Claude"), { recursive: true });
  await writeFile(desktopPath(), JSON.stringify(desktop));
  const codex = `model = "o5"\n\n[mcp_servers.anderer]\ncommand = "x"\n\n[mcp_servers.${NAME}]\ncommand = "alt"\n\n[mcp_servers.${NAME}.env]\nA = "1"\n\n[profiles.leise]\nmodel = "mini"\n`;
  await mkdir(join(home, ".codex"));
  await writeFile(codexPath(), codex);
  await writeFile(join(home, ".zshrc"), "alias ll='ls -l'");
  await writeFile(join(home, ".claude.json"), '{"eigenes":true}');

  expect(setup().status).toBe(0);
  const after = await readJson(desktopPath());
  expect(after.globalShortcut).toBe("Cmd+K");
  expect(after.mcpServers.anderer).toEqual(desktop.mcpServers.anderer);
  const codexAfter = await readFile(codexPath(), "utf8");
  expect(codexAfter).toContain('model = "o5"\n\n[mcp_servers.anderer]\ncommand = "x"');
  expect(codexAfter).toContain('[profiles.leise]\nmodel = "mini"');
  expect(codexAfter).not.toContain('command = "alt"');
  expect(codexAfter).not.toContain(`[mcp_servers.${NAME}.env]`);
  expect(await readFile(join(home, ".zshrc"), "utf8")).toMatch(/^alias ll='ls -l'\nexport PATH=/);

  const backups = async (folder: string, prefix: string) =>
    (await readdir(folder)).filter((file) => file.startsWith(`${prefix}.bak-`));
  for (const [folder, file, original] of [
    [join(home, "Library", "Application Support", "Claude"), "claude_desktop_config.json", JSON.stringify(desktop)],
    [join(home, ".codex"), "config.toml", codex],
    [home, ".zshrc", "alias ll='ls -l'"],
    [home, ".claude.json", '{"eigenes":true}'],
  ] as const) {
    const found = await backups(folder, file);
    expect(found, file).toHaveLength(1);
    expect(await readFile(join(folder, found[0] ?? ""), "utf8")).toBe(original);
  }
});

test("AC-F13-3 ungültiges JSON bei Claude Desktop wird nicht angefasst und als Fehler gemeldet", async () => {
  await mkdir(join(home, "Library", "Application Support", "Claude"), { recursive: true });
  await writeFile(desktopPath(), "{ kaputt");
  const result = setup();
  expect(result.status).toBe(3);
  expect(result.stdout).toMatch(/FEHLER Claude Desktop:/);
  expect(await readFile(desktopPath(), "utf8")).toBe("{ kaputt");
  expect(result.stdout).toMatch(/OK +Codex:/);
});

describe("AC-F13-4 Datenordner", () => {
  test("AC-F13-4 ein fehlender Datenordner entsteht mit den Startdaten", async () => {
    setup();
    const data = join(home, "Higgsfield-Kalkulator");
    for (const file of await readdir(join(PROJECT_ROOT, "daten-vorlage", "preise"))) {
      expect(await readFile(join(data, "preise", file), "utf8")).toBe(
        await readFile(join(PROJECT_ROOT, "daten-vorlage", "preise", file), "utf8"),
      );
    }
    expect(await readFile(join(data, "CLAUDE.md"), "utf8")).toContain("Pflegeregeln");
  });

  test("AC-F13-4 ein vorhandener Datenordner wird nie überschrieben", async () => {
    const data = join(home, "Higgsfield-Kalkulator", "preise");
    await mkdir(data, { recursive: true });
    await writeFile(join(data, "pakete.json"), "eigene Änderung");
    const result = setup();
    expect(result.stdout).toContain("gibt es schon und bleibt unverändert");
    expect(await readdir(data)).toEqual(["pakete.json"]);
    expect(await readFile(join(data, "pakete.json"), "utf8")).toBe("eigene Änderung");
  });
});

test("AC-F13-5 der neue Datenordner ist ein Git-Repository mit .gitignore (cache/) und einem ersten Commit", async () => {
  setup();
  expect(git(["log", "--oneline"]).stdout.trim().split("\n")).toHaveLength(1);
  expect(await readFile(join(home, "Higgsfield-Kalkulator", ".gitignore"), "utf8")).toBe("cache/\n");
  const files = git(["ls-files"]).stdout.trim().split("\n");
  expect(files).toEqual(
    expect.arrayContaining([".gitignore", "CLAUDE.md", "preise/pakete.json", "preise/videomodelle.json"]),
  );
  expect(git(["status", "--porcelain"]).stdout).toBe("");
});

test("AC-F11-5 hfcalc und der MCP-Server funktionieren weiter, wenn der Projektordner verschoben wurde", async () => {
  setup();
  const moved = `${bundle}-verschoben`;
  await rename(bundle, moved);
  try {
    const launcher = join(home, ".local", "bin", "hfcalc");
    const result = spawnSync(launcher, ["daten", "pruefen"], {
      env: { HOME: home, PATH: "/usr/bin:/bin" },
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain(join(home, "Higgsfield-Kalkulator"));
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
    const client = new Client({ name: "hfcalc-test", version: "1.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [mcpPath()],
        env: { HOME: home, PATH: "/usr/bin:/bin" },
      }),
    );
    expect((await client.listTools()).tools).toHaveLength(5);
    await client.close();
  } finally {
    await rename(moved, bundle);
  }
});

test("aus dem Quelltext statt aus dem Bündel weist die Einrichtung auf pnpm install:local hin", () => {
  const result = setup({ script: join(PROJECT_ROOT, "src", "cli", "main.ts") });
  expect(result.status).toBe(3);
  expect(result.stdout).toContain("pnpm install:local");
});
