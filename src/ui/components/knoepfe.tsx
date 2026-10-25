import { type ReactNode, useEffect, useRef } from "react";

// B16 Buttons und B17 Bestätigungsdialog (docs/UI-RULES.md). Ein Lime-Button pro Fenster: „Als Projekt speichern“.

export function Button({
  variant,
  children,
  onClick,
  disabled,
  type = "button",
  describedBy,
  autoFocus,
}: {
  variant: "primary" | "white" | "outline";
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  describedBy?: string;
  /** nur für den sicheren Ausweg in einem Dialog, zum Beispiel „Abbrechen“ in der Rückfrage */
  autoFocus?: boolean;
}) {
  return (
    <button
      type={type}
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-describedby={describedBy}
      // biome-ignore lint/a11y/noAutofocus: Der Dialog tauscht seinen Inhalt; ohne Fokus läge er auf nichts mehr
      autoFocus={autoFocus}
    >
      {children}
    </button>
  );
}

/** Modaler Dialog über `<dialog>` und `showModal()`; Escape schließt ihn (Browser), `onClose` meldet das. */
export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" aria-label={title} onClose={onClose}>
      {open ? (
        <div className="dialog__inner">
          <h2 className="dialog__title">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
