import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App.tsx";
import { tauriSource } from "./ui/quelle-tauri.ts";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Das Element #root fehlt in index.html.");
}

createRoot(root).render(
  <StrictMode>
    <App source={tauriSource} />
  </StrictMode>,
);
