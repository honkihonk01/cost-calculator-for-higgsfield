# Qualitätsstandards — Higgsfield-Kostenkalkulator

Qualitätsstufe: **Prototyp (Stufe 2 LEICHT)** für Oberfläche und Aufbau, weil nur der Nutzer die App nutzt. **Ausnahme Rechenkern:** volle Testtiefe, weil falsche Zahlen den Zweck der App zerstören. Stufe 3: nur Accessibility (Basis). Nicht relevant: Authentifizierung, Server, Datenbank, SEO, Datenschutz-Banner, Mehrsprachigkeit, externes Monitoring.

Messbare Gates stehen hier. Gestaltungs- und Bewegungsregeln stehen ausschließlich in `docs/UI-RULES.md`.

---

## Stufe 1 — Nicht verhandelbar

### Korrektheit der Rechnung
- Der Rechenkern (`src/kern/`) besteht aus reinen Funktionen: keine Dateizugriffe, kein Netz, keine Uhr, kein Zufall. Alles kommt als Argument.
- `calculate()` ist die einzige Einstiegsstelle. Oberfläche, Kommandozeile und MCP-Server rechnen nichts selbst.
- Credits und Geldbeträge werden ausschließlich mit big.js gerechnet und verglichen. Gerundet wird nur in der Anzeige und in der Textausgabe der Kommandozeile; das JSON-Ergebnis enthält exakte Dezimaltexte.
- Ein Preis mit Status `unknown` oder `unavailable` geht in keine Summe ein. Er wird nie durch 0 oder eine Schätzung ersetzt.
- Die Mehrwertsteuer wird vor der Umrechnung in Euro aufgeschlagen. Der Wechselkurs bedeutet immer „Dollar je 1 Euro“.

### Eingaben und Daten
- Jede Eingabe aus Oberfläche, Kommandozeile und MCP-Server wird mit demselben Zod-Schema aus `src/schema/` geprüft.
- Jede Datei im Datenordner wird beim Laden mit Zod geprüft, einschließlich der Verweise zwischen den Dateien. Ungültige Daten führen zu einer Meldung mit Datei und Feld und zu keiner Berechnung.
- Fehlerformat zwischen Schichten: `{ code: string, message: string, field?: string, file?: string }`. Die Kommandozeile gibt dazu die Exitcodes aus `docs/ARCHITECTURE.md` zurück.

### Schutz vor Datenverlust
- Geschrieben wird nur in den Datenordner, nach `~/.local/share/higgsfield-kalkulator/`, `~/.local/bin/hfcalc`, `~/.zshrc` (eine markierte Zeile) und in die drei MCP-Konfigurationsdateien. Vor jeder Änderung einer bestehenden Konfigurationsdatei entsteht eine Sicherungskopie.
- Ein bestehendes Projekt wird nie ohne ausdrückliche Bestätigung überschrieben. Ein bestehender Datenordner wird nie überschrieben.
- Dateien werden atomar geschrieben: erst in eine temporäre Datei im selben Ordner, dann umbenennen.
- Die App löscht keine Dateien.

### Fehlerbehandlung
- Kein Fehler führt zu einem weißen Fenster. Die Oberfläche hat eine Error Boundary um die Eingabespalte und eine um den Ergebnisbereich.
- Jede Grenze nach außen (Datei, Netz, Prozessaufruf, MCP-Anfrage) fängt Fehler und meldet sie verständlich auf Deutsch.
- Ladezustand für jeden Kursabruf und jedes Laden von Daten.

### Sicherheit
- Keine Geheimnisse im Code; die App braucht keine.
- Tauri-Berechtigungen nur für den Datenordner und für `data-api.ecb.europa.eu` (siehe `docs/ARCHITECTURE.md`).
- `pnpm audit` ohne kritische Befunde vor der Installation.

### Code-Qualität
- TypeScript strict, kein `any`, keine `@ts-ignore` ohne Begründung im Kommentar.
- Nur Syntax, die Node mit Type-Stripping ausführt (`erasableSyntaxOnly`).
- Semantisches HTML: `<button>`, `<main>`, `<aside>`, `<details>`, `<dialog>` statt nachgebauter `<div>`-Elemente.
- Kein `console.log`; Fehlerausgaben der Kommandozeile über `process.stderr`.
- Dateien unter 300 Zeilen. Module werden nur über ihre `index.ts` importiert.
- Biome ohne Fehler und ohne Warnungen.

### Frontend-Grundlagen (prüfbar)
- Alle visuellen Werte aus `src/styles/tokens.css`; ein Suchlauf nach `#`, `px` und `rgba(` außerhalb von `tokens.css` findet in Komponenten nichts.
- Jedes klickbare Element hat `cursor: pointer`, einen sichtbaren Hover-Zustand und einen sichtbaren Fokus-Zustand (`:focus-visible`).
- Kein horizontaler Scrollbalken bei der Mindestfenstergröße 1100 × 720.
- Leer-, Lade- und Fehlerzustand für den Ergebnisbereich, die Projektliste und den Modellwähler.
- Animiert werden `transform`, `opacity`, `background-color`, `color` und `box-shadow`; seit 25.10.2026 (Bewegung nach dem Prototyp, `docs/UI-RULES.md` §11) zusätzlich `clip-path` und `filter: blur` beim Aufbau, `height` beim Auf- und Zuklappen und `width`/`height` der gleitenden Markierung und des gedrückten Schalterknopfs. `prefers-reduced-motion` schaltet jede Bewegung ab, auch die per JavaScript.
- Schriften als WOFF2 mit `font-display: swap`.
- Ebenen nur über die z-Index-Tokens.

---

## Stufe 2 — LEICHT (mit Ausnahme Rechenkern)

### Testing
- Rechenkern: jede AC-ID aus F1 bis F7 mit Unit-Tests gegen die Prüfwerte in `docs/SPEC.md` und `docs/RECHENREGELN.md`; Grenz- und Fehlerfälle eingeschlossen.
- Ladeschicht, Projekte und Einrichtung: Integrationstests gegen echte temporäre Ordner, keine Mocks des Dateisystems.
- Kommandozeile und MCP-Server: Aufruf-Tests über echte Prozesse bzw. den echten MCP-Client, dazu der Gleichheitstest.
- Oberfläche: Komponententests mit Testing Library für die Kriterien aus F10; keine End-to-End-Automatisierung der gebauten App.
- Regressionstest für jeden gefundenen Fehler. Kein Abdeckungsprozent als Ziel.
- Details: `docs/TESTING.md`.

### Fehlerbehandlung
- Meldungen sagen, was zu tun ist („Gib mindestens 1 Versuch an“ statt „Ungültige Eingabe“).

### Performance
- Eine vollständige Berechnung dauert unter 50 ms (Standardbeispiel, gemessen im Test), damit die Oberfläche in unter 100 ms aktualisiert (AC-F10-1).
- Die Paketsuche ist exakt und begrenzt: geprüft werden nur Kombinationen bis „Fehlbetrag + größtes bekanntes Paket“.
- Der MCP-Server antwortet auf `kosten_berechnen` ohne Netzwerk in unter 500 ms; mit Kursabruf gilt das Zeitlimit aus den Einstellungen.

### Datenintegrität
- Preise und Projekte im Datenordner werden mit Git versioniert; die App selbst macht keine Commits.
- Startdaten in `daten-vorlage/` entsprechen nach dem Laden exakt den Prüfwerten der Spezifikation.

### Dokumentation
- `README.md` mit Installation, Befehlen und Datenordner.
- Die MCP-Werkzeugbeschreibungen und `hfcalc --help` sind die Anleitung für Agenten und werden bei jeder Schnittstellenänderung mitgepflegt.

### Frontend (LEICHT)
- Nur die Bausteine aus `docs/UI-RULES.md`, keine zweite Variante derselben Funktion.
- Fehlermeldung direkt am Feld; Eingaben bleiben bei Fehlern erhalten.
- Höchstens eine Primär-Aktion pro Bereich.

---

## Stufe 3 — Accessibility (Basis)

- Alle Bedienelemente per Tastatur erreichbar und bedienbar (Tab, Pfeiltasten, Enter, Leertaste, Escape).
- Jedes Eingabefeld hat eine sichtbare Beschriftung, die als Label verknüpft ist.
- Textkontrast mindestens 4,5 : 1, Bedienelemente und Fokusring mindestens 3 : 1.
- Status nie nur über Farbe: immer mit Wort.
- Dynamische Ergebnisänderungen und Speicherbestätigungen über eine `aria-live`-Region (`polite`).
- Klickflächen mindestens 24 × 24 px.
