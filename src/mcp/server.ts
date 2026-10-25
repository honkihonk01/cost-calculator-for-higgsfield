import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  calculateWithRate,
  findDataDir,
  listProjects,
  loadPrices,
  readProject,
  saveProject,
} from "../laden/node/index.ts";
import { type AppError, describeError, inputsSchema, newestPriceDate } from "../schema/index.ts";

// MCP-Server (SPEC F12): fünf Werkzeuge, alle über dieselbe Ladeschicht und denselben Rechenkern wie `hfcalc`.

const INSTRUCTIONS = `Kostenrechner für Higgsfield (inoffizielles Community-Projekt): rechnet die Kosten eines KI-Films mit Higgsfield in Credits, Dollar und Euro für deine Auswahl, sagt, welche Credit-Pakete zu kaufen sind, und ordnet alle Produktionswege nach Preis-Leistung. Unlimited-Pässe sind derzeit ausgebaut.

So benutzt du ihn:
- Kostenfragen immer mit kosten_berechnen beantworten, nie selbst rechnen oder Preise schätzen. Das Ergebnis enthält recommendations.overall: die Kosten der gewählten Kombination brutto mit dem Kaufplan (plan.packages mit Preis je Paket, plan.gross). recommendations.bestValue und valueRanking ordnen die Wege nach Kosten brutto je Qualitätspunkt.
- Eingegeben wird nur, was vom Film noch offen ist: entweder durationSeconds (offene Dauer in Sekunden) oder clipCount (offene Clips), nie beides. Der Aufschlag extraScenesPercent (20 bis 50) kommt in beiden Fällen obendrauf. Pflicht sind außerdem modelId, resolution, attemptsPerClip, clipImageModelId (Bildmodell für die Lichtbilder und Referenzbilder je Clip) und creditBalance. Storyboard (storyboardModelId) und einmalige Assets (oneTimeAssets) sind aus, solange du sie nicht angibst; schalte sie nur ein, wenn der Nutzer sie mitgerechnet haben will.
- Der Wechselkurs bedeutet immer „Dollar je 1 Euro“ (1.08 heißt: 1 € kostet 1,08 $). Ohne manualExchangeRate gilt der Referenzkurs der Europäischen Zentralbank.
- Alle Zahlen im Ergebnis sind exakte Dezimaltexte; runde erst in deiner Antwort (Credits auf eine, Geld auf zwei Nachkommastellen).
- Ein Preis „unknown“ heißt „kein Preis hinterlegt“, nie 0. Solche Wege werden nie empfohlen.
- Modelle, Bildmodelle, Pakete und Qualitätspunkte liefert preise_lesen. Euro-Beträge sind brutto.
- Filme lassen sich als Projekte speichern (projekt_speichern) und lesen (projekte_auflisten, projekt_lesen). Ein vorhandenes Projekt nur mit overwrite: true ersetzen, und nur wenn der Nutzer das ausdrücklich bestätigt hat. Gespeicherte Projekte erscheinen auch in der App des Nutzers.`;

type ToolReply = { content: { type: "text"; text: string }[]; isError?: true };

function reply(value: unknown): ToolReply {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function failure(title: string, errors: AppError[]): ToolReply {
  const list = errors.map((error) => `- ${describeError(error)}`).join("\n");
  return { content: [{ type: "text", text: `${title}\n${list}` }], isError: true };
}

export function createServer(): McpServer {
  const server = new McpServer({ name: "higgsfield-kalkulator", version: "0.1.0" }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "kosten_berechnen",
    {
      title: "Kosten eines Films berechnen",
      description:
        "Rechnet Credits, Dollar und Euro für den noch offenen Umfang eines Films und liefert die Empfehlungen (Produktionsweg, Pässe, Gesamtempfehlung). Ergebnis identisch mit `hfcalc rechnen --json`.",
      inputSchema: inputsSchema,
    },
    async (inputs) => {
      const loaded = await loadPrices(findDataDir());
      if (!loaded.ok) return failure(`Die Preisdaten in ${loaded.dataDir} sind ungültig:`, loaded.errors);
      const { outcome } = await calculateWithRate(inputs, loaded.data, loaded.dataDir);
      return outcome.ok ? reply(outcome.value) : failure("Ungültige Eingabe:", outcome.errors);
    },
  );

  server.registerTool(
    "preise_lesen",
    {
      title: "Preise lesen",
      description:
        "Liefert alle Preisdateien mit Stand-Datum und Quelle: Videomodelle (Credits je Sekunde), Bildmodelle, Credit-Pakete, Qualitätspunkte für das Preis-Leistungs-Ranking und Standardwerte. Identisch mit `hfcalc preise --json`.",
      inputSchema: z.strictObject({}),
    },
    async () => {
      const loaded = await loadPrices(findDataDir());
      if (!loaded.ok) return failure(`Die Preisdaten in ${loaded.dataDir} sind ungültig:`, loaded.errors);
      return reply({ dataDir: loaded.dataDir, ...loaded.data });
    },
  );

  server.registerTool(
    "projekte_auflisten",
    {
      title: "Projekte auflisten",
      description:
        "Listet alle gespeicherten Filmprojekte mit Name, Speicherzeit, Preisstand und Satz der Gesamtempfehlung, neueste zuerst. Beschädigte Dateien stehen unter errors. Identisch mit `hfcalc projekte --json`.",
      inputSchema: z.strictObject({}),
    },
    async () => {
      const dataDir = findDataDir();
      return reply({ dataDir, ...(await listProjects(dataDir)) });
    },
  );

  server.registerTool(
    "projekt_lesen",
    {
      title: "Projekt lesen",
      description:
        "Liefert ein gespeichertes Projekt mit den Eingaben (inputs) und dem Ergebnis zum Zeitpunkt des Speicherns (snapshot). Identisch mit `hfcalc projekt zeigen <name> --json`.",
      inputSchema: z.strictObject({ name: z.string().min(1).describe("Name des Projekts, wie in projekte_auflisten") }),
    },
    async ({ name }) => {
      const project = await readProject(findDataDir(), name);
      return project.ok ? reply(project.value) : failure("Das Projekt ließ sich nicht lesen:", project.errors);
    },
  );

  server.registerTool(
    "projekt_speichern",
    {
      title: "Projekt speichern",
      description:
        "Rechnet mit den Eingaben wie kosten_berechnen und speichert Eingaben, Ergebnis und Preisstand unter dem Namen. Ein vorhandenes Projekt wird nur mit overwrite: true ersetzt; das nur nach ausdrücklicher Bestätigung durch den Nutzer.",
      inputSchema: z.strictObject({
        name: z.string().min(1).describe("Name des Projekts, zum Beispiel „Die Route – Teil 2“"),
        inputs: inputsSchema.describe("Eingaben wie bei kosten_berechnen"),
        overwrite: z.boolean().default(false).describe("true ersetzt ein vorhandenes Projekt gleichen Namens"),
      }),
    },
    async ({ name, inputs, overwrite }) => {
      const loaded = await loadPrices(findDataDir());
      if (!loaded.ok) return failure(`Die Preisdaten in ${loaded.dataDir} sind ungültig:`, loaded.errors);
      const { outcome } = await calculateWithRate(inputs, loaded.data, loaded.dataDir);
      if (!outcome.ok) return failure("Ungültige Eingabe:", outcome.errors);
      const saved = await saveProject(
        loaded.dataDir,
        { name, inputs, result: outcome.value, pricesAsOf: newestPriceDate(loaded.data) },
        { overwrite, now: new Date().toISOString() },
      );
      return saved.ok ? reply(saved.value) : failure("Das Projekt wurde nicht gespeichert:", saved.errors);
    },
  );

  return server;
}
