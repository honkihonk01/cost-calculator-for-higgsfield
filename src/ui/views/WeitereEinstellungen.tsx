import { useRef } from "react";
import { deNumber } from "../../kern/index.ts";
import { RESOLUTIONS } from "../../schema/index.ts";
import { useAufklappen, usePuls } from "../bewegung/index.ts";
import { ChipGroup, FieldError, Icon, PillRadio, Segment, SettingField, ToggleRow } from "../components/index.ts";
import { changedOptionalCount, type PriceLevel } from "../formular.ts";
import { discountFamilies } from "./auswahllisten.ts";
import type { ColumnProps } from "./Eingabespalte.tsx";

// B11 „Weitere Einstellungen“: startet geschlossen und zeigt, wie viele Felder vom Standard abweichen (AC-F10-6).
// Reihenfolge nach docs/UI-RULES.md, Abschnitt A. Klappt weich auf; der Zähler pulsiert, wenn er sich ändert.

const LEVELS: { value: PriceLevel; label: string }[] = [
  { value: "discounted", label: "Mit Rabatt" },
  { value: "regular", label: "Regulär" },
];

export function WeitereEinstellungen({ data, form, change, touch, errors }: ColumnProps) {
  const { settings } = data;
  const changed = changedOptionalCount(form, settings);
  const ref = useAufklappen<HTMLDetailsElement>();
  const zaehler = useRef<HTMLSpanElement>(null);
  usePuls(zaehler, changed);
  const toggle = <T extends string>(list: T[], entries: T[]) =>
    entries.every((entry) => list.includes(entry))
      ? list.filter((entry) => !entries.includes(entry))
      : [...new Set([...list, ...entries])];

  return (
    <details ref={ref} className="more">
      <summary>
        <Icon name="chevronDown" />
        Weitere Einstellungen
        <span ref={zaehler} className="meta-chip">
          {changed === 1 ? "1 geändert" : `${changed} geändert`}
        </span>
      </summary>
      <div>
        <div className="more__body">
          <SettingField
            label="Durchschnittliche Cliplänge"
            unit="s"
            value={form.clipLengthText}
            error={errors.clipLengthSeconds}
            onChange={(clipLengthText) => change({ clipLengthText })}
            onBlur={() => touch("clipLengthSeconds")}
          />

          <SettingField
            label="Lichtbilder und Referenzbilder je Clip (mit Fehlversuchen)"
            unit="Bilder"
            value={form.clipImagesText}
            error={errors.clipImagesPerClip}
            onChange={(clipImagesText) => change({ clipImagesText })}
            onBlur={() => touch("clipImagesPerClip")}
          />

          <ToggleRow
            label="Rabatt auf Generierungspreise"
            hint={`${deNumber(settings.discountPercent)} % · beim Start ${settings.discountEnabled ? "an" : "aus"}`}
            checked={form.discountEnabled}
            onChange={(discountEnabled) => change({ discountEnabled }, ["discount"])}
          >
            <ChipGroup
              label="Rabatt gilt für"
              chips={[
                ...discountFamilies(data).map((family) => ({
                  key: family.family,
                  label: family.label,
                  pressed: family.modelIds.every((id) => form.discountModelIds.includes(id)),
                  onToggle: () =>
                    change({ discountModelIds: toggle(form.discountModelIds, family.modelIds) }, ["discount"]),
                })),
                ...RESOLUTIONS.map((resolution) => ({
                  key: resolution,
                  label: resolution,
                  pressed: form.discountResolutions.includes(resolution),
                  onToggle: () =>
                    change({ discountResolutions: toggle(form.discountResolutions, [resolution]) }, ["discount"]),
                })),
              ]}
            />
          </ToggleRow>

          <div className="labelled">
            <span className="group-label">Preisstand der Credit-Pakete (Rabatt = aktueller Preis bei Higgsfield)</span>
            <PillRadio
              label="Preisstand der Credit-Pakete"
              value={form.packagePriceLevel}
              options={LEVELS}
              onChange={(packagePriceLevel) => change({ packagePriceLevel })}
            />
          </div>

          <div className="labelled">
            <span className="group-label">Audio-Aufschlag für Seedance 2.0</span>
            <Segment
              label="Audio-Aufschlag für Seedance 2.0"
              value={String(form.audioSurchargePercent) as "0" | "50" | "100"}
              options={[
                { value: "0", small: "ohne Ton", label: "0 %" },
                { value: "50", small: "Ton", label: "+50 %" },
                { value: "100", small: "Ton", label: "+100 %" },
              ]}
              onChange={(value) => change({ audioSurchargePercent: Number(value) as 0 | 50 | 100 })}
            />
          </div>

          <SettingField
            label="Wechselkurs von Hand (leer = Kurs der EZB)"
            unit="$ je 1 €"
            placeholder="EZB-Kurs"
            value={form.manualRateText}
            error={errors.manualExchangeRate}
            onChange={(manualRateText) => change({ manualRateText })}
            onBlur={() => touch("manualExchangeRate")}
          />
          {errors.discount ? <FieldError message={errors.discount} /> : null}
        </div>
      </div>
    </details>
  );
}
