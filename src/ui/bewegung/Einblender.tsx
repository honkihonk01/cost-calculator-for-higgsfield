import { type ReactNode, useRef, useState } from "react";
import { useAusklappen } from "./hooks.ts";
import { bewegt } from "./zeit.ts";

// Bereich, der beim Einschalten weich aufklappt und beim Ausschalten weich zuklappt, statt zu springen
// (Box unter einem Kippschalter). Beim Zuklappen bleibt der Inhalt stehen, bis die Bewegung fertig ist.

export function Einblender({
  offen,
  className,
  children,
}: {
  offen: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [da, setDa] = useState(offen);
  const ref = useRef<HTMLDivElement>(null);
  if (offen && !da) setDa(true);
  const [bewegung] = useState(bewegt);
  useAusklappen(ref, offen, () => setDa(false));
  return offen || (bewegung && da) ? (
    <div ref={ref} className={className}>
      {children}
    </div>
  ) : null;
}
