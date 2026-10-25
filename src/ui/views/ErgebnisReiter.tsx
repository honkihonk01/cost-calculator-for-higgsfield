import { type ReactNode, useRef } from "react";
import { deDate, formatCredits, formatDecimal } from "../../kern/index.ts";
import type { Result } from "../../schema/index.ts";
import { useUmordnen } from "../bewegung/index.ts";
import { NoteList, OptionAccordion, ValueRow } from "../components/index.ts";
import { amountText, differenceText, grossText, notesIn, pathLabel, pathsByValue, valueText } from "./anzeige.ts";
import { Kaufplan } from "./Kaufplan.tsx";

// Inhalte der beiden Ergebnis-Reiter (docs/UI-RULES.md, Abschnitt A). Hinweise stehen bei dem, was sie betreffen.

/**
 * Alle Produktionswege nach Preis-Leistung (SPEC Entscheidung 27): Kosten brutto je Qualitätspunkt, bestes Verhältnis
 * oben. Die Empfehlung ist das beste Verhältnis, nicht zwingend der günstigste Weg; aufgeklappt Begründung und Pakete.
 */
export function PathsTab({ result }: { result: Result }) {
  const best = result.recommendations.bestValue;
  const { ranked, withoutPrice } = pathsByValue(result);
  // Ändert sich die Reihenfolge, gleiten die Zeilen an ihren neuen Platz (UI-RULES §11).
  const liste = useRef<HTMLUListElement>(null);
  useUmordnen(liste);
  return (
    <>
      <h3 className="list-heading">Produktionswege im Vergleich, sortiert nach Preis-Leistung</h3>
      <p className="tab-intro">
        Qualität in Punkten: Auflösung (480p = 1 bis 4K = 4) mal Modellfaktor (Seedance 2.5 = 1, Seedance 2.0 darunter).
        Oben steht der Weg mit den geringsten Kosten je Punkt, brutto für {formatDecimal(result.openSeconds, 1)} s Film
        mit allen Bildern; rechts stehen Preis und Unterschied zu deiner Auswahl. Aufklappen zeigt, was du kaufen
        müsstest.
      </p>
      <ul ref={liste} className="options" aria-label="Produktionswege im Vergleich">
        {ranked.map((path) => {
          const recommended = path.id === best.pathId;
          const value = valueText(result, path);
          return (
            <OptionAccordion
              key={path.id}
              title={path.label}
              chips={[...(value ? [value] : ["ohne Qualitätsangabe"])]}
              tile={path.plan ? { value: grossText(path.plan), below: differenceText(result, path) } : undefined}
              highlight={recommended}
              pill={recommended ? "Empfehlung" : undefined}
            >
              {recommended ? (
                <>
                  <p>{best.sentence}</p>
                  <p className="option-acc__text">{best.reason}</p>
                  <p className="option-acc__text">Zum Vergleich: {best.threshold}.</p>
                  <NoteList notes={best.notes} />
                </>
              ) : null}
              <dl className="values">
                <ValueRow
                  label="Credits je Sekunde fertigem Film"
                  value={formatDecimal(path.creditsPerSecond ?? "0", 2)}
                />
                <ValueRow label="Video-Credits" value={formatCredits(path.videoCredits ?? "0")} />
              </dl>
              {path.plan ? <Kaufplan plan={path.plan} /> : null}
            </OptionAccordion>
          );
        })}
      </ul>
      {withoutPrice.length > 0 ? (
        <p className="tab-intro">
          Ohne Preis und deshalb nie empfohlen: {withoutPrice.map((path) => path.label).join(", ")}.
        </p>
      ) : null}
      <NoteList notes={notesIn(result, "paths").filter((note) => note.kind !== "no-price")} />
    </>
  );
}

/** Zahlen der gewählten Kombination als Wertzeilen, gruppiert; Hinweise unter ihrer Gruppe. */
export function DetailsTab({ result }: { result: Result }) {
  const { selected, clips, exchangeRate, reach, images } = result;
  const priced = selected.totalCredits !== null;
  const packs = selected.packages
    .map((pack) => `${pack.count} × ${formatDecimal(String(pack.credits), 0)}`)
    .join(" + ");
  const origins = { ecb: "Referenzkurs der EZB", cached: "gespeichert, offline", manual: "von Hand eingegeben" };
  return (
    <>
      <Group title="Umfang">
        <ValueRow label="Offen einschließlich Aufschlag" value={`${formatDecimal(result.openSeconds, 1)} s`} />
        <ValueRow
          label="Clips"
          value={`${formatDecimal(clips.count, 0)} Clips à ${formatDecimal(clips.lengthSeconds, 2)} s`}
        />
        <ValueRow label="Abgerechnet je Versuch" value={`${formatDecimal(clips.billedSecondsPerAttempt, 2)} s`} />
      </Group>
      <NoteList notes={notesIn(result, "clips")} />

      <Group title="Bilder">
        <ValueRow
          label="Lichtbilder und Referenzbilder je Clip"
          value={imageValue(images.clipImages.images, images.clipImages.credits)}
        />
        <ValueRow
          label="Storyboard"
          value={images.storyboard ? imageValue(images.storyboard.images, images.storyboard.credits) : "aus"}
        />
        <ValueRow
          label="Einmalige Assets"
          value={
            images.assets
              ? `${formatDecimal(images.assets.count, 1)} Assets · ${imageValue(images.assets.images, images.assets.credits)}`
              : "aus"
          }
        />
      </Group>
      <NoteList notes={notesIn(result, "images")} />

      <Group title={`Kauf für deine Auswahl: ${pathLabel(result, selected.pathId)}`}>
        {priced && selected.totalCredits !== null ? (
          <>
            <ValueRow label="Bedarf einschließlich Bilder" value={formatCredits(selected.totalCredits)} />
            <ValueRow label="Fehlend nach deinem Credit-Stand" value={formatCredits(selected.shortfall ?? "0")} />
            <ValueRow label="Pakete" value={packs === "" ? "keine nötig" : `${packs} Credits`} />
            <ValueRow label="Zusätzliche Kosten brutto" value={amountText(selected.eur, selected.usdGross)} />
            <ValueRow label="Übrig nach dem Kauf" value={formatCredits(selected.leftoverCredits ?? "0")} />
          </>
        ) : (
          <ValueRow label="Bedarf" value="kein Preis hinterlegt" />
        )}
      </Group>
      <NoteList notes={notesIn(result, "packages")} />

      <Group title="Wechselkurs">
        <ValueRow
          label="Dollar je 1 Euro"
          value={
            exchangeRate
              ? `${formatDecimal(String(exchangeRate.value), 6)} $ · ${origins[exchangeRate.origin]}, ${deDate(exchangeRate.date)}`
              : "keiner, Vergleich in Dollar"
          }
        />
      </Group>
      {/* Bei EZB- und Handkurs wiederholte der Hinweis nur die Zeile; offline erklärt er, warum der Kurs älter ist. */}
      {exchangeRate?.origin === "cached" ? <NoteList notes={notesIn(result, "rate")} /> : null}

      <Group title="Reichweite deines Credit-Stands">
        <ValueRow
          label="Fertiger Film"
          value={
            reach
              ? `${formatDecimal(reach.finishedSeconds, 1)} s · ${formatDecimal(reach.clips, 0)} ganze Clips`
              : "kein Preis hinterlegt"
          }
        />
      </Group>
      <NoteList notes={notesIn(result, "reach")} />
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="value-group" aria-label={title}>
      <h3 className="group-label">{title}</h3>
      <dl className="values">{children}</dl>
    </section>
  );
}

/** „105 Bilder · 315 Credits“; ohne Preis „kein Preis hinterlegt“. */
function imageValue(count: string, credits: string | null): string {
  return `${formatDecimal(count, 1)} Bilder · ${credits === null ? "kein Preis hinterlegt" : formatCredits(credits)}`;
}
