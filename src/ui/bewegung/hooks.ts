import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { staffeln } from "./aufbau.ts";
import { aufbauGeplant, bewegt, tokenMs, tokenText } from "./zeit.ts";

// Bewegungen, die an einzelnen Bausteinen hängen. Jede prüft `bewegt()`; ohne Bewegung bleibt das native Verhalten.

/** Höhe eines Bereichs weich ändern, Inhalt dabei abschneiden. Gibt die Animation zurück. */
function hoehe(el: HTMLElement, von: number, bis: number, dauer: number): Animation {
  el.style.overflow = "clip";
  const lauf = el.animate([{ height: `${von}px` }, { height: `${bis}px` }], {
    duration: dauer,
    easing: tokenText("--ease-aus"),
  });
  const fertig = () => el.style.removeProperty("overflow");
  lauf.addEventListener("finish", fertig);
  lauf.addEventListener("cancel", fertig);
  return lauf;
}

/**
 * Akkordeon (`<details>`) klappt weich auf und zu; beim Aufklappen erscheint der Inhalt Element für Element.
 * Der Inhalt muss genau ein Element nach dem `<summary>` sein. Während des Zuklappens trägt das `<details>`
 * `data-schliesst`, damit der Pfeil sich sofort zurückdreht.
 */
export function useAufklappen<T extends HTMLDetailsElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const details = ref.current;
    const summary = details?.querySelector(":scope > summary");
    const inhalt = summary?.nextElementSibling;
    if (!details || !(summary instanceof HTMLElement) || !(inhalt instanceof HTMLElement)) return;
    let lauf: Animation | null = null;
    const klick = (event: MouseEvent) => {
      if (!bewegt()) return;
      event.preventDefault();
      const schliesst = details.dataset.schliesst !== undefined;
      const von = details.open ? inhalt.getBoundingClientRect().height : 0;
      lauf?.cancel();
      const dauer = tokenMs("--duration-akkordeon");
      if (!details.open || schliesst) {
        delete details.dataset.schliesst;
        details.open = true;
        lauf = hoehe(inhalt, von, inhalt.getBoundingClientRect().height, dauer);
        if (von === 0) staffeln(inhalt);
      } else {
        details.dataset.schliesst = "";
        lauf = hoehe(inhalt, von, 0, dauer);
        lauf.addEventListener("finish", () => {
          details.open = false;
          delete details.dataset.schliesst;
        });
      }
    };
    summary.addEventListener("click", klick);
    return () => {
      summary.removeEventListener("click", klick);
      lauf?.cancel();
    };
  }, []);
  return ref;
}

/**
 * Bereich, der erscheint oder verschwindet (Box eines eingeschalteten Kippschalters): Höhe von 0 auf ihre
 * natürliche Höhe und zurück; `fertig` meldet, wann der Bereich nach dem Zuklappen entfernt werden darf.
 */
export function useAusklappen(ref: RefObject<HTMLElement | null>, offen: boolean, fertig: () => void): void {
  const erstes = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: läuft bewusst nur, wenn „offen“ wechselt; `fertig` ist bei jedem Aufruf neu
  useLayoutEffect(() => {
    const el = ref.current;
    if (erstes.current) {
      erstes.current = false;
      return;
    }
    if (!el || !bewegt()) {
      if (!offen) fertig();
      return;
    }
    const dauer = tokenMs("--duration-akkordeon");
    if (offen) {
      const lauf = hoehe(el, 0, el.getBoundingClientRect().height, dauer);
      staffeln(el);
      return () => lauf.cancel();
    }
    const lauf = hoehe(el, el.getBoundingClientRect().height, 0, dauer);
    lauf.addEventListener("finish", fertig);
    return () => lauf.cancel();
  }, [offen]);
}

/**
 * Listeneinträge gleiten an ihren neuen Platz, wenn sich die Reihenfolge ändert (Vergleichsliste).
 * Einträge brauchen `data-flip` mit einem festen Schlüssel. Gleiche Reihenfolge = keine Bewegung, damit
 * ein aufgeklapptes Akkordeon darüber nicht als Umsortieren gilt.
 */
export function useUmordnen(ref: RefObject<HTMLElement | null>): void {
  const lagen = useRef(new Map<string, number>());
  const folge = useRef("");
  useLayoutEffect(() => {
    const liste = ref.current;
    if (!liste) return;
    const kinder = [...liste.children].filter(
      (kind): kind is HTMLElement => kind instanceof HTMLElement && kind.dataset.flip !== undefined,
    );
    const neueFolge = kinder.map((kind) => kind.dataset.flip).join("|");
    const umsortiert = folge.current !== "" && neueFolge !== folge.current && bewegt();
    const neu = new Map<string, number>();
    for (const kind of kinder) {
      const schluessel = kind.dataset.flip ?? "";
      neu.set(schluessel, kind.offsetTop);
      const alt = lagen.current.get(schluessel);
      if (umsortiert && alt !== undefined && alt !== kind.offsetTop) {
        kind.animate([{ transform: `translateY(${alt - kind.offsetTop}px)` }, { transform: "none" }], {
          duration: tokenMs("--duration-akkordeon"),
          easing: tokenText("--ease-aus"),
        });
      }
    }
    lagen.current = neu;
    folge.current = neueFolge;
  });
}

/**
 * Gleitende Markierung hinter dem gewählten Feld eines Umschalters (Pill-Reiter, Segment): eine weiße Fläche,
 * die federnd zum neuen Feld gleitet, statt dass das Feld einfach die Farbe wechselt.
 */
export function useMarkierung(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const box = ref.current;
    if (box && bewegt()) setzeMarkierung(box, false);
  });
  useEffect(() => {
    const box = ref.current;
    if (!box || !bewegt() || typeof ResizeObserver === "undefined") return;
    // Größenwechsel (Schrift geladen, zugeklappter Bereich geöffnet) setzen die Markierung ohne Gleiten.
    const beobachter = new ResizeObserver(() => setzeMarkierung(box, true));
    beobachter.observe(box);
    return () => beobachter.disconnect();
  }, [ref]);
}

function setzeMarkierung(box: HTMLElement, sofort: boolean): void {
  let markierung = box.querySelector<HTMLElement>(":scope > .markierung");
  const neu = markierung === null;
  if (!markierung) {
    markierung = document.createElement("span");
    markierung.className = "markierung";
    markierung.setAttribute("aria-hidden", "true");
    box.prepend(markierung);
    box.dataset.markierung = "";
  }
  const gewaehlt = box.querySelector<HTMLElement>(':scope > [data-state="checked"], :scope > [data-state="active"]');
  if (!gewaehlt || gewaehlt.offsetWidth === 0) {
    markierung.dataset.leer = "";
    return;
  }
  const springen = neu || sofort || markierung.dataset.leer !== undefined;
  if (springen) markierung.style.transition = "none";
  delete markierung.dataset.leer;
  markierung.style.width = `${gewaehlt.offsetWidth}px`;
  markierung.style.height = `${gewaehlt.offsetHeight}px`;
  markierung.style.transform = `translate(${gewaehlt.offsetLeft}px, ${gewaehlt.offsetTop}px)`;
  if (springen) {
    void markierung.offsetWidth;
    markierung.style.removeProperty("transition");
  }
}

/** Ein Wert pulsiert einmal kurz, wenn er sich ändert (zum Beispiel der Zähler „2 geändert“). */
export function usePuls(ref: RefObject<HTMLElement | null>, wert: unknown): void {
  const erstes = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: pulsiert bewusst bei jeder Änderung von `wert`, der sonst nicht gebraucht wird
  useLayoutEffect(() => {
    const el = ref.current;
    if (erstes.current) {
      erstes.current = false;
      return;
    }
    if (!el || !bewegt()) return;
    el.animate(
      [{ transform: "none" }, { transform: `scale(${tokenText("--scale-puls")})`, offset: 0.4 }, { transform: "none" }],
      {
        duration: tokenMs("--duration-puls"),
        easing: tokenText("--ease-feder"),
      },
    );
  }, [wert]);
}

/** Hinweis, der nach dem ersten Aufbau erscheint, gleitet kurz von unten herein. */
export function useEinblenden(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !bewegt() || !aufbauGeplant()) return;
    el.animate(
      [
        { opacity: 0, transform: `translateY(${tokenText("--move-hinweis")})` },
        { opacity: 1, transform: "none" },
      ],
      { duration: tokenMs("--duration-hinweis"), easing: tokenText("--ease-aus") },
    );
  }, [ref]);
}
