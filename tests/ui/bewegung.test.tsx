// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, describe, expect, test, vi } from "vitest";
import { grossChange } from "../../src/kern/index.ts";
import { naechsterStand, Zahl, zaehlbar, zwischenText } from "../../src/ui/bewegung/index.ts";
import { fillStandard, renderApp, type } from "../hilfen/ui.tsx";

// Bewegung (docs/UI-RULES.md §11). jsdom kennt weder matchMedia noch Element.animate; ohne beides gilt
// „keine Bewegung“. Für die Fälle mit Bewegung werden beide nachgebildet. CSS lädt jsdom nicht, deshalb sind alle
// Bewegungszeiten 0 und jede Zahl steht sofort auf ihrem Endwert.

function bewegungErlauben() {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query }));
  const animate = () => ({ addEventListener() {}, cancel() {} }) as unknown as Animation;
  Element.prototype.animate = animate;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // biome-ignore lint/suspicious/noExplicitAny: jsdom hat Element.animate nicht; nur die Nachbildung wieder entfernen
  delete (Element.prototype as any).animate;
});

describe("AC-F10-15 Zahlen zählen und enden exakt", () => {
  test("AC-F10-15 Zwischenbilder liegen anteilig zwischen altem und neuem Wert, das Ende ist exakt", () => {
    expect(zwischenText(null, "374,63 €", 0)).toBe("0,00 €");
    expect(zwischenText(null, "374,63 €", 0.5)).toBe("187,32 €");
    expect(zwischenText(null, "374,63 €", 1)).toBe("374,63 €");
    expect(zwischenText("1.000 Credits", "5.940 Credits", 0.5)).toBe("3.470 Credits");
    expect(zwischenText("netto 10,00 € · 900 Credits", "netto 20,00 € · 1.100 Credits", 0.5)).toBe(
      "netto 15,00 € · 1.000 Credits",
    );
  });

  test("AC-F10-15 bei anderem Aufbau des Textes kommt sofort das Ziel, ohne Änderung wird nicht gezählt", () => {
    expect(zwischenText("374,63 €", "349,99 $", 0.5)).toBe("349,99 $");
    expect(zwischenText("+1,00 € zu deiner Auswahl", "−1,00 € zu deiner Auswahl", 0.5)).toBe(
      "−1,00 € zu deiner Auswahl",
    );
    expect(zaehlbar("374,63 €", "374,63 €")).toBe(false);
    expect(zaehlbar("deine Auswahl", "deine Auswahl")).toBe(false);
    expect(zaehlbar("1 ×", "2 ×")).toBe(true);
  });

  test("AC-F10-15 ohne Bewegung steht nur der fertige Text da", () => {
    const { container } = render(<Zahl text="374,63 €" />);
    expect(container.innerHTML).toBe("374,63 €");
  });

  test("AC-F10-15 mit Bewegung hören Screenreader nur den fertigen Wert", () => {
    bewegungErlauben();
    const { container, rerender } = render(<Zahl text="374,63 €" />);
    rerender(<Zahl text="402,10 €" />);
    expect(container.querySelector(".zahl__lesbar")?.textContent).toBe("402,10 €");
    const bild = container.querySelector(".zahl__bild");
    expect(bild?.getAttribute("aria-hidden")).toBe("true");
    expect(bild?.textContent).toBe("402,10 €");
  });
});

describe("AC-F10-16 Differenz-Schild am Preis", () => {
  test("AC-F10-16 der Kern rechnet jetzt minus vorher in der gemeinsamen Währung", () => {
    expect(grossChange({ eur: "374.63", usd: "404.6" }, { eur: "402.1", usd: "434.27" })).toEqual({
      amount: "27.47",
      unit: "EUR",
    });
    expect(grossChange({ eur: null, usd: "100" }, { eur: null, usd: "80.5" })).toEqual({
      amount: "-19.5",
      unit: "USD",
    });
    expect(grossChange({ eur: null, usd: "100" }, { eur: "90", usd: "97.2" })).toBeNull();
  });

  test("AC-F10-16 nach einer Änderung zeigt das Schild den Unterschied zur Zahl, die vorher dastand", async () => {
    bewegungErlauben();
    await renderApp();
    await fillStandard();
    const preis = () => document.querySelector(".answer__value .zahl__lesbar")?.textContent ?? "";
    const alsBig = (text: string) => new Big(text.replace(/[^\d,]/g, "").replace(",", "."));
    const vorher = preis();
    await type("Versuche pro Clip", "4", false);
    const nachher = preis();
    expect(nachher).not.toBe(vorher);
    const schild = document.querySelector(".answer__value .differenz");
    const erwartet = alsBig(nachher).minus(alsBig(vorher));
    const zeichen = erwartet.gt(0) ? "+" : "−";
    expect(schild?.textContent).toBe(`${zeichen}${erwartet.abs().toFixed(2).replace(".", ",")} €`);
    expect(schild?.getAttribute("aria-hidden")).toBe("true");
    expect(schild?.classList.contains(erwartet.gt(0) ? "differenz--plus" : "differenz--minus")).toBe(true);
  });

  test("AC-F10-16 ändert sich der Preis nicht, erscheint kein Schild; ohne Bewegung nie", async () => {
    bewegungErlauben();
    await renderApp();
    await fillStandard();
    const vorher = document.querySelector(".differenz");
    await type("Aktueller Credit-Stand", "2.000");
    expect(document.querySelector(".differenz")).toBe(vorher);
    cleanup();
    vi.unstubAllGlobals();
    await renderApp();
    await fillStandard();
    await act(async () => {});
    await type("Versuche pro Clip", "4", false);
    expect(document.querySelector(".differenz")).toBeNull();
    expect(screen.getByRole("region", { name: "Kosten deiner Auswahl" })).toBeTruthy();
  });
});

describe("AC-F10-17 Scrollen mit Nachlauf", () => {
  test("AC-F10-17 jedes Bild legt denselben Anteil des Restwegs zurück, unabhängig von der Bildrate", () => {
    const sechzigstel = 1000 / 60;
    expect(naechsterStand(0, 1000, sechzigstel, 0.075)).toBeCloseTo(75, 6);
    // Zwei Bilder bei 120 Hz kommen genau dort an, wo ein Bild bei 60 Hz ankommt.
    const halb = naechsterStand(0, 1000, sechzigstel / 2, 0.075);
    expect(naechsterStand(halb, 1000, sechzigstel / 2, 0.075)).toBeCloseTo(75, 6);
    expect(naechsterStand(500, 200, sechzigstel, 0.075)).toBeCloseTo(477.5, 6);
  });

  test("AC-F10-17 der Nachlauf läuft aus und endet genau am Ziel", () => {
    let stand = 0;
    let bilder = 0;
    while (stand !== 640 && bilder < 1000) {
      stand = naechsterStand(stand, 640, 1000 / 60, 0.075);
      bilder++;
    }
    expect(stand).toBe(640);
    expect(bilder).toBeGreaterThan(30);
    expect(bilder).toBeLessThan(120);
  });
});
