import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { type ClipModel, type ClipScope, planClips } from "../../src/kern/index.ts";
import { parseDuration, scopeInputsSchema, type VideoModelsFile } from "../../src/schema/index.ts";
import { FIXTURE_DATA } from "../hilfen/daten.ts";

const models = (JSON.parse(readFileSync(join(FIXTURE_DATA, "preise/videomodelle.json"), "utf8")) as VideoModelsFile)
  .models;
function model(id: string): ClipModel {
  const found = models.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Modell ${id} fehlt in den Testdaten.`);
  return found;
}

function plan(scope: ClipScope, modelId = "seedance-2.5-draft") {
  const outcome = planClips(scope, model(modelId));
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => error.message).join("\n"));
  return outcome.value;
}

test("AC-F1-1 Dauer 3:00, Aufschlag 25 %, Cliplänge 7,5 s ergibt 225 s und 30 Clips", () => {
  const result = plan({ durationSeconds: 180, extraScenesPercent: 25, clipLengthSeconds: 7.5 });
  expect(result.openSeconds.toString()).toBe("225");
  expect(result.count.toString()).toBe("30");
  expect(result.lengthSeconds.toString()).toBe("7.5");
  expect(result.notes).toEqual([]);
});

test("AC-F1-2 Dauer 3:00, Aufschlag 20 %, Cliplänge 7 s rundet 30,86 Clips auf 31 auf", () => {
  const result = plan({ durationSeconds: 180, extraScenesPercent: 20, clipLengthSeconds: 7 });
  expect(result.openSeconds.toString()).toBe("216");
  expect(result.openSeconds.div(7).gt(30.85)).toBe(true);
  expect(result.count.toString()).toBe("31");
  expect(result.lengthSeconds.toString()).toBe("7");
});

describe("AC-F1-3 offene Clips plus Aufschlag", () => {
  test("AC-F1-3 20 offene Clips mit 25 % Aufschlag und 7,5 s ergeben 25 Clips und 187,5 s", () => {
    const result = plan({ clipCount: 20, extraScenesPercent: 25, clipLengthSeconds: 7.5 });
    expect(result.count.toString()).toBe("25");
    expect(result.openSeconds.toString()).toBe("187.5");
    expect(result.lengthSeconds.toString()).toBe("7.5");
  });

  test("AC-F1-3 7 offene Clips mit 25 % Aufschlag werden von 8,75 auf 9 Clips aufgerundet", () => {
    const result = plan({ clipCount: 7, extraScenesPercent: 25, clipLengthSeconds: 7.5 });
    expect(result.count.toString()).toBe("9");
  });
});

test("AC-F1-4 Cliplänge unter 4 s wird je Versuch mit 4 s abgerechnet, ein Hinweis nennt die Mindestlänge", () => {
  const short = plan({ durationSeconds: 180, extraScenesPercent: 25, clipLengthSeconds: 3 });
  expect(short.lengthSeconds.toString()).toBe("3");
  expect(short.billedSecondsPerAttempt.toString()).toBe("4");
  expect(short.count.toString()).toBe("75");
  expect(short.notes).toEqual([expect.objectContaining({ kind: "info", text: expect.stringContaining("4 s") })]);

  const normal = plan({ durationSeconds: 180, extraScenesPercent: 25, clipLengthSeconds: 7.5 });
  expect(normal.billedSecondsPerAttempt.toString()).toBe("7.5");
});

describe("AC-F1-5 Cliplänge über der Höchstlänge des Modells", () => {
  test("AC-F1-5 Seedance 2.0 mit 16 s: Meldung nennt Modell und 15 s, kein Ergebnis", () => {
    const outcome = planClips(
      { durationSeconds: 180, extraScenesPercent: 25, clipLengthSeconds: 16 },
      model("seedance-2.0-standard"),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual([expect.objectContaining({ field: "clipLengthSeconds" })]);
    expect(outcome.errors[0].message).toContain("Seedance 2.0 Standard");
    expect(outcome.errors[0].message).toContain("15 s");
  });

  test("AC-F1-5 Seedance 2.5 erlaubt bis 30 s, 16 s und 20 s sind gültig", () => {
    expect(planClips({ clipCount: 10, extraScenesPercent: 20, clipLengthSeconds: 16 }, model("seedance-2.5")).ok).toBe(
      true,
    );
    expect(planClips({ clipCount: 10, extraScenesPercent: 20, clipLengthSeconds: 20 }, model("seedance-2.5")).ok).toBe(
      true,
    );
  });
});

describe("AC-F1-6 ungültige oder fehlende Angabe zum offenen Umfang", () => {
  test("AC-F1-6 „3:75“ ist keine gültige Dauer und erzeugt eine Meldung", () => {
    const parsed = parseDuration("3:75");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toContain("59");
  });

  test("AC-F1-6 leere Dauer, Text und 0:00 sind ungültig", () => {
    expect(parseDuration("").ok).toBe(false);
    expect(parseDuration("drei Minuten").ok).toBe(false);
    expect(parseDuration("0:00").ok).toBe(false);
  });

  test("AC-F1-6 gültige Schreibweisen „3:00“, „3“, „180s“ und „2:30“", () => {
    expect(parseDuration("3:00")).toEqual({ ok: true, seconds: 180 });
    expect(parseDuration("3")).toEqual({ ok: true, seconds: 180 });
    expect(parseDuration("180s")).toEqual({ ok: true, seconds: 180 });
    expect(parseDuration(" 2:30 ")).toEqual({ ok: true, seconds: 150 });
  });

  test("AC-F1-6 weder Dauer noch Clips: Meldung am Feld, kein Ergebnis", () => {
    const result = scopeInputsSchema.safeParse({ extraScenesPercent: 25 });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ["durationSeconds"], message: expect.stringContaining("Dauer") }),
    ]);
    const outcome = planClips({ extraScenesPercent: 25, clipLengthSeconds: 7.5 }, model("seedance-2.5"));
    expect(outcome.ok).toBe(false);
  });

  test("AC-F1-6 Dauer und Clips zugleich: Meldung am Feld", () => {
    const result = scopeInputsSchema.safeParse({ durationSeconds: 180, clipCount: 20, extraScenesPercent: 25 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("nicht beides");
  });

  test("AC-F1-6 gültiger Umfang mit nur einer Angabe besteht die Prüfung", () => {
    expect(scopeInputsSchema.safeParse({ durationSeconds: 180, extraScenesPercent: 25 }).success).toBe(true);
    expect(scopeInputsSchema.safeParse({ clipCount: 20, extraScenesPercent: 25 }).success).toBe(true);
    expect(scopeInputsSchema.safeParse({ clipCount: 20, extraScenesPercent: 22 }).success).toBe(false);
  });
});
