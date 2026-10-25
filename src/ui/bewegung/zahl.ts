import Big from "big.js";

// Zahlen zählen weich vom alten zum neuen Wert, statt zu springen (Prototyp „Angebotsrechner“, Funktion zaehle).
// Die Zwischenbilder sind reine Anzeige und werden mit big.js gebildet; das letzte Bild ist immer exakt der Text,
// den die Anzeige aus calculate() erzeugt hat.

// Deutsche Zahlen: „6.240“, „375,73“, „12“. Alles andere (Einheiten, Vorzeichen, Wörter) ist Gerüst.
const ZAHL = /\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g;

function zerlege(text: string) {
  return { zahlen: text.match(ZAHL) ?? [], geruest: text.split(ZAHL) };
}

function alsBig(zahl: string): Big {
  return new Big(zahl.replace(/\./g, "").replace(",", "."));
}

function nachkommastellen(zahl: string): number {
  const komma = zahl.indexOf(",");
  return komma < 0 ? 0 : zahl.length - komma - 1;
}

function deutsch(wert: Big, stellen: number): string {
  const [ganz, bruch] = wert.toFixed(stellen).split(".");
  const gruppiert = ganz.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return bruch === undefined ? gruppiert : `${gruppiert},${bruch}`;
}

/** Lohnt sich das Zählen? Nur bei gleichem Gerüst und mindestens einer Zahl, die sich ändert. */
export function zaehlbar(von: string | null, nach: string): boolean {
  const ziel = zerlege(nach);
  if (ziel.zahlen.length === 0) return false;
  if (von === null) return true;
  const start = zerlege(von);
  return (
    start.zahlen.length === ziel.zahlen.length &&
    start.geruest.every((teil, i) => teil === ziel.geruest[i]) &&
    start.zahlen.some((zahl, i) => !alsBig(zahl).eq(alsBig(ziel.zahlen[i] ?? "0")))
  );
}

/**
 * Zwischenbild bei Fortschritt `k` (0 bis 1): jede Zahl liegt anteilig zwischen altem und neuem Wert, mit den
 * Nachkommastellen des Ziels. `von === null` zählt von 0. Passt das Gerüst nicht, kommt sofort das Ziel.
 */
export function zwischenText(von: string | null, nach: string, k: number): string {
  if (k >= 1 || !zaehlbar(von, nach)) return nach;
  const ziel = zerlege(nach);
  const start = von === null ? null : zerlege(von);
  const anteil = new Big(Math.max(0, k).toFixed(6));
  return ziel.geruest
    .map((teil, i) => {
      const zahl = ziel.zahlen[i];
      if (zahl === undefined) return teil;
      const a = start ? alsBig(start.zahlen[i] ?? "0") : new Big(0);
      const b = alsBig(zahl);
      return teil + deutsch(a.plus(b.minus(a).times(anteil)), nachkommastellen(zahl));
    })
    .join("");
}

type Lauf = { raf: number; timer?: ReturnType<typeof setTimeout> };
const laeufe = new WeakMap<Element, Lauf>();

/** Lässt `el` von `von` nach `nach` zählen (schnell los, weich auslaufend). Ein laufendes Zählen wird ersetzt. */
export function zaehle(el: Element, von: string | null, nach: string, dauer: number, verzoegerung = 0): void {
  halte(el);
  if (!zaehlbar(von, nach) || dauer <= 0) {
    el.textContent = nach;
    return;
  }
  el.textContent = zwischenText(von, nach, 0);
  const lauf: Lauf = { raf: 0 };
  lauf.timer = setTimeout(() => {
    const t0 = performance.now();
    const schritt = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / dauer));
      el.textContent = zwischenText(von, nach, 1 - (1 - p) ** 4);
      if (p < 1) lauf.raf = requestAnimationFrame(schritt);
      else laeufe.delete(el);
    };
    lauf.raf = requestAnimationFrame(schritt);
  }, verzoegerung);
  laeufe.set(el, lauf);
}

/** Bricht das Zählen ab; der Text bleibt, wo er gerade ist. */
export function halte(el: Element): void {
  const lauf = laeufe.get(el);
  if (!lauf) return;
  clearTimeout(lauf.timer);
  cancelAnimationFrame(lauf.raf);
  laeufe.delete(el);
}
