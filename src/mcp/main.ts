#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.ts";

// Startpunkt des MCP-Servers über stdio; Claude Desktop, Claude Code und Codex starten ihn als Unterprozess.

try {
  await createServer().connect(new StdioServerTransport());
} catch (error) {
  // stdout gehört dem MCP-Protokoll; Fehler deshalb nur auf stderr.
  process.stderr.write(
    `Der MCP-Server ließ sich nicht starten: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 3;
}
