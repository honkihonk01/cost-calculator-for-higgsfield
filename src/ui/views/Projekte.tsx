import { Select } from "radix-ui";
import { type FormEvent, useId, useState } from "react";
import { deDate } from "../../kern/index.ts";
import { listProjectsWith, type ProjectIo, type ProjectSummary } from "../../laden/gemeinsam/index.ts";
import type { AppError } from "../../schema/index.ts";
import { Button, Dialog, Icon, Note, SettingField } from "../components/index.ts";

// Projekte in der App (SPEC F9): Projektwahl oben in der Eingabespalte, „Als Projekt speichern“ unten.

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
 * Lime-Hauptaktion „Als Projekt speichern“ (B16) mit Dialog (B17) und Bestätigung (B18).
 * Existiert der Name schon, fragt der Dialog vor dem Überschreiben nach (AC-F9-3).
 */
export function SaveProject({
  canSave,
  open,
  setOpen,
  defaultName,
  save,
}: {
  canSave: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultName: string;
  save: (name: string, overwrite: boolean) => Promise<SaveOutcome>;
}) {
  const hintId = useId();
  const [name, setName] = useState(defaultName);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  // Bei jedem Öffnen (Knopf oder Cmd+S) frisch mit dem Namen des geladenen Projekts beginnen.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(defaultName);
      setConfirming(false);
      setError(null);
    }
  }
  const run = async (overwrite: boolean) => {
    const outcome = await save(name, overwrite);
    if (outcome.ok) {
      setOpen(false);
      setStatus(`Gespeichert als „${name.trim()}“.`);
    } else if (outcome.exists && !overwrite) {
      setConfirming(true);
    } else {
      setError(outcome.message);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") setError("Gib einen Namen für das Projekt an.");
    else void run(false);
  };

  return (
    <div className="save-project">
      <Button
        variant="primary"
        onClick={() => setOpen(true)}
        disabled={!canSave}
        describedBy={canSave ? undefined : hintId}
      >
        Als Projekt speichern
      </Button>
      {canSave ? null : (
        <p id={hintId} className="save-project__hint">
          Speichern geht, sobald ein Ergebnis da ist.
        </p>
      )}
      <p className="save-project__status" aria-live="polite">
        {status}
      </p>
      <Dialog
        open={open}
        title={confirming ? "Projekt überschreiben?" : "Als Projekt speichern"}
        onClose={() => setOpen(false)}
      >
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
