# Cost Calculator for Higgsfield (Kostenrechner für Higgsfield)

Inoffizielles Community-Projekt, nicht mit Higgsfield verbunden. Mac-App für KI-Filme mit Higgsfield: rechnet aus wenigen Angaben die Kosten eines Higgsfield-Films in Credits und Euro für die gewählte Kombination, sagt, welche Credit-Pakete zu kaufen sind, und ordnet alle Produktionswege nach Preis-Leistung. Die Unlimited-Pässe sind seit 25.10.2026 ausgebaut. Gedacht für einen Nutzer auf seinem eigenen Mac. Drei Bedienwege mit einem Rechenkern: Oberfläche, Kommandozeile `hfcalc`, lokaler MCP-Server für Claude und Codex. Die Oberfläche ist einfach, übersichtlich und minimalistisch im Higgsfield-Look.

## Tech Stack

- Tauri 2.12 (macOS, WebKit) · React 19.3 · Vite 8.3 · TypeScript aus der Tauri-Vorlage (nicht eigenmächtig auf 7.x heben)
- Node.js 24 LTS (führt TypeScript direkt aus) für Kommandozeile und MCP-Server
- Eigenes CSS mit `src/styles/tokens.css` · radix-ui 1.7 für Auswahl, Schalter, Regler, Reiter
- Zod 4.6 · big.js 7.0 · commander 15.0 · @modelcontextprotocol/sdk 1.32 (stabile Version 1, nicht 2)
- @tauri-apps/plugin-fs 2.6 · @tauri-apps/plugin-http 2.8
- Vitest 5.0 · @testing-library/react 16.3 + jsdom 30.1 (nur Tests) · Biome 2.5 · pnpm 12.10 · Rust stabil über rustup

## Projektstruktur

- `src/kern/` — Rechenkern, nur reine Funktionen
- `src/schema/` — Zod-Schemas für Eingaben, Preise, Projekte, Ergebnis
- `src/laden/` — Ladeschicht für Node (`node/`) und Tauri (`tauri/`)
- `src/cli/` · `src/mcp/` · `src/ui/` — die drei Bedienwege
- `src/styles/tokens.css` — einzige Quelle aller Gestaltungswerte
- `daten-vorlage/` — Startdaten für den Datenordner `~/Higgsfield-Kalkulator/` (bewusst nicht in „Dokumente“, Grund in `docs/ARCHITECTURE.md`)
- `src-tauri/` · `scripts/` · `tests/` · `docs/`

## Coding-Konventionen

- Ordner- und Dateinamen deutsch wie in `docs/ARCHITECTURE.md`; Code-Bezeichner und JSON-Felder englisch; alle Texte für Menschen deutsch.
- Nur Syntax, die Node mit Type-Stripping versteht (`erasableSyntaxOnly`): keine `enum`, keine Parameter-Properties; relative Importe mit `.ts`-Endung.
- Zahlen im Kern immer als big.js, über die Grenze als Text; gerundet wird nur in Anzeige und Textausgabe.
- Komponenten klein und ohne Rechenlogik; Logik gehört in `src/kern/`.
- Icons nur aus `src/ui/components/Icon.tsx`: eigene schlichte Zeichnungen auf 24er-Raster mit 1,5er Linie und runden Enden, als Inline-SVG mit `currentColor`. Neue Icons im selben Stil dort ergänzen. Keine Icon-Bibliothek, keine Emojis, keine Logos oder Icons von Higgsfield (gehören Higgsfield).
- Standard-Komponenten nie blind selbst bauen: erst natives HTML, dann Radix, eigener Nachbau nur mit `/* TODO: justify custom */` (Tabelle in `docs/UI-RULES.md` §16).
- Testnamen beginnen mit der AC-ID, zum Beispiel `AC-F3-2 günstigste Paketkombination`.

## Nicht verhandelbar

- Alle visuellen Werte kommen aus `src/styles/tokens.css`. Keine Hex-, px-, ms- oder Schatten-Literale im Komponentencode; neue Werte erst als Token ergänzen. Ausnahme nur `tauri.conf.json` und `app-icon.svg`.
- Der Rechenkern liest keine Dateien, ruft kein Netz und keine Uhr; `calculate()` ist die einzige Einstiegsstelle aller Bedienwege für einen Film. Die Gesamtkalkulation (`calculateTotal`) rechnet jedes Projekt über `calculate()` und summiert nur.
- Credits und Geld nur mit big.js rechnen; nie mit normalen Kommazahlen vergleichen oder summieren.
- Jede Eingabe und jede Datendatei wird mit Zod geprüft; ungültige Daten werden gemeldet, nie still verrechnet.
- Ein unbekannter Preis ist nie 0 und nie geschätzt; er erscheint als „kein Preis hinterlegt“.
- Schreiben nur im Datenordner, in `~/.local/`, in einer markierten Zeile von `~/.zshrc`, in den MCP-Konfigurationen von Claude Desktop und Codex und über `claude mcp` in `~/.claude.json` — bestehende Dateien nur mit Sicherungskopie und atomar; die App löscht nie Dateien; Tests nie gegen das echte Home-Verzeichnis.
- Fehler werden behandelt und verständlich angezeigt; kein weißes Fenster, keine verschluckten Fehler.
- TypeScript strict, kein `any`, kein `console.log` außer Fehlerausgaben der Kommandozeile.
- Dateien unter 300 Zeilen; Module nur über ihre `index.ts` importieren.

## Dokumente & Lesepflicht

Diese Dateien sind verbindlich. Lies sie zum genannten Zeitpunkt **erneut** — auch wenn du sie in dieser Session schon einmal gelesen hast.

| Wann | Datei |
|---|---|
| Zu Beginn jeder Session und nach jedem Kontextverlust | `docs/BUILD-PLAN.md` (Stand + Checkboxen), `docs/DECISIONS.md` |
| Vor dem ersten Build-Schritt | `docs/SPEC.md`, `docs/ARCHITECTURE.md`, `docs/BUILD-PLAN.md` |
| Zu Beginn jedes Build-Schritts | `docs/BUILD-PLAN.md` (aktueller Schritt) + `docs/SPEC.md` (die dort genannten Features) |
| Bevor du Rechenlogik oder Startdaten schreibst | `docs/RECHENREGELN.md` (Abschnitte 2 bis 5) + `docs/SPEC.md` (Entscheidungen) |
| Nach Abschluss jedes Schritts (schreibend) | `docs/BUILD-PLAN.md` — Haken, Verifikationsvermerk, Stand-Block |
| Nach jeder Abweichung, jedem nicht-trivialen Bugfix, jeder aufgelösten Unklarheit (schreibend) | `docs/DECISIONS.md` + die betroffenen Zustandsdokumente |
| Bevor du UI-Komponenten baust oder änderst | `docs/UI-RULES.md` |
| Bevor du Tests schreibst | `docs/TESTING.md` + die Akzeptanzkriterien in `docs/SPEC.md` |
| Bevor du einen Schritt als abgeschlossen meldest | `docs/QUALITY.md` + die Akzeptanzkriterien des Schritts |
| Nach dem letzten Build-Schritt | `docs/AUDIT.md` |
| Vor der lokalen Installation in `/Applications/` | `docs/PRE-LAUNCH.md` |
| Bei Unklarheit über Datenmodell, Schnittstellen oder Laufzeit-Orte | `docs/ARCHITECTURE.md` |
| Bei Unklarheit über Feature-Verhalten | `docs/SPEC.md` |

## Wenn etwas unklar ist

Nicht raten. Frag nach bei: Datenmodell-Änderung · neuer Dependency · Abweichung von Stack/Struktur/Tokens · mehrdeutigem Akzeptanzkriterium · Verhalten, das nicht in `docs/SPEC.md` steht · Rechenregeln, die `docs/RECHENREGELN.md` nicht eindeutig beantwortet · Schreiben außerhalb des Datenordners · Löschen von Dateien.
Frag gebündelt, mit Vorschlag und Einschätzung der Auswirkung.
Bei geringer Auswirkung: Default bauen, `// ASSUMPTION:` an die Codestelle, Eintrag in `docs/DECISIONS.md`, Nennung in der Zusammenfassung.
Nicht fragen bei Benennung, interner Struktur, Formatierung, Testaufbau, Fehlermeldungstexten.

## Umfang

Bau die kleinste Lösung, die die Akzeptanzkriterien erfüllt. Weniger Bedienelemente schlagen mehr Optionen.
Keine Abstraktion vor dem dritten Vorkommen. Keine Konfigurierbarkeit, Wrapper, Flags oder Optimierungen ohne Kriterium, das sie verlangt.
Melde es, bevor du weiterbaust, wenn ein Schritt deutlich größer wird als geplant (>10 Dateien, neue Datei >300 Zeilen, doppelte Deliverables).
Siehst du einen besseren Weg als den vorgegebenen: einmal sagen, dann umsetzen.

## Arbeitsweise

- Nur entlang `docs/BUILD-PLAN.md` bauen, ein Schritt nach dem anderen.
- Schritt fertig = alle Akzeptanzkriterien des Schritts erfüllt UND durch grüne Tests abgedeckt.
- Kriterium nie an den Code anpassen; bei Mehrdeutigkeit nachfragen.
- Nach jedem Schritt: Haken + Verifikationsvermerk + Stand-Block im Build-Plan; nie mehrere Schritt-Haken auf einmal.
- Sessionstart: Build-Plan lesen, ersten Schritt ohne Haken fortsetzen; nichts neu bauen, was abgehakt ist.
- Bei jeder Änderung über Routine hinaus: umsetzen → betroffene Dokumente (ARCHITECTURE/SPEC, bei Stack-/Struktur-/Regeländerung auch diese Datei) korrigieren → Eintrag in `docs/DECISIONS.md` → erst dann Haken.
- Nur den definierten Stack und die definierte Struktur; keine Geheimnisse ins Repo.
- Nach dem letzten Schritt: neue Session, dort `docs/AUDIT.md`, danach `docs/PRE-LAUNCH.md` — den Audit nie selbst im Build-Kontext ausführen.
