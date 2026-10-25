# UI-Regeln — Higgsfield-Kostenkalkulator

Plattform: Desktop-App (Tauri, macOS, WebKit). Alle Werte stehen in `src/styles/tokens.css`; hier stehen nur Regeln und Token-Namen.

Im Komponentencode stehen keine Hex-, px-, ms- oder Schatten-Literale, nur Token-Namen. Ausnahmen sind `src-tauri/tauri.conf.json` (Fenstergröße 1100 × 720, Hintergrundfarbe) und `src-tauri/icons/app-icon.svg`, weil beide keine CSS-Variablen lesen können; ihre Werte müssen den Tokens entsprechen.

---

## 0. Leitbild: einfach, übersichtlich, minimalistisch

Der Nutzer will eine App, die ohne Erklärung funktioniert. Daraus folgen verbindliche Regeln:

1. **Eine Frage, eine Antwort.** Oben im Ergebnis steht genau eine Antwort: die Kosten deiner Auswahl (seit 25.10.2026, SPEC Entscheidung 23). Früher: Gesamtkosten in Euro und ein Satz mit der Gesamtempfehlung (AC-F10-7). Alles Weitere ist eine Ebene tiefer.
2. **Pflicht sichtbar, Seltenes eingeklappt.** Beim Start sind die sieben Pflichtfelder sichtbar und darunter zwei ausgeschaltete Kippschalter für die wahlweisen Posten Storyboard und einmalige Assets; ihre Felder erscheinen erst eingeschaltet (AC-F10-8). Alle übrigen optionalen Felder liegen im Bereich „Weitere Einstellungen“, der geschlossen startet und zeigt, wie viele Felder vom Standard abweichen (AC-F10-6).
3. **Kein Knopf zum Rechnen.** Ergebnisse folgen jeder Eingabe sofort (AC-F10-1).
4. **Eine Primär-Aktion.** Der einzige Lime-Button des Fensters ist „Als Projekt speichern“. Lime markiert sonst nur die Empfehlung.
5. **Sätze statt Tabellenwände.** Empfehlungen sind Sätze mit Begründung und Schwelle. Zahlenlisten nur im Reiter „Details“.
6. **Jedes Element braucht einen Grund.** Kein Element, das sich entfernen lässt, ohne dass der Nutzer etwas verliert. Keine Dekoration, keine Werbebilder, keine Einführungs-Tour, keine Diagramme.
7. **Einheiten immer dazu.** Jede Zahl trägt ihre Einheit: „Credits“, „€“, „$“, „s“, „Versuche“. Deutsche Zahlenformate (2.362,5 · 346,53 €).
8. **Ruhe statt Lärm.** Höchstens drei Hierarchie-Ebenen pro Bereich. Hinweise stehen an der Stelle, die sie betreffen, und nicht als Sammelliste.

---

## A. Aufbau des Fensters

Vorbild ist der Video-Arbeitsbereich von Higgsfield: Eingaben links in einer schmalen Spalte, Ergebnis rechts.

```
┌──────────── Titelleiste (Ampel links, Fensterfarbe, verschiebbar) ─────────────┐
│ ┌─ Eingabespalte (--width-input-column) ─┐ ┌─ Ergebnisbereich ──────────────────┐│
│ │ Projekt: [Name ▾]                      │ │ ZUSÄTZLICHE KOSTEN                 ││
│ │                                        │ │ 346,53 €          [Preiskachel $]  ││
│ │ Noch offen (Dauer|Clips)               │
│ │ [Regler 0–15 min ──●──] [10:00]        │ │ Ein Satz Gesamtempfehlung          ││
│ │ Aufschlag [Regler]                     │
│ │ Videomodell [Einstellungszeile ›]      │ │ netto … · … Credits · Zu kaufen …  ││
│ │ [Auflösung]                            │
│ │ [Versuche − 3 +]                       │ │ Hinweise zu diesem Ergebnis        ││
│ │ Bilder je Clip [Einstellungszeile ›]   │ │                                    ││
│ │ Credit-Stand [2.000 Credits]           │ │ (Produktionswege)(Pässe)(Details)  ││
│ │ Storyboard            [Schalter aus]   │ │                                    ││
│ │ Einmalige Assets      [Schalter aus]   │ │                                    ││
│ │                                        │ │ Inhalt des gewählten Reiters       ││
│ │ ▸ Weitere Einstellungen · 2 geändert   │ │                                    ││
│ │                                        │ │                                    ││
│ │ [ Als Projekt speichern ]  (Lime)      │ │                                    ││
│ └────────────────────────────────────────┘ └────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

- Fenstergrund `--color-surface`, Eingabespalte `--color-surface-tertiary` mit Rahmen `--color-separator-card` und `--radius-16`, Innenabstand `--space-4`.
- Ergebnisbereich ohne eigene Fläche; die Ergebniskarte trägt ihn.
- Reiter im Ergebnisbereich: Pill-Reiter (B4). Inhalt (seit 25.10.2026): zwei Reiter, die Pässe sind ausgebaut. „Produktionswege“ = Überschrift „Produktionswege im Vergleich, sortiert nach Preis-Leistung“, ein Satz zur Punkteskala, dann alle Wege als Akkordeon-Zeilen (B13a) nach Kosten brutto je Qualitätspunkt, Preis brutto rechts, Chip „… Punkte · … € je Punkt“; die Empfehlung des Rechenkerns mit Lime-Pill und Hervorhebung, deine Auswahl mit Chip; aufgeklappt Satz, Begründung, „Ändert sich bei“, Video-Credits und Kaufplan. Wege ohne Preis in einer Zeile Text unter der Liste · „Details“ = Umfang, Bilder, Paketkombination, Kurs, Reichweite als Wertzeilen.
- **Wertzeile** heißt eine nicht bedienbare Zeile im Reiter „Details“: Beschriftung links in `--color-font-secondary`, Wert rechts in `--color-text-primary` mit Einheit, Höhe `--size-control-md`, getrennt durch Abstand statt Linien.
- ~~Zeile „Deine Auswahl: … kostet … €“~~ entfällt seit 25.10.2026, weil oben immer deine Auswahl steht.
- Die Ergebniskarte (B12, seit 25.10.2026) zeigt: Kennzeichnung „Deine Auswahl“, darunter Weg und Bezahlweg („Seedance 2.5 · 480p über Credit-Pakete“), groß den Bruttobetrag, klein „netto … · … Credits Bedarf, davon … fehlend“ und darunter die dezente Tabelle „Zu kaufen · Paketpreise vom …“ (Anzahl, Paket, Preis je Paket, Summe, Zeile „Zusammen brutto“; Linien `--color-white-8`, Kopf in `--color-text-secondary`), darunter klein das günstigste Einzelpaket zum Vergleich. Alle Euro-Beträge brutto, nur hier klein netto. Keine Begründung, keine Schwelle, keine Preiskachel; ohne Wechselkurs zusätzlich der Kurs-Hinweis, weil er dann die Zahl oben betrifft.
- **Ort der Hinweise:** Jeder allgemeine Hinweis trägt im Ergebnis ein Feld `area` (docs/ARCHITECTURE.md). Clips, Bilder, Pakete und Reichweite stehen im Reiter „Details“ unter ihrer Wertgruppe; Produktionswege im Reiter „Produktionswege“ unter der Liste; Pass-Hinweise ohne Pass oben im Reiter „Pässe“, Hinweise zu einem Pass in dessen Karte. Der Kurs-Hinweis erscheint in „Details“ nur offline, weil er sonst nur die Wertzeile wiederholt.
- **Projekt speichern:** Der Lime-Button öffnet einen Dialog (B17) mit dem Feld „Projektname“, vorbelegt mit dem Namen des geladenen Projekts. Gibt es den Namen schon, wechselt der Dialog zur Rückfrage „Projekt überschreiben?“ mit dem Fokus auf „Abbrechen“. Ohne gültiges Ergebnis ist der Button deaktiviert, und eine Zeile darunter sagt, warum. Laden eines Projekts ersetzt alle Felder ohne Rückfrage, weil die Felder nicht gespeichert werden.
- Die Projektwahl oben in der Eingabespalte liest die Projektliste bei jedem Öffnen neu aus dem Datenordner, damit Projekte, die Claude über Kommandozeile oder MCP-Server gespeichert hat, ohne Neustart erscheinen (AC-F9-6).
- Die Gruppen in der Eingabespalte sind durch Abstand getrennt (`--space-5`), nicht durch Linien.
- „Noch offen“ ist ein Pflichtfeld mit Umschalter (Pill-Reiter B4, Radix RadioGroup) zwischen „Dauer“ (Kachel B3, MM:SS) und „Clips“ (Zahlenfeld B2). Beim Umschalten bleibt der zuletzt eingegebene Wert der anderen Art erhalten, gerechnet wird nur mit der gewählten. Der Aufschlag gilt in beiden Fällen.
- **Umschalter „Einzelprojekt | Gesamtkalkulation“** (Pill-Reiter B4) ganz oben in der Eingabespalte (SPEC F15). In der Gesamtkalkulation zeigt die Spalte die gespeicherten Projekte als Liste mit nativen Kontrollkästchen in einer Box (Linien `--color-white-8`, Häkchen `accent-color: --color-lime`) und darunter das Credit-Feld „Aktueller Kontostand für die Gesamtkalkulation“; Projektwahl und „Als Projekt speichern“ fehlen dort. Rechts: Ergebniskarte „Gesamtkalkulation“ mit Summe brutto, netto klein und Pakettabelle, darunter die Tabelle Projekt, Weg, Credit-Bedarf mit Summe, Abzüglich Kontostand und Nachzukaufen.
- **Vergleichsliste ohne Rahmen um Zahlen** (seit 25.10.2026): rechts in jeder Zeile der Preis brutto (`--text-20`, auf der Empfehlung in Lime) und darunter in `--color-text-secondary` der Unterschied zu deiner Auswahl. Die Preiskachel mit Rahmen (früher B12/B13) entfällt; nur die grüne Empfehlungszeile hat einen Rahmen.
- **Alles vorbelegt** (seit 25.10.2026): Beim ersten Öffnen stehen in allen Feldern die Startwerte aus `einstellungen.json`, damit rechts sofort ein Ergebnis steht (AC-F10-9).
- **Dauer:** Block-Regler B7 ohne eigene Überschrift (die Gruppe heißt „Noch offen“), stufenlos von 0 bis 15 Minuten in Sekundenschritten, Skala 0 · 5 · 10 · 15 min; darunter die Kachel B3 zum Eintippen. Beide zeigen denselben Wert (AC-F10-10).
- **Credit-Stand:** Einstellungszeile B1, darunter eine Zeile in `--color-font-secondary`, die sagt, woher die Zahl stammt („Live aus deinem Higgsfield-Konto, Stand 10:25 Uhr“, „Von Hand eingetragen“, „Aus dem geladenen Projekt“), rechts daneben der Textknopf „Live-Stand übernehmen“ bzw. „Erneut abrufen“ (unterstrichen, Klickfläche mindestens `--size-hit-min`). Schlägt der Abruf fehl, steht darüber ein Hinweis B15 mit dem Grund (AC-F10-11).
- **Storyboard und einmalige Assets** (seit 25.10.2026) sind Kippschalter B6 mit Unterzeile direkt unter dem Credit-Stand, beim Start aus. Eingeschaltet bilden Schalter und Einstellungen **eine Box** (`ToggleRow grouped`, Klasse `.switch-group`): eine Fläche `--color-surface-primary` mit `--radius-6`, die Zeilen darin ohne eigene Fläche, getrennt durch eine Linie `--border-width` in `--color-white-8`; der Fokusring liegt innen. Eingeschaltet erscheint darunter beim Storyboard das Glas-Menü B10 „Bildmodell für das Storyboard“, bei den Assets das Glas-Menü „Bildmodell für die Assets“ und drei Zahlenfelder B2: „Personen im Film“ (vorbelegt 5), „Orte im Film“ (3), „Anläufe pro Asset“ (8). Die Unterzeile der Assets nennt die Faktoren („je Person 3, je Ort 9 Assets“), damit klar ist, woher die Zahl der Assets kommt.
- „Weitere Einstellungen“ enthält in dieser Reihenfolge: Cliplänge · Lichtbilder und Referenzbilder je Clip · Rabatt (Kippschalter + Gilt für) · Preisstand Pakete (zuerst „Mit Rabatt“) · Audio-Aufschlag · Wechselkurs manuell. Preisstand Pässe und Netto-Stunden entfallen seit 25.10.2026.

---

## B. Bausteine

Alle Bausteine stammen aus der Higgsfield-App oder sind aus gemessenen Teilen abgeleitet. Primitive nach §15/§16.

| Nr. | Baustein | Einsatz | Grundlage | Tokens (Auszug) |
|---|---|---|---|---|
| B1 | Einstellungszeile | Videomodell, Bildmodelle (öffnen B10), Credit-Stand | `<button>` bzw. `<label>` mit Eingabe | `--size-control-lg`, `--color-surface-primary`, `--radius-6`; Beschriftung `--text-12` in `--color-text-secondary`; Wert `--text-14` Medium; Hover `--color-white-8` |
| B2 | Zahlenfeld mit Plus/Minus | Versuche pro Clip, offene Clips, Personen, Orte, Anläufe pro Asset | `<input inputmode="numeric">` + zwei `<button>` | wie B1; Knöpfe `--size-control-sm`, `--color-white-5`, Hover `--color-white-10` |
| B3 | Kachel | offene Dauer MM:SS, Auflösung | `<input>` bzw. `<button>`, Icon `--size-icon-sm` | `--size-control-md`, `--radius-6`, Abstand `--space-2` |
| B4 | Pill-Reiter | Ergebnis-Reiter, Preisstände, Umschalter Dauer/Clips | Radix Tabs (Ergebnis), Radix RadioGroup (Preisstände) | Behälter `--color-black-35`, `--radius-full`; gewählt weiß mit `--color-font-primary-reverted` und `--shadow-segment` |
| B5 | Zweizeiliges Segment | Audio-Aufschlag 0/50/100 % | Radix RadioGroup | `--size-control-xl`, `--radius-12` in `--radius-16`; gewählt weiß |
| B6 | Kippschalter | Rabatt, Storyboard, einmalige Assets an/aus | Radix Switch | `--size-switch-*`, aus `--color-toggle-default`, an `--color-lime` mit Knopf `--color-font-primary-reverted` |
| B7 | Block-Regler | Aufschlag 20–50 % in 5er-Schritten, Netto-Stunden | Radix Slider | Schiene `--size-slider-track` hoch mit Rahmen `--color-badge-gray`, Füllung `--color-surface-secondary`, Griff `--size-slider-thumb-w` weiß, Wert innen links; Skala darüber, aktiver Wert weiß |
| B8 | Modellwähler | Videomodell | Radix Select mit eigener Zeilenvorlage | Panel `--color-picker` + `--blur-picker`, `--radius-16`; Zeile `--size-picker-row` hoch, `--radius-12`, Icon-Kachel `--size-icon-tile`; Meta-Chips `--text-10` in `--color-text-secondary` (nicht `--color-font-secondary`: auf der Chip-Fläche sonst unter 4,5 : 1); Badges Space Grotesk, `--skew-badge`; Modelle ohne Preis sichtbar, nicht wählbar, Hinweis-Chip mit `--color-state-warning-bg` und weißer Schrift |
| B9 | Menü | Auflösung | Radix Select | `--color-neutral-surface`, Rahmen `--color-neutral-surface-subtle`, `--radius-12`, `--shadow-menu`; Eintrag `--size-control-sm`, Hover `--color-white-4`, gewählt `--color-white-8` + Haken |
| B10 | Glas-Menü mit Beschreibung | Bildmodelle für Bilder je Clip, Storyboard und einmalige Assets (mit Preis je Bild) | Radix Select | `--color-glass` + `--blur-glass`, `--shadow-glass-menu`; Beschreibung in `--color-white-50` |
| B11 | Ausklappbereich | Weitere Einstellungen | `<details>`/`<summary>` | Zähler als Meta-Chip; klappt nach §11 Regel 6 weich auf |
| B12 | Ergebniskarte | oberste Antwort | `<section>` | `--color-surface-primary`, `--radius-16`, `--shadow-card-inset`; Betrag Space Grotesk `--text-48`; Preiskachel `--color-white-5` + Rahmen `--color-white-10`, `--radius-8` |
| B13a | Optionszeile als Akkordeon | Produktionswege, Pässe | `<details>`/`<summary>` in `<li>` | wie B13; Chevron `--size-icon-sm` dreht sich federnd (§11 Regel 8); aufgeklappt Text in `--color-text-secondary`, auf der hervorgehobenen Zeile auch die Beschriftungen der Wertzeilen |
| B13 | Optionszeile (abgelöst durch B13a) | Produktionswege, Pässe | Liste `<ul>` | `--color-white-5`, `--radius-16`, Preiskachel rechts; Empfehlung mit `--gradient-highlight`, `--shadow-highlight`, Lime-Pill |
| B14 | Empfehlungskarte (entfällt seit 25.10.2026; Inhalt steht aufgeklappt in B13a) | Antworten auf die Fragen 1–5 | `<article>` | positive Empfehlung wie B13-Hervorhebung mit Lime-Titel; Gegenkarte neutral; „Ändert sich bei“ eingelassen in `--color-page-primary` |
| B15 | Hinweis | Annahmen, fehlende Preise, Verfall, gedeckt, Fehler | `<p role="status">` | Fläche `--color-state-*-bg`, Punkt `--size-status-dot` in `--color-state-*`, Wort und Satz in Weiß, `--radius-8`; Zuordnung siehe Tabelle unten |
| B16 | Buttons | Speichern (Lime), Bestätigen im Dialog (weiß), Abbrechen (Umriss) | `<button>` | Lime: `--gradient-lime-button`, `--shadow-button-edge`, `--radius-12`, `--size-control-lg`; Text `--color-button-label-brand` |
| B17 | Bestätigungsdialog | Projekt überschreiben | `<dialog>` + `showModal()` | Fläche wie Popover außen/innen (`--color-surface-tertiary`, `--color-page-primary`) |
| B18 | Speicherbestätigung | nach dem Speichern | `aria-live`-Region, kurze Zeile unter dem Button | kein Toast-Paket |

Badges in der App: nur Higgsfields eigene Kennzeichnung von Modellen („TOP“, „NEU“). Keine eigenen Badges erfinden.

**Hinweisart → Statusfarbe.** Das Feld `notes[].kind` im Ergebnis bestimmt Farbe und Wort des Hinweises B15:

| `kind` | Status-Token | Wort | Beispiel |
|---|---|---|---|
| `info` | `--color-state-info` | HINWEIS | Kurs vom 08.10.2026, Verfall der Credits nach 90 Tagen |
| `assumption` | `--color-state-warning` | ANNAHME | Generierungsdauer im Pass nicht bestätigt |
| `no-price` | `--color-state-warning` | OHNE PREIS | 4.000-Credit-Stufe ohne hinterlegten Preis |
| `covered` | `--color-state-success` | GEDECKT | Credit-Stand reicht für den Film |
| `error` | `--color-state-error` | FEHLER | Preisdatei ungültig |

**Namen in der Vorschau → Tokens.** Die Vorschau-Datei nutzt teils kürzere Namen. Im Code gelten nur die Namen aus `tokens.css`:

| Vorschau | Token |
|---|---|
| `--white-4` … `--white-90`, `--black-35` | `--color-white-4` … `--color-white-90`, `--color-black-35` |
| `--color-surface-info-alpha` (ebenso `-warning-`, `-error-`, `-success-`) | `--color-state-info-bg` (ebenso `-warning-`, `-error-`, `-success-`) |
| `--color-font-error`, `--color-font-warning`, `--color-font-success` | `--color-state-error`, `--color-state-warning`, `--color-state-success` (nur Punkt, Rahmen, Fläche; nie Schrift) |
| `--ease` | `--ease-standard` |
| `--dur` | `--duration-micro` |
| `--dur-thumb` | `--duration-state` |
| `--hover-out` | `--duration-hover-out` mit `--ease-leave` |
| `--reveal` | `--duration-reveal` mit `--ease-out` |
| feste Pixelwerte in der Vorschau (zum Beispiel 8 px Punkt, 10 px Innenabstand) | nächstliegendes Token (`--size-status-dot`, `--space-2`) |

---

## 1. Grundprinzipien

- Whitespace ist Standard. Im Zweifel mehr Abstand.
- Hierarchie durch Reduktion: Primär (Betrag + Satz), Sekundär (Reiterinhalt), Tertiär (Meta-Chips, Quellen).
- Identische Bausteine sehen überall identisch aus.

## 2. Farbe

- Fläche dominiert, Weiß für Text, Lime nur für die Primär-Aktion, die Empfehlung und gewählte Häkchen.
- Gewählte Zustände in Reitern und Segmenten sind weiß, nicht Lime (wie in der Higgsfield-App).
- Statusfarben nur für Status. Higgsfield-Rot nie als Schriftfarbe, weil es auf den Flächen unter 4,5 : 1 bleibt.

## 3. Typografie

- Zwei Familien: Space Grotesk (Titel in Versalien, Beträge, Preise, Badges) und Inter (alles andere).
- Größen nur aus den Text-Tokens. Fließtext nie unter `--text-14`, Meta nie unter `--text-10`.
- Zahlen mit `font-variant-numeric: tabular-nums`.

## 4. Abstände

- Nur Abstands-Tokens (4er-Raster). Zusammengehöriges `--space-2` bis `--space-4`, Gruppen `--space-5` bis `--space-6`.
- Innenabstände eines Containers sind die Fluchtlinie für alle Inhalte.

## 5. Schatten und Tiefe

- Tiefe über Flächenstufen und innere Schimmer (`--shadow-card-inset`, `--shadow-icon-tile`).
- Weiche Schatten nur bei schwebenden Elementen (Menü, Glas-Menü). Nie Rahmen und starker Schatten gemeinsam auf Karten.

## 6. Buttons

- Ein Lime-Button pro Fenster. Weiß für Bestätigen im Dialog, Umriss für Abbrechen.
- Deaktiviert: Deckkraft `--opacity-disabled`, kein Hover, kein Zeiger.

## 7. Karten

- Karten-Radius `--radius-16`, Elemente darin kleiner (`--radius-6` bis `--radius-12`).
- Aufbau: Kennzeichnung (Pill) → Titel → Satz → Begründung → „Ändert sich bei“.

## 8. Formulare

- Beschriftung oben im Feld (Higgsfield-Muster B1) oder direkt darüber; nie nur ein Platzhalter.
- Fehler dreifach: roter Rahmen (`box-shadow: inset 0 0 0 var(--border-width) var(--color-state-error)`, kein Layout-Sprung), Hinweis B15 mit Wort „FEHLER“, Text direkt am Feld.
- Validierung beim Verlassen des Feldes und bei jeder gültigen Änderung; Eingaben bleiben erhalten.
- Dauerfelder akzeptieren „3:00“, „3“ (Minuten) und „180s“ und zeigen immer „M:SS“.

## 9. Navigation

- Keine Seitennavigation. Projektwahl oben in der Eingabespalte, Reiter im Ergebnisbereich.

## 10. Zustände

- Jedes Bedienelement: Standard, Hover, Gedrückt, Fokus, Deaktiviert. Zustandswechsel verschieben nie das Layout.
- Fokusring `outline` in `--focus-ring-width` und `--color-lime` mit `--focus-ring-offset` Abstand, nur bei `:focus-visible`.
- Klickflächen nie kleiner als `--size-hit-min`, auch bei Info-Icons.

## 11. Bewegung (vollständig, verbindlich)

Seit 25.10.2026 folgt die Bewegung dem Prototyp „Angebotsrechner“ aus dem Projekt KI-Film-Angebotsrechner (`05_Design/02_Prototypen/261023_Angebotsrechner/angebotsrechner_ki_film.html`, Abschnitte „Bewegung“ und „Aufbau-Regie“). Der Nutzer wollte die App vollständig nach diesen Prinzipien animiert haben. Die frühere Regel „keine Einblend-Choreografie, Zahlen ohne Animation“ ist damit aufgehoben (Begründung in `docs/DECISIONS.md`). Alle Zeiten, Kurven, Wege und Maße stehen als Token in `tokens.css` (Abschnitt „Bewegung nach dem Prototyp“); der Code dazu liegt in `src/ui/bewegung/`.

Die dreizehn Regeln:

1. **Aufbau beim Öffnen als Treppe.** Jede Fläche zieht sich auf: hohe Flächen wie die Eingabespalte von oben (`--duration-flaeche-hoch`), breite wie die Ergebniskarte von links (`--duration-flaeche`), Kurve `--ease-flaeche`. Erst danach erscheinen ihre Elemente einzeln: Sie gleiten aus `--move-atom` Abstand und `--blur-atom` Unschärfe herein (`--duration-atom`, `--ease-aus`), im Abstand `--stagger-atom`. Flächen starten im Abstand `--delay-flaeche` und warten nicht aufeinander. Flächen in einer Fläche starten `--delay-inhalt` nach ihr, untereinander `--delay-verschachtelt` versetzt. Nichts erscheint als ganze Gruppe.
2. **Was beim Öffnen nicht sichtbar ist, baut sich beim Scrollen auf**, sobald es ins Bild kommt (Zeilen weiter unten in der Vergleichsliste).
3. **Zahlen zählen statt zu springen.** Beim Aufbau zählen Beträge und Credits von 0 hoch (`--duration-zaehlen-aufbau`), danach bei jeder Änderung vom gerade sichtbaren zum neuen Wert (`--duration-zaehlen`), schnell los und weich auslaufend. Das letzte Bild ist immer exakt der Text aus `calculate()`; die Zwischenbilder rechnet big.js. Screenreader hören nur den fertigen Wert (AC-F10-15).
4. **Differenz-Schild am Preis.** Ändert sich der große Preis oben, erscheint daneben kurz „+… €“ (Fläche `--color-state-error-bg`) oder „−… €“ (Fläche `--color-state-success-bg`), Schrift weiß, gerechnet gegen die Zahl, die vorher dastand. Es blendet schnell ein (`--duration-differenz-ein`), steht `--delay-differenz-halten` und blendet langsam aus (`--duration-differenz-aus`). Unter einem Cent erscheint kein Schild (AC-F10-16).
5. **Gleitende Markierung.** In Pill-Reitern (B4) und Segmenten (B5) gleitet eine weiße Fläche federnd zum gewählten Feld (`--duration-gleiten`, `--ease-feder`), statt dass das Feld nur die Farbe wechselt.
6. **Aufklappen weich und gestaffelt.** Akkordeons (B11, B13a) und die Box eines eingeschalteten Kippschalters ändern ihre Höhe weich (`--duration-akkordeon`, `--ease-aus`), auch beim Zuklappen. Der neue Inhalt erscheint Element für Element; lange Listen laufen dichter (`--stagger-auf-min` bis `--stagger-auf-max`), damit das letzte Element nach spätestens `--stagger-auf-gesamt` steht. Dasselbe gilt beim Wechsel der Ergebnis-Reiter und beim Wechsel Einzelprojekt / Gesamtkalkulation.
7. **Umsortieren gleitet.** Ändert sich die Reihenfolge der Vergleichsliste, gleiten die Zeilen an ihren neuen Platz.
8. **Federn bei kleinen Teilen.** Pfeile drehen, Icons im Modellwähler wachsen (`--scale-icon-gewaehlt`), der Reglergriff wird beim Darüberfahren und Ziehen breiter (`--scale-griff-hover`, `--scale-griff-druck`), alles mit `--duration-feder` und `--ease-feder`. Beim Zuklappen dreht sich der Pfeil sofort zurück.
9. **Drücken gibt nach.** Kleine Bedienelemente (Plus/Minus, Pill-Reiter, Segment, Chip, Auflösungskachel, Textknopf) schrumpfen beim Drücken auf `--scale-druck`. Der Kippschalterknopf zieht sich beim Drücken um `--stretch-schalter` in die Breite und federt beim Loslassen auf seine Seite. Der Lime-Button behält Regel 12.
10. **Darüberfahren.** Eine zugeklappte Zeile der Vergleichsliste hebt sich um `--lift-hover` mit `--shadow-lift` (`--duration-hover-lift`). Farbwechsel beim Darüberfahren bleiben asymmetrisch: Eintritt `--duration-hover-in` ease-out, Austritt `--duration-hover-out` ease.
11. **Hinweise, Menüs, Dialog erscheinen weich.** Neue Hinweise gleiten aus `--move-hinweis` herein (`--duration-hinweis`). Menüs öffnen aus `--move-menue` und `--scale-menue` (`--duration-reveal`, `--ease-aus`). Der Dialog gleitet wie ein Element beim Aufbau herein, der Hintergrund blendet ab. Der Zähler „… geändert“ pulsiert einmal (`--scale-puls`, `--duration-puls`), wenn er sich ändert.
12. **CTA-Hover 150 ms** (`--duration-cta-hover`), `scale(var(--scale-cta-hover))` beim Hover, `scale(var(--scale-cta-press))` beim Drücken. Nur für Buttons.

Dazu wandert hinter der Ergebniskarte ganz langsam ein schwacher Schimmer (`--glow-drift`, `--duration-drift`), wie der Verlauf hinter dem Preis im Prototyp. Er ist so schwach, dass er keinen Kontrast verändert.

13. **Scrollen mit Nachlauf** (seit 25.10.2026 auf Wunsch des Nutzers, wie im Prototyp). Eingabespalte und Ergebnisbereich gleiten bei Mausrad und Trackpad weich zum Ziel und laufen sanft aus: Jedes Bild legt den Anteil `--scroll-nachlauf` des Restwegs zurück, auf die Bildrate des Bildschirms umgerechnet. Zoomen, waagerechtes Wischen, Tastatur und Scrollbalken bleiben unverändert (AC-F10-17).

**Bewegung reduzieren:** Ist die Systemeinstellung an, ist alles sofort da — kein Aufbau, kein Zählen, kein Schild, kein Gleiten (`bewegt()` in `src/ui/bewegung/zeit.ts` und der Abschaltpfad in `global.css`). Welche Eigenschaften animiert werden dürfen: `docs/QUALITY.md`, Stufe 1.

## 12. Accessibility

- Messbare Mindestwerte (Kontrast, Klickflächen, Tastatur, `aria-live`): `docs/QUALITY.md`, Stufe 3.
- Landmarks: `<aside>` für die Eingabespalte, `<main>` für den Ergebnisbereich.
- Reihenfolge beim Tabben folgt der sichtbaren Reihenfolge der Eingabespalte, danach Reiter, danach Ergebnis.

## 13. Desktop-Konventionen (macOS, Tauri)

- Titelleiste mit `titleBarStyle: "Overlay"`: Ampel-Knöpfe bleiben sichtbar, der obere Rand der Eingabespalte hält Abstand dazu, die oberste Zone ist verschiebbar (`data-tauri-drag-region`).
- Tastenkürzel: `Cmd+S` speichert das Projekt, `Escape` schließt Menüs und Dialoge, `Cmd+1` und `Cmd+2` wechseln die Ergebnis-Reiter.
- Schriften sind die Marken-Schriften, nicht die Systemschrift.
- Kein Kontextmenü mit Browser-Einträgen (Neu laden, Untersuchen) in der gebauten App.

## 15. Primitive statt Nachbau

Reihenfolge zwingend: (1) natives HTML → (2) Radix UI → (3) eigener Nachbau nur begründet und mit `/* TODO: justify custom */` markiert. `<button>` statt `<div role="button">`. `:focus-visible` statt `:focus`.

## 16. Feature → Lösung (für diese App)

| Bedarf | Lösung |
|---|---|
| Weitere Einstellungen ausklappen | `<details>`/`<summary>` |
| Projekt überschreiben bestätigen | `<dialog>` + `showModal()` |
| Videomodell, Auflösung, Bildmodelle wählen | Radix Select |
| Ergebnis-Reiter | Radix Tabs |
| Preisstände, Audio-Aufschlag, Umschalter Dauer/Clips | Radix RadioGroup |
| Rabatt, Storyboard, einmalige Assets an/aus | Radix Switch |
| Aufschlag, Netto-Stunden | Radix Slider |
| Zahlen und Dauer eingeben | `<input>` mit `inputmode` und Constraint Validation (`setCustomValidity`) |
| Speicherbestätigung, Ergebnisänderung ansagen | `aria-live="polite"` |
| Fokus sichtbar | `:focus-visible` |
| Bewegung | `prefers-reduced-motion`-Pfad Pflicht |
