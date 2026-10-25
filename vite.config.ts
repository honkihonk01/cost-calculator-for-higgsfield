/// <reference types="vitest/config" />
import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  // Vorgaben für `tauri dev` und `tauri build`:
  // 1. Rust-Fehler nicht durch Leeren des Terminals verdecken
  clearScreen: false,
  // 2. Tauri erwartet einen festen Port; ist er belegt, abbrechen statt ausweichen
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    // 3. src-tauri nicht beobachten
    watch: { ignored: ["**/src-tauri/**"] },
  },

  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "node",
  },
}));
