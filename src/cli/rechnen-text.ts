import type { Result } from "../schema/index.ts";
import { formatCredits, formatDate, formatDecimal, formatMoney } from "./format.ts";

// Lesbare Ausgabe von `hfcalc rechnen`: oben deine Auswahl mit Pakettabelle, darunter Wege nach Preis-Leistung,
// Details und Hinweise. Euro-Beträge sind brutto.

const NOTE_WORDS = {
  info: "HINWEIS",
  assumption: "ANNAHME",
  "no-price": "OHNE PREIS",
  covered: "GEDECKT",
  error: "FEHLER",
};

type Recommendation = { sentence: string; reason: string; threshold: string; notes: Result["notes"] };

export function resultText(result: Result): string {
  const lines: string[] = [];
  const { overall } = result.recommendations;
  const money = (eur: string | null, usd: string | null) =>
    eur !== null
      ? `${formatMoney(eur, "EUR")}${usd !== null ? ` (${formatMoney(usd, "USD")})` : ""}`
      : usd !== null
        ? formatMoney(usd, "USD")
        : "kein Betrag";

  lines.push("KOSTEN DEINER AUSWAHL", money(overall.eur, overall.usd));
  recommendation(lines, overall, "");
  const plan = overall.plan;
  if (plan) {
    const asOf = plan.pricesAsOf ? ` (Paketpreise vom ${formatDate(plan.pricesAsOf)})` : "";
    lines.push("", `ZU KAUFEN${asOf}`);
    if (plan.packages.length === 0) lines.push("  nichts, dein Credit-Stand reicht");
    for (const pack of plan.packages) {
      lines.push(
        `  ${pack.count} × ${formatCredits(String(pack.credits))} à ${money(pack.unitGross.eur, pack.unitGross.usd)} = ${money(pack.lineGross.eur, pack.lineGross.usd)}`,
      );
    }
    if (plan.packages.length > 0) lines.push(`  Zusammen brutto: ${money(plan.gross.eur, plan.gross.usd)}`);
    if (plan.singlePackage) {
      lines.push(
        `  Zum Vergleich ein einzelnes Paket: 1 × ${formatCredits(String(plan.singlePackage.credits))} = ${money(plan.singlePackage.gross.eur, plan.singlePackage.gross.usd)}`,
      );
    }
  }

  lines.push("", "PRODUKTIONSWEGE NACH PREIS-LEISTUNG (Kosten brutto je Qualitätspunkt, bestes Verhältnis zuerst)");
  const best = result.recommendations.bestValue.pathId;
  for (const id of result.valueRanking) {
    const path = result.paths.find((entry) => entry.id === id);
    if (path?.status !== "ok" || !path.plan) continue;
    const mark = path.id === best ? "  ← Empfehlung" : path.id === result.selected.pathId ? "  ← deine Auswahl" : "";
    const value = path.costPerQualityPoint
      ? ` · ${formatDecimal(path.quality?.points ?? "0", 2)} Punkte · ${formatMoney(path.costPerQualityPoint, result.exchangeRate ? "EUR" : "USD")} je Punkt`
      : "";
    lines.push(`  ${path.label}: ${money(path.plan.gross.eur, path.plan.gross.usd)} brutto${value}${mark}`);
  }
  const withoutPrice = result.paths.filter((entry) => entry.status === "no-price");
  if (withoutPrice.length > 0) lines.push(`  Ohne Preis: ${withoutPrice.map((path) => path.label).join(", ")}`);
  recommendation(lines, result.recommendations.bestValue, "  ");

  lines.push("", "DETAILS");
  lines.push(`  Offen mit Aufschlag: ${formatDecimal(result.openSeconds, 1)} s`);
  lines.push(
    `  Clips: ${formatDecimal(result.clips.count, 0)} à ${formatDecimal(result.clips.lengthSeconds, 2)} s, abgerechnet ${formatDecimal(result.clips.billedSecondsPerAttempt, 2)} s je Versuch`,
  );
  const credits = (value: string | null) => (value === null ? "kein Preis hinterlegt" : formatCredits(value));
  const { storyboard, clipImages, assets } = result.images;
  lines.push(
    `  Storyboard: ${storyboard ? `${formatDecimal(storyboard.images, 1)} Bilder, ${credits(storyboard.credits)}` : "aus"}`,
    `  Lichtbilder und Referenzbilder je Clip: ${formatDecimal(clipImages.images, 1)} Bilder, ${credits(clipImages.credits)}`,
    `  Einmalige Assets: ${assets ? `${formatDecimal(assets.count, 1)} Assets, ${formatDecimal(assets.images, 1)} Bilder, ${credits(assets.credits)}` : "aus"}`,
  );
  const { selected } = result;
  if (selected.totalCredits !== null && selected.shortfall !== null) {
    lines.push(
      `  Bedarf deiner Auswahl: ${formatCredits(selected.totalCredits)}, davon fehlend ${formatCredits(selected.shortfall)}`,
    );
    if (selected.packages.length > 0) {
      const packs = selected.packages
        .map((pack) => `${pack.count} × ${formatDecimal(String(pack.credits), 0)}`)
        .join(" + ");
      lines.push(`  Pakete: ${packs} Credits = ${money(selected.eur, selected.usdGross)} brutto`);
    }
    if (selected.leftoverCredits !== null) lines.push(`  Übrig: ${formatCredits(selected.leftoverCredits)}`);
  }
  const rate = result.exchangeRate;
  const origins = { ecb: "Referenzkurs der EZB", cached: "gespeichert, offline", manual: "manuell" };
  lines.push(
    `  Wechselkurs: ${rate ? `${formatDecimal(String(rate.value), 6)} $ je 1 € (${origins[rate.origin]}, ${formatDate(rate.date)})` : "keiner, Vergleich in Dollar"}`,
  );
  if (result.reach)
    lines.push(
      `  Reichweite des Credit-Stands: ${formatDecimal(result.reach.finishedSeconds, 1)} s fertiger Film, ${formatDecimal(result.reach.clips, 0)} Clips`,
    );

  lines.push("", "HINWEISE");
  for (const note of result.notes) lines.push(`  ${NOTE_WORDS[note.kind]} · ${note.text}`);
  return `${lines.join("\n")}\n`;
}

function recommendation(lines: string[], entry: Recommendation, indent: string): void {
  lines.push(
    `${indent}${entry.sentence}`,
    `${indent}Begründung: ${entry.reason}`,
    `${indent}Ändert sich: ${entry.threshold}`,
  );
  for (const note of entry.notes) lines.push(`${indent}${NOTE_WORDS[note.kind]} · ${note.text}`);
}
