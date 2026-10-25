import type { Price } from "../schema/index.ts";

// Deutsche Zahlen- und Datumsformate für die Textausgabe. Gerundet wird hier nicht: Alle Stellen bleiben sichtbar.
// Gerundete Anzeige von Ergebniszahlen teilen sich Kommandozeile und Oberfläche über den Rechenkern.

export { formatCredits, formatDecimal, formatMoney } from "../kern/index.ts";

const numberFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 20 });
const moneyFormat = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 20 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** `2026-10-09` → `09.10.2026` */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

const UNIT_TEXT = {
  credits_per_second: (value: number) => `${formatNumber(value)} Credits je Sekunde`,
  credits_per_image: (value: number) => `${formatNumber(value)} Credits je Bild`,
  USD: (value: number) => `${moneyFormat.format(value)} $`,
  EUR: (value: number) => `${moneyFormat.format(value)} € netto`,
} as const;

export function formatPriceValue(price: Price): string {
  switch (price.status) {
    case "known":
      return UNIT_TEXT[price.unit](price.value);
    case "unknown":
      return "kein Preis hinterlegt";
    case "unavailable":
      return "gibt es nicht";
  }
}

/** Ein Preis mit Wert, Stand und Quelle in einer Zeile (AC-F8-1). */
export function formatPrice(price: Price): string {
  return `${formatPriceValue(price)} · Stand ${formatDate(price.asOf)} · Quelle: ${price.source}`;
}
