import { describe, expect, test } from "vitest";
import { type CreditInputs, computeCredits, totalCredits } from "../../src/kern/index.ts";
import type { PriceData } from "../../src/schema/index.ts";
import { fixturePrices, STANDARD_INPUTS } from "../hilfen/preise.ts";

function credits(changes: Partial<CreditInputs> = {}, prices: PriceData = fixturePrices()) {
  const outcome = computeCredits({ ...STANDARD_INPUTS, ...changes }, prices);
  if (!outcome.ok) throw new Error(outcome.errors.map((error) => error.message).join("\n"));
  return outcome.value;
}

/** Credits je Sekunde fertigem Film für einen Weg, als exakter Dezimaltext. */
function perSecond(pathId: string, changes: Partial<CreditInputs> = {}): string | undefined {
  return credits(changes)
    .paths.find((path) => path.id === pathId)
    ?.creditsPerSecond?.toString();
}

const ATTEMPTS = [1, 2, 3, 4, 5];

test("AC-F2-1 Seedance 2.5 stimmt für 1 bis 5 Versuche mit der Prüftabelle 4.4 überein", () => {
  const table = { "seedance-2.5@720p": [7, 14, 21, 28, 35], "seedance-2.5@1080p": [16, 32, 48, 64, 80] };
  const draft = [19, 22, 25, 28, 31];
  for (const [index, attempts] of ATTEMPTS.entries()) {
    for (const [pathId, values] of Object.entries(table)) {
      expect(perSecond(pathId, { attemptsPerClip: attempts }), `${pathId} bei ${attempts}`).toBe(String(values[index]));
    }
    expect(perSecond("seedance-2.5-draft@1080p", { attemptsPerClip: attempts })).toBe(String(draft[index]));
  }
});

test("AC-F2-2 Seedance 2.0 stimmt für 1 bis 5 Versuche mit der Prüftabelle 4.4a überein", () => {
  const table = {
    "seedance-2.0-enhanced-fast@720p": ["3.5", "7", "10.5", "14", "17.5"],
    "seedance-2.0-standard@720p": ["4.5", "9", "13.5", "18", "22.5"],
    "seedance-2.0-standard@1080p": ["9", "18", "27", "36", "45"],
  };
  for (const [index, attempts] of ATTEMPTS.entries()) {
    for (const [pathId, values] of Object.entries(table)) {
      expect(perSecond(pathId, { attemptsPerClip: attempts }), `${pathId} bei ${attempts}`).toBe(values[index]);
    }
  }
});

test("AC-F2-3 Storyboard für 30 Clips kostet mit Seedream 5.0 Flash 30 und mit Pro 180 Credits", () => {
  const flash = credits({ storyboardModelId: "seedream-5.0-flash" });
  expect(flash.clips.count.toString()).toBe("30");
  expect(flash.images.storyboard?.credits?.toString()).toBe("30");
  expect(credits({ storyboardModelId: "seedream-5.0-pro" }).images.storyboard?.credits?.toString()).toBe("180");
});

test("AC-F2-4 Rabatt 25 % im Standardumfang: 1080p kostet 12 statt 16, Draft 3 × v + 12, Rest unverändert", () => {
  const discount = { ...STANDARD_INPUTS.discount, enabled: true };
  for (const attempts of ATTEMPTS) {
    const changes = { discount, attemptsPerClip: attempts };
    expect(perSecond("seedance-2.5@1080p", changes)).toBe(String(12 * attempts));
    expect(perSecond("seedance-2.5-draft@1080p", changes)).toBe(String(3 * attempts + 12));
    expect(perSecond("seedance-2.5@720p", changes)).toBe(String(7 * attempts));
    expect(perSecond("seedance-2.0-standard@1080p", changes)).toBe(String(9 * attempts));
    expect(perSecond("seedance-2.0-enhanced-fast@720p", changes)).toBe(String(3.5 * attempts));
  }
});

test("AC-F2-5 Audio-Aufschlag 50 %: Seedance 2.0 Standard 720p kostet 6,75 je Sekunde, Seedance 2.5 bleibt gleich", () => {
  const changes = { attemptsPerClip: 1, audioSurchargePercent: 50 };
  expect(perSecond("seedance-2.0-standard@720p", changes)).toBe("6.75");
  expect(perSecond("seedance-2.5@720p", changes)).toBe("7");
  expect(perSecond("seedance-2.5-draft@1080p", changes)).toBe("19");
  expect(perSecond("seedance-2.0-standard@720p", { attemptsPerClip: 1, audioSurchargePercent: 100 })).toBe("9");
});

describe("AC-F2-6 unbekannter Preis", () => {
  test("AC-F2-6 ein Weg ohne Preis hat keine Zahl, keine Summe und steht am Ende", () => {
    const result = credits();
    const mini = result.paths.find((path) => path.id === "seedance-2.0-mini@720p");
    expect(mini).toMatchObject({ status: "no-price", creditsPerSecond: null, videoCredits: null });
    if (!mini) return;
    expect(totalCredits(mini, result.images)).toBeNull();
    const firstWithoutPrice = result.paths.findIndex((path) => path.status === "no-price");
    expect(result.paths.slice(firstWithoutPrice).every((path) => path.status === "no-price")).toBe(true);
    expect(result.paths.slice(0, firstWithoutPrice).every((path) => path.creditsPerSecond !== null)).toBe(true);
  });

  test("AC-F2-6 gewählte Kombination ohne Preis meldet „kein Preis hinterlegt“", () => {
    const result = credits({ modelId: "seedance-2.0-standard", resolution: "4K" });
    expect(result.selectedPathId).toBe("seedance-2.0-standard@4K");
    expect(result.notes).toEqual([
      expect.objectContaining({ kind: "no-price", text: expect.stringContaining("kein Preis hinterlegt") }),
    ]);
  });
});

describe("AC-F2-7 unzulässige Kombination", () => {
  test("AC-F2-7 Seedance 2.5 in 4K: Meldung nennt die erlaubten Auflösungen, kein Ergebnis", () => {
    const outcome = computeCredits({ ...STANDARD_INPUTS, modelId: "seedance-2.5", resolution: "4K" }, fixturePrices());
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors).toEqual([expect.objectContaining({ field: "resolution" })]);
    expect(outcome.errors[0].message).toContain("480p, 720p, 1080p");
  });

  test("AC-F2-7 Seedance 2.5 Draft liefert nur 1080p", () => {
    const outcome = computeCredits({ ...STANDARD_INPUTS, resolution: "720p" }, fixturePrices());
    expect(outcome.ok ? "" : outcome.errors[0].message).toContain("1080p");
  });

  test("AC-F2-7 unbekanntes Videomodell und Bildmodell ohne Storyboard werden abgelehnt", () => {
    expect(computeCredits({ ...STANDARD_INPUTS, modelId: "seedance-9" }, fixturePrices()).ok).toBe(false);
    const image = computeCredits(
      { ...STANDARD_INPUTS, storyboardModelId: "gpt-image-2.5-flare-high-1k" },
      fixturePrices(),
    );
    expect(image.ok ? undefined : image.errors[0].field).toBe("storyboardModelId");
  });
});

describe("Produktionswege nach SPEC Entscheidungen 10 und 11", () => {
  test("Standardbeispiel: Draft-Weg braucht 30 × 7,5 s × 25 = 5.625 Video-Credits, mit Bildern je Clip 5.940", () => {
    const result = credits();
    const draft = result.paths.find((path) => path.id === result.selectedPathId);
    expect(draft?.videoCredits?.toString()).toBe("5625");
    expect(draft && totalCredits(draft, result.images)?.toString()).toBe("5940");
  });

  test("Ziel 1080p zeigt keine 480p-Wege; Ziel 480p zeigt zusätzlich alle 480p-Wege", () => {
    const at1080 = credits().paths.map((path) => path.id);
    expect(at1080.some((id) => id.endsWith("@480p"))).toBe(false);
    expect(at1080).toContain("seedance-2.0-standard@4K");
    const at480 = credits({ modelId: "seedance-2.5", resolution: "480p" }).paths.map((path) => path.id);
    expect(at480).toContain("seedance-2.5@480p");
    expect(at480).toContain("seedance-2.0-standard@480p");
  });

  test("Cliplänge unter 4 s rechnet je Versuch 4 s ab", () => {
    const result = credits({ clipLengthSeconds: 3 });
    const draft = result.paths.find((path) => path.id === result.selectedPathId);
    expect(draft?.videoCredits?.toString()).toBe(result.clips.count.times(4).times(25).toString());
  });

  test("Modelle, die die Cliplänge nicht erzeugen können, fehlen mit Hinweis im Vergleich", () => {
    const result = credits({ modelId: "seedance-2.5", clipLengthSeconds: 20 });
    expect(result.paths.some((path) => path.modelId.startsWith("seedance-2.0"))).toBe(false);
    expect(result.notes.filter((note) => note.text.includes("15 s"))).toHaveLength(3);
  });
});

test("AC-F8-5 ein neues Videomodell erscheint ohne Code-Änderung als Produktionsweg", () => {
  const prices = fixturePrices();
  const template = prices.videoModels.models[0];
  prices.videoModels.models.push({
    ...structuredClone(template),
    id: "seedance-2.6",
    name: "Seedance 2.6",
    badge: null,
  });
  const path = credits({}, prices).paths.find((candidate) => candidate.id === "seedance-2.6@1080p");
  expect(path).toMatchObject({ label: "Seedance 2.6 · 1080p", status: "ok" });
  expect(path?.creditsPerSecond?.toString()).toBe("48");
});
