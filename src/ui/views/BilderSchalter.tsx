import { deNumber } from "../../kern/index.ts";
import { FieldError, GlassSelect, StepperField, ToggleRow } from "../components/index.ts";
import { imageOptions, storyboardOptions } from "./auswahllisten.ts";
import type { ColumnProps } from "./Eingabespalte.tsx";

// Zwei Posten, die der Nutzer wahlweise dazurechnet (docs/DECISIONS.md 2026-10-25): das Storyboard und die einmalig
// erzeugten Assets. Beide starten ausgeschaltet; erst eingeschaltet fragen sie nach ihrem Bildmodell.

export function BilderSchalter({ data, form, change, touch, errors }: ColumnProps) {
  const { settings } = data;
  const assetError =
    errors["oneTimeAssets.people"] ?? errors["oneTimeAssets.locations"] ?? errors["oneTimeAssets.attemptsPerAsset"];
  return (
    <>
      <ToggleRow
        label="Storyboard"
        hint={`${data.imageModels.imagesPerClip} Bilder je Clip · beim Start aus`}
        checked={form.storyboardEnabled}
        onChange={(storyboardEnabled) => change({ storyboardEnabled })}
        grouped
      >
        <GlassSelect
          label="Bildmodell für das Storyboard"
          placeholder="Bildmodell wählen"
          value={form.storyboardModelId}
          invalid={errors.storyboardModelId !== undefined}
          options={storyboardOptions(data)}
          onChange={(storyboardModelId) => change({ storyboardModelId }, ["storyboardModelId"])}
        />
        {errors.storyboardModelId ? <FieldError message={errors.storyboardModelId} /> : null}
      </ToggleRow>

      <ToggleRow
        label="Einmalige Assets"
        hint={`Figuren, Orte, Gegenstände · je Person ${deNumber(settings.assetsPerPerson)}, je Ort ${deNumber(settings.assetsPerLocation)} Assets`}
        checked={form.assetsEnabled}
        onChange={(assetsEnabled) => change({ assetsEnabled })}
        grouped
      >
        <GlassSelect
          label="Bildmodell für die Assets"
          placeholder="Bildmodell wählen"
          value={form.assetModelId}
          invalid={errors["oneTimeAssets.modelId"] !== undefined}
          options={imageOptions(data)}
          onChange={(assetModelId) => change({ assetModelId }, ["oneTimeAssets.modelId"])}
        />
        {errors["oneTimeAssets.modelId"] ? <FieldError message={errors["oneTimeAssets.modelId"]} /> : null}
        <StepperField
          label="Personen im Film"
          min={0}
          max={100}
          value={form.assetPeopleText}
          error={errors["oneTimeAssets.people"]}
          messageOutside
          onChange={(assetPeopleText) => change({ assetPeopleText })}
          onBlur={() => touch("oneTimeAssets.people")}
        />
        <StepperField
          label="Orte im Film"
          min={0}
          max={100}
          value={form.assetLocationsText}
          error={errors["oneTimeAssets.locations"]}
          messageOutside
          onChange={(assetLocationsText) => change({ assetLocationsText })}
          onBlur={() => touch("oneTimeAssets.locations")}
        />
        <StepperField
          label="Anläufe pro Asset"
          min={1}
          max={50}
          value={form.assetAttemptsText}
          error={errors["oneTimeAssets.attemptsPerAsset"]}
          messageOutside
          onChange={(assetAttemptsText) => change({ assetAttemptsText })}
          onBlur={() => touch("oneTimeAssets.attemptsPerAsset")}
        />
        {assetError ? <FieldError message={assetError} /> : null}
      </ToggleRow>
    </>
  );
}
