import { Select } from "radix-ui";
import { Icon, type IconName } from "./Icon.tsx";

// B8 Modellwähler, B9 Menü, B10 Glas-Menü – alle auf Radix Select (docs/UI-RULES.md §16).
// Tastatur: Enter/Leertaste öffnet, Pfeiltasten wählen, Escape schließt (Radix).

type Common = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
};

/** B9 Menü mit Kachel als Auslöser, zum Beispiel Auflösung. */
export function MenuSelect({
  label,
  value,
  onChange,
  invalid,
  placeholder,
  icon,
  options,
  disabled,
  display,
}: Common & {
  icon: IconName;
  options: { value: string; label: string; hint?: string }[];
  disabled?: boolean;
  /** feste Anzeige statt des gewählten Werts, zum Beispiel „480p → 1080p“ beim Draft-Modell */
  display?: string;
}) {
  return (
    <Select.Root value={value === "" ? undefined : value} onValueChange={onChange} disabled={disabled}>
      <Select.Trigger className="tile" aria-label={label} data-invalid={invalid ? "true" : undefined}>
        <Icon name={icon} />
        {display ? <span>{display}</span> : <Select.Value placeholder={placeholder ?? label} />}
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="menu" position="popper" align="start">
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="menu__item">
                <Select.ItemText>{option.label}</Select.ItemText>
                {option.hint ? <span className="menu__hint">{option.hint}</span> : null}
                <Select.ItemIndicator>
                  <Icon name="check" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

/** B10 Glas-Menü mit Beschreibung, zum Beispiel Storyboard-Modell mit Preis je Bild. */
export function GlassSelect({
  label,
  value,
  onChange,
  invalid,
  placeholder,
  options,
}: Common & { options: { value: string; title: string; description: string }[] }) {
  return (
    <Select.Root value={value === "" ? undefined : value} onValueChange={onChange}>
      <SettingTrigger label={label} invalid={invalid} placeholder={placeholder} />
      <Select.Portal>
        <Select.Content className="glass" position="popper" align="start">
          <Select.Viewport>
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="glass__item">
                <span>
                  <Select.ItemText>
                    <span className="glass__title">{option.title}</span>
                  </Select.ItemText>
                  <span className="glass__description">{option.description}</span>
                </span>
                <Select.ItemIndicator>
                  <Icon name="check" className="check" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export type PickerModel = {
  id: string;
  name: string;
  badge: "top" | "new" | null;
  meta: string[];
  /** Modelle ohne Preis bleiben sichtbar, sind aber nicht wählbar (B8) */
  disabledReason: string | null;
};

/** B8 Modellwähler mit Gruppen, Icon-Kachel, Meta-Chips und Kennzeichnung. */
export function ModelPicker({
  label,
  value,
  onChange,
  invalid,
  placeholder,
  groups,
}: Common & { groups: { label: string; models: PickerModel[] }[] }) {
  return (
    <Select.Root value={value === "" ? undefined : value} onValueChange={onChange}>
      <SettingTrigger label={label} invalid={invalid} placeholder={placeholder} />
      <Select.Portal>
        <Select.Content className="picker" position="popper" align="start">
          <Select.Viewport>
            {groups.map((group) => (
              <Select.Group key={group.label}>
                <Select.Label className="picker__group">{group.label}</Select.Label>
                {group.models.map((model) => (
                  <Select.Item
                    key={model.id}
                    value={model.id}
                    className="model"
                    disabled={model.disabledReason !== null}
                  >
                    <span className="model__icon">
                      <Icon name="modelBars" />
                    </span>
                    <span>
                      <span className="model__name">
                        <Select.ItemText>{model.name}</Select.ItemText>
                        {model.badge ? (
                          <span className={`badge badge--${model.badge}`}>{model.badge === "top" ? "Top" : "Neu"}</span>
                        ) : null}
                      </span>
                      <span className="model__meta">
                        {model.disabledReason ? (
                          <span className="meta-chip meta-chip--warning">{model.disabledReason}</span>
                        ) : (
                          model.meta.map((entry) => (
                            <span key={entry} className="meta-chip">
                              {entry}
                            </span>
                          ))
                        )}
                      </span>
                    </span>
                    <Select.ItemIndicator>
                      <Icon name="check" className="check" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Group>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

/** Auslöser im Stil der Einstellungszeile B1: Beschriftung oben, Wert darunter, Pfeil rechts. */
function SettingTrigger({ label, invalid, placeholder }: { label: string; invalid?: boolean; placeholder?: string }) {
  return (
    <Select.Trigger className="setting" aria-label={label} data-invalid={invalid ? "true" : undefined}>
      <span>
        <span className="setting__label">{label}</span>
        <span className="setting__value">
          <Select.Value placeholder={placeholder ?? "Bitte wählen"} />
        </span>
      </span>
      <Select.Icon>
        <Icon name="chevronDown" className="setting__chevron" />
      </Select.Icon>
    </Select.Trigger>
  );
}
