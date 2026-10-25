# Verlauf & Entscheidungen — Higgsfield-Kostenkalkulator

> **Hinweis zur öffentlichen Fassung (Cost Calculator for Higgsfield):** Dieses Protokoll zeigt, wie der Kalkulator mit Claude Code entstanden ist; persönliche Angaben sind durch „der Autor“ ersetzt. Die hier erwähnten Ordner `design-system/` (Logos, Icons und Bilder von Higgsfield), `docs/referenz/` und `backup/` sind nicht Teil der öffentlichen Fassung. Icons und App-Icon sind dort eigene Zeichnungen.

## Gilt fortlaufend

<!-- Max. 10 Zeilen. Merksätze mit Dauerwirkung: Stolperfallen, bestätigte Framework-Eigenheiten, Konventionen aus einem Fix. Bei Widerspruch gilt der ausführliche Eintrag im Verlauf. -->
- Meldet pnpm eine Paketversion als jünger als einen Tag, die nächstältere Version nehmen, nie eine Ausnahme eintragen (Eintrag 2026-10-09).
- Eingegeben wird nur der offene Umfang (Dauer oder Clips, plus Aufschlag); „Bereits fertig“ gibt es nicht mehr (Eintrag „Kostenrechner statt Clipplaner“).
- Oberfläche im Browser prüfen über `vorschau.html` (Konfiguration „vorschau“ in `.claude/launch.json`); die echte App mit `pnpm tauri dev` liest `~/Higgsfield-Kalkulator`.
- Radix-Select in jsdom-Tests per Tastatur bedienen (`choose()` in `tests/hilfen/ui.tsx`); Polyfills stehen dort.
- `<label>` nur um den Beschriftungstext, nie um Eingabe und Einheit (sonst falscher Name für Screenreader).
- Die App wird nach `/Applications/` installiert (der Autor nutzt einen eigenen Programmordner).
- Claude Desktop überschreibt seine Konfiguration, solange es läuft: vor `hfcalc einrichten` mit Cmd+Q beenden.
- Allgemeine Hinweise im Ergebnis tragen `area` (und bei einem Pass `passId`); neue Hinweise im Kern immer mit Ort anlegen, sonst zeigt die Oberfläche sie nicht (Eintrag „Ergebnisbereich“).
- Storyboard und einmalige Assets sind „aus“, solange `storyboardModelId` bzw. `oneTimeAssets` fehlen; es gibt kein eigenes `enabled`-Feld (Eintrag 2026-10-25).

## Verlauf

Append-only. Neue Einträge unten anhängen, bestehende nie überschreiben. Überholte Einträge mit „⟶ überholt durch [Datum]“ markieren, nicht löschen.

<!--
Eintragsmuster:

### [Datum] · [Kurztitel]
- **Typ:** Entscheidung | Fix | Erkenntnis
- **Auslöser:** was passiert ist oder was zur Wahl stand
- **Ergebnis:** was jetzt gilt bzw. wie es gelöst wurde — konkret, mit Datei- oder Funktionsnamen
- **Warum:** Begründung, und was verworfen wurde
- **Folgen:** was das für den weiteren Build bedeutet (leer lassen, wenn keine)
- **Nachgeführt in:** Dokumente, die deshalb geändert wurden — oder „keine“

Bei Typ Fix zusätzlich: **Symptom**, **tatsächliche Ursache**, **ID des Regressionstests**.
-->

### 2026-10-09 · Standardwerte aus der Spezifikation
- **Typ:** Entscheidung
- **Auslöser:** nicht blockierende Punkte 4 bis 14 in `docs/SPEC.md`, Abschnitt „Entscheidungen und Standardwerte“
- **Ergebnis:** (4) Credits exakt rechnen, Anzeige mit einer Nachkommastelle · (5) beim Modell „Seedance 2.5 Draft“ immer eine 1080p-Fertigstellung je Clip, Auflösungsfeld zeigt „480p → 1080p“ · (6) optionales Feld „Bereits fertig (MM:SS)“, leer = 0:00 · (7) Pass-Vergleich mit Rabattpreisen über den günstigsten Rabattpreis je Credit bis 4.000 Credits (0,0475 $) · (8) Seedance 2.0 Standard 720p bleibt bei 4,5 Credits je Sekunde, obwohl der Generate-Button bei Ton an und Bitrate hoch 48 statt 36 Credits für 8 s zeigte · (9) zwei getrennte Euro-Maßstäbe: Pass-Urteil nach Abschnitt 4.5, Gesamtempfehlung nach tatsächlichen Zusatzkosten · (10) Herleitung der Produktionswege · (11) Formel der abgerechneten Sekunden · (12) Rabatt-Standardumfang Seedance 2.5 und Draft in 1080p · (13) Kursabruf beim Start bzw. je Aufruf · (14) oben die Gesamtempfehlung, darunter bei Abweichung „Deine Auswahl“
- **Warum:** benannte Standardwerte, die sich nachträglich billig ändern lassen
- **Folgen:** Punkt 8 ist ein Datenwert und wird über `preise/videomodelle.json` korrigiert, sobald der Autor ihn am Button abliest
- **Nachgeführt in:** keine

### 2026-10-09 · Gestaltung nach der Higgsfield-App
- **Typ:** Entscheidung
- **Auslöser:** Der Autor will die Bausteine der Higgsfield-App, nicht der Startseite, und eine einfache, minimalistische Bedienung
- **Ergebnis:** Werte in `src/styles/tokens.css` aus der Messung der App vom 09.10.2026; Bewegungskurve `--ease-standard` = Higgsfield-Kurve statt der Standardkurve aus dem Skill; gewählte Zustände in Reitern weiß; Statusfarben der Website nur als Fläche und Punkt
- **Warum:** Marken-Bewegungssprache hat Vorrang; das Higgsfield-Rot erreicht als Schrift nicht 4,5 : 1
- **Folgen:** `design-system/tokens.css` (Startseite) ist nur Referenz für Schriften, Icons und Logos, nicht für Werte
- **Nachgeführt in:** keine

### 2026-10-09 · Datenordner direkt im Benutzerordner
- **Typ:** Entscheidung
- **Auslöser:** Prüfung des Bauplans: macOS schützt den Ordner „Dokumente“ und fragt jedes Programm einzeln um Erlaubnis
- **Ergebnis:** Datenordner ist `~/Higgsfield-Kalkulator/`; Tauri-Berechtigung `$HOME/Higgsfield-Kalkulator/**`; Kurs-Zwischenspeicher in `cache/` statt `.cache/`
- **Warum:** Im Ordner „Dokumente“ hätte macOS die App nach jedem Neubau erneut gefragt, weil sich ihre Ad-hoc-Signatur ändert; Claude Desktop und Codex starten den MCP-Server ohne sichtbares Fenster, dort wäre die Abfrage unbemerkt gescheitert und der Server hätte keine Daten gefunden. Verworfen: `~/Documents/Higgsfield-Kalkulator/` (Abfragen) und `~/Library/Application Support/` (für den Autor und Agenten schwer auffindbar)
- **Folgen:** keine Einstellungsdatei für den Ort nötig; `HFCALC_DATA` bleibt nur für Tests und Notfälle
- **Nachgeführt in:** `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/PRE-LAUNCH.md`, `docs/TESTING.md`, `.env.example`

### 2026-10-09 · Versionsprüfung Schritt 1 und Gerüst
- **Typ:** Erkenntnis
- **Auslöser:** Schritt 1 verlangt, Versionen, Init-Befehle und Paketnamen gegen den offiziellen Stand zu prüfen.
- **Ergebnis:** Alle Versionen aus `CLAUDE.md` sind am 09.10.2026 die aktuellen Versionen im npm-Verzeichnis und wurden genau so installiert: Tauri-CLI 2.12.1, `@tauri-apps/api` 2.12.2 (⟶ überholt durch 2026-10-09 · Keine Pakete, die jünger als ein Tag sind), React 19.3.0, Vite 8.3.4, `@vitejs/plugin-react` 6.1.2, Zod 4.6.5, big.js 7.0.1, commander 15.0.0, `@modelcontextprotocol/sdk` 1.32.1 (aktuellste Version 1), plugin-fs 2.6.0, plugin-http 2.8.1, radix-ui 1.7.0, Vitest 5.0.3, `@testing-library/react` 16.3.3, jsdom 30.1.2, Biome 2.5.15, pnpm 12.10.1. Werkzeuge auf dem Mac: Node 24.19.0, Rust 1.98.1. Der Init-Befehl aus dem Bauplan ist gültig; `create-tauri-app` 4.7.4 kennt alle verwendeten Optionen (`--template`, `--manager`, `--identifier`, `-y`). Die Vorlage bringt TypeScript 6.0.3 mit; das bleibt so, obwohl 7.0.2 erschienen ist, wie `CLAUDE.md` es verlangt.
- **Warum:** Keine Abweichung gefunden, deshalb keine Änderung an `CLAUDE.md`.
- **Folgen:** keine
- **Nachgeführt in:** keine

### 2026-10-09 · Drei reine Typ-Pakete zusätzlich zum Stack
- **Typ:** Entscheidung
- **Auslöser:** TypeScript strict kann big.js und die Node-Schnittstellen nur prüfen, wenn deren Typbeschreibungen installiert sind; `@testing-library/react` verlangt außerdem `@testing-library/dom` als Partnerpaket.
- **Ergebnis:** Als Entwicklungs-Abhängigkeiten installiert: `@types/big.js` 7.0.0 und `@types/node` 24 (passend zu Node 24). `@testing-library/dom` 10.4.2 hat pnpm als Partnerpaket automatisch ergänzt. `@types/react` und `@types/react-dom` stammen aus der Tauri-Vorlage.
- **Warum:** Alle drei sind reine Typbeschreibungen bzw. eine Pflicht-Ergänzung eines Stack-Pakets; sie landen nie in der App oder im Bündel. Ohne sie lässt sich „TypeScript strict, kein `any`“ nicht einhalten. Geringe Auswirkung, deshalb ohne Rückfrage.
- **Folgen:** keine
- **Nachgeführt in:** keine

### 2026-10-09 · Ein TypeScript-Projekt für App, Node-Teile und Tests
- **Typ:** Entscheidung
- **Auslöser:** Die Vorlage hatte zwei Konfigurationen (`tsconfig.json` für `src`, `tsconfig.node.json` für `vite.config.ts`).
- **Ergebnis:** Eine einzige `tsconfig.json` prüft `src`, `tests`, `scripts` und `vite.config.ts`, mit `strict`, `erasableSyntaxOnly`, `allowImportingTsExtensions` und `verbatimModuleSyntax`. `tsconfig.node.json` ist entfernt (Kopie bleibt in `_geruest/`). Vitest ist in `vite.config.ts` eingerichtet; Tests liegen unter `tests/**/*.test.{ts,tsx}`, Standardumgebung `node`, Oberflächen-Tests schalten mit `// @vitest-environment jsdom` um.
- **Warum:** `verbatimModuleSyntax` erzwingt `import type` für reine Typen; sonst bricht Node beim Type-Stripping ab, weil die importierte Typ-Bezeichnung zur Laufzeit nicht existiert. Eine Konfiguration ist die kleinste Lösung; der Kern bleibt per Regel frei von Node-Schnittstellen, nicht per Typprüfung.
- **Folgen:** `pnpm check` = `tsc` + `biome check`.
- **Nachgeführt in:** keine

### 2026-10-09 · Tauri-Hülle: Berechtigungen, Fenster, Icon
- **Typ:** Entscheidung
- **Auslöser:** Schritt 1, Fenster und Plugins
- **Ergebnis:** Plugin `opener` vollständig entfernt (Paket, Cargo, `lib.rs`, Berechtigungen) samt Beispielbefehl `greet`. Berechtigungen in `src-tauri/capabilities/default.json` schon jetzt eng: Dateien nur in `$HOME/Higgsfield-Kalkulator` (lesen, schreiben, Ordner anlegen, umbenennen für atomares Schreiben, **kein** Löschen), Netz nur `https://data-api.ecb.europa.eu/*`, dazu `core:window:allow-start-dragging` für die verschiebbare Titelzone. Fenster 1280 × 800, Mindestgröße 1100 × 720, Overlay-Titelleiste, Hintergrund `#0b0b0b` (= `--color-surface`). Gebaut wird nur das `.app`-Paket (`targets: ["app"]`), kein DMG. App-Icon nach dem macOS-Raster: dunkle Fläche 824 × 824 mit 100 px Rand im 1024er-Feld, Zeichen 494 px breit mittig. Die von `tauri icon` zusätzlich erzeugten Android- und iOS-Icons wurden entfernt.
- **Warum:** Die Plugins `fs:default` und `http:default` ohne Bereich hätten entweder zu viel (App-Ordner) oder nichts erlaubt; die engen Regeln stehen ohnehin in `docs/ARCHITECTURE.md`. Mit dem Apple-Rand wirkt das Icon im Dock so groß wie die anderen Apps. DMG und Mobil-Icons braucht eine lokal installierte Mac-App nicht.
- **Folgen:** Schritt 14 muss keine Berechtigungen mehr ergänzen, außer ein Dateibefehl fehlt.
- **Nachgeführt in:** keine

### 2026-10-09 · Vorlagenreste und fehlende `.env.example`
- **Typ:** Erkenntnis
- **Auslöser:** Nach dem Kopieren der Vorlage lagen Beispieldateien im Projekt, die die App nicht braucht.
- **Ergebnis:** Entfernt wurden `src/App.css`, `src/assets/react.svg`, `public/tauri.svg`, `public/vite.svg` und `tsconfig.node.json`; `App.tsx` liegt jetzt unter `src/ui/App.tsx`, wie `docs/ARCHITECTURE.md` es vorsieht. Alle Originale bleiben in `_geruest/` erhalten, bis der Autor dessen Löschung freigibt. Die `README.md` der Vorlage bleibt vorerst stehen und wird in Schritt 16 ersetzt. Eine Datei `.env.example`, die der Bauplan und ein früherer Eintrag hier erwähnen, gab es im Projekt nicht; es wurde keine angelegt, weil die einzige Umgebungsvariable `HFCALC_DATA` in `docs/ARCHITECTURE.md` beschrieben ist.
- **Warum:** Die Beispieldateien hätten Literale (Farben, Pixel) außerhalb von `tokens.css` ins Projekt gebracht.
- **Folgen:** keine
- **Nachgeführt in:** keine

### 2026-10-09 · Keine Pakete, die jünger als ein Tag sind
- **Typ:** Entscheidung
- **Auslöser:** pnpm 12 prüft vor der Installation, ob eine Paketversion schon mindestens einen Tag veröffentlicht ist (Schutz gegen frisch eingeschleuste Schadversionen). `@tauri-apps/api` 2.12.2 und die Rust-Bibliothek `tauri` 2.12.2 erschienen am Morgen des 09.10.2026. pnpm hatte dafür still eine Ausnahme in einer neuen Datei `pnpm-workspace.yaml` angelegt.
- **Ergebnis:** Ausnahme und `pnpm-workspace.yaml` entfernt; `@tauri-apps/api` fest auf 2.12.1, in `src-tauri/Cargo.toml` `tauri = "~2.12.1"` und in `Cargo.lock` genau 2.12.1 (beide vom 30.09.2026). Damit passen JavaScript- und Rust-Seite von Tauri zusammen, und die Sicherheitsregel von pnpm gilt ohne Ausnahme.
- **Warum:** Die Schutzregel abzuschalten, nur um eine wenige Stunden alte Fehlerbehebungs-Version zu bekommen, wäre der schlechtere Tausch. 2.12.1 erfüllt „Tauri 2.12“ aus `CLAUDE.md`.
- **Folgen:** Bei späteren Paketen gilt dasselbe: Meldet pnpm eine zu junge Version, die nächstältere nehmen statt eine Ausnahme einzutragen.
- **Nachgeführt in:** keine

### 2026-10-09 · Preisdatenbasis: Form der Startdaten und der Prüfung
- **Typ:** Entscheidung
- **Auslöser:** Schritt 2 (F8); einige Details standen weder in `docs/SPEC.md` noch in `docs/ARCHITECTURE.md`.
- **Ergebnis:**
  - **Seedance 2.0 Mini in 1080p und 4K = „gibt es nicht“ (`unavailable`).** Annahme, weil `docs/RECHENREGELN.md` 3.2 Mini nur für 480p und 720p beschreibt. 480p und 720p stehen auf „unbekannt“. Die Quelle in `videomodelle.json` nennt die Annahme.
  - **GPT Image 2.5 Sunburst und Flare** stehen je Auflösung als eigener Eintrag in `bildmodelle.json`, weil das Datenmodell genau einen Preis je Bildmodell kennt.
  - **Kennzeichnungen:** Seedance 2.5 = `top`, Seedance 2.5 Draft = `new`, alle anderen ohne, genau wie in `docs/referenz/kalkulator-bausteine-vorschau.html`.
  - **Unbekannte Preise dürfen eine Einheit tragen** (zum Beispiel `USD` bei den Reglerstufen der Pakete), damit beim Nachtragen klar ist, in welcher Währung abgelesen werden soll.
  - **Unbekannte Felder sind ein Prüffehler** (`z.strictObject`), damit Tippfehler wie `soruce` nicht still übergangen werden.
  - **Prüfung ohne Dateizugriff:** `checkPriceFiles` in `src/schema/preise-pruefen.ts` bekommt die Dateiinhalte als Text. So nutzen Kommandozeile, MCP-Server und App dieselbe Prüfung; nur das Lesen unterscheidet sich.
  - **Kaputtes JSON** (zum Beispiel `4,5` ohne Anführungszeichen) meldet Datei, Zeile und das Feld davor; eine Zahl als Text (`"4,5"`) meldet den vollständigen Feldpfad wie `models[2].resolutions.720p.value`.
  - **Zod meldet auf Deutsch** (`z.config(z.locales.de())` in `src/schema/index.ts`); die wichtigen Fälle (fehlendes Datum, fehlende Quelle, Preis 0, Komma) haben eigene Meldungen, die sagen, was zu tun ist.
  - **Biome prüft die Preisdateien nicht** (`daten-vorlage/preise`, `tests/fixtures`), weil sie Daten sind, die Zod prüft, und die Testdaten eine Byte-gleiche Kopie der Startdaten bleiben sollen. Ein Test vergleicht beide.
- **Warum:** jeweils die kleinste Lösung, die die Kriterien AC-F8-1 bis AC-F8-6 erfüllt und spätere Ablesungen einfach macht. Alle Punkte sind Datenwerte oder lassen sich ohne Folgen ändern.
- **Folgen:** Liest der Autor am Generate-Button einen Mini-Preis für 1080p ab, wird der Status in `videomodelle.json` auf `known` gesetzt; Code bleibt unverändert.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Schema-Ordner, Einheit bei `unknown`, Bildmodelle je Auflösung, Ausgabe von `hfcalc preise --json`)

### 2026-10-09 · Reichweite der Tests zu AC-F8-5 in Schritt 2
- **Typ:** Erkenntnis
- **Auslöser:** AC-F8-5 verlangt, dass ein neues Videomodell „in Auswahl und Vergleich“ erscheint. Auswahl (Oberfläche, Schritt 14) und Vergleich (Produktionswege, Schritt 4) gibt es in Schritt 2 noch nicht.
- **Ergebnis:** In Schritt 2 ist geprüft, dass ein neues Modell ohne Code-Änderung geladen, geprüft und in `hfcalc preise` gelistet wird. Die Tests zu den Produktionswegen in Schritt 4 und zum Modellwähler in Schritt 14 bekommen je einen weiteren `AC-F8-5`-Test mit einem zusätzlichen Modell.
- **Warum:** Ohne Rechenkern und Oberfläche lässt sich der Rest des Kriteriums nicht prüfen; der Bauplan ordnet AC-F8-5 trotzdem Schritt 2 zu.
- **Folgen:** Schritt 4 und Schritt 14 müssen diese Tests ergänzen.
- **Nachgeführt in:** keine

### 2026-10-09 · Seedance 2.0 Mini nur in 480p und 720p bestätigt
- **Typ:** Entscheidung
- **Auslöser:** Rückfrage nach Schritt 2 zur Annahme „Mini in 1080p und 4K gibt es nicht“.
- **Ergebnis:** Der Autor bestätigt die Annahme. Die Quelle der beiden Einträge in `videomodelle.json` (Startdaten und Testdaten) nennt jetzt die Bestätigung statt „Annahme“.
- **Warum:** Bestätigung durch den Autor.
- **Folgen:** keine
- **Nachgeführt in:** `daten-vorlage/preise/videomodelle.json`, `tests/fixtures/daten/preise/videomodelle.json`

### 2026-10-09 · Kostenrechner statt Clipplaner: nur der offene Umfang, als Dauer oder Clips
- **Typ:** Entscheidung
- **Auslöser:** Vor Schritt 3 („Clips planen“) stellt der Autor klar: Der Kalkulator ist ein Kostenrechner, kein Film- oder Clipplaner. Er soll auch funktionieren, wenn er zum ersten Mal mitten in einem Filmprojekt aufgerufen wird, mit dem aktuellen Credit-Stand und der Zahl der Clips, die noch vor ihm liegen. Der Aufschlag für Zwischenszenen und Inserts soll auch dann einstellbar sein und auf die restlichen Clips obendrauf kommen.
- **Ergebnis:** Eingegeben wird nur, was noch offen ist: genau eines von „Dauer“ (MM:SS) und „Clips“ (Anzahl), umschaltbar in einem Pflichtfeld „Noch offen“. Der Aufschlag (20–50 %) gilt für beides: Clipanzahl = aufgerundet(Dauer × (1 + Aufschlag) ÷ Cliplänge) bzw. aufgerundet(offene Clips × (1 + Aufschlag)). Das Feld „Bereits fertig“ entfällt (SPEC Entscheidung 6 überholt), ebenso die Kombination „Dauer und Clipanzahl zugleich“ (früher AC-F1-3: Cliplänge aus Dauer ÷ Clipanzahl). Geändert: AC-F1-3 (20 Clips + 25 % = 25 Clips, 187,5 s; 7 Clips + 25 % = 9 Clips), AC-F1-6 (auch „weder noch“ und „beides“), AC-F7-1 (Einstieg mitten im Projekt: 800 Credits, 12 offene Clips, 25 % → 15 Clips, 2.827,5 Credits Bedarf, 2.027,5 fehlend). AC-F7-3 entfällt. Die Zahl der Pflichtfelder bleibt sieben. Schritt 3 heißt jetzt „Clipanzahl und abgerechnete Sekunden“, Schritt 9 „Einstieg mitten im Projekt und Restguthaben“. Alle Prüfwerte sind mit exakter Dezimalrechnung nachgerechnet; das Standardbeispiel (3:00 als Dauer) und alle anderen Prüfwerte bleiben unverändert.
- **Warum:** Der Autor denkt mitten im Projekt in Clips, nicht in Minuten. Die bisherige Spezifikation verlangte immer eine Filmdauer und die Clipanzahl nur zusätzlich; die Kernfrage „Was kosten meine restlichen 20 Clips?“ ließ sich so nur über einen Umweg beantworten. Verworfen: „nur Clips“ (am Anfang eines Films ist die Dauer bekannt, die Clipzahl nicht) und „wie geplant lassen“.
- **Folgen:** Kommandozeile bekommt `--clips` als Alternative zu `--dauer` (Schritt 10), die Oberfläche einen Umschalter Dauer/Clips (Schritt 14). Die Kriterien-Tests in Schritt 17 schließen AC-F7-3 aus.
- **Nachgeführt in:** `docs/SPEC.md` (F1, F7, Standardbeispiel, Entscheidung 6), `docs/ARCHITECTURE.md` (Eingaben, Ergebnis `openSeconds`, Kommandozeile, Feature-Zuordnung), `docs/UI-RULES.md` (Aufbau, Weitere Einstellungen, B2, B3, B4, §16), `docs/BUILD-PLAN.md` (Schritte 3, 9, 14)

### 2026-10-09 · Produktionswege im Rechenkern: Kennung, Anzeige und zwei Annahmen
- **Typ:** Entscheidung
- **Auslöser:** Schritt 4 (F2); die Spezifikation legt fest, welche Wege entstehen (Entscheidung 10), aber nicht jede Einzelheit.
- **Ergebnis:**
  - **Kennung und Name eines Wegs:** `<modelId>@<Auflösung>`, zum Beispiel `seedance-2.0-standard@1080p` mit dem Namen „Seedance 2.0 Standard · 1080p“. Der Draft-Weg heißt `seedance-2.5-draft@1080p` mit dem Namen „Seedance 2.5 Draft + 1080p“.
  - **Reihenfolge:** wie in `videomodelle.json` (Modell, dann Auflösung aufsteigend); Wege ohne Preis rücken ans Ende, sonst bleibt die Reihenfolge.
  - **Annahme 1:** Kann ein Modell die gewählte Cliplänge nicht erzeugen (zum Beispiel 20 s bei Seedance 2.0 mit höchstens 15 s), fehlt es im Vergleich, und ein Hinweis nennt den Grund. Nur beim gewählten Modell ist das ein Fehler ohne Ergebnis (AC-F1-5). Markiert mit `// ASSUMPTION:` in `src/kern/credits.ts`.
  - **Annahme 2:** Die Versuche des Draft-Modells laufen in seiner ersten angebotenen Auflösung (in den Daten 480p). Das Datenmodell hat dafür kein eigenes Feld, weil das Draft-Modell nur eine Auflösung anbietet.
  - **Ein Weg ohne Preis** hat `creditsPerSecond` und `videoCredits` = `null`; `totalCredits()` liefert dann ebenfalls `null`, sodass er in keine Summe eingehen kann (AC-F2-6). Ist die gewählte Kombination ohne Preis, entsteht ein Hinweis der Art `no-price`.
  - **Der Rabatt gilt für den einzelnen Preis**, wenn Modell und Auflösung im Rabattumfang liegen; die Draft-Fertigstellung zählt als `seedance-2.5` in `1080p` (Entscheidung 12). Der Audio-Aufschlag gilt nur für Modelle mit `audioSurchargeAllowed: true`.
- **Warum:** kleinste Lösung für AC-F2-1 bis AC-F2-7; beide Annahmen haben geringe Auswirkung und lassen sich ohne Folgen ändern.
- **Folgen:** Die Empfehlung (Schritt 8) wählt nur aus Wegen mit Status `ok` und mindestens der Zielauflösung.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Ergebnisfeld `paths[]`)

### 2026-10-09 · Wechselkurs: Herkunft, Zwischenspeicher und Fehlerfälle
- **Typ:** Entscheidung
- **Auslöser:** Schritt 5 (F4); Entscheidung 13 der Spezifikation lässt offen, wie ein gespeicherter Kurs vom aktuellen Bankarbeitstag heißt und was bei Speicherfehlern passiert.
- **Ergebnis:**
  - Ein gespeicherter Kurs vom aktuellen Bankarbeitstag gilt als `origin: "ecb"`, nicht als `cached`, weil er der aktuelle Referenzkurs ist; „offline“ erscheint nur, wenn ein älterer Kurs einspringen muss.
  - Bankarbeitstag = Montag bis Freitag. Feiertage kennt der Kalkulator nicht; an einem Feiertag fragt er die Zentralbank einmal zu viel, das Ergebnis bleibt richtig.
  - Mit manuellem Kurs ruft der Kalkulator die Zentralbank gar nicht ab (schneller, funktioniert offline); Datum des manuellen Kurses ist der heutige Tag.
  - Der Zwischenspeicher wird nur geschrieben, wenn der Datenordner existiert. Sonst entstünde ein halber Datenordner, und `hfcalc einrichten` würde ihn nach AC-F13-4 nie mehr mit Startdaten füllen.
  - Ein beschädigter oder nicht speicherbarer Zwischenspeicher wird als `cacheError` zurückgemeldet statt verschluckt; die Rechnung läuft weiter.
  - Die Uhr kommt als Argument (`today`), damit Tests das Datum festlegen; `localToday()` liefert es im Betrieb aus der Zeitzone des Macs.
  - Hinweistexte des Kerns formatieren Zahlen mit deutschem Komma ohne Rundung (`src/kern/text.ts`, drittes Vorkommen, deshalb jetzt eine gemeinsame Funktion).
- **Warum:** kleinste Lösung für AC-F4-1 bis AC-F4-6; kein Fehler bleibt still.
- **Folgen:** Schritt 9 ergänzt Tests zu AC-F4-1 und AC-F4-3 über `calculate()` (im Build-Plan eingetragen). Die Tauri-Ladeschicht (Schritt 14) nutzt `parseEcbResponse` und `isCacheCurrent` aus `src/schema/kurs.ts`.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Abschnitt Wechselkurs), `docs/BUILD-PLAN.md` (Schritt 9)

### 2026-10-09 · Paketsuche: Verfahren, Währungen und Fehlbetrag mit Nachkommastelle
- **Typ:** Entscheidung
- **Auslöser:** Schritt 6 (F3); `docs/QUALITY.md` verlangt eine exakte, begrenzte Suche, `docs/SPEC.md` Entscheidung 13 regelt Euro-Pakete ohne Kurs.
- **Ergebnis:**
  - **Verfahren:** dynamische Programmierung über die Credit-Menge in Schritten des größten gemeinsamen Teilers aller Paketgrößen (heute 100 Credits), von 0 bis „Fehlbetrag + größtes Paket“. Für jede Menge gilt die günstigste Kombination, bei gleichem Preis die mit weniger Paketen; gewählt wird danach der niedrigste Preis, dann die geringere Paketzahl, dann der kleinere Überschuss (AC-F3-4). Das Ergebnis ist exakt, nicht geschätzt.
  - **Vergleich ohne Division:** Haben alle Pakete dieselbe Währung, vergleicht die Suche die Nettopreise direkt. Nur bei gemischten Währungen werden Dollar-Preise durch den Kurs geteilt und in Euro verglichen. Die Mehrwertsteuer ändert die Reihenfolge nicht und kommt erst danach dazu.
  - **Euro-Preise:** werden nur mit der Mehrwertsteuer versehen und nie umgerechnet; ohne Kurs fallen sie mit Hinweis aus dem Vergleich (Entscheidung 13).
  - **Fehlbetrag mit Nachkommastelle** (zum Beispiel 2.027,5) wird voll gedeckt; der Überschuss behält die Nachkommastelle (72,5 Credits).
  - **Hinweise:** „gedeckt“ bei ausreichendem Credit-Stand, „Verfall nach 90 Tagen“ bei Überschuss, „ohne Preis“ für Paketgrößen ohne hinterlegten Preis. Zahlen in Hinweisen jetzt mit Tausenderpunkt (`deNumber`).
  - Neues Ergebnisfeld `eurNet` neben `usdNet`, damit Euro- und Dollar-Pakete getrennt nachvollziehbar bleiben.
- **Warum:** einzige Lösung, die bei allen Paketgrößen garantiert die günstigste Kombination findet und trotzdem schnell ist (gemessen: Standardbeispiel unter 2 ms, eine Million Credits rund 12 ms).
- **Folgen:** keine
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Ergebnisfeld `selected`)

### 2026-10-09 · Pässe: Vergleichsweg, Gewinnschwelle und Generierungsdauer
- **Typ:** Entscheidung
- **Auslöser:** Schritt 7 (F5). `docs/RECHENREGELN.md` 4.5 vergleicht den Pass „Seedance 2.5 bis 1080p“ zusätzlich mit Seedance 2.0 Standard in 1080p; `docs/SPEC.md` Entscheidung 2 sagt „mit dem günstigsten abgedeckten Modell in seiner Auflösungsstufe“, AC-F5-4 vergleicht mit dem Draft-Weg. Bei Abweichung gilt die Spezifikation.
- **Ergebnis:**
  - **Urteil (Maßstab a):** Jeder Pass wird mit dem günstigsten Credit-Weg in seiner Auflösung verglichen, dessen Modell er abdeckt oder dessen Draft auf einem abgedeckten Modell fertigstellt. Beim Pass „Seedance 2.5 bis 1080p“ sind das Seedance 2.5 in 1080p und der Draft-Weg, nicht Seedance 2.0 Standard. Das entspricht den Fragen 2 bis 4 in RECHENREGELN 5.1 und AC-F5-4. Ob Seedance 2.0 insgesamt günstiger ist, beantwortet die Gesamtempfehlung (Schritt 8), die alle Wege vergleicht.
  - **Gewinnschwelle:** Passpreis brutto ÷ Paketpreis je Credit brutto = Credits; ÷ Preis je generierter Sekunde des günstigsten abgedeckten Modells (mit aktivem Rabatt) = generierte Sekunden; ÷ abgerechnete Sekunden je Versuch = Versuche; ÷ Versuche pro Clip = fertige Sekunden bzw. brauchbare Clips. Jede Größe wird aus dem ungerundeten Wert aufgerundet. Damit stimmen alle 24 Werte aus AC-F5-1. Der Draft-Weg zählt hier nicht, weil im Pass jeder Versuch direkt in der Pass-Auflösung entsteht.
  - **Preis je Credit (Entscheidung 7)** als Konstante `PASS_COMPARISON_MAX_PACKAGE = 4000` in `src/kern/paesse.ts`, weil das Datenmodell dafür kein Feld hat.
  - **Generierungsdauer:** Eine einzelne Messung gilt für alle Cliplängen (720p); ab zwei Messungen wird linear durch die erste und letzte gerechnet und außerhalb fortgeschrieben, mit Hinweis (1080p). Für die Empfehlung gilt die langsamere Messung, mindestens `recommendationFloorMinutes`; die schnellere Messung liefert die Spanne (`attemptsPossibleFast`). Die Annahme für Seedance 2.0 gilt für alle Pässe, die eines der dort genannten Modelle abdecken, auch für die 1080p-Stufe ohne Preis.
  - **Erreichbar** ist ein Pass, wenn die Versuche des Films (Clips × Versuche, alle direkt) in den Zeitraum passen und die Cliplänge die Höchstlänge des Passes nicht überschreitet.
  - **Ohne Kurs** werden Urteil und Gewinnschwelle in Dollar gerechnet; die Euro-Felder sind dann `null`.
- **Warum:** einheitliche Regel für alle fünf Pässe, die alle Prüfwerte der Spezifikation erfüllt; die Abweichung zu RECHENREGELN 4.5 betrifft nur einen Vergleich, den die Gesamtempfehlung ohnehin abdeckt.
- **Folgen:** Will der Autor den 1080p-Pass zusätzlich gegen Seedance 2.0 Standard bewerten, ist das eine Änderung in `comparisonPath()`.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Ergebnisfeld `passes[]` und Tabelle der Euro-Maßstäbe)

### 2026-10-09 · Empfehlungen: Auswahlregeln, Schwellen und Gleichstände
- **Typ:** Entscheidung
- **Auslöser:** Schritt 8 (F6); die Spezifikation legt Satz, Begründung und Schwelle fest, aber nicht jede Regel für Gleichstände und Schwellen.
- **Ergebnis:**
  - **Produktionsweg:** günstigster Weg mit Preis und mindestens der Zielauflösung, verglichen über die Kosten des ganzen offenen Umfangs. Bei Gleichstand gewinnt die höhere Auflösung (AC-F6-4), danach die Reihenfolge in `videomodelle.json`.
  - **Schwelle des Produktionswegs:** Der Kern rechnet die Empfehlung für 1 bis 20 Versuche durch und nennt die nächste Versuchszahl darunter („bei N oder weniger Versuchen ist … günstiger“) und darüber („ab N Versuchen ist … günstiger“), an der ein anderer Weg gewinnt. Dafür trägt jeder Produktionsweg jetzt den Preis je Versuch (`attemptPrice`) und den festen Fertigstellungsanteil (`finishPrice`) getrennt.
  - **Begründung** nennt Preis je Sekunde, den nächstgünstigen Weg, den Vergleich der Seedance-2.5-Wege untereinander mit den Namen aus RECHENREGELN 4.4 („720p direkt“, „Draft plus 1080p“; bei niedrigerer Auflösung mit „liefert aber nur …“) und bei Seedance 2.0 den fehlenden Referenz-Workflow (AC-F6-3).
  - **Pass-Empfehlung:** „lohnt sich“, wenn mindestens ein Zeitraum lohnt; genannt wird der günstigste davon. Sonst bezieht sich die Begründung auf den kürzesten erreichbaren Zeitraum und nennt kürzere, die nicht reichen. Die Schwelle ist die Gewinnschwelle dieses Zeitraums. Deckt der Credit-Stand den Vergleichsweg schon, nennt ein Hinweis das (RECHENREGELN 4.5, letzter Punkt).
  - **Gesamtempfehlung (Maßstab b):** alle Credit-Wege mit Preis und alle erreichbaren Pass-Zeiträume mit Preis, jeweils mit mindestens der Zielauflösung, verglichen nach tatsächlichen Zusatzkosten in Euro (ohne Kurs in Dollar). Gleichstand: höhere Auflösung, dann weniger verbrauchte Credits (wichtig, wenn der Credit-Stand mehrere Wege voll deckt), dann Credits vor Pass. Im Pass gilt das erste abgedeckte Modell in der Pass-Auflösung als Produktionsweg. Die Schwelle ist die des Produktionswegs, wenn beide Empfehlungen übereinstimmen, sonst der Abstand zur nächstbesten Kombination. Die günstigste Kombination mit niedrigerer Auflösung erscheint als Hinweis (AC-F6-5).
  - **Geldbeträge in Sätzen** werden auf Cent gerundet („346,53 €“); die Zahlenfelder bleiben exakt.
- **Warum:** kleinste Regeln, die alle Prüfwerte aus AC-F6-1 bis AC-F6-6 wörtlich erfüllen und für jede Eingabe einen verständlichen Satz liefern; alle Sätze wurden für das Standardbeispiel gegengelesen.
- **Folgen:** `calculate()` (Schritt 9) ruft `recommend()` auf und legt das Ergebnis in `Result.recommendations` ab.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Abschnitt Ergebnis, Empfehlungen)

### 2026-10-09 · calculate(): Prüfung, Standardwerte, Ergebnis als JSON und Reichweite
- **Typ:** Entscheidung
- **Auslöser:** Schritt 9; `calculate()` wird die einzige Einstiegsstelle aller Bedienwege.
- **Ergebnis:**
  - `calculate(roh, prices, rate)` prüft die rohen Eingaben selbst mit `inputsSchema` und gibt `Outcome<Result>` zurück. So können Kommandozeile, MCP-Server und Oberfläche keine ungeprüften Werte durchreichen.
  - Fehlende optionale Werte (Cliplänge, Rabatt, Ton, Preisstände, Netto-Stunden) kommen aus `einstellungen.json`; der Kern kennt keine eigenen Standardwerte.
  - Das Ergebnis ist reines JSON: Alle big.js-Zahlen werden zu exaktem Dezimaltext (`JSON.stringify` nutzt `Big.toJSON`). Der Typ `Result` wird daraus abgeleitet (`Serialized<…>`). Ein Zod-Schema für `Result` entsteht in Schritt 11, wo gespeicherte Projekte ein Ergebnis enthalten und beim Laden geprüft werden müssen.
  - Den Wechselkurs bestimmt die Ladeschicht (auch den manuellen); `calculate()` nimmt ihn als Argument und nutzt `manualExchangeRate` aus den Eingaben nicht selbst, weil der Kern keine Uhr für das Datum hat.
  - **Reichweite:** Credit-Stand ÷ (Gesamtbedarf der gewählten Kombination ÷ Sekunden fertigen Films), dazu die ganzen Clips (abgerundet). Ohne Preis ist die Reichweite `null`.
  - **Hinweise:** eine flache Liste aus Clips, Produktionswegen, Kurs, Paketkauf, Pässen und Reichweite; die Empfehlungen tragen eigene Hinweise.
- **Warum:** kleinste Lösung für AC-F7-1, AC-F7-2 und die nachgeholten Tests zu AC-F4-1 und AC-F4-3; das Ergebnis lässt sich ohne Umwandlung ausgeben, speichern und vergleichen (Gleichheitstest in Schritt 12).
- **Folgen:** Schritt 10 und 12 rufen nur `calculate()` und die Ladeschicht auf.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Kern-Dateien, Schnittstelle des Rechenkerns, Ergebnisfelder `selected` und `reach`)

### 2026-10-09 · Kommandozeile `hfcalc rechnen`: Optionen, Hilfe und Meldungen
- **Typ:** Entscheidung
- **Auslöser:** Schritt 10 (F11).
- **Ergebnis:**
  - Optionen mit deutschen Namen (Liste in `docs/ARCHITECTURE.md`); Zahlen dürfen „7,5“ oder „7.5“ geschrieben werden; Preisstände heißen `regulaer` und `rabatt`; Auflösungen ohne Rücksicht auf Groß- und Kleinschreibung. `--rabatt <prozent>` schaltet den Rabatt ein; ohne Rabatt-Optionen gilt `einstellungen.json`.
  - `hfcalc --help` zeigt die vollständige Hilfe von `rechnen` mit (AC-F11-4). Erlaubte Modelle und Standardwerte liest die Hilfe aus dem Datenordner, damit sie nie veraltet; ohne gültige Daten nennt sie „siehe hfcalc preise“ bzw. „Standard aus einstellungen.json“.
  - Überschriften und Fehlermeldungen von commander sind ins Deutsche übertragen (`styleTitle`, `exitOverride`); Eingabefehler nennen die Option (`--versuche: …`) statt des englischen Feldnamens.
  - Fehlende Pflichtangaben werden vor der Prüfung gesammelt und gemeinsam genannt (AC-F11-3). Erst nach gültigen Eingaben wird der Kurs abgerufen, damit ein Tippfehler keinen Netzabruf kostet.
  - Die Textausgabe folgt dem Aufbau der Oberfläche: oben die eine Antwort, dann „Deine Auswahl“ bei Abweichung, Produktionswege, Pässe, Details, Hinweise. Credits mit höchstens einer Nachkommastelle, Geld mit zwei; jede Zahl mit Einheit.
  - Ein Pass ganz ohne Preis bekommt nur noch den Hinweis „kein Preis hinterlegt“, keine Annahme-Hinweise mehr (weniger Lärm); der Test zu AC-F5-7 ist entsprechend angepasst.
- **Warum:** kleinste Lösung für AC-F11-1, AC-F11-3 und AC-F11-4; Meldungen sagen, was zu tun ist.
- **Folgen:** Schritt 13 bündelt `src/cli/main.ts` zu `hfcalc.mjs`.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Kommandozeile)

### 2026-10-09 · Projektliste der App liest beim Öffnen des Menüs neu
- **Typ:** Entscheidung
- **Auslöser:** Der Autor fragte, ob Claude über die Kommandozeile Werte in die App eintragen kann. Antwort: nicht ins offene Fenster, aber über Projekte im gemeinsamen Datenordner. Laut AC-F9-1 erschien ein so gespeichertes Projekt erst nach einem Neustart der App.
- **Ergebnis:** Neues Kriterium AC-F9-6: Die App liest die Projektliste bei jedem Öffnen des Projektmenüs neu; ein von Claude gespeichertes Projekt erscheint ohne Neustart und lässt sich laden. Vom Autor bestätigt am 09.10.2026. Eine Fernsteuerung des offenen App-Fensters durch Claude bleibt bewusst außen vor.
- **Warum:** macht den Weg „Claude bereitet einen Film als Projekt vor, der Autor öffnet ihn in der App“ flüssig, ohne zusätzliche Verbindung zwischen App und Claude.
- **Folgen:** Umsetzung und Test in Schritt 15.
- **Nachgeführt in:** `docs/SPEC.md` (AC-F9-6), `docs/BUILD-PLAN.md` (Schritt 15), `docs/UI-RULES.md` (Abschnitt A)

### 2026-10-09 · Projekte: Dateiname, Überschreiben, beschädigte Dateien, Ergebnis-Schema
- **Typ:** Entscheidung
- **Auslöser:** Schritt 11 (F9).
- **Ergebnis:**
  - **Ergebnis-Schema:** `resultSchema` in `src/schema/ergebnis.ts` beschreibt das ganze Ergebnis; der Typ `Result` kommt jetzt von dort. `src/kern/berechnung.ts` reicht sein Ergebnis durch eine Funktion mit diesem Typ, sodass jede Abweichung zwischen Kern und Schema schon bei der Typprüfung auffällt.
  - **Dateiname** aus dem Projektnamen (`projectSlug`); gleicher Dateiname = gleiches Projekt, auch bei anderer Schreibweise. Ein Name ohne Buchstaben oder Ziffern wird abgelehnt.
  - **Überschreiben** nur mit Bestätigung (`--ueberschreiben`); ohne sie bleibt die Datei Byte für Byte gleich, Exitcode 1. Beim Überschreiben bleibt `createdAt`, der Name wird der neu angegebene.
  - **Gespeichert werden die Eingaben, wie angegeben**, ohne ergänzte Standardwerte, damit eine spätere Änderung der Standardwerte beim Neuberechnen greift; das gespeicherte Ergebnis hält den Stand beim Speichern fest.
  - **Preisstand** = jüngstes Stand-Datum aller Preise und der Generierungsdauer im Datenordner (nicht nur der tatsächlich verwendeten), weil das einfacher nachzuvollziehen ist und für einen Datenordner mit einem gemeinsamen Ablesedatum dasselbe ergibt.
  - **Beschädigte Projektdatei:** eine Meldung je Datei mit dem ersten Fehler, die Datei wird übersprungen; `hfcalc projekte` endet trotzdem mit Exitcode 0, weil die übrigen Projekte gültig sind (AC-F9-4). Die Meldung geht auf den Fehlerkanal, die Liste auf die Standardausgabe; `--json` enthält beides.
  - **Kein Projektordner** heißt „noch keine Projekte“, kein Fehler. Ohne Datenordner wird nichts angelegt.
- **Warum:** kleinste Lösung für AC-F9-1 bis AC-F9-4 mit Schutz vor Datenverlust.
- **Folgen:** Der MCP-Server (Schritt 12) nutzt dieselben Funktionen `listProjects`, `readProject` und `saveProject`.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Projekt, Kommandozeile)

### 2026-10-09 · MCP-Server: Antworten, Eingabeprüfung, gemeinsamer Rechenablauf
- **Typ:** Entscheidung
- **Auslöser:** Schritt 12 (F12).
- **Ergebnis:**
  - Jedes der fünf Werkzeuge antwortet mit genau dem JSON-Text des passenden Kommandozeilen-Befehls (zwei Leerzeichen Einzug). Damit ist „identisch“ (AC-F12-2, AC-F11-2, AC-F9-5) zeichengenau prüfbar; ein Ausgabeschema (`outputSchema`) gibt es nicht, weil die Agenten den Text lesen und es die Werkzeugliste nur aufblähen würde.
  - Eingaben prüft das SDK mit `inputsSchema`; die Felder tragen deutsche Beschreibungen (`.describe()` in `src/schema/eingaben.ts`). Die Fehlermeldung des SDK beginnt englisch („Input validation error …“), nennt aber jedes Feld mit der deutschen Anweisung, zum Beispiel „Gib mindestens 1 Versuch an. at attemptsPerClip“.
  - Kursabruf und `calculate()` laufen über `calculateWithRate` (`src/laden/node/rechnen.ts`), die auch die Kommandozeile nutzt; so können die beiden Wege nicht auseinanderlaufen.
  - Die Preisdaten werden bei jedem Werkzeugaufruf neu geladen; eine Preisänderung gilt sofort, ohne Neustart von Claude Desktop oder Codex.
  - Die Server-Anweisung sagt den Agenten: nie selbst rechnen oder Preise schätzen, nur den offenen Umfang eingeben, Kurs = Dollar je 1 Euro, erst in der Antwort runden, Projekte nur nach ausdrücklicher Bestätigung überschreiben.
- **Warum:** kleinste Lösung für AC-F12-1 bis AC-F12-3, AC-F11-2 und AC-F9-5.
- **Folgen:** AC-F12-4 ist eine manuelle Prüfung nach der Einrichtung in Schritt 13.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (MCP-Server)

### 2026-10-09 · Einrichtung: Bündel, Sicherungen, Datenordner und Node-Pfad
- **Typ:** Entscheidung
- **Auslöser:** Schritt 13 (F13).
- **Ergebnis:**
  - **Bündel:** `scripts/bundle-cli.ts` baut mit Vite (Rolldown) zwei eigenständige ESM-Dateien `hfcalc.mjs` und `mcp.mjs` mit allen Abhängigkeiten und legt `daten-vorlage/` daneben. `pnpm install:local` ist ein Paket-Skript (bündeln, dann `einrichten` aus dem Bündel) statt einer eigenen Datei `scripts/install-local.ts`; das ist kürzer und tut dasselbe.
  - **`einrichten` läuft nur aus dem Bündel**, weil es die Dateien neben sich installiert; aus dem Quelltext gestartet, verweist es auf `pnpm install:local`.
  - **Sicherungskopien** tragen Datum und Uhrzeit (`.bak-2026-10-09T22-40-00`), damit zwei Läufe am selben Tag sich nicht überschreiben. Ist eine Datei schon aktuell, entsteht keine Sicherung und kein Schreibvorgang.
  - **Datenordner** entsteht in einem Zwischenordner und wird erst vollständig umbenannt; scheitert das Kopieren, räumt die Einrichtung nur ihren eigenen Zwischenordner weg. Ohne Git-Identität (`user.email`) schreibt der erste Commit als „Higgsfield-Kalkulator <hfcalc@localhost>“.
  - **Node-Pfad auf dem Mac des Autors:** Node 24 liegt unter `~/.nvm/versions/node/v24.19.0/bin/node`; keiner der drei update-festen Pfade existiert. Die Einrichtung nimmt laut Architektur `process.execPath` und nennt den Hinweis „Nach einem Node-Update `hfcalc einrichten` erneut ausführen“.
  - **Fehler in einem Teilschritt** (zum Beispiel ungültiges JSON bei Claude Desktop) halten die übrigen Teilschritte nicht auf; die Ausgabe nennt jeden Teilschritt mit OK oder FEHLER, der Exitcode ist dann 3.
  - `dist-cli/` steht in `.gitignore` und ist von Biome ausgenommen.
- **Warum:** kleinste Lösung für AC-F13-1 bis AC-F13-5 und AC-F11-5 mit Schutz vor Datenverlust.
- **Folgen:** Der echte Lauf auf dem Mac des Autors ändert `claude_desktop_config.json`, `~/.codex/config.toml`, `~/.zshrc` und über `claude mcp` `~/.claude.json`; er geschieht nur nach seiner Freigabe.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Projektstruktur `scripts/`, Einträge durch `hfcalc einrichten`)

### 2026-10-09 · App wird beim Autor in einen eigenen Programmordner installiert, nicht nach /Applications
- **Typ:** Entscheidung
- **Auslöser:** Der Autor vor Schritt 16: Die gebaute App soll nicht in `/Applications` liegen, sondern in einem eigenen Programmordner.
- **Ergebnis:** Installationsort der App ist der eigene Programmordner des Autors. In der öffentlichen Fassung gilt `/Applications/`.
- **Warum:** die Ablage des Autors für eigene Programme.
- **Folgen:** Schritt 16 kopiert die gebaute App dorthin; der Start ohne Warnung und ohne Datenschutz-Abfrage wird dort geprüft. Der Ordnername enthält ein Leerzeichen, deshalb Pfade immer in Anführungszeichen.
- **Nachgeführt in:** `CLAUDE.md` (Lesepflicht-Tabelle), `docs/ARCHITECTURE.md` (Laufzeit-Orte), `docs/BUILD-PLAN.md` (Schritt 16), `docs/PRE-LAUNCH.md`

### 2026-10-09 · Echter Lauf der Einrichtung auf dem Mac des Autors
- **Typ:** Erkenntnis
- **Auslöser:** Freigabe durch den Autor nach Schritt 13.
- **Ergebnis:** `pnpm install:local` lief ohne Fehler. Geprüft: `hfcalc daten pruefen` aus beliebigem Ordner mit Exitcode 0; `claude mcp get higgsfield-kalkulator` meldet „Connected“ für alle Projekte; in `claude_desktop_config.json` ist nur der eigene Eintrag dazugekommen, `figma-console` und alle Einstellungen sind gleich; in `~/.codex/config.toml` sind nur die vier Zeilen des eigenen Blocks angehängt; der Datenordner ist ein Git-Repository mit einem Commit. `~/.local/bin` stand schon im PATH, `~/.zshrc` blieb unverändert. Sicherungskopien liegen neben den drei geänderten Dateien.
- **Fix danach:** Die Sicherungskopien trugen die Weltzeit (UTC), also 20-44 statt 22:44 Ortszeit. Der Zeitstempel nutzt jetzt die Ortszeit des Macs (`src/cli/einrichten.ts`).
- **Folgen:** Manuelle Prüfung AC-F12-4 durch den Autor (Claude Desktop neu starten, Kostenfrage stellen).
- **Nachgeführt in:** `docs/BUILD-PLAN.md` (Stand-Block)

### 2026-10-09 · Claude Desktop überschreibt seine Konfiguration, solange es läuft
- **Typ:** Erkenntnis
- **Auslöser:** Beim zweiten Lauf von `hfcalc einrichten` entstand eine neue Sicherungskopie von `claude_desktop_config.json`, obwohl der Eintrag schon geschrieben war.
- **Ergebnis:** Die laufende Claude-Desktop-App hatte die Datei zwischen den Läufen aus ihrem Arbeitsspeicher neu geschrieben, ohne unseren Eintrag (und ohne Zeilenende am Schluss). Der zweite Lauf hat den Eintrag wieder ergänzt. Sicherer Ablauf: Claude Desktop mit Cmd+Q beenden, `hfcalc einrichten` ausführen, Claude Desktop starten. Die Einrichtung selbst arbeitet richtig; das Verhalten liegt bei Claude Desktop.
- **Warum:** festgehalten, damit ein verschwundener Eintrag nicht als Fehler der Einrichtung gesucht wird.
- **Folgen:** Prüfanweisung AC-F12-4 an den Autor um diesen Ablauf ergänzt; dieselbe Anweisung gehört in die `README.md` (Schritt 16).
- **Nachgeführt in:** keine

### 2026-10-09 · Eingabespalte: Aufbau, Startwerte, Fehleranzeige und Barrierefreiheit
- **Typ:** Entscheidung
- **Auslöser:** Schritt 14 (F10, Teil 1), dazu Befunde aus der Prüfung im Browser.
- **Ergebnis:**
  - **Startwerte:** Pflichtfelder starten leer, optionale Felder mit den Werten aus `einstellungen.json` (AC-F10-2). Annahme: Der Aufschlag-Regler steht anfangs auf 25 %, weil ein Regler immer einen Wert zeigt (`// ASSUMPTION:` in `src/ui/formular.ts`). Solange Pflichtangaben fehlen, nennt der Ergebnisbereich sie in Spaltenreihenfolge als Hinweis, ohne Fehlermarkierung.
  - **Fehler am Feld** erscheinen, sobald ein Feld berührt wurde (verlassen oder in einem Menü gewählt); Fehler aus der Kombination (zum Beispiel Cliplänge zu lang für das Modell) erscheinen sofort. Bei ungültigen Feldern zeigt der Ergebnisbereich nur die Meldungen, keine Zahlen (AC-F10-3).
  - **Modellwechsel** markiert nur das Modell als berührt und leert eine Auflösung, die das neue Modell nicht anbietet (Regressionstests nach Befund im Browser). Fehlt die Auflösung, heißt die Meldung „Wähle eine Auflösung.“
  - **Auflösung und Versuche** stehen untereinander statt nebeneinander wie in der Skizze von `docs/UI-RULES.md`, weil „Versuche pro Clip“ mit Plus und Minus neben der Auflösung in zwei Zeilen umbrach. Reglerwerte kurz („25 %“, „6 h“), damit der Griff den Text nicht durchschneidet.
  - **Beschriftungen:** Das `<label>` umfasst nur den Beschriftungstext, nicht Eingabe und Einheit; sonst bekam das Feld im Browser den Namen „Durchschnittliche Cliplänges“ oder gar den eingetippten Wert.
  - **Kontrast:** Meta-Chips im Modellwähler in `--color-text-secondary` statt `--color-font-secondary` (vorher 3,8–4,3 : 1, jetzt 5,8 : 1); Platzhalter in `--color-font-secondary` statt Browserfarbe (vorher 3,6, jetzt 4,8 : 1); „kein Preis hinterlegt“ als weiße Schrift auf `--color-state-warning-bg` statt gelber Schrift. Fokusring in Menüs nach innen versetzt, damit er nicht abgeschnitten wird.
  - **Gemeinsamer Kursablauf:** `src/laden/gemeinsam/kurs-ablauf.ts` enthält den Ablauf (manuell → aktueller Zwischenspeicher → EZB → offline); Node und Tauri liefern nur Lesen, Schreiben und Abruf. Die App rechnet sofort mit dem gespeicherten Kurs und aktualisiert nach dem Abruf (Entscheidung 13).
  - **Vorschauseite** `vorschau.html` mit `src/ui/vorschau.tsx`: dieselbe App mit den Startdaten und festem Kurs, nur für die Prüfung im Browser während der Entwicklung (`.claude/launch.json`, Konfiguration „vorschau“); sie ist nicht Teil des App-Builds.
  - **Fehlergrenzen** um Eingabespalte und Ergebnisbereich (Klassenkomponente, weil React sie nur so anbietet).
  - Schritt 14 umfasst rund 20 neue Dateien; das ergibt sich aus den acht geplanten Bausteinen, der Tauri-Ladeschicht und den Tests. Bausteine sind dafür in wenige Dateien gruppiert (felder, auswahl, schalter).
- **Warum:** kleinste Lösung für AC-F10-2, AC-F10-3, AC-F10-6 und AC-F8-5; die Abweichungen von Vorschau und Skizze folgen aus gemessener Lesbarkeit und Barrierefreiheit (docs/QUALITY.md, Stufe 3).
- **Folgen:** Schritt 15 ersetzt den vorläufigen Ergebnisbereich (nur oberste Antwort) durch Ergebniskarte und Reiter.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Projektstruktur `laden/`, `ui/`), `docs/UI-RULES.md` (Skizze, B8)

### 2026-10-09 · Ergebnisbereich: Ort der Hinweise, Reiter, Projekte in der App
- **Typ:** Entscheidung
- **Auslöser:** Schritt 15 (F10, Teil 2; F9 in der App). Der Rechenkern lieferte die allgemeinen Hinweise als eine ungeordnete Liste; die Oberfläche konnte sie nicht an die Stelle setzen, die sie betreffen (UI-RULES 0.8).
- **Ergebnis:**
  - **Datenmodell (vom Autor am 09.10.2026 freigegeben):** Jeder Hinweis in `result.notes` trägt `area` (`clips`, `storyboard`, `paths`, `rate`, `packages`, `passes`, `reach`), Hinweise zu genau einem Pass zusätzlich `passId`. Das Feld gilt für alle drei Bedienwege gleich; im Schema `placedNoteSchema` ist `area` optional, damit früher gespeicherte Projektdateien gültig bleiben. Der Kern setzt es immer (`calculate()` für Kurs, Pakete, Reichweite; `computeCredits` und `evaluatePasses` für ihre eigenen Hinweise).
  - **Anzeige-Rundung geteilt:** `formatDecimal`, `formatCredits`, `formatMoney` liegen jetzt in `src/kern/text.ts`; die Kommandozeile reicht sie über `src/cli/format.ts` weiter. So runden Oberfläche und Textausgabe gleich.
  - **Projekte gemeinsam:** Regeln für Liste, Lesen und Speichern liegen in `src/laden/gemeinsam/projekte-ablauf.ts` (Schnittstelle `ProjectIo`); Node (`nodeProjectIo`) und Tauri (`appProjectIo`) liefern nur Dateizugriffe. Die Meldungen der Kommandozeile sind unverändert.
  - **Ergebnisbereich:** Ergebniskarte mit Betrag, Satz, Begründung und „Ändert sich bei“, Preiskachel mit dem Bruttobetrag in Dollar; Radix Tabs im Pill-Stil mit Überblendung beim Wechsel; Produktionswege nach Video-Credits sortiert (günstigster zuerst, wie die Higgsfield-Pass-Karten), die gewählte Kombination mit Chip „deine Auswahl“; Pass-Karten mit Kurzurteil aus den Urteilen des Kerns („Lohnt sich“, „Lohnt sich nicht“, „Reicht nicht“, „Kein Preis hinterlegt“).
  - **Kurs-Hinweis:** in „Details“ nur offline, sonst wiederholt er die Wertzeile; ohne Kurs steht er oben bei der Antwort. Während des ersten Kursabrufs ohne gespeicherten Kurs steht oben „Der Wechselkurs wird abgerufen“ statt „kein Kurs“.
  - **Projekte in der App:** Projektwahl (Radix Select) liest die Liste bei jedem Öffnen neu (AC-F9-6); beschädigte Dateien stehen als Meldung im Menü. Speichern über Dialog mit Rückfrage beim Überschreiben, Fokus dann auf „Abbrechen“. Laden ersetzt alle Felder ohne Rückfrage und markiert sie als berührt, damit ein Projekt, das nicht mehr zu den Preisen passt, sofort auffällt. `Cmd+S`, `Cmd+1` bis `Cmd+3` nach UI-RULES §13.
  - **Rabatt-Prozentsatz im Formular:** `FormState.discountPercent` hält den Wert aus einem geladenen Projekt; vorher nahm das Formular immer den Standard und hätte einen über die Kommandozeile gespeicherten Rabatt von 30 % beim Laden verloren.
  - ASSUMPTION: Eine gespeicherte Dauer mit Sekundenbruchteil (nur über Kommandozeile oder MCP-Server möglich) wird beim Laden auf ganze Sekunden gerundet, mit Hinweis unter der Projektwahl (`inputsToForm` in `src/ui/formular.ts`).
  - **Befunde aus der Browser-Prüfung:** Datum im markierten Menüeintrag 4,17 : 1 → `.menu__hint` in `--color-text-secondary`; Hinweise hatten den Standardrand von `<p>` → `.note { margin: 0 }`; Begründungen auf der hervorgehobenen Karte in `--color-text-secondary`, weil `--color-font-secondary` auf dem grünen Verlauf unter 4,5 : 1 bliebe. Der deaktivierte Speichern-Knopf liegt bei 3,4 : 1; das ist zulässig, weil WCAG deaktivierte Bedienelemente ausnimmt und UI-RULES §6 die halbe Deckkraft verlangt.
  - Neue Tokens: `--width-price-tile`, `--width-dialog`.
  - Schritt 15 umfasst rund 15 geänderte und 8 neue Dateien; das folgt aus Ergebnis-Reitern, Projektdialog, gemeinsamer Projektschicht und Tests.
- **Warum:** kleinste Lösung für AC-F10-1, AC-F10-4, AC-F10-7 und AC-F9-6 mit Hinweisen an ihrem Ort; die gemeinsame Projektschicht verhindert, dass App und Kommandozeile beim Überschreiben verschieden entscheiden.
- **Folgen:** Die Prüfung von Speichern und Überschreiben in der echten Tauri-App (plugin-fs schreibt in `~/Higgsfield-Kalkulator/projekte`) bleibt als manuelle Prüfung beim Autor; der Fernzugriff auf die App wurde abgelehnt.
- **Nachgeführt in:** `docs/ARCHITECTURE.md` (Projektstruktur, Ergebnisfeld `notes`), `docs/UI-RULES.md` (Abschnitt A)

### 2026-10-25 · Bilder: Storyboard wahlweise, Bilder je Clip immer, einmalige Assets wahlweise
- **Typ:** Entscheidung
- **Auslöser:** Der Autor am 25.10.2026: Das Storyboard soll nur wahlweise dazukommen und beim Start aus sein; erst eingeschaltet soll nach seinem Bildmodell gefragt werden. Dafür braucht er immer das Bildmodell für die Lichtbilder und Referenzbilder, die für jeden Clip entstehen, und wahlweise die einmalig erzeugten Assets am Projektanfang mit eigenem Bildmodell und mehreren Anläufen pro Asset. Grundlage sollten die Zahlen aus einem Testfilm des Autors (früher „Die Route“) sein.
- **Ergebnis:**
  - **Zahlen aus einem Testfilm des Autors** (Versuchsliste des Testfilms, ausgewertet am 25.10.2026): 450 Lichtbilder und zusätzliche Bilder für 129 angenommene Clips, also 3,5 Bilder je Clip einschließlich Fehlversuchen; 96 % mit Seedream 5.0 Pro. 43 einmalige Assets, davon 16 zu Personen und 27 zu Orten, bei 5 Personen und 3 Orten. Rund 333 bezahlte Referenzbilder für diese 43 Assets, also knapp 8 Anläufe pro Asset (fast kostenlose Werkzeuge wie Soul Cast, Nachbearbeitung und Farbkorrektur nicht mitgezählt).
  - **Vom Autor entschieden** (Rückfrage am 25.10.2026): eine Zahl der Assets mit einem Durchschnitt von 8 Anläufen statt getrennter Anläufe nach Art; die Zahl der Assets leitet sich aus Personen und Orten ab (seine Idee: „3 Orte und 5 Personen = ca. 50 Assets“). Aus der Sortierung der 43 Assets folgt Personen × 3 + Orte × 9 (für den Testfilm des Autors 42). Seedream 5.0 Pro bleibt bei 3 Credits je Bild, obwohl beim Testfilm des Autors 2,5 Credits abgebucht wurden.
  - **Datenmodell:** `storyboardModelId` optional (fehlt = aus); neu `clipImageModelId` (Pflicht), `clipImagesPerClip` (optional) und `oneTimeAssets: { modelId, people?, locations?, attemptsPerAsset? }` (fehlt = aus). Im Ergebnis ersetzt `images` das Feld `storyboardCredits`; der Hinweisort `storyboard` heißt jetzt `images`. Rechnung in `src/kern/bilder.ts`; `totalCredits` addiert alle Bilder, Pass-Weg und Paketkauf ebenso.
  - **Reichweite:** Die einmaligen Assets gehen zuerst vom Credit-Stand ab, weil sie nicht mit der Filmlänge wachsen; der Rest verteilt sich auf Video, Storyboard und Bilder je Clip (`src/kern/rest.ts`, AC-F7-4).
  - **Standardwerte in `einstellungen.json`:** `clipImagesPerClip`, `attemptsPerAsset`, `assetsPerPerson`, `assetsPerLocation`, `assetPeople`, `assetLocations`. Im Schema mit `.default()`, damit der echte Datenordner `~/Higgsfield-Kalkulator` (am 09.10.2026 angelegt, ohne diese Felder) gültig bleibt; der Datenordner wurde nicht verändert, weil die Einrichtung ihn nie überschreibt.
  - **Oberfläche:** Pflichtfeld „Lichtbilder und Referenzbilder je Clip“ (Glas-Menü mit allen Bildmodellen) an der Stelle des bisherigen Storyboard-Felds; darunter zwei Kippschalter „Storyboard“ und „Einmalige Assets“, beide aus (`src/ui/views/BilderSchalter.tsx`). Eingeschaltet erscheinen Bildmodell bzw. Bildmodell, Personen, Orte und Anläufe. „Bilder je Clip“ steht in „Weitere Einstellungen“ und zählt im Zähler „geändert“ mit. Im Reiter „Details“ eine eigene Gruppe „Bilder (in keinem Pass enthalten)“ mit Annahme-Hinweis zur Herleitung der Assets. Fehler zu `oneTimeAssets.people` usw. stehen am genauen Feld (`byField` in `src/ui/bewertung.ts` prüft zuerst den vollen Pfad).
  - **Kommandozeile:** `--bildmodell` Pflicht statt `--storyboard`; `--storyboard <id>` und `--assets <id>` schalten ein, dazu `--personen`, `--orte`, `--anlaeufe`, `--bilder-je-clip`. MCP-Server: Anweisung und Feldbeschreibungen entsprechend.
  - **Standardbeispiel und Kriterien:** Storyboard aus, Bilder je Clip mit Seedream 5.0 Pro; ergibt 374,63 € statt 346,53 € (5.625 Video + 315 Bilder = 5.940 Credits, 3.940 fehlen, ein 4.000er-Paket für 340 $ netto). Geändert: AC-F2-3, AC-F5-4 (Wortlaut), AC-F5-6, AC-F6-5, AC-F7-1, AC-F7-2, AC-F10-6; neu: AC-F2-8, AC-F2-9, AC-F2-10, AC-F7-4, AC-F10-8. Die Kriterien wurden geändert, weil der Autor die Anforderung geändert hat, nicht um sie an den Code anzupassen.
  - Projektdateien mit dem alten Ergebnisfeld `storyboardCredits` oder ohne `clipImageModelId` sind nach dieser Änderung ungültig und erscheinen mit Meldung in der Projektliste. Im echten Datenordner gab es am 25.10.2026 noch keine Projekte.
  - Umfang: rund 20 geänderte und 3 neue Dateien (`src/kern/bilder.ts`, `src/ui/views/BilderSchalter.tsx`, `tests/kern/bilder.test.ts`); vor dem Bau gemeldet.
- **Warum:** Storyboard und Assets sind nicht in jedem Projekt nötig (mitten im Projekt sind die Assets meist schon fertig); die Bilder je Clip fallen dagegen immer an und wurden bisher nicht gerechnet. Verworfen: getrennte Anläufe für Figuren, Orte und Gegenstände (genauer, aber mehr Felder; Wahl des Autors) und ein eigenes `enabled`-Feld je Posten (doppelte Wahrheit neben dem Bildmodell).
- **Folgen:** Die installierte Kommandozeile und der MCP-Server in `~/.local/` laufen noch mit dem alten Stand, bis `pnpm install:local` erneut läuft. Die Anleitung im echten Datenordner (`~/Higgsfield-Kalkulator/CLAUDE.md`) nennt die neuen Felder erst, wenn der Autor sie übernimmt.
- **Nachgeführt in:** `docs/SPEC.md` (Standardbeispiel, F2, F5, F6, F7, F10, Entscheidungen 15 bis 18), `docs/ARCHITECTURE.md` (Struktur, Bildmodelle, Einstellungen, Eingaben, Ergebnis, Beziehungen, Optionen), `docs/UI-RULES.md` (Leitbild, Skizze, Abschnitt A, B1, B2, B6, B10, §16), `docs/BUILD-PLAN.md` (Stand, Prüfpunkt Schritt 16), `daten-vorlage/CLAUDE.md`

### 2026-10-25 · Einrichtung schrieb die Zeile in `~/.zshrc` nicht, wenn sie aus Claude Code lief
- **Typ:** Fix
- **Symptom:** Nach `pnpm install:local` meldete die Einrichtung „~/.local/bin ist schon im PATH“; im Terminal des Autors kam bei `hfcalc einrichten` dann „command not found: hfcalc“.
- **Tatsächliche Ursache:** Der Schritt „PATH“ in `src/cli/einrichten.ts` prüfte den PATH des aufrufenden Prozesses. Claude Code bringt `~/.local/bin` in seinem eigenen PATH mit, die `~/.zshrc` des Autors aber nicht. Die markierte Zeile wurde deshalb nie geschrieben.
- **Ergebnis:** Der Schritt prüft nur noch `~/.zshrc` (`ensureZshrcPath`, schreibt die markierte Zeile nur, wenn sie fehlt). Neu installiert am 25.10.2026; die Zeile steht jetzt in `~/.zshrc` (Sicherung `~/.zshrc.bak-2026-10-25T10-00-01`), eine frische zsh findet `hfcalc`.
- **Regressionstest:** `AC-F11-5 die Zeile in ~/.zshrc entsteht auch, wenn der aufrufende Prozess ~/.local/bin schon im PATH hat` in `tests/cli/einrichten.test.ts`.
- **Folgen:** Bestätigt außerdem den Eintrag „Claude Desktop überschreibt seine Konfiguration“: Zwischen zwei Installationen im Abstand von vier Minuten hatte Claude Desktop den Eintrag erneut entfernt. Der Autor arbeitet nicht im Terminal, sondern startet die App aus dem Finder; die Kommandozeile ist für ihn nur der Weg zum MCP-Eintrag.
- **Nachgeführt in:** keine weiteren Dokumente (Verhalten laut `docs/ARCHITECTURE.md` „Einträge durch `hfcalc einrichten`“ war schon so beschrieben)

### 2026-10-25 · Startwerte, Dauer-Regler, Credit-Stand live, Schalter-Boxen
- **Typ:** Entscheidung
- **Auslöser:** Der Autor am 25.10.2026: Rechts darf nie ein leeres Ergebnis stehen, auch nicht beim ersten Öffnen. Die Dauer will er über einen stufenlosen Regler bis 15 Minuten einstellen, zusätzlich eintippen; Vorbelegungen 10:00, Seedance 2.5, 480p, Versuche aus einem Testfilm des Autors, Seedream 5.0 Pro; Storyboard mit Seedream 5.0 Flash, Assets mit Seedream 5.0 Pro. Den Credit-Stand will er live aus seinem Higgsfield-Konto, von Hand überschreibbar. Storyboard und Assets sollen eingeschaltet je eine Box mit feinen Trennlinien sein. Er startet die App aus dem Finder, nicht aus dem Terminal.
- **Ergebnis:**
  - **Startwerte:** `startValues` in `einstellungen.json` (Schema mit `.default()` für ältere Datenordner); `initialForm` in `src/ui/formular.ts` übernimmt sie. Versuche pro Clip: 3, weil ein Testfilm des Autors 381 Video-Generierungen (ohne technische Tests und 1080p-Fertigstellungen) für 129 angenommene Clips brauchte (2,95). Credit-Stand-Startwert 0, bis der Live-Stand da ist.
  - **Dauer-Regler:** `BlockSlider` hat zwei neue Angaben, `scaleLabel` (Skala in Minuten, Werte in Sekunden) und `showLabel` (keine doppelte Überschrift unter „Noch offen“). Regler 1 bis 900 s in 1-s-Schritten; das Feld bleibt die Quelle, der Regler zeigt höchstens 15:00.
  - **Credit-Stand live:** eigener Tauri-Befehl `higgsfield_credits` (Rust, nur Standardbibliothek und das schon vorhandene `serde_json`, kein neues Paket). Er ruft die angemeldete Higgsfield-Kommandozeile (`@higgsfield/cli` 1.1.24, `higgsfield account status --json`) auf; die Zugangsdaten liest nur diese Kommandozeile, die App sieht sie nie. Abgerundet auf ganze Credits, weil `creditBalance` ganzzahlig ist und der Kalkulator nie mit nicht vorhandenen Credits rechnen soll. Herkunft im Formular (`creditOrigin`: start, live, manual, project); der erste Abruf ersetzt nur den Startwert, „Live-Stand übernehmen“ ersetzt auch eine eigene Eingabe. Verworfen: die Higgsfield-Schnittstelle direkt mit dem Token aus `~/.config/higgsfield/credentials.json` aufrufen (Zugangsdaten in der App, Schnittstelle nicht dokumentiert) und `@tauri-apps/plugin-shell` (neue Abhängigkeit für einen einzigen festen Aufruf).
  - **Schalter-Boxen:** `ToggleRow` mit `grouped` rendert `<section class="switch-group">` mit eigenem Namen; Einstellungen darin ohne eigene Fläche, Linie `--color-white-8`, Fokusring nach innen.
  - **Fix nebenbei:** Wurde die Auflösung durch einen Modellwechsel geleert, meldete Radix Select ein leeres `onValueChange`, und das Feld galt als berührt und zeigte sofort einen Fehler; der leere Wert wird jetzt ignoriert (`src/ui/views/Eingabespalte.tsx`). Regressionstest: „Regression: nach der Modellwahl meldet die geleerte, nie berührte Auflösung keinen Fehler“. Vorher fiel das nicht auf, weil die Auflösung anfangs leer war.
  - Neue Kriterien AC-F10-9, AC-F10-10, AC-F10-11; geändert AC-F10-6 und AC-F10-8 (`tests/ui/startwerte.test.tsx`, `tests/ui/eingabespalte.test.tsx`).
  - Umfang: rund 15 geänderte und 5 neue Dateien (`src-tauri/src/lib.rs` ersetzt, `src/laden/tauri/credits.ts`, `src/laden/gemeinsam/credits.ts`, `src/ui/creditstand.ts`, `src/ui/views/CreditStand.tsx`, `tests/ui/startwerte.test.tsx`).
- **Warum:** Der Autor will die App öffnen und sofort eine Zahl sehen; leere Pflichtfelder zwangen ihn bisher, sieben Felder auszufüllen, bevor überhaupt etwas erschien.
- **Folgen:** Der Live-Abruf braucht die angemeldete Higgsfield-Kommandozeile. Läuft deren Anmeldung ab, steht der Grund unter dem Feld; neu anmelden geht nur im Terminal (`higgsfield auth login`). Der Prüfpunkt von Schritt 16 (Standardbeispiel 374,63 €) gilt weiter, weil er mit ausdrücklich eingetragenen Werten rechnet.
- **Nachgeführt in:** `docs/SPEC.md` (AC-F10-6, AC-F10-8 bis AC-F10-11, Entscheidungen 19 bis 22), `docs/ARCHITECTURE.md` (Struktur, Einstellungen, Tauri), `docs/UI-RULES.md` (Skizze, Abschnitt A), `docs/BUILD-PLAN.md` (Stand), `daten-vorlage/CLAUDE.md`

### 2026-10-25 · Ergebnis auf deine Auswahl, Kaufplan, Akkordeons, Paketpreise vom 25.10.2026
- **Typ:** Entscheidung
- **Auslöser:** Der Autor am 25.10.2026 zum Bildschirmfoto der App: Oben stand „Seedance 2.0 Enhanced Fast … mit dem Pass … 304,60 €“, obwohl er Seedance 2.5 gewählt hatte. Video- und Bildmodell sind für ihn bewusste Entscheidungen. Der Block oben enthielt zu viel Text. Er will brutto groß, netto und Credits klein und konkret sehen, welche Credit-Pakete er kaufen muss, oben und bei jeder Option. Dazu schickte er die aktuellen Paketpreise aus dem Kauf-Fenster.
- **Ergebnis:**
  - **Gesamtempfehlung = deine Auswahl** (`recommendOverall` in `src/kern/empfehlung.ts`): verglichen werden nur der Credit-Weg der gewählten Kombination und erreichbare Pässe, die das gewählte Modell in mindestens der gewählten Auflösung abdecken (je Pass und abgedecktem Modell eine Option). Ist ein anderer Weg günstiger, steht das als Hinweis in `overall.notes` (Kommandozeile, MCP), oben in der App nicht. SPEC Entscheidung 14 und die Zeile „Deine Auswahl“ sind überholt.
  - **Kaufplan** (`src/kern/kaufplan.ts`, `Plan`): Pakete, Pass, Credits, brutto und netto in Euro und Dollar; im Ergebnis an `paths[]`, `passes[]` und `recommendations.overall`. Netto wird aus dem Bruttopassspreis zurückgerechnet (÷ 1,19), Pakete aus ihren Nettopreisen. Die Rangfolge der Optionen nutzt jetzt die Pläne.
  - **Oberfläche:** Ergebniskarte nur noch mit Auswahl, Bruttobetrag, Netto, Credits und Paket-Chips (`Answer` in `src/ui/views/Ergebnisbereich.tsx`). Produktionswege und Pässe als Akkordeon-Zeilen (`OptionAccordion`, natives `<details>`), sortiert nach Kosten; aufgeklappt Begründung, Schwelle und Kaufplan (`src/ui/views/Kaufplan.tsx`). `RecommendationCard`, `OptionRow` und ihre Stile entfernt.
  - **Paketpreise vom 25.10.2026** in `daten-vorlage/preise/pakete.json` und im echten Datenordner `~/Higgsfield-Kalkulator/preise/pakete.json` (atomar geschrieben, dort Git-Commit `9fe2985`; der alte Stand ist der Commit davor, eine Kopie liegt zusätzlich im temporären Ordner des Systems). Rabattpreise gestiegen (zum Beispiel 1.000 Credits 56 $ statt 49 $), 7.000, 9.000 und 11.000 Credits jetzt mit Preis. Die Testdaten behalten die Preise vom 09.10.2026, weil die Prüfwerte der Spezifikation darauf beruhen; der Test „Testdaten = Startdaten“ nimmt `pakete.json` deshalb aus.
  - **Befund aus der Browser-Prüfung:** Beschriftungen der Wertzeilen auf der grün hervorgehobenen Akkordeon-Zeile lagen bei 3,8 : 1 → `--color-text-secondary` wie bei der früheren Empfehlungskarte.
  - Kriterien: geändert AC-F6-5, AC-F10-4, AC-F10-7; neu AC-F6-7, AC-F10-12.
- **Warum:** Die Zahl oben soll beantworten, was der Film des Autors mit seinen Entscheidungen kostet und was er dafür kaufen muss; Alternativen sind eine Ebene tiefer.
- **Folgen:** Die App rechnet die Pakete standardmäßig mit dem regulären Preis (durchgestrichen im Kauf-Fenster), weil `packagePriceLevel` in `einstellungen.json` auf „regular“ steht. Was Higgsfield heute tatsächlich verlangt, ist der Rabattpreis; umstellen lässt sich das unter „Weitere Einstellungen“ oder dauerhaft in `einstellungen.json` (offene Frage an den Autor).
- **Nachgeführt in:** `docs/SPEC.md` (AC-F6-5, AC-F6-7, AC-F10-4, AC-F10-7, AC-F10-12, Entscheidungen 14, 23, 24), `docs/ARCHITECTURE.md` (Ergebnis), `docs/UI-RULES.md` (Leitbild, Skizze, Abschnitt A, B12 bis B14), `docs/BUILD-PLAN.md` (Stand)

### 2026-10-25 · Pässe ausgebaut, Pakettabelle brutto, Preis-Leistungs-Ranking, Fix „Auflösung springt“
- **Typ:** Entscheidung und Fix
- **Auslöser:** Der Autor am 25.10.2026: immer die günstigste Kaufvariante prüfen (zum Beispiel Einzelpakete gegen ein großes Paket), Paketpreise möglichst live aus Higgsfield mit der Datenbank als Ersatz, alle Euro-Preise brutto (nur oben klein netto), Pakete als dezente Tabelle, Unlimited-Pässe vorläufig ganz raus (als Sicherung behalten), Vergleichsliste nach Preis-Leistung mit Überschrift. Dazu der Fehler: Beim Ändern der Versuche änderte sich manchmal die Auflösung im Ergebnis.
- **Ergebnis:**
  - **Günstigste Kaufvariante:** Die Paketsuche (`cheapestCombination` in `src/kern/pakete.ts`) prüfte schon alle Mengen bis Fehlbetrag + größtes Paket, also auch ein einzelnes größeres Paket. Neu liefert sie die Preise je Paket, das günstigste Einzelpaket zum Vergleich (`singlePackage`) und das Stand-Datum der Preise (`pricesAsOf`). Test AC-F3-8 mit den Preisen vom 25.10.2026.
  - **Paketpreise live:** nicht möglich. Die Higgsfield-Kommandozeile (`@higgsfield/cli` 1.1.24) hat nur `account status` und `account transactions`; Higgsfields MCP-Werkzeug `show_plans_and_credits` öffnet ein Verkaufsfenster mit vier Paketgrößen und ist für die App nicht erreichbar. Der Autor hat entschieden: Datenbank mit sichtbarem Stand. Die inoffizielle Schnittstelle der Website mit seinem Anmelde-Token wurde verworfen (bricht ohne Vorwarnung, Zugangsdaten in der App).
  - **Rabattpreis als Standard** (ASSUMPTION, geringe Auswirkung, unter „Weitere Einstellungen“ umschaltbar): `packagePriceLevel: "discounted"` in den Startdaten und im echten Datenordner (Commit `58ba3cd`), weil der Autor die wechselnden Rabatte als die echten Preise meint. Die Testdaten bleiben auf „regular“, weil die Prüfwerte darauf beruhen; der Test „Testdaten = Startdaten“ vergleicht `einstellungen.json` deshalb ohne dieses Feld.
  - **Pakettabelle:** `Plan.packages` mit `unitGross` und `lineGross`, `PaketTabelle` in `src/ui/views/Kaufplan.tsx` (natives `<table>` mit `<caption>`, `<thead>`, `<tfoot>`), oben und in jeder aufgeklappten Zeile. Netto steht nur noch oben klein; Details und Kommandozeile zeigen brutto.
  - **Pässe ausgebaut:** `src/kern/paesse.ts`, `empfehlung-pass.ts`, `dauer.ts`, ihre Tests und die Dateien `paesse.json` und `generierungsdauer.json` in Startdaten und Testdaten entfernt; Eingaben ohne `passPriceLevel` und `netHoursPerDay`; Ergebnis ohne `passes[]` und `recommendations.passes`; Kommandozeile ohne `--passpreise` und `--stunden`; Oberfläche ohne Reiter „Pässe“ und ohne die beiden Felder. Vorher wurde der vollständige Stand als `backup/unlimited-paesse-stand-2026-10-25.tar.gz` gesichert (`src/`, `tests/`, `daten-vorlage/`, vier Dokumente; 220 grüne Tests), mit Anleitung in `backup/LIESMICH.md`. Im echten Datenordner bleiben die beiden Dateien liegen; `settingsFileSchema` duldet `passPriceLevel` und `netHoursPerDay` weiter als optionale Felder.
  - **Preis-Leistung:** neue Datei `preise/qualitaet.json` statt der Pass-Dateien (im echten Datenordner neu angelegt, nichts überschrieben; die installierte Kommandozeile liest sie nicht und läuft deshalb weiter). `src/kern/preisleistung.ts` rechnet Punkte und Kosten je Punkt; Grundlage sind Kaufpläne ohne Abzug des Credit-Stands (`fullPlans`), weil sonst Wege, die das Guthaben fast deckt, fast nichts kosten und die Reihenfolge verzerren — das fiel beim ersten Prüfwert auf (65,56 € statt 252,88 € für den ganzen Film). `recommendations.bestValue` ist die Empfehlung der Liste; `productionPath` (günstigster Weg nach Credits je Sekunde) bleibt für Kommandozeile und MCP-Server.
  - **Fix „Auflösung springt“:** Symptom: Beim Ändern der Versuche wechselte oben die Auflösung, etwa von 480p auf 720p. Ursache: Die Zahl oben durfte einen Pass für das gewählte Modell wählen, und Pässe wurden in ihrer Höchstauflösung (720p) gerechnet; ab einer bestimmten Versuchszahl war der Pass günstiger als die Pakete. Mit dem Ausbau der Pässe rechnet die Zahl oben nur noch den Credit-Weg der Auswahl. Regressionstest: „AC-F6-8 Regression: die Versuche ändern nie Modell oder Auflösung der Zahl oben“.
  - Kriterien: neu AC-F3-8, AC-F6-8, AC-F10-13; geändert AC-F10-2, AC-F10-12; F5 ausgesetzt; SPEC Entscheidungen 25 bis 28.
- **Warum:** Der Autor will nachvollziehen, wie sich die Kosten zusammensetzen, und die Liste soll Qualität gegen Preis abwägen statt nur den billigsten Weg zu zeigen.
- **Folgen:** Kommandozeile und MCP-Server in `~/.local/` laufen mit dem Stand von heute Morgen, bis `pnpm install:local` erneut läuft. Die Qualitätsfaktoren sind eine Einschätzung, keine Messung; sie lassen sich in `qualitaet.json` ändern.
- **Nachgeführt in:** `docs/SPEC.md` (F3, F5, F6, F10, Entscheidungen 9, 25 bis 28), `docs/ARCHITECTURE.md` (Datenmodell, Einstellungen, Eingaben, Ergebnis), `docs/UI-RULES.md` (Abschnitt A, §13), `docs/BUILD-PLAN.md` (Stand), `daten-vorlage/CLAUDE.md`, `backup/LIESMICH.md`

### 2026-10-25 · Gesamtkalkulation mehrerer Projekte, Differenz zur Auswahl, Liste ohne Rahmen
- **Typ:** Entscheidung und Fix
- **Auslöser:** Der Autor am 25.10.2026: mehrere gespeicherte Kalkulationen auswählen und summieren, der Higgsfield-Kontostand nur einmal und nur in der Summe. Kurz darauf: in der Vergleichsliste neben dem Preis den Unterschied zu seiner Auswahl, keine Rahmen um Zahlen, nur die grüne Box behält einen Rahmen. Dazwischen die Frage, ob „720p genauso teuer wie Draft + 1080p“ ein Fehler sei: Nein, bei genau 4 Versuchen kosten beide 28 Credits je Sekunde (RECHENREGELN 4.4, AC-F6-4).
- **Ergebnis:**
  - **Vom Autor entschieden** (Rückfrage am 25.10.2026): mit heutigen Preisen neu rechnen, nur in der App, letzte Auswahl im Datenordner merken.
  - **Rechenkern:** `calculateTotal` in `src/kern/gesamt.ts` ruft für jedes Projekt `calculate()` mit Credit-Stand 0 und summiert; `planForCredits` aus `src/kern/kaufplan.ts` (aus `creditPlan` herausgelöst) deckt Summe minus Kontostand. Die Regel „calculate() ist die einzige Einstiegsstelle“ in `CLAUDE.md` ist entsprechend präzisiert. Paketpreisstand: der aus `einstellungen.json`.
  - **Datenordner:** `gesamtkalkulation.json` mit `{ projects }` (Schema `totalSelectionSchema`), gelesen und geschrieben über `src/laden/gemeinsam/gesamt-auswahl.ts` und die vorhandene Projektablage.
  - **Oberfläche:** Umschalter „Einzelprojekt | Gesamtkalkulation“ oben in der Eingabespalte; `src/ui/gesamt.ts` hält Projekte, Auswahl und Kontostand; `GesamtSpalte.tsx` und `GesamtErgebnis.tsx`. `CreditStand` ist jetzt ein allgemeines Feld für beide Ansichten. Der erste Live-Abruf füllt beide Startwerte; „Live-Stand übernehmen“ wirkt nur in der offenen Ansicht.
  - **Differenz zur Auswahl:** `paths[].differenceToSelection` im Rechenkern (brutto, je Währung); die Liste zeigt „+…/−… € zu deiner Auswahl“ unter dem Preis. Die Preiskachel mit Rahmen (`PriceTile`) ist entfernt.
  - **Fix:** `nodeProjectIo.dataDirExists` warf bei fehlendem Datenordner einen Fehler statt `false` zu liefern; beim Speichern von Projekten fiel das nicht auf, weil der Fehler dort abgefangen wird. Regressionstest: „AC-F15-7 ohne Datenordner wird nichts angelegt“.
  - **Fix:** Beim Einfügen der neuen Preisstile in `akkordeon.css` traf eine Textersetzung zweimal; dadurch waren alle Pfeile der Akkordeons gedreht, als wären sie aufgeklappt. Im Browser gefunden und behoben.
  - **Befund aus der Browser-Prüfung:** Die Einheit im Credit-Feld lag auf der Hover-Fläche bei 4,497 : 1 → `.setting__unit` in `--color-text-secondary`.
  - Kriterien: neu F15 (AC-F15-1 bis AC-F15-9) und AC-F10-14; SPEC Entscheidungen 29 und 30.
- **Warum:** Der Autor plant mehrere Filme parallel und will wissen, was er insgesamt nachkaufen muss, ohne sein Guthaben mehrfach zu zählen.
- **Folgen:** Kommandozeile und MCP-Server kennen die Gesamtkalkulation nicht (bewusst); die Differenz zur Auswahl steht dort im JSON (`differenceToSelection`), sobald sie neu installiert sind.
- **Nachgeführt in:** `docs/SPEC.md` (F15, AC-F10-14, Entscheidungen 29 und 30), `docs/ARCHITECTURE.md` (Laufzeit-Orte, Ergebnis, Gesamtkalkulation), `docs/UI-RULES.md` (Abschnitt A), `docs/BUILD-PLAN.md` (Stand), `CLAUDE.md` (Einstiegsstelle)

### 2026-10-25 · Vollständige Bewegung nach dem Prototyp „Angebotsrechner“, Differenz-Schild am Preis
- **Typ:** Entscheidung (Abweichung von UI-RULES §11 alt und QUALITY Stufe 1)
- **Auslöser:** Der Autor am 25.10.2026: Der Kalkulator soll vollständig animiert werden, nach den Animationsprinzipien seiner Prototypen im Projekt KI-Film-Angebotsrechner (`05_Design/02_Prototypen/261023_Angebotsrechner`). Kurz danach: Bei jeder Änderung soll neben dem Preis kurz die Differenz zur Zahl erscheinen, die vorher dastand, schnell einblenden, nach einer Sekunde langsam ausblenden.
- **Ergebnis:**
  - **Prinzipien aus dem Prototyp** (`angebotsrechner_ki_film.html`, Abschnitte „Bewegung“, „Aufbau-Regie“, „Akkordeons“, Funktionen `zaehle`, `regie`, `klappeAuf`, `zeigeInd`): Flächen ziehen sich treppenartig auf, danach ihre Elemente einzeln; Zahlen zählen; gleitende Markierung in Umschaltern; Akkordeons klappen weich auf, ihr Inhalt erscheint gestaffelt; Drücken gibt nach, Schalterknopf dehnt sich und federt; Zeilen heben sich beim Darüberfahren; langsam wandernder Schimmer hinter dem Preis. Kurven und Zeiten unverändert aus dem Prototyp übernommen, als Token in `tokens.css`. Regeln in `docs/UI-RULES.md` §11 neu gefasst.
  - **Bewusst nicht übernommen:** zunächst das weiche Scrollen mit Nachlauf (macOS gibt schon selbst Schwung; am selben Tag auf Wunsch des Autors doch eingebaut, siehe unten) und der Puls auf geänderten Beträgen beim Ziehen am Regler (er würde bei jedem Schritt neu starten); der Puls sitzt nur am Zähler „… geändert“.
  - **Aufgehoben:** UI-RULES §11 Regel 1 alt („keine Einblend-Choreografie, kein Stagger“) und der Satz „Zahlen im Ergebnis werden ohne Animation ersetzt“; QUALITY Stufe 1 erlaubt zusätzlich `clip-path`, `filter`, `height` und `width` für die genannten Fälle.
  - **Code:** neues Modul `src/ui/bewegung/` (aufbau, Zahl, zahl, hooks, Einblender, zeit, bewegung.css). Höhen beim Auf- und Zuklappen über die Web Animations API statt `::details-content` und `interpolate-size`, weil unklar ist, ob WebKit in der Tauri-App Letzteres kann; das native `<details>` bleibt für Tastatur und Screenreader.
  - **Zahlen:** Zwischenbilder werden mit big.js gebildet, das letzte Bild ist exakt der Anzeigetext aus `calculate()` (`zwischenText`). Weil die Ergebniskarte `aria-live` ist, liegt der zählende Text in einem für Screenreader verborgenen Element, der fertige in einer unsichtbaren Kopie.
  - **Differenz-Schild:** `grossChange` in `src/kern/waehrung.ts` rechnet „jetzt minus vorher“ mit big.js, weil die Oberfläche kein Geld rechnen darf. `src/ui/views/DifferenzSchild.tsx` zeigt es an der Ergebniskarte und an der Gesamtkalkulation; rot für teurer, grün für billiger, Schrift weiß (Statusfarben nur als Fläche, UI-RULES §2). Für Screenreader verborgen, weil die Karte den neuen Betrag ohnehin ansagt. Nach dem Ausblenden wird es entfernt.
  - **Fix während der Browser-Prüfung:** Die Pfeile der Vergleichszeilen sind SVG; die Aufbau-Regie startete nur HTML-Elemente, die Pfeile blieben unsichtbar. Behoben (`Teil = HTMLElement | SVGElement` in `aufbau.ts`).
  - **Fix während der Browser-Prüfung:** Radix Tabs setzt den Inhalt eines neuen Reiters erst in einem zweiten Durchgang ein; das Staffeln lief davor ins Leere. Es läuft jetzt im nächsten Bildaufbau (`requestAnimationFrame`), der vor dem ersten sichtbaren Bild kommt.
  - Neue Kriterien AC-F10-15 und AC-F10-16 (`tests/ui/bewegung.test.tsx`); jsdom hat keine Bewegung, deshalb laufen alle bestehenden Oberflächentests unverändert.
  - `.claude/launch.json`: zweite Vorschau „vorschau-2“ auf Port 1430, weil 1420 von einer anderen Sitzung belegt war.
- **Warum:** Der Autor will, dass sich der Kalkulator so lebendig anfühlt wie seine Prototypen, und bei jeder Änderung sofort sehen, um wie viel der Preis sich bewegt hat.
- **Folgen:** Am selben Tag neu gebaut und in der echten App (WebKit) geprüft: Zählen, Differenz-Schild und Akkordeon laufen wie in der Vorschau. Fenster im Hintergrund zeichnet macOS nicht neu; dort bleiben Bewegungen stehen, bis das Fenster wieder vorne ist. Beim Öffnen dauert der Aufbau bis zum letzten Element gut eine Sekunde.
- **Nachgeführt in:** `docs/UI-RULES.md` (§11, B11, B13a), `docs/QUALITY.md` (Stufe 1), `docs/SPEC.md` (AC-F10-15, AC-F10-16), `docs/ARCHITECTURE.md` (Struktur, kern/waehrung), `docs/BUILD-PLAN.md` (Stand)

### 2026-10-25 · Scrollen mit Nachlauf wie im Prototyp
- **Typ:** Entscheidung
- **Auslöser:** Der Autor am 25.10.2026, nachdem die Bewegung eingebaut war: Er will auch den Nachlauf beim Scrollen aus den HTML-Prototypen. Ich hatte ihn zuerst weggelassen, weil macOS Trackpad und Maus schon selbst Schwung gibt; der Autor will den Effekt trotzdem.
- **Ergebnis:** `src/ui/bewegung/scrollen.ts` (`nachlaufen`, `naechsterStand`) überträgt die Funktion aus dem Prototyp auf die beiden Scrollbereiche der App, Eingabespalte und Ergebnisbereich (im Prototyp scrollt die ganze Seite). Faktor 0,075 des Restwegs je Bild wie im Prototyp, als Token `--scroll-nachlauf`; anders als im Prototyp auf die Bildrate umgerechnet, weil der Prototyp auf einem 120-Hz-Bildschirm doppelt so schnell nachliefe. Mausrad-Schritte in Zeilen über `--scroll-zeile`. Zoomen, waagerechtes Wischen, Tastatur, Scrollbalken, Touch und „Bewegung reduzieren“ bleiben ohne Nachlauf. Neues Kriterium AC-F10-17 mit Tests der Schrittfunktion; in der Vorschau gemessen: ein Schritt um 400 Pixel gleitet in gut einer Sekunde ans Ziel.
- **Warum:** Der Autor will, dass sich die App wie seine Prototypen anfühlt.
- **Folgen:** Auf dem Trackpad addiert sich der Nachlauf zum Schwung, den macOS selbst liefert; das Scrollen läuft dadurch länger aus als in anderen Programmen. Ist das zu träge, lässt sich `--scroll-nachlauf` erhöhen (zum Beispiel 0,15 = schneller am Ziel).
- **Nachgeführt in:** `docs/UI-RULES.md` (§11 Regel 13), `docs/SPEC.md` (AC-F10-17), `docs/ARCHITECTURE.md` (Struktur), `docs/BUILD-PLAN.md` (Stand)

### 2026-10-25 · Öffentliche Fassung „Cost Calculator for Higgsfield“ für GitHub
- **Typ:** Entscheidung
- **Auslöser:** Der Autor will den Kalkulator der Higgsfield-Community zur Verfügung stellen, damit andere ihn mit Claude Code nachbauen und anpassen können. Entschieden am 25.10.2026: fertiges Projekt als GitHub-Vorlage, MIT-Lizenz, Name `cost-calculator-for-higgsfield`, README englisch und der Rest deutsch, dieses Protokoll anonymisiert.
- **Ergebnis:**
  - Higgsfield-Eigentum entfernt: Ordner `design-system/` (Logos, Original-Icons und Bilder von higgsfield.ai) und `docs/referenz/` (Vorschau mit Original-Icons, gemessene Website-Werte). Die acht Icons in `src/ui/components/Icon.tsx` und das App-Icon sind eigene Zeichnungen. Die gemessenen Farb- und Maßwerte in `tokens.css` bleiben, sie sind Zahlen und keine Grafiken.
  - Schriften Inter und Space Grotesk bleiben, mit ihren Lizenztexten (SIL Open Font License 1.1) in `src/assets/fonts/`.
  - App heißt „Cost Calculator for Higgsfield“, Kennung `io.github.cost-calculator-for-higgsfield`, Installationsort `/Applications/`. Technische Namen bleiben, damit Dokumente und Tests stimmen: Datenordner `~/Higgsfield-Kalkulator/`, Befehl `hfcalc`, MCP-Server `higgsfield-kalkulator`.
  - Persönliche Angaben ersetzt: Name durch „der Autor“ (Entstehungsgeschichte) oder „der Nutzer“ (Spezifikation, Regeln, Code), Filmname durch „Testfilm des Autors“, eigene Pfade durch allgemeine.
  - Nicht enthalten: `backup/` mit dem ausgebauten Stand der Unlimited-Pässe.
- **Warum:** Logos, Icons und Bilder gehören Higgsfield und dürfen nicht weiterverbreitet werden; ohne Lizenz dürften andere den Code nicht verändern.
- **Folgen:** Die Preise haben den Stand 25.10.2026 und müssen von jedem Nutzer gepflegt werden (`daten-vorlage/CLAUDE.md`).
