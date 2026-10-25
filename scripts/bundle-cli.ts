import { cp, mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "vite";

// Bündelt Kommandozeile und MCP-Server zu je einer Datei, unabhängig vom Projektordner (AC-F11-5).
// Aufruf: node scripts/bundle-cli.ts [Zielordner]; Standard ist dist-cli/. Die Startdaten kommen daneben.

const root = resolve(import.meta.dirname, "..");
const outDir = resolve(process.argv[2] ?? join(root, "dist-cli"));

const ENTRIES = { hfcalc: "src/cli/main.ts", mcp: "src/mcp/main.ts" } as const;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
for (const [name, entry] of Object.entries(ENTRIES)) {
  await build({
    root,
    configFile: false,
    logLevel: "warn",
    ssr: { noExternal: true, target: "node" },
    build: {
      ssr: join(root, entry),
      outDir,
      emptyOutDir: false,
      target: "node24",
      minify: false,
      rolldownOptions: { output: { format: "es", entryFileNames: `${name}.mjs` } },
    },
  });
}
await cp(join(root, "daten-vorlage"), join(outDir, "daten-vorlage"), { recursive: true });
process.stdout.write(`Gebündelt nach ${outDir}: hfcalc.mjs, mcp.mjs, daten-vorlage/\n`);
