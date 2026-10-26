// @vitest-environment jsdom
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { nodeProjectIo } from "../../src/laden/node/index.ts";
import { tempData } from "../hilfen/daten.ts";
import { fixturePrices } from "../hilfen/preise.ts";
import { fakeSource, fillStandard, renderApp, type } from "../hilfen/ui.tsx";

// Geladene Projekte ändern, umbenennen und löschen (SPEC F9) gegen einen echten temporären Datenordner.

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
const files = (folder: string) => readdir(join(data.dataDir, folder)).then((names) => names.sort());

async function click(name: string, within_: HTMLElement = document.body) {
  await act(async () => {
    fireEvent.click(within(within_).getByRole("button", { name }));
  });
}

/** Speichert die Standardeingaben als „Die Route“; danach ist das Projekt geladen. */
async function saveRoute() {
  await renderApp(source());
  await fillStandard();
  await click("Als Projekt speichern");
  const dialog = screen.getByRole("dialog", { name: "Als Projekt speichern" });
  await act(async () => {
    fireEvent.change(within(dialog).getByLabelText("Projektname"), { target: { value: "Die Route" } });
  });
  await click("Speichern", dialog);
  await waitFor(() => expect(screen.getByRole("button", { name: "Änderungen speichern" })).toBeTruthy());
}

test("AC-F9-9 Änderungen speichern überschreibt das geladene Projekt ohne Rückfrage", async () => {
  await saveRoute();
  const before = JSON.parse(await readFile(projectFile("die-route"), "utf8"));
  await type("Versuche pro Clip", "2");
  await click("Änderungen speichern");
  await waitFor(() => expect(screen.getByText("Änderungen an „Die Route“ gespeichert.")).toBeTruthy());
  expect(screen.queryByRole("dialog")).toBeNull();
  const after = JSON.parse(await readFile(projectFile("die-route"), "utf8"));
  expect(after.inputs.attemptsPerClip).toBe(2);
  expect(after.createdAt).toBe(before.createdAt);
});

test("AC-F9-9 Als neues Projekt speichern legt eine zweite Datei an, das Original bleibt", async () => {
  await saveRoute();
  const before = await readFile(projectFile("die-route"), "utf8");
  await type("Versuche pro Clip", "2");
  await click("Als neues Projekt speichern");
  const dialog = screen.getByRole("dialog", { name: "Als neues Projekt speichern" });
  expect((within(dialog).getByLabelText("Projektname") as HTMLInputElement).value).toBe("");
  await act(async () => {
    fireEvent.change(within(dialog).getByLabelText("Projektname"), { target: { value: "Route kurz" } });
  });
  await click("Speichern", dialog);
  await waitFor(() => expect(screen.getByText("Gespeichert als „Route kurz“.")).toBeTruthy());
  expect(await readFile(projectFile("die-route"), "utf8")).toBe(before);
  expect(await files("projekte")).toEqual(["die-route.json", "route-kurz.json"]);
  expect(screen.getByRole("combobox", { name: "Projekt" }).textContent).toContain("Route kurz");
});

test("AC-F9-8 Umbenennen ändert Datei, Projektwahl und die gemerkte Auswahl der Gesamtkalkulation", async () => {
  await saveRoute();
  await nodeProjectIo(data.dataDir).writeAtomic("gesamtkalkulation.json", '{ "projects": ["Die Route"] }\n');
  await click("Umbenennen");
  const dialog = screen.getByRole("dialog", { name: "Projekt umbenennen" });
  const field = within(dialog).getByLabelText("Neuer Projektname") as HTMLInputElement;
  expect(field.value).toBe("Die Route");
  await act(async () => {
    fireEvent.change(field, { target: { value: "Das Ende" } });
  });
  await click("Umbenennen", dialog);
  await waitFor(() => expect(screen.getByText("Das Projekt heißt jetzt „Das Ende“.")).toBeTruthy());
  expect(screen.getByRole("combobox", { name: "Projekt" }).textContent).toContain("Das Ende");
  expect(await files("projekte")).toEqual(["das-ende.json", "papierkorb"]);
  expect(JSON.parse(await readFile(join(data.dataDir, "gesamtkalkulation.json"), "utf8")).projects).toEqual([
    "Das Ende",
  ]);
});

test("AC-F9-7 Löschen fragt nach; Abbrechen ändert nichts, bestätigt liegt die Datei im Papierkorb", async () => {
  await saveRoute();
  await click("Löschen");
  const dialog = screen.getByRole("dialog", { name: "Projekt löschen?" });
  expect(within(dialog).getByText(/nicht endgültig gelöscht/)).toBeTruthy();
  await click("Abbrechen", dialog);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(await files("projekte")).toEqual(["die-route.json"]);

  await click("Löschen");
  await click("In den Papierkorb", screen.getByRole("dialog", { name: "Projekt löschen?" }));
  await waitFor(() => expect(screen.getByText(/„Die Route“ liegt jetzt im Papierkorb/)).toBeTruthy());
  expect(await files("projekte")).toEqual(["papierkorb"]);
  expect(await files("projekte/papierkorb")).toEqual(["die-route.json"]);
  expect(screen.getByRole("combobox", { name: "Projekt" }).textContent).toContain("Kein Projekt geladen");
  expect(screen.queryByRole("button", { name: "Löschen" })).toBeNull();
  expect(screen.getByRole("button", { name: "Als Projekt speichern" })).toBeTruthy();
});
