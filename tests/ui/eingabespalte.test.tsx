// @vitest-environment jsdom
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { fixturePrices } from "../hilfen/preise.ts";
import { choose, fakeSource, fillStandard, renderApp, type } from "../hilfen/ui.tsx";

afterEach(cleanup);

const REQUIRED = [
  "Noch offene Dauer (M:SS)",
  "Zwischenszenen, Inserts und Korrekturclips",
  "Videomodell",
  "Auflösung",
  "Versuche pro Clip",
  "Lichtbilder und Referenzbilder je Clip",
  "Aktueller Credit-Stand",
];

test("Grundlayout: Eingabespalte und Ergebnisbereich", async () => {
  await renderApp();
  expect(screen.getByRole("complementary", { name: "Eingaben" })).toBeTruthy();
  expect(screen.getByRole("main", { name: "Ergebnis" })).toBeTruthy();
});

describe("AC-F10-6 nur die sieben Pflichtfelder sind sichtbar", () => {
  test("AC-F10-6 frischer Start: sieben Pflichtfelder außerhalb, alles Optionale im geschlossenen Bereich", async () => {
    const { container } = await renderApp();
    const details = container.querySelector("details");
    expect(details?.open).toBe(false);
    for (const name of REQUIRED) {
      const field = screen.getByLabelText(name);
      expect(details?.contains(field), name).toBe(false);
    }
    for (const name of ["Storyboard", "Einmalige Assets"]) {
      const toggle = screen.getByRole("switch", { name });
      expect(details?.contains(toggle), name).toBe(false);
      expect(toggle.getAttribute("aria-checked"), name).toBe("false");
    }
    for (const name of [
      "Lichtbilder und Referenzbilder je Clip (mit Fehlversuchen)",
      "Durchschnittliche Cliplänge",
      "Rabatt auf Generierungspreise",
      "Wechselkurs von Hand (leer = Kurs der EZB)",
    ]) {
      expect(details?.contains(screen.getByLabelText(name)), name).toBe(true);
    }
    expect(within(details?.querySelector("summary") as HTMLElement).getByText("0 geändert")).toBeTruthy();
  });

  test("AC-F10-6 der Bereich zählt, wie viele optionale Felder vom Standard abweichen", async () => {
    const { container } = await renderApp();
    const summary = container.querySelector("summary") as HTMLElement;
    await act(async () => {
      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "Preisstand der Credit-Pakete" })).getByRole("radio", {
          name: "Mit Rabatt",
        }),
      );
    });
    await type("Durchschnittliche Cliplänge", "6");
    expect(within(summary).getByText("2 geändert")).toBeTruthy();
    await type("Durchschnittliche Cliplänge", "7,5");
    expect(within(summary).getByText("1 geändert")).toBeTruthy();
  });
});

describe("AC-F10-8 Storyboard und einmalige Assets fragen erst eingeschaltet nach ihrem Bildmodell", () => {
  test("AC-F10-8 Storyboard: aus ohne Bildmodell, eingeschaltet mit Seedream 5.0 Flash in derselben Box", async () => {
    await renderApp();
    await fillStandard();
    expect(screen.queryByRole("combobox", { name: "Bildmodell für das Storyboard" })).toBeNull();
    expect(document.querySelector(".answer__value")?.textContent).toBe("374,63 €");

    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Storyboard" }));
    });
    const box = screen.getByRole("region", { name: "Storyboard" });
    const model = within(box).getByRole("combobox", { name: "Bildmodell für das Storyboard" });
    expect(model.textContent).toContain("Seedream 5.0 Flash");
    expect(within(box).getByRole("switch", { name: "Storyboard" })).toBeTruthy();
    // 5.940 + 30 Storyboard-Credits: weiterhin ein 4.000er-Paket, also derselbe Betrag
    expect(document.querySelector(".answer__value")?.textContent).toBe("374,63 €");
  });

  test("AC-F10-8 einmalige Assets: eingeschaltet mit 5 Personen, 3 Orten und 8 Anläufen vorbelegt", async () => {
    await renderApp();
    await fillStandard();
    expect(screen.queryByLabelText("Personen im Film")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole("switch", { name: "Einmalige Assets" }));
    });
    expect((screen.getByLabelText("Personen im Film") as HTMLInputElement).value).toBe("5");
    expect((screen.getByLabelText("Orte im Film") as HTMLInputElement).value).toBe("3");
    expect((screen.getByLabelText("Anläufe pro Asset") as HTMLInputElement).value).toBe("8");
    const box = screen.getByRole("region", { name: "Einmalige Assets" });
    expect(within(box).getByRole("combobox", { name: "Bildmodell für die Assets" }).textContent).toContain(
      "Seedream 5.0 Pro",
    );
    expect(within(box).getByLabelText("Personen im Film")).toBeTruthy();
    // 6.948 Credits − 2.000 = 4.948 fehlend → 5.000er-Paket, 425 $ × 1,19 ÷ 1,08
    expect(document.querySelector(".answer__value")?.textContent).toBe("468,29 €");
    await type("Personen im Film", "-1");
    expect(within(screen.getByRole("complementary")).getByText(/Personen darf nicht negativ sein/)).toBeTruthy();
  });
});

test("AC-F10-2 frischer Start: Rabatt aus, Preisstand der Pakete wie in einstellungen.json, Cliplänge 7,5 s", async () => {
  await renderApp();
  expect(screen.getByRole("switch", { name: "Rabatt auf Generierungspreise" }).getAttribute("aria-checked")).toBe(
    "false",
  );
  const level = screen.getByRole("radiogroup", { name: "Preisstand der Credit-Pakete" });
  // Die Testdaten rechnen mit dem regulären Preis; die Startdaten stehen auf dem Rabattpreis (SPEC Entscheidung 26).
  expect(within(level).getByRole("radio", { name: "Regulär" }).getAttribute("aria-checked")).toBe("true");
  expect((screen.getByLabelText("Durchschnittliche Cliplänge") as HTMLInputElement).value).toBe("7,5");
  expect(screen.queryByRole("radiogroup", { name: "Preisstand der Unlimited-Pässe" })).toBeNull();
  expect(screen.queryByRole("slider", { name: "Netto-Generierungsstunden pro Tag" })).toBeNull();
});

describe("AC-F10-3 ungültiges Feld", () => {
  test("AC-F10-3 das Feld ist markiert, und der Ergebnisbereich zeigt die Meldung statt veralteter Zahlen", async () => {
    await renderApp();
    await fillStandard();
    const result = screen.getByRole("main", { name: "Ergebnis" });
    expect(document.querySelector(".answer__value")?.textContent).toBe("374,63 €");

    const attempts = await type("Versuche pro Clip", "0");
    expect(attempts.getAttribute("aria-invalid")).toBe("true");
    expect(within(screen.getByRole("complementary")).getByText("Gib mindestens 1 Versuch an.")).toBeTruthy();
    expect(within(result).getByText("Versuche pro Clip: Gib mindestens 1 Versuch an.")).toBeTruthy();
    expect(within(result).queryByText(/€/)).toBeNull();
  });

  test("AC-F10-3 eine ungültige Dauer wie „3:75“ wird am Feld gemeldet", async () => {
    await renderApp();
    const duration = await type("Noch offene Dauer (M:SS)", "3:75");
    expect(duration.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getAllByText(/Die Sekunden gehen nur bis 59/).length).toBeGreaterThan(0);
  });

  test("leert der Nutzer ein Pflichtfeld, nennt der Ergebnisbereich es ohne Fehlermarkierung", async () => {
    await renderApp();
    await type("Noch offene Dauer (M:SS)", "", false);
    const result = screen.getByRole("main", { name: "Ergebnis" });
    expect(within(result).getByText(/Gib noch an: Noch offen/)).toBeTruthy();
    expect(screen.queryAllByText("FEHLER")).toHaveLength(0);
  });
});

test("AC-F8-5 ein neues Videomodell erscheint ohne Code-Änderung im Modellwähler", async () => {
  const prices = fixturePrices();
  prices.videoModels.models.push({
    ...structuredClone(prices.videoModels.models[0]),
    id: "seedance-2.6",
    name: "Seedance 2.6",
    badge: null,
  });
  await renderApp(fakeSource(prices));
  await choose("Videomodell", /Seedance 2\.6/);
  expect(screen.getByRole("combobox", { name: "Videomodell" }).textContent).toContain("Seedance 2.6");
});

describe("weitere Fälle der Eingabespalte", () => {
  test("Regression: nach der Modellwahl meldet die geleerte, nie berührte Auflösung keinen Fehler", async () => {
    await renderApp();
    // Über das Draft-Modell (nur 1080p) wird die vorbelegte 480p geleert, ohne dass der Nutzer die Auflösung anfasst.
    await choose("Videomodell", /Seedance 2\.5 Draft/);
    await choose("Videomodell", /^Seedance 2\.5(?!\s*Draft)/);
    expect(screen.getByRole("combobox", { name: "Auflösung" }).getAttribute("data-invalid")).toBeNull();
    expect(screen.queryAllByText("FEHLER")).toHaveLength(0);
    expect(within(screen.getByRole("main", { name: "Ergebnis" })).getByText(/Gib noch an: Auflösung/)).toBeTruthy();
  });

  test("Regression: wechselt das Modell, wird eine nicht angebotene Auflösung geleert", async () => {
    await renderApp();
    await choose("Videomodell", /^Seedance 2\.0 Standard/);
    await choose("Auflösung", "4K");
    await choose("Videomodell", /^Seedance 2\.5(?!\s*Draft)/);
    expect(screen.getByRole("combobox", { name: "Auflösung" }).textContent).not.toContain("4K");
  });

  test("beim Draft-Modell zeigt die Auflösung „480p → 1080p“ und ist nicht wählbar", async () => {
    await renderApp();
    await choose("Videomodell", /Seedance 2\.5 Draft/);
    const resolution = screen.getByRole("combobox", { name: "Auflösung" });
    expect(resolution.textContent).toContain("480p → 1080p");
    expect(resolution.hasAttribute("disabled")).toBe(true);
  });

  test("ein Modell ohne Preis ist sichtbar, aber nicht wählbar", async () => {
    await renderApp();
    const trigger = screen.getByRole("combobox", { name: "Videomodell" });
    await act(async () => {
      trigger.focus();
      fireEvent.keyDown(trigger, { key: "Enter" });
    });
    const mini = await screen.findByRole("option", { name: /Seedance 2\.0 Mini/ });
    expect(mini.getAttribute("aria-disabled")).toBe("true");
    expect(within(mini).getByText("kein Preis hinterlegt")).toBeTruthy();
  });

  test("ungültige Preisdaten: Meldung mit Datei und Feld statt eines leeren Fensters", async () => {
    await renderApp(
      fakeSource({
        ok: false,
        errors: [
          { code: "invalid-value", file: "preise/pakete.json", field: "vatPercent", message: "Mehrwertsteuer fehlt." },
        ],
      }),
    );
    const result = screen.getByRole("main", { name: "Ergebnis" });
    expect(within(result).getByText(/sind ungültig/)).toBeTruthy();
    expect(within(result).getByText("preise/pakete.json · vatPercent: Mehrwertsteuer fehlt.")).toBeTruthy();
  });
});
