import { expect, test } from "vitest";
import { calculateTotal, type TotalProject } from "../../src/kern/index.ts";
import type { Inputs } from "../../src/schema/index.ts";
import { fixturePrices, STANDARD_RAW } from "../hilfen/preise.ts";

const RATE = { value: 1.08, date: "2026-10-09", origin: "manual" as const };
const { durationSeconds: _duration, ...withoutDuration } = STANDARD_RAW;

// Drei Projekte mit bekanntem Bedarf (Video und Bilder je Clip, ohne Kontostand):
// 1. Standardbeispiel: 5.625 Video + 315 Bilder = 5.940 Credits
// 2. 12 offene Clips → 15 Clips: 2.812,5 + 157,5 = 2.970 Credits
// 3. Seedance 2.5 in 720p, 1:00 offen, 2 Versuche → 10 Clips: 10 × 7,5 s × 14 = 1.050 + 105 = 1.155 Credits
const PROJECTS: TotalProject[] = [
  { name: "Projekt 1", inputs: { ...STANDARD_RAW } as Inputs },
  { name: "Projekt 2", inputs: { ...withoutDuration, clipCount: 12, creditBalance: 800 } as Inputs },
  {
    name: "Projekt 3",
    inputs: {
      ...STANDARD_RAW,
      modelId: "seedance-2.5",
      resolution: "720p",
      durationSeconds: 60,
      attemptsPerClip: 2,
      creditBalance: 50000,
    } as Inputs,
  },
];

function total(projects: TotalProject[], balance: unknown) {
  const outcome = calculateTotal(projects, balance, fixturePrices(), RATE);
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => error.message).join("\n"));
  return outcome.value;
}

test("AC-F15-1 der Bedarf aller Projekte wird summiert und der Kontostand genau einmal abgezogen", () => {
  const result = total(PROJECTS, 3000);
  expect(result.projects.map((project) => [project.name, project.credits])).toEqual([
    ["Projekt 1", "5940"],
    ["Projekt 2", "2970"],
    ["Projekt 3", "1155"],
  ]);
  expect(result.totalCredits).toBe("10065");
  expect(result.plan?.creditsNeeded).toBe("10065");
  expect(result.plan?.shortfall).toBe("7065");
  expect(result.creditBalance).toBe(3000);
});

test("AC-F15-2 die in den Projekten gespeicherten Kontostände zählen nicht mit", () => {
  const changed = PROJECTS.map((project) => ({ ...project, inputs: { ...project.inputs, creditBalance: 99999 } }));
  expect(total(changed, 3000)).toEqual(total(PROJECTS, 3000));
});

test("AC-F15-3 für den Fehlbetrag gilt die günstigste Paketkombination, brutto in Euro", () => {
  const plan = total(PROJECTS, 3000).plan;
  // 7.065 Credits → 7.100 zu je 0,085 $ netto (reguläre Preise der Testdaten): 5.000 + 2.000 + 100
  expect(plan?.packages.map((pack) => [pack.count, pack.credits])).toEqual([
    [1, 5000],
    [1, 2000],
    [1, 100],
  ]);
  expect(plan?.net.usd).toBe("603.5");
  expect(Number(plan?.gross.eur).toFixed(2)).toBe("664.97");
});

test("AC-F15-4 deckt der Kontostand alles, ist nichts zu kaufen", () => {
  const result = total(PROJECTS, 20000);
  expect(result.plan?.shortfall).toBe("0");
  expect(result.plan?.packages).toEqual([]);
  expect(result.notes).toContainEqual(expect.objectContaining({ kind: "covered" }));
});

test("AC-F15-5 ein Projekt ohne Preis steht mit Grund in der Liste, aber nicht in der Summe", () => {
  const unpriced: TotalProject = {
    name: "Ohne Preis",
    inputs: { ...STANDARD_RAW, modelId: "seedance-2.0-mini", resolution: "720p" } as Inputs,
  };
  const result = total([PROJECTS[0] as TotalProject, unpriced], 0);
  expect(result.totalCredits).toBe("5940");
  expect(result.projects[1]).toMatchObject({ name: "Ohne Preis", credits: null });
  expect(result.notes).toContainEqual(
    expect.objectContaining({ kind: "error", text: expect.stringContaining("„Ohne Preis“ ist nicht in der Summe") }),
  );
});

test("AC-F15-6 ein ungültiger Kontostand wird gemeldet, statt zu rechnen", () => {
  const outcome = calculateTotal(PROJECTS, -5, fixturePrices(), RATE);
  expect(outcome.ok ? "" : outcome.errors[0]?.message).toContain("nicht negativ");
});
