import type { PriceData } from "../../schema/index.ts";
import {
  BlockSlider,
  FieldError,
  FieldGroup,
  GlassSelect,
  MenuSelect,
  ModelPicker,
  PillRadio,
  SettingField,
  StepperField,
  TileInput,
} from "../components/index.ts";
import type { useLiveCredits } from "../creditstand.ts";
import { durationSecondsOf, type FieldName, type FormState, findModel, formatDuration } from "../formular.ts";
import { draftDisplay, imageOptions, modelGroups, resolutionOptions } from "./auswahllisten.ts";
import { BilderSchalter } from "./BilderSchalter.tsx";
import { CreditStand } from "./CreditStand.tsx";
import { WeitereEinstellungen } from "./WeitereEinstellungen.tsx";

// Eingabespalte (docs/UI-RULES.md, Abschnitt A): sieben Pflichtfelder und die Schalter für Storyboard und einmalige
// Assets sichtbar, alles Seltene eingeklappt (AC-F10-6).

/** Der Dauer-Regler reicht bis 15 Minuten; längere Dauern gehen über das Eingabefeld (docs/DECISIONS.md 2026-10-25). */
const DURATION_MAX_SECONDS = 900;

export type ColumnProps = {
  data: PriceData;
  form: FormState;
  change: (patch: Partial<FormState>, touched?: FieldName[]) => void;
  touch: (field: FieldName) => void;
  /** Fehler, die am Feld erscheinen sollen */
  errors: Partial<Record<FieldName, string>>;
  /** Live-Abruf des Credit-Stands und sein Zustand */
  credit: ReturnType<typeof useLiveCredits>;
};

export function Eingabespalte(props: ColumnProps) {
  const { data, form, change, touch, errors } = props;
  const model = findModel(data, form.modelId);
  const scopeError =
    form.scopeMode === "duration" ? errors.durationSeconds : (errors.clipCount ?? errors.durationSeconds);

  return (
    <form className="input-form" aria-label="Eingaben" onSubmit={(event) => event.preventDefault()}>
      <FieldGroup
        label="Noch offen"
        aside={
          <PillRadio
            label="Offenen Umfang angeben als"
            value={form.scopeMode}
            options={[
              { value: "duration", label: "Dauer" },
              { value: "clips", label: "Clips" },
            ]}
            onChange={(scopeMode) => change({ scopeMode })}
          />
        }
      >
        {form.scopeMode === "duration" ? (
          <>
            <BlockSlider
              label="Noch offene Dauer"
              showLabel={false}
              value={Math.min(DURATION_MAX_SECONDS, durationSecondsOf(form.durationText) ?? 0)}
              min={1}
              max={DURATION_MAX_SECONDS}
              step={1}
              scale={[0, 300, 600, 900]}
              scaleLabel={(mark) => (mark === DURATION_MAX_SECONDS ? "15 min" : String(mark / 60))}
              format={formatDuration}
              onChange={(seconds) => change({ durationText: formatDuration(seconds) }, ["durationSeconds"])}
            />
            <TileInput
              label="Noch offene Dauer (M:SS)"
              icon="clock"
              placeholder="M:SS, zum Beispiel 3:00"
              value={form.durationText}
              error={scopeError}
              onChange={(durationText) => change({ durationText })}
              onBlur={() => touch("durationSeconds")}
            />
            {scopeError ? <FieldError message={scopeError} /> : null}
          </>
        ) : (
          <SettingField
            label="Noch offene Clips"
            unit="Clips"
            inputMode="numeric"
            value={form.clipsText}
            error={scopeError}
            onChange={(clipsText) => change({ clipsText })}
            onBlur={() => touch("clipCount")}
          />
        )}
      </FieldGroup>

      <BlockSlider
        label="Zwischenszenen, Inserts und Korrekturclips"
        value={form.extraScenesPercent}
        min={20}
        max={50}
        step={5}
        scale={[20, 25, 30, 35, 40, 45, 50]}
        format={(value) => `${value} %`}
        onChange={(extraScenesPercent) => change({ extraScenesPercent })}
      />

      <div>
        <ModelPicker
          label="Videomodell"
          placeholder="Modell wählen"
          value={form.modelId}
          invalid={errors.modelId !== undefined}
          groups={modelGroups(data)}
          onChange={(modelId) => {
            // Eine Auflösung, die das neue Modell nicht liefert, wird geleert statt als Fehler gemeldet.
            const offered = resolutionOptions(findModel(data, modelId)).map((option) => option.value);
            const resolution = form.resolution !== "" && offered.includes(form.resolution) ? form.resolution : "";
            change({ modelId, resolution }, ["modelId"]);
          }}
        />
        {errors.modelId ? <FieldError message={errors.modelId} /> : null}
      </div>

      <div>
        <div className="stack">
          <MenuSelect
            label="Auflösung"
            icon="video"
            placeholder="Auflösung"
            value={form.resolution}
            invalid={errors.resolution !== undefined}
            options={resolutionOptions(model)}
            disabled={Boolean(model?.draft)}
            display={model ? draftDisplay(model) : undefined}
            onChange={(resolution) => {
              // Radix meldet beim Leeren durch einen Modellwechsel "" zurück; das ist keine Eingabe vom Nutzer.
              if (resolution !== "") change({ resolution: resolution as FormState["resolution"] }, ["resolution"]);
            }}
          />
          <StepperField
            label="Versuche pro Clip"
            min={1}
            max={20}
            value={form.attemptsText}
            error={errors.attemptsPerClip}
            messageOutside
            onChange={(attemptsText) => change({ attemptsText })}
            onBlur={() => touch("attemptsPerClip")}
          />
        </div>
        {errors.resolution ? <FieldError message={errors.resolution} /> : null}
        {errors.attemptsPerClip ? <FieldError message={errors.attemptsPerClip} /> : null}
      </div>

      <div>
        <GlassSelect
          label="Lichtbilder und Referenzbilder je Clip"
          placeholder="Bildmodell wählen"
          value={form.clipImageModelId}
          invalid={errors.clipImageModelId !== undefined}
          options={imageOptions(data)}
          onChange={(clipImageModelId) => change({ clipImageModelId }, ["clipImageModelId"])}
        />
        {errors.clipImageModelId ? <FieldError message={errors.clipImageModelId} /> : null}
      </div>

      <CreditStand
        label="Aktueller Credit-Stand"
        value={form.creditBalanceText}
        origin={form.creditOrigin}
        error={errors.creditBalance}
        onChange={(creditBalanceText) => change({ creditBalanceText, creditOrigin: "manual" })}
        onBlur={() => touch("creditBalance")}
        credit={props.credit}
      />

      <BilderSchalter {...props} />

      <WeitereEinstellungen {...props} />
    </form>
  );
}
