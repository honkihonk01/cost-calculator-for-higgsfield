import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PROJECT_FOLDER, type ProjectIo } from "../laden/gemeinsam/index.ts";
import { checkPriceFiles, PRICE_FILES, type PriceFileKey } from "../schema/index.ts";
import { App } from "./App.tsx";
import type { DataSource } from "./quelle.ts";
import "../styles/global.css";

// Nur für die Prüfung im Browser während der Entwicklung (vorschau.html, nicht Teil des App-Builds):
// dieselbe App mit den Startdaten aus daten-vorlage/ und festem Kurs 1,08 statt Tauri-Zugriff.
// Projekte liegen nur im Arbeitsspeicher der Seite und sind nach dem Neuladen weg.

const files = import.meta.glob<string>("/daten-vorlage/preise/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
});
const texts: Partial<Record<PriceFileKey, string>> = {};
for (const [key, file] of Object.entries(PRICE_FILES) as [PriceFileKey, string][]) {
  texts[key] = files[`/daten-vorlage/preise/${file}`];
}

const memory = new Map<string, string>();
const memoryProjects: ProjectIo = {
  dataDirLabel: "Vorschau (nur im Arbeitsspeicher)",
  // nur Dateien direkt im Projektordner, wie readdir; der Papierkorb ist ein Unterordner
  listFiles: async () =>
    [...memory.keys()].map((file) => file.slice(PROJECT_FOLDER.length + 1)).filter((file) => !file.includes("/")),
  readText: async (file) => memory.get(file) ?? null,
  dataDirExists: async () => true,
  writeAtomic: async (file, text) => {
    memory.set(file, text);
  },
  moveFile: async (from, to) => {
    const text = memory.get(from);
    if (text !== undefined) memory.set(to, text);
    memory.delete(from);
  },
};

const previewSource: DataSource = {
  dataDirLabel: "daten-vorlage",
  loadPrices: async () => {
    const check = checkPriceFiles(texts);
    return check.ok ? { ok: true, data: check.data } : { ok: false, errors: check.errors };
  },
  cachedRate: async () => ({ value: 1.08, date: "2026-10-09", origin: "cached" }),
  exchangeRate: async () => ({ rate: { value: 1.08, date: "2026-10-09", origin: "ecb" } }),
  // In der Vorschau gibt es kein Higgsfield-Konto; ein fester Stand nach kurzer Wartezeit zeigt den Live-Ablauf.
  creditBalance: () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, credits: 1234 }), 800)),
  projects: memoryProjects,
  today: () => "2026-10-09",
  now: () => new Date().toISOString(),
};

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App source={previewSource} />
    </StrictMode>,
  );
}
