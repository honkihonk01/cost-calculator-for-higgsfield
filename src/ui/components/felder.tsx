import { type ReactNode, useId } from "react";
import { Note } from "./hinweis.tsx";
import { Icon, type IconName } from "./Icon.tsx";

// B1 Einstellungszeile mit Eingabe, B2 Zahlenfeld mit Plus/Minus, B3 Kachel (docs/UI-RULES.md).
// Fehler dreifach: roter Innenrahmen, Hinweis „FEHLER“, Text direkt am Feld (§8).

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  inputMode?: "numeric" | "decimal" | "text";
  placeholder?: string;
};

export function SettingField({
  label,
  value,
  onChange,
  onBlur,
  error,
  inputMode = "decimal",
  placeholder,
  unit,
}: FieldProps & { unit?: string }) {
  const id = useId();
  return (
    <div>
      <div className="setting" data-invalid={error ? "true" : undefined}>
        <span>
          <label className="setting__label" htmlFor={id}>
            {label}
          </label>
          <span className="setting__value">
            <input
              id={id}
              className="num"
              value={value}
              inputMode={inputMode}
              placeholder={placeholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
            />
            {unit ? <span className="setting__unit">{unit}</span> : null}
          </span>
        </span>
      </div>
      {error ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

export function StepperField({
  label,
  value,
  onChange,
  onBlur,
  error,
  min,
  max,
  messageOutside,
}: FieldProps & {
  min: number;
  max: number /** Meldung steht außerhalb, zum Beispiel unter einer Zeile aus zwei Feldern */;
  messageOutside?: boolean;
}) {
  const id = useId();
  const current = Number(value.replace(",", "."));
  const step = (delta: number) => {
    const base = Number.isFinite(current) && value.trim() !== "" ? current : min;
    onChange(String(Math.min(max, Math.max(min, Math.round(base) + delta))));
  };
  return (
    <div>
      <div className="setting" data-invalid={error ? "true" : undefined}>
        <span>
          <label className="setting__label" htmlFor={id}>
            {label}
          </label>
          <span className="setting__value">
            <input
              id={id}
              className="num"
              value={value}
              inputMode="numeric"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
            />
          </span>
        </span>
        <span className="stepper">
          <button type="button" aria-label={`${label}: eins weniger`} onClick={() => step(-1)}>
            <Icon name="minus" />
          </button>
          <button type="button" aria-label={`${label}: eins mehr`} onClick={() => step(1)}>
            <Icon name="plus" />
          </button>
        </span>
      </div>
      {error && !messageOutside ? <FieldError id={`${id}-error`} message={error} /> : null}
    </div>
  );
}

export function TileInput({
  label,
  value,
  onChange,
  onBlur,
  error,
  icon,
  placeholder,
  inputMode = "text",
}: FieldProps & { icon: IconName }) {
  const id = useId();
  return (
    <label className="tile" htmlFor={id} data-invalid={error ? "true" : undefined}>
      <Icon name={icon} />
      <input
        id={id}
        aria-label={label}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      />
    </label>
  );
}

export function FieldError({ id, message }: { id?: string; message: string }) {
  return <Note kind="error" text={message} id={id} />;
}

/** Beschriftete Gruppe in der Eingabespalte, zum Beispiel „Noch offen“ mit Umschalter. */
export function FieldGroup({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="field-group">
      <div className="field-group__head">
        <span className="group-label">{label}</span>
        {aside}
      </div>
      {children}
    </div>
  );
}
