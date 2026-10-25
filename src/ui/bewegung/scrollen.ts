import { bewegt, tokenText } from "./zeit.ts";

// Weiches Scrollen mit Nachlauf nach dem Prototyp „Angebotsrechner“: Mausrad- und Trackpad-Schritte werden zu einer
// gleitenden Bewegung, die sanft ausläuft. Jedes Bild legt einen festen Anteil des Restwegs zurück
// (`--scroll-nachlauf` bei 60 Bildern pro Sekunde, auf andere Bildraten umgerechnet). Tastatur, Scrollbalken und
// Fokuswechsel scrollen weiter wie gewohnt; bei „Bewegung reduzieren“ und auf Touch-Geräten bleibt alles normal.

const BILD_MS = 1000 / 60;

/** Nächster Scrollstand: rückt um den Anteil `faktor` je 60stel Sekunde auf das Ziel zu; nah dran = am Ziel. */
export function naechsterStand(aktuell: number, ziel: number, dauerMs: number, faktor: number): number {
  const anteil = 1 - (1 - faktor) ** (dauerMs / BILD_MS);
  const neu = aktuell + (ziel - aktuell) * anteil;
  return Math.abs(ziel - neu) < 0.4 ? ziel : neu;
}

/** Schaltet den Nachlauf für einen Scrollbereich ein; gibt die Funktion zum Ausschalten zurück. */
export function nachlaufen(bereich: HTMLElement): () => void {
  if (!bewegt() || window.matchMedia("(pointer: coarse)").matches) return () => {};
  const faktor = Number.parseFloat(tokenText("--scroll-nachlauf"));
  if (!(faktor > 0 && faktor < 1)) return () => {};
  const zeilenhoehe = Number.parseFloat(tokenText("--scroll-zeile")) || 1;

  let ziel = bereich.scrollTop;
  let aktuell = ziel;
  let bild = 0;
  let zuletzt = 0;
  const max = () => bereich.scrollHeight - bereich.clientHeight;

  const schritt = (jetzt: number) => {
    aktuell = naechsterStand(aktuell, ziel, Math.min(jetzt - zuletzt, 100), faktor);
    zuletzt = jetzt;
    bereich.scrollTop = aktuell;
    bild = aktuell === ziel ? 0 : requestAnimationFrame(schritt);
  };

  const rad = (event: WheelEvent) => {
    // Zoomen (Strg) und waagerechtes Wischen bleiben beim Browser, ebenso Bereiche ohne Überlauf.
    if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || max() <= 0) return;
    event.preventDefault();
    // Manche Mäuse melden Zeilen oder Seiten statt Pixel.
    const zeile = event.deltaMode === 1 ? zeilenhoehe : event.deltaMode === 2 ? bereich.clientHeight : 1;
    ziel = Math.max(0, Math.min(max(), (bild ? ziel : bereich.scrollTop) + event.deltaY * zeile));
    if (!bild) {
      aktuell = bereich.scrollTop;
      zuletzt = performance.now();
      bild = requestAnimationFrame(schritt);
    }
  };
  // Scrollt etwas anderes (Tastatur, Scrollbalken, Fokus), zieht das Ziel mit, damit nichts zurückspringt.
  const gescrollt = () => {
    if (!bild) ziel = aktuell = bereich.scrollTop;
  };

  bereich.addEventListener("wheel", rad, { passive: false });
  bereich.addEventListener("scroll", gescrollt, { passive: true });
  return () => {
    cancelAnimationFrame(bild);
    bereich.removeEventListener("wheel", rad);
    bereich.removeEventListener("scroll", gescrollt);
  };
}
