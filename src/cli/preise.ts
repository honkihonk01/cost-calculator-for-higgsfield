import type { PriceData } from "../schema/index.ts";
import { formatNumber, formatPrice } from "./format.ts";

/** Textausgabe von `hfcalc preise`: jeder Preis mit Wert, Währung, Stand-Datum und Quelle. */
export function pricesText(data: PriceData, dataDir: string): string {
  const lines: string[] = [`Preise aus ${dataDir}`, ""];
  const { videoModels, imageModels, packages, quality } = data;

  lines.push("Videomodelle (Credits je Sekunde Video, ohne Rabatt und ohne Ton)");
  for (const model of videoModels.models) {
    const draft = model.draft
      ? ` – Entwurf in 480p, Fertigstellung über ${model.draft.finishModelId} in ${model.draft.finishResolution} innerhalb von ${model.draft.finishWithinDays} Tagen`
      : "";
    lines.push(`  ${model.name} (${model.id}, Clips ${model.clipMinSeconds} bis ${model.clipMaxSeconds} s)${draft}`);
    for (const [resolution, price] of Object.entries(model.resolutions)) {
      lines.push(`    ${resolution}: ${formatPrice(price)}`);
    }
  }

  lines.push(
    "",
    `Bildmodelle (Storyboard: ${imageModels.imagesPerClip} Bilder je Clip; alle Modelle auch für Bilder je Clip und einmalige Assets)`,
  );
  for (const model of imageModels.models) {
    const use = model.storyboard ? "auch für das Storyboard" : "nicht für das Storyboard";
    lines.push(`  ${model.name} (${model.id}, ${use}): ${formatPrice(model.pricePerImage)}`);
  }

  const vat = formatNumber(packages.vatPercent);
  lines.push(
    "",
    `Credit-Pakete (netto, dazu ${vat} % Mehrwertsteuer; gekaufte Credits verfallen nach ${packages.expiryDays} Tagen)`,
  );
  for (const pack of packages.packages) {
    lines.push(`  ${formatNumber(pack.credits)} Credits`);
    lines.push(`    regulär: ${formatPrice(pack.regular)}`);
    lines.push(`    mit Rabatt: ${formatPrice(pack.discounted)}`);
  }

  lines.push("", `Qualitätspunkte für das Preis-Leistungs-Ranking (Stand ${quality.asOf}, Quelle: ${quality.source})`);
  lines.push(
    `  Auflösung: ${Object.entries(quality.resolutionPoints)
      .map(([resolution, points]) => `${resolution} = ${formatNumber(points)}`)
      .join(", ")}`,
  );
  for (const [id, factor] of Object.entries(quality.modelFactors))
    lines.push(`  ${id}: Faktor ${formatNumber(factor)}`);
  return `${lines.join("\n")}\n`;
}
