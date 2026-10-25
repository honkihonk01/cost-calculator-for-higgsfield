// Ob sich die Oberfläche bewegen darf, und Bewegungszeiten aus src/styles/tokens.css.
// Ohne Bewegung (Systemeinstellung „Bewegung reduzieren“, Testumgebung ohne matchMedia) ist alles sofort da.

export function bewegt(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    typeof Element.prototype.animate === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Wert eines Tokens als Text, zum Beispiel die Kurve `--ease-aus`. */
export function tokenText(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Zeit eines Tokens in Millisekunden, zum Beispiel `tokenMs("--stagger-atom")` → 60; fehlt es, 0. */
export function tokenMs(name: string): number {
  const text = tokenText(name);
  const value = Number.parseFloat(text);
  if (!Number.isFinite(value)) return 0;
  return text.endsWith("ms") ? value : text.endsWith("s") ? value * 1000 : value;
}

// Der erste Aufbau des Fensters übernimmt das Einblenden selbst; bis er geplant ist, blendet sonst nichts ein.
let aufbauSteht = false;
export function aufbauGeplant(): boolean {
  return aufbauSteht;
}
export function markiereAufbau(): void {
  aufbauSteht = true;
}
