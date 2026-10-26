import { type FormEvent, useState } from "react";
import { Button, Dialog, Note, SettingField } from "../components/index.ts";

// Umbenennen und Löschen des geladenen Projekts (SPEC F9, AC-F9-7 und AC-F9-8), als zwei Outline-Knöpfe unter der
// Projektwahl. Löschen verschiebt die Datei in den Papierkorb und fragt vorher nach; gelöscht wird nie.

type Open = "rename" | "trash" | null;

export function ProjektAktionen({
  project,
  dataDirLabel,
  rename,
  trash,
}: {
  project: string;
  dataDirLabel: string;
  /** liefert eine Fehlermeldung oder `null`, wenn es geklappt hat */
  rename: (newName: string) => Promise<string | null>;
  trash: () => Promise<string | null>;
}) {
  const [open, setOpen] = useState<Open>(null);
  const [name, setName] = useState(project);
  const [error, setError] = useState<string | null>(null);
  const show = (next: Open) => {
    setName(project);
    setError(null);
    setOpen(next);
  };
  const finish = (outcome: string | null) => (outcome === null ? setOpen(null) : setError(outcome));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() === "") setError("Gib einen Namen für das Projekt an.");
    else if (name.trim() === project) setOpen(null);
    else void rename(name).then(finish);
  };

  return (
    <div className="project-actions">
      <Button variant="outline" onClick={() => show("rename")}>
        Umbenennen
      </Button>
      <Button variant="outline" onClick={() => show("trash")}>
        Löschen
      </Button>
      <Dialog open={open === "rename"} title="Projekt umbenennen" onClose={() => setOpen(null)}>
        <form className="dialog__form" onSubmit={submit}>
          <SettingField
            label="Neuer Projektname"
            inputMode="text"
            value={name}
            error={error ?? undefined}
            onChange={(next) => {
              setName(next);
              setError(null);
            }}
          />
          <div className="dialog__actions">
            <Button variant="outline" onClick={() => setOpen(null)}>
              Abbrechen
            </Button>
            <Button variant="white" type="submit">
              Umbenennen
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={open === "trash"} title="Projekt löschen?" onClose={() => setOpen(null)}>
        <p>
          „{project}“ verschwindet aus der Projektliste und aus der Gesamtkalkulation. Die Datei wird nicht endgültig
          gelöscht, sondern in den Papierkorb {dataDirLabel}/projekte/papierkorb verschoben. Zurückholen kannst du das
          Projekt, indem du die Datei von dort wieder in den Ordner projekte legst.
        </p>
        {error ? <Note kind="error" text={error} /> : null}
        <div className="dialog__actions">
          <Button variant="outline" onClick={() => setOpen(null)} autoFocus>
            Abbrechen
          </Button>
          <Button variant="white" onClick={() => void trash().then(finish)}>
            In den Papierkorb
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
