// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { calculate } from "../../src/kern/index.ts";
import { saveProjectWith } from "../../src/laden/gemeinsam/index.ts";
import { nodeProjectIo } from "../../src/laden/node/index.ts";
import { type Inputs, newestPriceDate } from "../../src/schema/index.ts";
import { tempData } from "../hilfen/daten.ts";
import { fixturePrices, STANDARD_RAW } from "../hilfen/preise.ts";
import { fakeSource, renderApp, type } from "../hilfen/ui.tsx";

// Gesamtkalkulation in der App (SPEC F15) gegen einen echten temporären Datenordner (docs/TESTING.md).

let data: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  data = await tempData();
  const prices = fixturePrices();
  const { durationSeconds: _duration, ...withoutDuration } = STANDARD_RAW;
  const projects: [string, Inputs][] = [
    ["Projekt 1", { ...STANDARD_RAW } as Inputs],
    ["Projekt 2", { ...withoutDuration, clipCount: 12, creditBalance: 800 } as Inputs],
  ];
  for (const [name, inputs] of projects) {
    const result = calculate(inputs, prices, { value: 1.08, date: "2026-10-09", origin: "manual" });
    if (!result.ok) throw new Error("Rechnung fehlgeschlagen");
    await saveProjectWith(
      nodeProjectIo(data.dataDir),
      { name, inputs, result: result.value, pricesAsOf: newestPriceDate(prices) },
      { overwrite: false, now: "2026-10-25T10:00:00.000Z" },
    );
  }
});
afterEach(async () => {
  cleanup();
  await data.cleanup();
});

const source = () => fakeSource(fixturePrices(), data.dataDir);

async function openTotal() {
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Ansicht" })).getByRole("radio", { name: "Gesamtkalkulation" }),
    );
  });
  await waitFor(() => expect(screen.getByRole("checkbox", { name: /Projekt 1/ })).toBeTruthy());
}

async function check(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(name) }));
  });
}

test("AC-F15-8 Projekte anhaken: Tabelle mit Bedarf je Projekt, Summe, Kontostand einmal, Nachzukaufen", async () => {
  await renderApp(source());
  await openTotal();
  expect(screen.queryByRole("button", { name: "Als Projekt speichern" })).toBeNull();
  expect(screen.getByText(/Hake links mindestens ein gespeichertes Projekt an/)).toBeTruthy();

  await check("Projekt 1");
  await check("Projekt 2");
  await type("Aktueller Kontostand für die Gesamtkalkulation", "3000");

  const table = screen.getByRole("table", { name: /Credit-Bedarf der Projekte/ });
  const rows = within(table)
    .getAllByRole("row")
    .map((row) => row.textContent);
  expect(rows).toEqual([
    "ProjektWegCredit-Bedarf",
    "Projekt 1Seedance 2.5 Draft + 1080p5.940 Credits",
    "Projekt 2Seedance 2.5 Draft + 1080p2.970 Credits",
    "Summe8.910 Credits",
    "Abzüglich Kontostand−3.000 Credits",
    "Nachzukaufen5.910 Credits",
  ]);
  const top = screen.getByRole("region", { name: "Kosten der Gesamtkalkulation" });
  expect(within(top).getByText("2 Projekte zusammen über Credit-Pakete")).toBeTruthy();
  expect(top.querySelector(".answer__credits")?.textContent).toBe("8.910 Credits Bedarf");
  expect(within(top).getByText(/5\.910 Credits fehlen noch/)).toBeTruthy();
  expect(within(top).getByRole("table", { name: /Zu kaufen/ })).toBeTruthy();
});

test("AC-F15-7 die Auswahl ist nach einem Neustart der App noch angehakt", async () => {
  await renderApp(source());
  await openTotal();
  await check("Projekt 2");
  await waitFor(async () => {
    const io = nodeProjectIo(data.dataDir);
    expect(await io.readText("gesamtkalkulation.json")).toContain("Projekt 2");
  });
  cleanup();

  await renderApp(source());
  await openTotal();
  await waitFor(() =>
    expect((screen.getByRole("checkbox", { name: /Projekt 2/ }) as HTMLInputElement).checked).toBe(true),
  );
  expect((screen.getByRole("checkbox", { name: /Projekt 1/ }) as HTMLInputElement).checked).toBe(false);
});

test("AC-F15-9 der Kontostand der Gesamtkalkulation ändert das Einzelprojekt nicht", async () => {
  await renderApp(source());
  await type("Aktueller Credit-Stand", "1234");
  await openTotal();
  await type("Aktueller Kontostand für die Gesamtkalkulation", "500");
  await act(async () => {
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Ansicht" })).getByRole("radio", { name: "Einzelprojekt" }),
    );
  });
  expect((screen.getByLabelText("Aktueller Credit-Stand") as HTMLInputElement).value).toBe("1234");
});
