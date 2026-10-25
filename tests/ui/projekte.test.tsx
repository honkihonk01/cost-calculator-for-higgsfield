// @vitest-environment jsdom
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { runCli, tempData } from "../hilfen/daten.ts";
import { fixturePrices } from "../hilfen/preise.ts";
import { choose, fakeSource, fillStandard, renderApp, type } from "../hilfen/ui.tsx";

// Projekte in der App gegen einen echten temporären Datenordner (docs/TESTING.md).

let data: Awaited<ReturnType<typeof tempData>>;
beforeEach(async () => {
  data = await tempData();
});
afterEach(async () => {
  cleanup();
  await data.cleanup();
});

const source = () => fakeSource(fixturePrices(), data.dataDir);
const projectFile = (slug: string) => join(data.dataDir, "projekte", `${slug}.json`);

async function saveAs(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Als Projekt speichern" }));
  });
  const dialog = screen.getByRole("dialog", { name: "Als Projekt speichern" });
  await act(async () => {
    fireEvent.change(within(dialog).getByLabelText("Projektname"), { target: { value: name } });
  });
  await act(async () => {
    fireEvent.click(within(dialog).getByRole("button", { name: "Speichern" }));
  });
  // Gespeichert wird in einen echten Ordner; fertig ist es, wenn der Namensdialog zu oder die Rückfrage da ist.
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Als Projekt speichern" })).toBeNull());
}

async function openProjectMenu() {
  const trigger = screen.getByRole("combobox", { name: "Projekt" });
  await act(async () => {
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
  });
}

async function closeMenu() {
  await act(async () => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
  });
}

function value(label: string) {
  return (screen.getByLabelText(label) as HTMLInputElement).value;
}

describe("AC-F9-1 in der App: speichern, neu starten, laden", () => {
  test("AC-F9-1 gespeichertes Projekt erscheint nach einem Neustart mit identischen Eingaben", async () => {
    await renderApp(source());
    await fillStandard();
    await saveAs("Die Route");
    expect(screen.getByText("Gespeichert als „Die Route“.")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    const saved = JSON.parse(await readFile(projectFile("die-route"), "utf8"));
    expect(saved.snapshot.result.recommendations.overall.sentence).toContain("374,63 €");

    cleanup();
    await renderApp(source());
    await choose("Projekt", /Die Route/);
    await waitFor(() => expect(value("Noch offene Dauer (M:SS)")).toBe("3:00"));
    expect(value("Versuche pro Clip")).toBe("3");
    expect(value("Aktueller Credit-Stand")).toBe("2000");
    expect(document.querySelector(".answer__value")?.textContent).toBe("374,63 €");

    await saveAs("Kopie der Route");
    const copy = JSON.parse(await readFile(projectFile("kopie-der-route"), "utf8"));
    expect(copy.inputs).toEqual(saved.inputs);
  });

  test("AC-F9-1 Cmd+S öffnet den Speicherdialog mit dem Namen des geladenen Projekts", async () => {
    await renderApp(source());
    await fillStandard();
    await saveAs("Die Route");
    await act(async () => {
      fireEvent.keyDown(window, { key: "s", metaKey: true });
    });
    const dialog = screen.getByRole("dialog", { name: "Als Projekt speichern" });
    expect((within(dialog).getByLabelText("Projektname") as HTMLInputElement).value).toBe("Die Route");
  });
});

describe("AC-F9-3 in der App: nichts wird überschrieben, bevor der Nutzer bestätigt", () => {
  test("AC-F9-3 gleicher Name: Rückfrage, Abbrechen lässt die Datei unverändert, Überschreiben ersetzt sie", async () => {
    await renderApp(source());
    await fillStandard();
    await saveAs("Die Route");
    const before = await readFile(projectFile("die-route"), "utf8");

    await type("Versuche pro Clip", "2");
    await saveAs("die route");
    const confirm = screen.getByRole("dialog", { name: "Projekt überschreiben?" });
    expect(within(confirm).getByText(/gibt es schon/)).toBeTruthy();
    expect(await readFile(projectFile("die-route"), "utf8")).toBe(before);
    await act(async () => {
      fireEvent.click(within(confirm).getByRole("button", { name: "Abbrechen" }));
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(await readFile(projectFile("die-route"), "utf8")).toBe(before);

    await saveAs("Die Route");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Überschreiben" }));
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const after = JSON.parse(await readFile(projectFile("die-route"), "utf8"));
    expect(after.inputs.attemptsPerClip).toBe(2);
    expect(after.createdAt).toBe(JSON.parse(before).createdAt);
  });
});

describe("AC-F9-6 Projektliste wird bei jedem Öffnen des Menüs neu gelesen", () => {
  test("AC-F9-6 ein über die Kommandozeile gespeichertes Projekt erscheint ohne Neustart und lässt sich laden", async () => {
    await renderApp(source());
    await openProjectMenu();
    expect(await screen.findByText("Noch keine Projekte gespeichert.")).toBeTruthy();
    await closeMenu();

    const cli = runCli(
      [
        "projekt",
        "speichern",
        "Von Claude",
        "--clips",
        "12",
        "--aufschlag",
        "25",
        "--modell",
        "seedance-2.5-draft",
        "--aufloesung",
        "1080p",
        "--versuche",
        "3",
        "--bildmodell",
        "seedream-5.0-pro",
        "--credits",
        "800",
        "--kurs",
        "1,08",
      ],
      { home: data.home, dataDir: data.dataDir },
    );
    expect(cli.code, cli.stderr).toBe(0);

    await choose("Projekt", /Von Claude/);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Clips" }).getAttribute("aria-checked")).toBe("true"));
    expect(value("Noch offene Clips")).toBe("12");
    expect(value("Aktueller Credit-Stand")).toBe("800");
    expect(screen.getByRole("combobox", { name: "Projekt" }).textContent).toContain("Von Claude");
  });

  test("AC-F9-4 eine beschädigte Datei erscheint als Meldung im Menü, die anderen Projekte bleiben ladbar", async () => {
    await renderApp(source());
    await fillStandard();
    await saveAs("Die Route");
    await writeFile(join(data.dataDir, "projekte", "kaputt.json"), "{ kein json");
    await openProjectMenu();
    expect(await screen.findByText(/projekte\/kaputt\.json: Die Projektdatei ist beschädigt/)).toBeTruthy();
    expect(screen.getByRole("option", { name: /Die Route/ })).toBeTruthy();
  });
});
