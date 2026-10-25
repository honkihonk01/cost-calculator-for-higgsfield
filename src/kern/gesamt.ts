import Big from "big.js";
import { z } from "zod";
import {
  type ExchangeRate,
  type Inputs,
  issuesToErrors,
  type Note,
  type Outcome,
  type PriceData,
  totalBalanceSchema,
} from "../schema/index.ts";
import { calculate, type Serialized } from "./berechnung.ts";
import { type Plan, planForCredits } from "./kaufplan.ts";
import { deNumber } from "./text.ts";

// Gesamtkalkulation mehrerer gespeicherter Projekte (SPEC F15, docs/DECISIONS.md 2026-10-25). Jedes Projekt rechnet
// calculate() wie gewohnt, aber mit Credit-Stand 0, damit der Kontostand nur einmal zählt: Er gilt allein hier und
// wird von der Summe abgezogen. calculate() bleibt die einzige Stelle, die einen Film rechnet; hier wird nur summiert.

export type TotalProject = { name: string; inputs: Inputs };

type TotalValues = {
  projects: {
    name: string;
    /** gewählter Weg des Projekts, zum Beispiel „Seedance 2.5 · 480p“; `null`, wenn es nicht gerechnet werden kann */
    pathLabel: string | null;
    /** gesamter Credit-Bedarf (Video und alle Bilder) ohne Kontostand; `null`, wenn das Projekt nicht in der Summe ist */
    credits: Big | null;
    /** warum das Projekt nicht in der Summe ist */
    problem: string | null;
  }[];
  totalCredits: Big;
  creditBalance: number;
  /** Kauf für die Summe minus Kontostand; `null`, wenn kein Paket einen Preis hat */
  plan: Plan | null;
  notes: Note[];
};

export type TotalResult = Serialized<TotalValues>;

export function calculateTotal(
  projects: TotalProject[],
  rawBalance: unknown,
  prices: PriceData,
  rate: ExchangeRate | null,
): Outcome<TotalResult> {
  const balance = z.object({ creditBalance: totalBalanceSchema }).safeParse({ creditBalance: rawBalance });
  if (!balance.success) return { ok: false, errors: issuesToErrors(balance.error) };
  const creditBalance = balance.data.creditBalance;

  const rows: TotalValues["projects"] = projects.map((project) => {
    const outcome = calculate({ ...project.inputs, creditBalance: 0 }, prices, rate);
    if (!outcome.ok) {
      return { name: project.name, pathLabel: null, credits: null, problem: outcome.errors[0]?.message ?? "Fehler" };
    }
    const result = outcome.value;
    const path = result.paths.find((candidate) => candidate.id === result.selected.pathId);
    const credits = result.selected.totalCredits;
    return {
      name: project.name,
      pathLabel: path?.label ?? result.selected.pathId,
      credits: credits === null ? null : new Big(credits),
      problem: credits === null ? "Für die gewählte Kombination ist kein Preis hinterlegt." : null,
    };
  });

  const totalCredits = rows.reduce((sum, row) => (row.credits ? sum.plus(row.credits) : sum), new Big(0));
  const notes: Note[] = rows
    .filter((row) => row.problem)
    .map((row) => ({ kind: "error", text: `„${row.name}“ ist nicht in der Summe: ${row.problem}` }));
  const plan = planForCredits(totalCredits, "gesamt", {
    creditBalance,
    prices,
    priceLevel: prices.settings.packagePriceLevel,
    rate,
  });
  if (plan?.shortfall.eq(0)) {
    notes.push({
      kind: "covered",
      text: `Dein Kontostand von ${deNumber(creditBalance)} Credits deckt alle ausgewählten Projekte; danach bleiben ${deNumber(plan.leftoverCredits.toString())} Credits übrig.`,
    });
  }
  const values: TotalValues = { projects: rows, totalCredits, creditBalance, plan, notes };
  // big.js schreibt sich in JSON als exakter Dezimaltext, wie beim Ergebnis von calculate().
  return { ok: true, value: JSON.parse(JSON.stringify(values)) as TotalResult };
}
