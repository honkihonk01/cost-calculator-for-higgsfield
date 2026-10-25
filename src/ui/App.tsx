import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { calculateTotal } from "../kern/index.ts";
import { readProjectWith, saveProjectWith } from "../laden/gemeinsam/index.ts";
import { describeError, type ExchangeRate, newestPriceDate } from "../schema/index.ts";
import { aufbauen, bewegt, nachlaufen, staffeln } from "./bewegung/index.ts";
import { effectiveRate, evaluate, FIELD_LABELS, inputsForSaving } from "./bewertung.ts";
import { ErrorBoundary, Note, PillRadio } from "./components/index.ts";
import { useLiveCredits } from "./creditstand.ts";
import { type FieldName, type FormState, initialForm, inputsToForm, toNumber } from "./formular.ts";
import { useTotal } from "./gesamt.ts";
import type { DataSource, PricesResult } from "./quelle.ts";
import "./views/ansichten.css";
import { Eingabespalte } from "./views/Eingabespalte.tsx";
import { Ergebnisbereich, RESULT_TABS, type ResultView } from "./views/Ergebnisbereich.tsx";
import { GesamtErgebnis, type TotalView } from "./views/GesamtErgebnis.tsx";
import { GesamtSpalte } from "./views/GesamtSpalte.tsx";
import { ProjectMenu, type SaveOutcome, SaveProject } from "./views/Projekte.tsx";

type Mode = "single" | "total";
const MODES: { value: Mode; label: string }[] = [
  { value: "single", label: "Einzelprojekt" },
  { value: "total", label: "Gesamtkalkulation" },
];

// Fensteraufbau (docs/UI-RULES.md, Abschnitt A): Eingabespalte links, Ergebnisbereich rechts, jeweils mit Fehlergrenze.

export function App({ source }: { source: DataSource }) {
  const [prices, setPrices] = useState<PricesResult | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(new Set());
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [tab, setTab] = useState<string>(RESULT_TABS[0].value);
  const [project, setProject] = useState<string | null>(null);
  const [projectMessage, setProjectMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  // Einzelprojekt oder Gesamtkalkulation mehrerer gespeicherter Projekte (SPEC F15)
  const [mode, setMode] = useState<Mode>("single");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const total = useTotal(source.projects, mode === "total");
  const today = useMemo(() => source.today(), [source]);
  const fenster = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    source.loadPrices().then(
      (loaded) => {
        if (!active) return;
        setPrices(loaded);
        if (!loaded.ok) return;
        setForm(initialForm(loaded.data.settings));
        // SPEC Entscheidung 13: sofort mit dem gespeicherten Kurs rechnen, nach dem Abruf aktualisieren.
        source.cachedRate().then((cached) => active && cached && setRate((current) => current ?? cached));
        source.exchangeRate({ today, timeoutMs: loaded.data.settings.ecbTimeoutMs }).then((lookup) => {
          if (!active) return;
          if (lookup.rate) setRate(lookup.rate);
          setRateLoading(false);
        });
      },
      (error: unknown) => active && setPrices({ ok: false, errors: [{ code: "load-failed", message: String(error) }] }),
    );
    return () => {
      active = false;
    };
  }, [source, today]);

  const change = useCallback((patch: Partial<FormState>, fields: FieldName[] = []) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
    if (fields.length > 0) setTouched((current) => new Set([...current, ...fields]));
  }, []);
  const touch = useCallback((field: FieldName) => setTouched((current) => new Set([...current, field])), []);
  // Der Live-Stand ersetzt beim ersten Abruf beide Startwerte; „Live-Stand übernehmen“ wirkt nur in der offenen Ansicht.
  const { applyLive } = total;
  const credit = useLiveCredits(source, Boolean(prices?.ok), (credits, force) => {
    const single = force && modeRef.current === "single";
    setForm((current) =>
      current && (single || (!force && current.creditOrigin === "start"))
        ? { ...current, creditBalanceText: String(credits), creditOrigin: "live" }
        : current,
    );
    applyLive(credits, force && modeRef.current === "total");
  });

  // Bewegung (UI-RULES §11): Sobald die Felder stehen, baut sich das Fenster einmal treppenartig auf.
  // Beim Wechsel zwischen Einzelprojekt und Gesamtkalkulation erscheint der neue Inhalt Element für Element.
  const bereit = Boolean(prices?.ok && form);
  useLayoutEffect(() => {
    if (bereit && fenster.current && bewegt()) return aufbauen(fenster.current);
  }, [bereit]);
  // Eingabespalte und Ergebnisbereich scrollen mit weichem Nachlauf wie im Prototyp.
  useEffect(() => {
    const bereiche = [...(fenster.current?.querySelectorAll<HTMLElement>(".input-column, .result-area") ?? [])];
    const aus = bereiche.map(nachlaufen);
    return () => {
      for (const ende of aus) ende();
    };
  }, []);
  const ersterModus = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: staffelt bewusst bei jedem Wechsel der Ansicht
  useLayoutEffect(() => {
    if (ersterModus.current) {
      ersterModus.current = false;
      return;
    }
    const stapel = fenster.current?.querySelector(".input-column__stack");
    const ergebnis = fenster.current?.querySelector(".result-area");
    if (!bewegt()) return;
    if (stapel) staffeln(stapel, stapel.firstElementChild);
    if (ergebnis) staffeln(ergebnis);
  }, [mode]);

  const evaluation = useMemo(
    () => (prices?.ok && form ? evaluate(form, prices.data, rate, today) : null),
    [prices, form, rate, today],
  );
  const canSave = Boolean(evaluation?.result);
  const totalView = useMemo((): TotalView | null => {
    if (mode !== "total" || !prices?.ok || !form) return null;
    if (total.selectedProjects.length === 0) return { state: "empty" };
    const usedRate = effectiveRate(form, rate, today);
    const outcome = calculateTotal(total.selectedProjects, toNumber(total.state.balanceText), prices.data, usedRate);
    return outcome.ok
      ? { state: "ready", result: outcome.value, rateLoading, hasRate: usedRate !== null }
      : { state: "invalid", errors: outcome.errors };
  }, [mode, prices, form, rate, today, total.selectedProjects, total.state.balanceText, rateLoading]);

  // UI-RULES §13: Cmd+S speichert, Cmd+1 bis Cmd+3 wechseln die Ergebnis-Reiter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.metaKey) return;
      if (event.key === "s") {
        event.preventDefault();
        if (canSave && modeRef.current === "single") setSaveOpen(true);
      }
      const index = ["1", "2", "3"].indexOf(event.key);
      const target = RESULT_TABS[index];
      if (target) {
        event.preventDefault();
        setTab(target.value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSave]);

  const loadProject = async (name: string) => {
    if (!prices?.ok) return;
    const loaded = await readProjectWith(source.projects, name, "Das Projektmenü zeigt alle Projekte.");
    if (!loaded.ok) {
      setProjectMessage({ kind: "error", text: loaded.errors.map(describeError).join(" ") });
      return;
    }
    const { form: next, notice } = inputsToForm(loaded.value.inputs, prices.data.settings);
    setForm(next);
    // Alle Felder gelten als berührt, damit ein Projekt, das nicht mehr zu den Preisdaten passt, sofort auffällt.
    setTouched(new Set(Object.keys(FIELD_LABELS) as FieldName[]));
    setProject(loaded.value.name);
    setProjectMessage(notice ? { kind: "info", text: notice } : null);
  };

  const saveProject = async (name: string, overwrite: boolean): Promise<SaveOutcome> => {
    const inputs = prices?.ok && form ? inputsForSaving(form, prices.data) : null;
    if (!prices?.ok || !inputs || !evaluation?.result) {
      return { ok: false, exists: false, message: "Erst wenn alle Felder gültig sind, lässt sich speichern." };
    }
    const saved = await saveProjectWith(
      source.projects,
      { name, inputs, result: evaluation.result, pricesAsOf: newestPriceDate(prices.data) },
      { overwrite, now: source.now() },
    );
    if (saved.ok) {
      setProject(saved.value.name);
      return { ok: true };
    }
    const exists = saved.errors.some((error) => error.code === "project-exists");
    return { ok: false, exists, message: saved.errors.map((error) => error.message).join(" ") };
  };

  const visibleErrors: Partial<Record<FieldName, string>> = {};
  for (const [field, message] of Object.entries(evaluation?.inputErrors ?? {}) as [FieldName, string][]) {
    if (touched.has(field)) visibleErrors[field] = message;
  }
  Object.assign(visibleErrors, evaluation?.combinationErrors ?? {});

  return (
    <>
      <div className="titlebar" data-tauri-drag-region aria-hidden="true" />
      <div ref={fenster} className="app">
        <aside className="input-column" aria-label="Eingaben">
          <ErrorBoundary area="Die Eingabespalte">
            {prices?.ok && form ? (
              <div className="input-column__stack">
                <PillRadio label="Ansicht" value={mode} options={MODES} onChange={setMode} />
                {mode === "total" ? (
                  <GesamtSpalte total={total} credit={credit} />
                ) : (
                  <>
                    <div className="stack">
                      <ProjectMenu io={source.projects} current={project} onLoad={(name) => void loadProject(name)} />
                      {projectMessage ? <Note kind={projectMessage.kind} text={projectMessage.text} /> : null}
                    </div>
                    <Eingabespalte
                      data={prices.data}
                      form={form}
                      change={change}
                      touch={touch}
                      errors={visibleErrors}
                      credit={credit}
                    />
                    <SaveProject
                      canSave={canSave}
                      open={saveOpen}
                      setOpen={setSaveOpen}
                      defaultName={project ?? ""}
                      save={saveProject}
                    />
                  </>
                )}
              </div>
            ) : null}
          </ErrorBoundary>
        </aside>
        <main className="result-area" aria-label="Ergebnis">
          <ErrorBoundary area="Der Ergebnisbereich">
            {totalView ? (
              <GesamtErgebnis view={totalView} />
            ) : (
              <Ergebnisbereich
                view={resultView(prices, evaluation, visibleErrors, source.dataDirLabel, rateLoading)}
                tab={tab}
                onTabChange={setTab}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}

function resultView(
  prices: PricesResult | null,
  evaluation: ReturnType<typeof evaluate> | null,
  visibleErrors: Partial<Record<FieldName, string>>,
  dataDirLabel: string,
  rateLoading: boolean,
): ResultView {
  if (prices === null) return { state: "loading" };
  if (!prices.ok) {
    return {
      state: "data-error",
      messages: [
        `Die Preisdaten in ${dataDirLabel} sind ungültig. Es wird nicht gerechnet, bis sie korrigiert sind.`,
        ...prices.errors.map(describeError),
      ],
    };
  }
  if (!evaluation) return { state: "loading" };
  if (evaluation.result) return { state: "ready", result: evaluation.result, data: prices.data, rateLoading };
  const shown = Object.entries(visibleErrors) as [FieldName, string][];
  if (shown.length > 0 || evaluation.otherErrors.length > 0) {
    return {
      state: "invalid",
      messages: [...shown.map(([field, message]) => `${FIELD_LABELS[field]}: ${message}`), ...evaluation.otherErrors],
    };
  }
  // Reihenfolge wie in der Eingabespalte, damit sich die Liste von oben nach unten abarbeiten lässt.
  const order = Object.keys(FIELD_LABELS) as FieldName[];
  const missing = [
    ...new Set(order.filter((field) => field in evaluation.inputErrors).map((field) => FIELD_LABELS[field])),
  ];
  return { state: "incomplete", missing };
}
