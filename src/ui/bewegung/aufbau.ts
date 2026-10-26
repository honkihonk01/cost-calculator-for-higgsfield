import { zaehleVonNull } from "./Zahl.tsx";
import { markiereAufbau, tokenMs } from "./zeit.ts";

// Aufbau-Regie nach dem Prototyp „Angebotsrechner“: Jede Fläche zieht sich auf (hohe von oben, breite von links),
// danach erscheinen ihre Elemente einzeln, treppenartig. Flächen starten zeitversetzt und überlappen sich.
// Flächen in einer Fläche starten, sobald diese gut zur Hälfte steht. Was beim Start nicht sichtbar ist (weiter
// unten in der Ergebnisliste), baut sich auf, sobald es ins Bild kommt. Zahlen zählen dabei von 0 hoch.

const FLAECHEN = [
  ".input-column",
  ".result-area__inner",
  ".answer__card",
  ".result-tabs",
  ".option-acc",
  ".block",
  ".switch-group",
  ".check-list",
].join(",");

/** Bausteine, die einzeln erscheinen; beim Aufklappen kommen Absätze, Listenpunkte und Tabellenzeilen dazu. */
const ATOME = [
  ".pills",
  ".pills > button",
  ".segment",
  ".segment > button",
  ".group-label",
  ".setting",
  "label.tile",
  "button.tile",
  ".block__scale > span",
  ".block__slider",
  ".switch-row",
  ".more > summary",
  ".button",
  ".save-project__hint",
  ".credit-status",
  ".note",
  ".answer__label",
  ".answer__title",
  ".answer__value",
  ".answer__credits",
  ".answer__meta",
  ".buy-table caption",
  ".buy-table tr",
  ".buy-note",
  ".buy-empty",
  ".option__title",
  ".option__chips",
  ".option-acc__price",
  ".option-acc__chevron",
  ".list-heading",
  ".tab-intro",
  ".value-row",
  ".value-group > h3",
  ".placeholder",
  ".check-list > li",
  ".chips > .chip",
].join(",");
const ATOME_AUF = `${ATOME}, p, li`;

const FEIN = ".block__scale > span";
const WISCH = ".block__slider";
const BLENDE = ".pills > button, .segment > button, .option-acc__chevron";

/** Bausteine mit eigenem Stil: HTML und SVG (die Pfeile der Akkordeons sind SVG). */
type Teil = HTMLElement | SVGElement;
const istTeil = (el: Element): el is Teil => el instanceof HTMLElement || el instanceof SVGElement;

const BAU_KLASSEN = [
  "bau-flaeche",
  "bau-atom",
  "bau-wartet",
  "bau-los",
  "bau-von-oben",
  "bau-fein",
  "bau-wisch",
  "bau-blende",
];
const AUF_KLASSEN = ["auf-stufe", "auf-blende", "auf-wisch"];

/** Liegt das Element in einem zugeklappten Bereich oder ist es unsichtbar? */
function verborgen(el: Element): boolean {
  return el.getClientRects().length === 0 || el.closest("details:not([open]) > :not(summary)") !== null;
}

function naechste(el: Element, menge: Set<Element>): Element | null {
  let p = el.parentElement;
  while (p && !menge.has(p)) p = p.parentElement;
  return p;
}

/** Baut alles in `wurzel` auf; gibt eine Aufräumfunktion zurück, die jeden Zwischenstand zurücknimmt. */
export function aufbauen(wurzel: HTMLElement): () => void {
  const zeit = {
    inhalt: tokenMs("--delay-inhalt"),
    flaeche: tokenMs("--delay-flaeche"),
    verschachtelt: tokenMs("--delay-verschachtelt"),
    atom: tokenMs("--stagger-atom"),
    fein: tokenMs("--stagger-fein"),
    zahl: tokenMs("--delay-zahl"),
    ausklang: tokenMs("--duration-wisch") + tokenMs("--duration-zaehlen-aufbau"),
  };
  const boxen = [...wurzel.querySelectorAll(FLAECHEN)].filter((b) => !verborgen(b));
  const istBox = new Set<Element>(boxen);
  const proBox = new Map<Element, Teil[]>(boxen.map((b) => [b, []]));
  for (const a of wurzel.querySelectorAll<Teil>(ATOME)) {
    if (istBox.has(a) || verborgen(a)) continue;
    const box = naechste(a, istBox);
    if (!box) continue;
    a.classList.add("bau-atom", "bau-wartet");
    if (a.matches(FEIN)) a.classList.add("bau-fein");
    else if (a.matches(WISCH)) a.classList.add("bau-wisch");
    else if (a.matches(BLENDE)) a.classList.add("bau-blende");
    proBox.get(box)?.push(a);
  }
  for (const b of boxen) {
    if (!(b instanceof HTMLElement)) continue;
    const r = b.getBoundingClientRect();
    b.classList.add("bau-flaeche", "bau-wartet");
    if (r.height > r.width) b.classList.add("bau-von-oben");
    b.style.setProperty("--bau-rr", getComputedStyle(b).borderTopLeftRadius || "0");
  }

  const timer: ReturnType<typeof setTimeout>[] = [];
  const aufraeumen = (el: Teil) => {
    el.classList.remove(...BAU_KLASSEN);
    el.style.removeProperty("--bau-d");
    el.style.removeProperty("--bau-rr");
  };

  // Zeitplan einer Fläche: sie selbst bei „start“, ihre Elemente ab „start + inhalt“ im Abstand „atom“.
  const plane = (box: Element, start: number) => {
    const alle = [box, ...(proBox.get(box) ?? [])].filter(istTeil);
    if (istTeil(box)) box.style.setProperty("--bau-d", `${start}ms`);
    let t = start + zeit.inhalt;
    let ende = start;
    for (const a of proBox.get(box) ?? []) {
      a.style.setProperty("--bau-d", `${Math.round(t)}ms`);
      for (const z of a.matches("[data-zahl]") ? [a] : a.querySelectorAll("[data-zahl]")) {
        zaehleVonNull(z, t + zeit.zahl);
      }
      ende = t;
      t += a.classList.contains("bau-fein") ? zeit.fein : zeit.atom;
    }
    for (const el of alle) {
      el.classList.remove("bau-wartet");
      el.classList.add("bau-los");
    }
    timer.push(setTimeout(() => alle.forEach(aufraeumen), ende + zeit.ausklang));
  };

  const elternBox = new Map(boxen.map((b) => [b, naechste(b, istBox)]));
  const startZeit = new Map<Element, number>();
  const starteGruppe = (gruppe: Element[]) => {
    const inGruppe = new Set(gruppe);
    const geschwister = new Map<Element, number>();
    let stufe = 0;
    for (const b of gruppe) {
      const p = elternBox.get(b);
      let start: number;
      if (p && inGruppe.has(p)) {
        const n = geschwister.get(p) ?? 0;
        geschwister.set(p, n + 1);
        start = (startZeit.get(p) ?? 0) + zeit.inhalt + n * zeit.verschachtelt;
      } else start = stufe++ * zeit.flaeche;
      startZeit.set(b, start);
      plane(b, start);
    }
  };

  // Ohne IntersectionObserver baut sich alles sofort auf.
  const ohneBeobachter = typeof IntersectionObserver === "undefined";
  const sofort = boxen.filter((b) => ohneBeobachter || b.getBoundingClientRect().top < window.innerHeight);
  starteGruppe(sofort);
  if (ohneBeobachter) {
    markiereAufbau();
    return () => {
      for (const t of timer) clearTimeout(t);
      for (const el of wurzel.querySelectorAll<Teil>(".bau-atom, .bau-flaeche")) aufraeumen(el);
    };
  }
  const io = new IntersectionObserver(
    (eintraege) => {
      const neu = eintraege
        .filter((e) => e.isIntersecting)
        .map((e) => e.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      for (const b of neu) io.unobserve(b);
      if (neu.length > 0) starteGruppe(neu);
    },
    { threshold: 0.12 },
  );
  for (const b of boxen) if (!sofort.includes(b)) io.observe(b);
  markiereAufbau();

  return () => {
    io.disconnect();
    for (const t of timer) clearTimeout(t);
    for (const el of wurzel.querySelectorAll<Teil>(".bau-atom, .bau-flaeche")) aufraeumen(el);
  };
}

/**
 * Beim Aufklappen, Umschalten oder Reiterwechsel erscheint der neue Inhalt Element für Element.
 * Lange Listen laufen dichter, damit das letzte Element nach spätestens „--stagger-auf-gesamt“ steht.
 * `ohne`: ein Teil des Bereichs, der stehen bleibt (zum Beispiel der Umschalter, der den Wechsel ausgelöst hat).
 */
const staffelTimer = new WeakMap<Element, ReturnType<typeof setTimeout>>();

export function staffeln(bereich: Element, ohne?: Element | null): void {
  const teile = [...bereich.querySelectorAll<Teil>(ATOME_AUF)].filter(
    (a) => !verborgen(a) && !(ohne?.contains(a) ?? false),
  );
  if (teile.length === 0) return;
  for (const a of teile) a.classList.remove(...AUF_KLASSEN);
  void (bereich as HTMLElement).offsetWidth;
  const schritt = Math.max(
    tokenMs("--stagger-auf-min"),
    Math.min(tokenMs("--stagger-auf-max"), tokenMs("--stagger-auf-gesamt") / teile.length),
  );
  let t = tokenMs("--stagger-atom");
  for (const a of teile) {
    a.style.setProperty("--auf-d", `${Math.round(t)}ms`);
    a.classList.add("auf-stufe");
    if (a.matches(WISCH)) a.classList.add("auf-wisch");
    else if (a.matches(`${BLENDE}, ${FEIN}`)) a.classList.add("auf-blende");
    t += a.matches(FEIN) ? tokenMs("--stagger-fein") : schritt;
  }
  clearTimeout(staffelTimer.get(bereich));
  const timer = setTimeout(() => {
    for (const a of teile) {
      a.classList.remove(...AUF_KLASSEN);
      a.style.removeProperty("--auf-d");
    }
  }, t + tokenMs("--duration-wisch"));
  staffelTimer.set(bereich, timer);
}
