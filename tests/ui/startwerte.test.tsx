// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { fakeSource, renderApp, type } from "../hilfen/ui.tsx";

afterEach(cleanup);

const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;
const result = () => screen.getByRole("main", { name: "Ergebnis" });

describe("AC-F10-9 beim ersten Öffnen steht rechts sofort ein Ergebnis", () => {
  test("AC-F10-9 alle Pflichtfelder sind mit den Startwerten aus einstellungen.json vorbelegt", async () => {
    await renderApp();
    expect(value("Noch offene Dauer (M:SS)")).toBe("10:00");
    expect(screen.getByRole("combobox", { name: "Videomodell" }).textContent).toContain("Seedance 2.5");
    expect(screen.getByRole("combobox", { name: "Auflösung" }).textContent).toContain("480p");
    expect(value("Versuche pro Clip")).toBe("3");
    expect(screen.getByRole("combobox", { name: "Lichtbilder und Referenzbilder je Clip" }).textContent).toContain(
      "Seedream 5.0 Pro",
    );
    expect(value("Aktueller Credit-Stand")).toBe("0");
    expect(within(result()).queryByText(/Gib noch an/)).toBeNull();
    expect(within(result()).getAllByText(/\d €$/).length).toBeGreaterThan(0);
  });
});

describe("AC-F10-10 Dauer über Regler bis 15 Minuten und über das Eingabefeld", () => {
  test("AC-F10-10 der Regler setzt das Feld, das Feld setzt den Regler", async () => {
    await renderApp();
    const slider = screen.getByRole("slider", { name: "Noch offene Dauer" });
    expect(slider.getAttribute("aria-valuenow")).toBe("600");
    expect(slider.getAttribute("aria-valuemax")).toBe("900");
    await act(async () => {
      fireEvent.keyDown(slider, { key: "End" });
    });
    expect(value("Noch offene Dauer (M:SS)")).toBe("15:00");
    await act(async () => {
      fireEvent.keyDown(slider, { key: "ArrowLeft" });
    });
    expect(value("Noch offene Dauer (M:SS)")).toBe("14:59");

    await type("Noch offene Dauer (M:SS)", "12:30");
    expect(slider.getAttribute("aria-valuenow")).toBe("750");
    await type("Noch offene Dauer (M:SS)", "20:00");
    expect(slider.getAttribute("aria-valuenow")).toBe("900");
    expect(value("Noch offene Dauer (M:SS)")).toBe("20:00");
  });
});

describe("AC-F10-11 Credit-Stand live aus dem Higgsfield-Konto, von Hand überschreibbar", () => {
  test("AC-F10-11 der Live-Stand ersetzt den Startwert; eine eigene Eingabe bleibt, bis der Live-Stand übernommen wird", async () => {
    let credits = 215;
    await renderApp(fakeSource(undefined, undefined, async () => ({ ok: true, credits })));
    expect(value("Aktueller Credit-Stand")).toBe("215");
    expect(screen.getByText(/Live aus deinem Higgsfield-Konto, Stand \d\d:\d\d Uhr/)).toBeTruthy();

    await type("Aktueller Credit-Stand", "5000");
    expect(screen.getByText("Von Hand eingetragen")).toBeTruthy();
    credits = 180;
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Live-Stand übernehmen" }));
    });
    expect(value("Aktueller Credit-Stand")).toBe("180");
  });

  test("AC-F10-11 schlägt der Abruf fehl, sagt ein Hinweis warum, und das Ergebnis steht trotzdem", async () => {
    await renderApp(
      fakeSource(undefined, undefined, async () => ({ ok: false, message: "Higgsfield meldet: Session expired." })),
    );
    expect(
      screen.getByText(/Live-Abruf aus Higgsfield nicht möglich: Higgsfield meldet: Session expired\./),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Erneut abrufen" })).toBeTruthy();
    expect(value("Aktueller Credit-Stand")).toBe("0");
    expect(within(result()).queryByText(/Gib noch an/)).toBeNull();
  });
});
