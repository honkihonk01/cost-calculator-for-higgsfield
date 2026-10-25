import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PROJECT_ROOT } from "./daten.ts";

/** Echter MCP-Client über stdio gegen `node src/mcp/main.ts`, mit temporärem HOME und Datenordner. */
export async function connectMcp(env: { home: string; dataDir: string }) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["src/mcp/main.ts"],
    cwd: PROJECT_ROOT,
    env: { PATH: process.env.PATH ?? "", HOME: env.home, HFCALC_DATA: env.dataDir },
    stderr: "pipe",
  });
  const client = new Client({ name: "hfcalc-test", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

/** Text der ersten Antwort eines Werkzeugs und ob es ein Fehler war. */
export async function callTool(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args });
  const content = result.content as { type: string; text: string }[];
  return { text: content[0]?.text ?? "", isError: result.isError === true };
}
