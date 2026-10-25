import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { CreditLookup } from "../../src/laden/gemeinsam/index.ts";
import { nodeProjectIo } from "../../src/laden/node/index.ts";
import type { ExchangeRate, PriceData } from "../../src/schema/index.ts";
import { App } from "../../src/ui/App.tsx";
import type { DataSource, PricesResult } from "../../src/ui/quelle.ts";
import { fixturePrices } from "./preise.ts";

// jsdom kennt einige Browserfunktionen nicht, die Radix nutzt; nur für Tests nachgebildet.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.assign(globalThis, { ResizeObserver: ResizeObserverStub });
Object.assign(Element.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => {},
  releasePointerCapture: () => {},
  scrollIntoView: () => {},
});

// jsdom kennt `<dialog>` ohne showModal() und close(); so verhält er sich wie im Browser, nur ohne Fokusfalle.
Object.assign(HTMLDialogElement.prototype, {
  showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
  close(this: HTMLDialogElement) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  },
});

export const RATE: ExchangeRate = { value: 1.08, date: "2026-10-09", origin: "manual" };

/**
 * Datenquelle mit Testdaten. Projekte liegen in `dataDir`, einem echten temporären Ordner des Tests;
 * ohne Angabe zeigt sie auf einen Ordner, den es nicht gibt (keine Projekte, nichts wird angelegt).
 */
export function fakeSource(
  prices: PriceData | PricesResult = fixturePrices(),
  dataDir = join(tmpdir(), `hfcalc-ui-ohne-datenordner-${randomUUID()}`),
  credits: () => Promise<CreditLookup> = async () => ({
    ok: false,
    message: "Die Testquelle hat kein Higgsfield-Konto.",
  }),
): DataSource {
  const result: PricesResult = "ok" in prices ? prices : { ok: true, data: prices };
  return {
    dataDirLabel: "~/Higgsfield-Kalkulator",
    loadPrices: async () => result,
    cachedRate: async () => null,
    exchangeRate: async () => ({ rate: RATE }),
    creditBalance: credits,
    projects: nodeProjectIo(dataDir),
    today: () => "2026-10-09",
    now: () => "2026-10-09T21:00:00.000Z",
  };
}

/** Rendert die App und wartet, bis die Eingabespalte steht. */
export async function renderApp(source: DataSource = fakeSource()) {
  const view = render(<App source={source} />);
  await act(async () => {});
  return view;
}

/** Wählt in einem Radix-Select per Tastatur einen Eintrag, wie es der Nutzer mit der Tastatur täte. */
export async function choose(triggerName: string | RegExp, optionName: string | RegExp) {
  const trigger = screen.getByRole("combobox", { name: triggerName });
  await act(async () => {
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
  });
  const option = await screen.findByRole("option", { name: optionName });
  await act(async () => {
    fireEvent.keyDown(option, { key: "Enter" });
  });
}

export async function type(label: string | RegExp, value: string, blur = true) {
  const input = screen.getByLabelText(label);
  await act(async () => {
    fireEvent.change(input, { target: { value } });
    if (blur) fireEvent.blur(input);
  });
  return input;
}

/** Füllt das Standardbeispiel aus docs/SPEC.md über die Felder aus (Ergebnis: 374,63 €). */
export async function fillStandard() {
  await type("Noch offene Dauer (M:SS)", "3:00");
  await choose("Videomodell", /Seedance 2\.5 Draft/);
  await type("Versuche pro Clip", "3");
  await choose("Lichtbilder und Referenzbilder je Clip", /Seedream 5\.0 Pro/);
  await type("Aktueller Credit-Stand", "2.000");
}

/** Klickt einen Ergebnis-Reiter; Radix Tabs reagiert auf das Drücken der Maustaste. */
export async function openTab(name: string) {
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole("tab", { name }), { button: 0 });
  });
}
