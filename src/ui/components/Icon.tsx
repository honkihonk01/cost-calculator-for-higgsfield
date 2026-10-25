// Eigene, schlichte Linien-Icons auf 24er-Raster (1,5er Linie, runde Enden); Farbe über currentColor
// (CLAUDE.md, Coding-Konventionen). Higgsfields eigene Icons gehören Higgsfield und sind hier bewusst nicht enthalten.
// Neue Icons im selben Stil ergänzen.

const LINIE = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const ICONS = {
  check: <path {...LINIE} d="M5 12.5 10 17.5 19 7" />,
  chevronDown: <path {...LINIE} d="M6 9l6 6 6-6" />,
  minus: <path {...LINIE} d="M5 12h14" />,
  plus: <path {...LINIE} d="M12 5v14M5 12h14" />,
  clock: (
    <>
      <circle {...LINIE} cx="12" cy="12" r="8.5" />
      <path {...LINIE} d="M12 7.5V12l3 2" />
    </>
  ),
  modelBars: <path {...LINIE} d="M6 18v-6M12 18V6M18 18V9" />,
  image: (
    <>
      <rect {...LINIE} x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle {...LINIE} cx="9" cy="10" r="1.5" />
      <path {...LINIE} d="M20.5 16l-5-5-9.5 8.5" />
    </>
  ),
  video: (
    <>
      <rect {...LINIE} x="3" y="6" width="12.5" height="12" rx="2" />
      <path {...LINIE} d="M15.5 10.5 21 7.5v9l-5.5-3z" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

/** Dekoratives Icon; die Bedeutung trägt immer der Text daneben. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      {ICONS[name]}
    </svg>
  );
}
