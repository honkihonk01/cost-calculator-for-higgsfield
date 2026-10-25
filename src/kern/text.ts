import Big from "big.js";

// Zahlen und Daten in Hinweistexten des Kerns: deutsches Komma, keine Rundung.

export function deNumber(value: number | Big | string): string {
  const [integer, fraction] = String(value).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

/** `2026-10-09` → `09.10.2026` */
export function deDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

/** Geldbetrag für Sätze: auf Cent gerundet, nur hier (die Zahlenfelder im Ergebnis bleiben exakt). */
export function deMoney(amount: Big, unit: "USD" | "EUR"): string {
  return `${deNumber(amount.toFixed(2))} ${unit === "EUR" ? "€" : "$"}`;
}

/** Exakter Dezimaltext aus dem Ergebnis → deutsche Anzeige mit höchstens `decimals` Nachkommastellen. */
export function formatDecimal(text: string, decimals: number, fixed = false): string {
  const rounded = new Big(text).round(decimals);
  return deNumber(fixed ? rounded.toFixed(decimals) : rounded.toString());
}

/** Credits mit einer Nachkommastelle (SPEC Entscheidung 4). */
export function formatCredits(text: string): string {
  return `${formatDecimal(text, 1)} Credits`;
}

/** Geld auf Cent gerundet, für Anzeige und Textausgabe. */
export function formatMoney(text: string, unit: "USD" | "EUR"): string {
  return `${formatDecimal(text, 2, true)} ${unit === "EUR" ? "€" : "$"}`;
}
