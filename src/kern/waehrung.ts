import Big from "big.js";
import type { ExchangeRate, Note, Price } from "../schema/index.ts";
import { deDate, deNumber } from "./text.ts";

// SPEC F4: Euro = Dollar brutto ÷ Kurs, weil der Kurs „Dollar je 1 Euro“ bedeutet.

export function usdToEur(usd: Big, rate: ExchangeRate): Big {
  return usd.div(new Big(rate.value));
}

/** Hinweis, welcher Kurs gilt (AC-F4-1 bis AC-F4-4). */
export function exchangeRateNote(rate: ExchangeRate | null): Note {
  if (rate === null) {
    return {
      kind: "info",
      text: "Kein Wechselkurs verfügbar: keine Verbindung zur Zentralbank, kein gespeicherter und kein manueller Kurs. Alle Beträge stehen in Dollar, und die Empfehlungen vergleichen in Dollar. Für Euro-Werte gib unter „Weitere Einstellungen“ einen Kurs von Hand ein.",
    };
  }
  const value = `${deNumber(rate.value)} $ je 1 €`;
  switch (rate.origin) {
    case "ecb":
      return {
        kind: "info",
        text: `Wechselkurs: Referenzkurs der Europäischen Zentralbank vom ${deDate(rate.date)}, ${value}.`,
      };
    case "cached":
      return {
        kind: "info",
        text: `Offline: Der aktuelle Kurs ließ sich nicht abrufen. Gerechnet wird mit dem gespeicherten Kurs vom ${deDate(rate.date)}, ${value}.`,
      };
    case "manual":
      return { kind: "info", text: `Wechselkurs manuell eingegeben: ${value}.` };
  }
}

/** Geldbetrag mit Währung; Pässe und Pakete können in Dollar oder Euro notiert sein. */
export type Money = { amount: Big; unit: "USD" | "EUR" };

/** Bruttopreis eines bekannten Dollar- oder Euro-Preises; sonst `null`. */
export function grossMoney(price: Price, vatPercent: number): Money | null {
  if (price.status !== "known" || (price.unit !== "USD" && price.unit !== "EUR")) return null;
  return { amount: new Big(price.value).times(new Big(1).plus(new Big(vatPercent).div(100))), unit: price.unit };
}

/** Betrag in Euro; Dollar nur mit Kurs. */
export function moneyToEur(money: Money, rate: ExchangeRate | null): Big | null {
  if (money.unit === "EUR") return money.amount;
  return rate ? usdToEur(money.amount, rate) : null;
}

/** Verhältnis a ÷ b; gleiche Währung exakt, verschiedene nur über den Kurs. */
export function moneyRatio(a: Money, b: Money, rate: ExchangeRate | null): Big | null {
  if (a.unit === b.unit) return a.amount.div(b.amount);
  const aEur = moneyToEur(a, rate);
  const bEur = moneyToEur(b, rate);
  return aEur && bEur ? aEur.div(bEur) : null;
}

/** Bruttobetrag, wie er im Ergebnis steht (exakte Dezimaltexte je Währung). */
export type GrossText = { eur: string | null; usd: string | null };

/**
 * Wie sich ein Bruttobetrag gegenüber dem vorher angezeigten verändert hat, für das Differenz-Schild am Preis:
 * jetzt minus vorher, in Euro, wenn beide Beträge Euro haben, sonst in Dollar. Ohne gemeinsame Währung `null`.
 */
export function grossChange(previous: GrossText, current: GrossText): { amount: string; unit: "EUR" | "USD" } | null {
  if (previous.eur !== null && current.eur !== null) {
    return { amount: new Big(current.eur).minus(new Big(previous.eur)).toString(), unit: "EUR" };
  }
  if (previous.eur === null && current.eur === null && previous.usd !== null && current.usd !== null) {
    return { amount: new Big(current.usd).minus(new Big(previous.usd)).toString(), unit: "USD" };
  }
  return null;
}
