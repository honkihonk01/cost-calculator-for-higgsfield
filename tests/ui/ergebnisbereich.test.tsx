// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { choose, fakeSource, fillStandard, openTab, renderApp, type } from "../hilfen/ui.tsx";

afterEach(cleanup);

function answer() {
  return screen.getByRole("region", { name: "Kosten deiner Auswahl" });
}

/** Eine Zeile einer Vergleichsliste, erkannt an ihrem Titel. */
function row(list: string, title: string): HTMLElement {
  const rows = within(screen.getByRole("list", { name: list })).getAllByRole("listitem");
  const found = rows.find((item) => item.querySelector(".option__title")?.textContent?.startsWith(title));
  if (!found) throw new Error(`Keine Zeile „${title}“ in „${list}“`);
  return found;
}

function panel() {
  return screen.getByRole("tabpanel");
}

describe("AC-F10-7 oben genau eine Antwort, alles Weitere in Reitern", () => {
  test("AC-F10-12 oben deine Auswahl: brutto groß, netto klein, dazu die Pakete zum Kaufen", async () => {
    const { container } = await renderApp();
    await fillStandard();
    const top = answer();
    expect(container.querySelectorAll(".answer__value")).toHaveLength(1);
    expect(document.querySelector(".answer__value")?.textContent).toBe("374,63 €");
    expect(within(top).getByText("Seedance 2.5 Draft + 1080p über Credit-Pakete")).toBeTruthy();
    expect(within(top).getByText("netto 314,81 € · 3.940 Credits fehlen noch")).toBeTruthy();
    const table = within(top).getByRole("table", { name: /Zu kaufen · Paketpreise vom 09\.10\.2026/ });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Anzahl", "Paket", "Preis je Paket", "Summe"]);
    expect(within(table).getAllByRole("row")[1]?.textContent).toBe("1 ×4.000 Credits374,63 €374,63 €");
    expect(within(table).getByRole("rowheader", { name: "Zusammen brutto" })).toBeTruthy();
    // Keine Begründung, keine Schwelle oben: die stehen aufgeklappt in den Listen.
    expect(within(top).queryByText(/Ändert sich bei/)).toBeNull();
  });

  test("AC-F10-18 der Credit-Bedarf steht groß unter dem Preis, kleiner und in Sekundärfarbe", async () => {
    await renderApp();
    await fillStandard();
    const credits = answer().querySelector(".answer__credits");
    expect(credits?.textContent).toBe("5.940 Credits Bedarf");
    // Reihenfolge in der Karte: erst Euro, dann Credits, dann netto
    expect(credits?.previousElementSibling?.className).toContain("answer__value");
    expect(credits?.nextElementSibling?.className).toContain("answer__meta");
  });

  test("AC-F10-7 zwei Reiter, immer nur einer sichtbar; Cmd+1 und Cmd+2 wechseln; keine Pässe", async () => {
    await renderApp();
    await fillStandard();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Produktionswege", "Details"]);
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(within(panel()).getByRole("list", { name: "Produktionswege im Vergleich" })).toBeTruthy();
    expect(screen.queryByText(/Pass/)).toBeNull();

    await act(async () => {
      fireEvent.keyDown(window, { key: "2", metaKey: true });
    });
    expect(screen.getByRole("tab", { name: "Details" }).getAttribute("aria-selected")).toBe("true");
    expect(within(panel()).getByText("1 × 4.000 Credits")).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(window, { key: "1", metaKey: true });
    });
    expect(screen.getByRole("tab", { name: "Produktionswege" }).getAttribute("aria-selected")).toBe("true");
  });

  test("AC-F6-7 oben steht immer das gewählte Videomodell, auch wenn ein anderes günstiger wäre", async () => {
    await renderApp();
    await fillStandard();
    await choose("Videomodell", /Seedance 2\.0 Standard/);
    await choose("Auflösung", "1080p");
    expect(within(answer()).getByText("Seedance 2.0 Standard · 1080p über Credit-Pakete")).toBeTruthy();
    expect(document.querySelector(".answer__value")?.textContent).toBe("412,09 €");
  });

  test("AC-F10-7 Hinweise stehen bei dem, was sie betreffen", async () => {
    await renderApp();
    await fillStandard();
    const top = answer();
    expect(top.querySelectorAll(".note")).toHaveLength(0);

    expect(within(panel()).getAllByText(/Ohne Preis und deshalb nie empfohlen/).length).toBeGreaterThan(0);

    await openTab("Details");
    const packages = within(panel()).getByRole("region", {
      name: "Kauf für deine Auswahl: Seedance 2.5 Draft + 1080p",
    });
    expect(within(packages).getByText("60 Credits")).toBeTruthy();
    expect(within(panel()).getByText(/Nach dem Kauf bleiben 60 Credits übrig/)).toBeTruthy();
    expect(within(panel()).getByText("1,08 $ · von Hand eingegeben, 09.10.2026")).toBeTruthy();
    expect(within(panel()).getByText(/reicht mit Seedance 2.5 Draft plus 1080p für etwa 75,8 s/)).toBeTruthy();
  });
});

describe("AC-F10-13 Vergleichsliste nach Preis-Leistung mit Überschrift", () => {
  test("AC-F10-13 Überschrift, Reihenfolge nach Kosten je Qualitätspunkt, Empfehlung mit Begründung und Pakettabelle", async () => {
    await renderApp();
    await fillStandard();
    expect(
      within(panel()).getByRole("heading", { name: "Produktionswege im Vergleich, sortiert nach Preis-Leistung" }),
    ).toBeTruthy();
    const rows = within(screen.getByRole("list", { name: "Produktionswege im Vergleich" })).getAllByRole("listitem");
    expect(rows.map((item) => item.querySelector(".option__title")?.textContent?.replace("Empfehlung", ""))).toEqual([
      "Seedance 2.0 Enhanced Fast · 720p",
      "Seedance 2.5 Draft + 1080p",
      "Seedance 2.0 Standard · 720p",
      "Seedance 2.5 · 720p",
      "Seedance 2.0 Standard · 1080p",
      "Seedance 2.5 · 1080p",
    ]);
    const best = row("Produktionswege im Vergleich", "Seedance 2.0 Enhanced Fast · 720p");
    expect(within(best).getByText("1,4 Punkte · 180,63 € je Punkt")).toBeTruthy();
    expect(
      within(best).getByText("Bestes Preis-Leistungs-Verhältnis: Seedance 2.0 Enhanced Fast in 720p."),
    ).toBeTruthy();
    expect(within(best).getByText(/ohne Abzug deines Credit-Stands/)).toBeTruthy();
    expect(
      within(best).getByText(/^Zum Vergleich: nächstbestes Verhältnis: Seedance 2.5 Draft plus 1080p/),
    ).toBeTruthy();

    // AC-F10-14 rechts Preis und Unterschied zu deiner Auswahl, ohne Rahmen um die Zahl
    expect(within(best).getByText("−309,07 € zu deiner Auswahl")).toBeTruthy();
    expect(best.querySelector(".price-tile")).toBeNull();
    const draft = row("Produktionswege im Vergleich", "Seedance 2.5 Draft + 1080p");
    expect(within(draft).getByText("deine Auswahl")).toBeTruthy();
    expect(within(within(draft).getByRole("table")).getByRole("rowheader", { name: "Zusammen brutto" })).toBeTruthy();
  });
});

test("AC-F6-6 Wege ohne Preis stehen zusammengefasst in einer letzten Zeile und nie als Empfehlung", async () => {
  await renderApp();
  await fillStandard();
  const rows = within(screen.getByRole("list", { name: "Produktionswege im Vergleich" })).getAllByRole("listitem");
  expect(
    screen.getByText(/^Ohne Preis und deshalb nie empfohlen: Seedance 2\.0 Standard · 4K, Seedance 2\.0 Mini · 720p/),
  ).toBeTruthy();
  expect(rows.some((item) => item.textContent?.includes("Seedance 2.0 Mini · 720p"))).toBe(false);
  const recommended = rows.filter((item) => item.querySelector("details")?.dataset.highlight === "true");
  expect(recommended.map((item) => item.querySelector(".option__title")?.textContent)).toEqual([
    "Seedance 2.0 Enhanced Fast · 720pEmpfehlung",
  ]);
});

test("AC-F4-3 ohne Kurs: Betrag in Dollar, die Meldung steht oben bei der Antwort", async () => {
  const source = { ...fakeSource(), exchangeRate: async () => ({ rate: null }) };
  await renderApp(source);
  await fillStandard();
  const top = answer();
  expect(document.querySelector(".answer__value")?.textContent).toBe("404,60 $");
  expect(within(top).getByText(/Kein Wechselkurs verfügbar/)).toBeTruthy();
});

test("AC-F10-1 eine Änderung aktualisiert das Ergebnis ohne Knopf in unter 100 ms", async () => {
  await renderApp();
  await fillStandard();
  const durations: number[] = [];
  for (const attempts of ["2", "3", "4", "3"]) {
    const start = performance.now();
    await type("Versuche pro Clip", attempts, false);
    durations.push(performance.now() - start);
  }
  expect(document.querySelector(".answer__value")?.textContent).toBe("374,63 €");
  for (const duration of durations) expect(duration).toBeLessThan(100);
});

test("AC-F4-2 offline: Details nennen den gespeicherten Kurs mit Datum und den Hinweis „Offline“", async () => {
  const cached = { value: 1.08, date: "2026-10-07", origin: "cached" as const };
  await renderApp({ ...fakeSource(), cachedRate: async () => cached, exchangeRate: async () => ({ rate: cached }) });
  await fillStandard();
  await openTab("Details");
  expect(within(panel()).getByText("1,08 $ · gespeichert, offline, 07.10.2026")).toBeTruthy();
  expect(within(panel()).getByText(/Offline: Der aktuelle Kurs ließ sich nicht abrufen/)).toBeTruthy();
});
