import { Note, SettingField } from "../components/index.ts";
import type { CreditStatus, useLiveCredits } from "../creditstand.ts";
import type { CreditOrigin } from "../formular.ts";

// Credit-Stand: live aus dem Higgsfield-Konto, von Hand überschreibbar (AC-F10-11). Die Zeile darunter sagt immer,
// woher die Zahl im Feld stammt. Dasselbe Feld dient dem Einzelprojekt und der Gesamtkalkulation (SPEC F15).

export function CreditStand({
  label,
  value,
  origin,
  error,
  onChange,
  onBlur,
  credit,
}: {
  label: string;
  value: string;
  origin: CreditOrigin;
  error?: string;
  /** eine Eingabe von Hand */
  onChange: (value: string) => void;
  onBlur?: () => void;
  credit: ReturnType<typeof useLiveCredits>;
}) {
  const { status, refresh } = credit;
  return (
    <div>
      <SettingField
        label={label}
        unit="Credits"
        inputMode="numeric"
        value={value}
        error={error}
        onChange={onChange}
        onBlur={onBlur}
      />
      {status.state === "failed" ? (
        <Note
          kind="info"
          text={`Live-Abruf aus Higgsfield nicht möglich: ${status.message} Trag den Stand von Hand ein.`}
        />
      ) : null}
      <p className="credit-status">
        <span>{originText(origin, status)}</span>
        {status.state === "loading" || (status.state === "live" && origin === "live") ? null : (
          <button type="button" className="text-button" onClick={refresh}>
            {status.state === "failed" ? "Erneut abrufen" : "Live-Stand übernehmen"}
          </button>
        )}
      </p>
    </div>
  );
}

function originText(origin: CreditOrigin, status: CreditStatus): string {
  if (status.state === "loading") return "Wird aus deinem Higgsfield-Konto abgerufen …";
  if (origin === "live" && status.state === "live") return `Live aus deinem Higgsfield-Konto, Stand ${status.time} Uhr`;
  if (origin === "manual") return "Von Hand eingetragen";
  if (origin === "project") return "Aus dem geladenen Projekt";
  return "Startwert, noch nicht aus Higgsfield abgerufen";
}
