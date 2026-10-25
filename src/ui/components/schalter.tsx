import { RadioGroup, Slider, Switch } from "radix-ui";
import { type ReactNode, useRef } from "react";
import { Einblender, useMarkierung } from "../bewegung/index.ts";

// B4 Pill-Reiter und B5 Segment (Radix RadioGroup), B6 Kippschalter (Radix Switch), B7 Block-Regler (Radix Slider).
// Gewählte Zustände sind weiß, nicht Lime (docs/UI-RULES.md §2); die weiße Markierung gleitet zum gewählten Feld (§11).

type Option<T extends string> = { value: T; label: string };

export function PillRadio<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMarkierung(ref);
  return (
    <RadioGroup.Root
      ref={ref}
      className="pills"
      aria-label={label}
      value={value}
      orientation="horizontal"
      onValueChange={(next) => onChange(next as T)}
    >
      {options.map((option) => (
        <RadioGroup.Item key={option.value} value={option.value}>
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

export function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: (Option<T> & { small: string })[];
  onChange: (value: T) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useMarkierung(ref);
  return (
    <RadioGroup.Root
      ref={ref}
      className="segment"
      aria-label={label}
      value={value}
      orientation="horizontal"
      onValueChange={(next) => onChange(next as T)}
    >
      {options.map((option) => (
        <RadioGroup.Item key={option.value} value={option.value}>
          <small>{option.small}</small>
          <b>{option.label}</b>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

/** B6: Kippschalter in einer Zeile; eingeschaltet klappt darunter „Gilt für“ weich auf. */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  children,
  grouped = false,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
  /** Schalter und zugehörige Einstellungen in einer gemeinsamen Box, getrennt durch feine Linien (UI-RULES A) */
  grouped?: boolean;
}) {
  const row = (
    <div className="switch-row">
      <span className="switch-row__label">
        {label}
        <span className="switch-row__hint">{hint}</span>
      </span>
      <Switch.Root className="switch" checked={checked} onCheckedChange={onChange} aria-label={label}>
        <Switch.Thumb className="switch__thumb" />
      </Switch.Root>
    </div>
  );
  if (grouped) {
    return (
      <section className="switch-group" aria-label={label}>
        {row}
        <Einblender offen={checked} className="switch-group__body">
          {children}
        </Einblender>
      </section>
    );
  }
  return (
    <div>
      {row}
      <Einblender offen={checked}>{children}</Einblender>
    </div>
  );
}

export function ChipGroup({
  label,
  chips,
}: {
  label: string;
  chips: { key: string; label: string; pressed: boolean; onToggle: () => void }[];
}) {
  return (
    <fieldset className="chips" aria-label={label}>
      {chips.map((chip) => (
        <button key={chip.key} type="button" className="chip" aria-pressed={chip.pressed} onClick={chip.onToggle}>
          {chip.label}
        </button>
      ))}
    </fieldset>
  );
}

/** B7 Block-Regler: Skala darüber, Wert innen links, Griff weiß (gemessen: „Dauer wählen“). */
export function BlockSlider({
  label,
  value,
  min,
  max,
  step,
  scale,
  format,
  onChange,
  scaleLabel = String,
  showLabel = true,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  scale: number[];
  format: (value: number) => string;
  onChange: (value: number) => void;
  /** Beschriftung der Skala, zum Beispiel Minuten bei einem Regler in Sekunden */
  scaleLabel?: (mark: number) => string;
  /** aus, wenn eine Gruppenüberschrift darüber den Regler schon benennt; der Griff behält `label` als Namen */
  showLabel?: boolean;
}) {
  return (
    <div className="block">
      {showLabel ? <span className="group-label">{label}</span> : null}
      <div className="block__scale" aria-hidden="true">
        {scale.map((mark) => (
          <span key={mark} data-on={mark === value ? "true" : undefined}>
            {scaleLabel(mark)}
          </span>
        ))}
      </div>
      <Slider.Root
        className="block__slider"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => {
          if (next !== undefined) onChange(next);
        }}
      >
        <Slider.Track className="block__track">
          <Slider.Range className="block__range" />
        </Slider.Track>
        <span className="block__value">{format(value)}</span>
        <Slider.Thumb className="block__thumb" aria-label={label} aria-valuetext={format(value)} />
      </Slider.Root>
    </div>
  );
}
