import { Select } from "radix-ui";
import { type FormEvent, useId, useState } from "react";
import { deDate } from "../../kern/index.ts";
import { listProjectsWith, type ProjectIo, type ProjectSummary } from "../../laden/gemeinsam/index.ts";
import type { AppError } from "../../schema/index.ts";
import { Button, Dialog, Icon, Note, SettingField } from "../components/index.ts";

// Projekte in der App (SPEC F9): Projektwahl oben in der Eingabespalte, Speichern unten.

type ListState = { loading: boolean; projects: ProjectSummary[]; errors: AppError[] };

/**
 * Projektwahl (B1-Auslöser, B9-Menü). Die Liste wird bei jedem Öffnen neu aus dem Datenordner gelesen, damit
 * Projekte, die Claude über Kommandozeile oder MCP-Server gespeichert hat, ohne Neustart erscheinen (AC-F9-6).
 */
export function ProjectMenu({
  io,
  current,
  onLoad,
}: {
  io: ProjectIo;
  current: string | null;
  onLoad: (name: string) => void;
}) {
  const [list, setList] = useState<ListState>({ loading: false, projects: [], errors: [] });
  const refresh = () => {
    setList((previous) => ({ ...previous, loading: true }));
    listProjectsWith(io).then((loaded) => setList({ loading: false, ...loaded }));
  };
  const empty = list.projects.length === 0;
  return (
    <Select.Root value={current ?? ""} onValueChange={onLoad} onOpenChange={(open) => open && refresh()}>
      <Select.Trigger className="setting" aria-label="Projekt">
        <span>
          <span className="setting__label">Projekt</span>
          <span className="setting__value">
            <Select.Value placeholder="Kein Projekt geladen">{current}</Select.Value>
          </span>
        </span>
        <Select.Icon>
          <Icon name="chevronDown" className="setting__chevron" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="menu project-menu" position="popper" align="start">
          <Select.Viewport>
            {empty && list.loading ? <p className="menu__status">Projekte werden gelesen …</p> : null}
            {empty && !list.loading && list.errors.length === 0 ? (
              <p className="menu__status">Noch keine Projekte gespeichert.</p>
            ) : null}
            {list.projects.map((project) => (
              <Select.Item key={project.file} value={project.name} className="menu__item">
                <Select.ItemText>{project.name}</Select.ItemText>
                <span className="menu__hint">{deDate(project.updatedAt.slice(0, 10))}</span>
                <Select.ItemIndicator>
                  <Icon name="check" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
            {list.errors.map((error) => (
              <p key={error.file ?? error.message} className="menu__status">
                {error.file ? `${error.file}: ` : ""}
                {error.message}
              </p>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export type SaveOutcome = { ok: true } | { ok: false; exists: boolean; message: string };

/**
 * Lime-Hauptaktion (B16) mit Dialog (B17) und Bestätigung (B18). Ohne geladenes Projekt „Als Projekt speichern“;
 * existiert der Name schon, fragt der Dialog vor dem Überschreiben nach (AC-F9-3). Mit geladenem Projekt schreibt
 * „Änderungen speichern“ direkt in seine Datei, „Als neues Projekt speichern“ öffnet den Dialog (AC-F9-9).
 */
export function SaveProject({
  canSave,
  current,
  open,
  setOpen,
  save,
  saveChanges,
  status,
}: {
  canSave: boolean;
  current: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  save: (name: string, overwrite: boolean) => Promise<SaveOutcome>;
  saveChanges: () => void;
  status: { kind: "error" | "info"; text: string } | null;
}) {
  const hintId = useId();
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bei jedem Öffnen frisch beginnen; ein neues Projekt bekommt einen neuen Namen, deshalb ist das Feld leer.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setConfirming(false);
      setError(null);
    }
  }
  const run = async (overwrite: boolean) => {
    const outcome = await save(name, overwrite);
    if (outcome.ok) setOpen(false);
    else if (outcome.exists && !overwrite) setConfirming(true);
    else setError(outcome.message);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") setError("Gib einen Namen für das Projekt an.");
    else void run(false);
  };
  const title = current ? "Als neues Projekt speichern" : "Als Projekt speichern";

  return (
    <div className="save-project">
      {current ? (
        <>
          <Button
            variant="primary"
            onClick={saveChanges}
            disabled={!canSave}
            describedBy={canSave ? undefined : hintId}
          >
            Änderungen speichern
          </Button>
          <Button variant="outline" onClick={() => setOpen(true)} disabled={!canSave}>
            Als neues Projekt speichern
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          onClick={() => setOpen(true)}
          disabled={!canSave}
          describedBy={canSave ? undefined : hintId}
        >
          Als Projekt speichern
        </Button>
      )}
      {canSave ? null : (
        <p id={hintId} className="save-project__hint">
          Speichern geht, sobald ein Ergebnis da ist.
        </p>
      )}
      <div aria-live="polite">
        {status?.kind === "error" ? <Note kind="error" text={status.text} /> : null}
        {status?.kind === "info" ? <p className="save-project__status">{status.text}</p> : null}
      </div>
      <Dialog open={open} title={confirming ? "Projekt überschreiben?" : title} onClose={() => setOpen(false)}>
        {confirming ? (
          <>
            <p>
              Ein Projekt „{name.trim()}“ gibt es schon. Überschreiben ersetzt seine gespeicherten Eingaben und das
              gespeicherte Ergebnis.
            </p>
            {error ? <Note kind="error" text={error} /> : null}
            <div className="dialog__actions">
              <Button variant="outline" onClick={() => setOpen(false)} autoFocus>
                Abbrechen
              </Button>
              <Button variant="white" onClick={() => void run(true)}>
                Überschreiben
              </Button>
            </div>
          </>
        ) : (
          <form className="dialog__form" onSubmit={submit}>
            <SettingField
              label="Projektname"
              inputMode="text"
              value={name}
              error={error ?? undefined}
              onChange={(next) => {
                setName(next);
                setError(null);
              }}
            />
            <div className="dialog__actions">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
              <Button variant="white" type="submit">
                Speichern
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
