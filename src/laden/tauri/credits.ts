import { invoke } from "@tauri-apps/api/core";
import type { CreditLookup } from "../gemeinsam/index.ts";

// Credit-Stand aus dem Higgsfield-Konto über den Befehl `higgsfield_credits` der Tauri-Hülle (src-tauri/src/lib.rs).
// Higgsfield liefert Bruchteile (zum Beispiel 215,13); das Eingabefeld nimmt ganze Credits, abgerundet, damit der
// Kalkulator nie mit Credits rechnet, die es nicht gibt.

export async function creditsFromApp(): Promise<CreditLookup> {
  try {
    const credits = await invoke<number>("higgsfield_credits");
    return { ok: true, credits: Math.floor(credits) };
  } catch (error) {
    return { ok: false, message: typeof error === "string" ? error : "Der Abruf bei Higgsfield ist fehlgeschlagen." };
  }
}
