import { formatCredits } from "../../kern/index.ts";
import { Zahl } from "../bewegung/index.ts";
import { ValueRow } from "../components/index.ts";
import { amountText, grossText, type PlanData, pricesAsOfText } from "./anzeige.ts";

// Welche Credit-Pakete zu kaufen sind, als dezente Tabelle: Anzahl, Paket, Preis je Paket, Summe und am Ende alle
// Pakete zusammen, brutto (SPEC Entscheidung 25). Darunter das günstigste Einzelpaket zum Vergleich.

export function PaketTabelle({ plan }: { plan: PlanData }) {
  const asOf = pricesAsOfText(plan);
  if (plan.packages.length === 0) {
    return (
      <p className="buy-empty">
        Nichts zu kaufen: Dein Credit-Stand reicht, danach bleiben {formatCredits(plan.leftoverCredits)} übrig.
      </p>
    );
  }
  return (
    <div className="buy">
      <table className="buy-table">
        <caption>Zu kaufen{asOf ? ` · ${asOf}` : ""}</caption>
        <thead>
          <tr>
            <th scope="col">Anzahl</th>
            <th scope="col">Paket</th>
            <th scope="col">Preis je Paket</th>
            <th scope="col">Summe</th>
          </tr>
        </thead>
        <tbody>
          {plan.packages.map((pack) => (
            <tr key={pack.credits}>
              <td className="num">
                <Zahl text={`${pack.count} ×`} />
              </td>
              <td className="num">{formatCredits(String(pack.credits))}</td>
              <td className="num">
                <Zahl text={amountText(pack.unitGross.eur, pack.unitGross.usd)} />
              </td>
              <td className="num">
                <Zahl text={amountText(pack.lineGross.eur, pack.lineGross.usd)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3}>
              Zusammen brutto
            </th>
            <td className="num">
              <Zahl text={grossText(plan)} />
            </td>
          </tr>
        </tfoot>
      </table>
      {plan.singlePackage ? (
        <p className="buy-note">
          Zum Vergleich ein einzelnes Paket: 1 × {formatCredits(String(plan.singlePackage.credits))} kostet{" "}
          {amountText(plan.singlePackage.gross.eur, plan.singlePackage.gross.usd)}.
        </p>
      ) : null}
    </div>
  );
}

/** Kaufplan eines Wegs in einer aufgeklappten Zeile: Credits und Tabelle. */
export function Kaufplan({ plan }: { plan: PlanData }) {
  return (
    <>
      <dl className="values">
        <ValueRow label="Credit-Bedarf" value={formatCredits(plan.creditsNeeded)} />
        <ValueRow label="Fehlend nach deinem Credit-Stand" value={formatCredits(plan.shortfall)} />
      </dl>
      <PaketTabelle plan={plan} />
    </>
  );
}
