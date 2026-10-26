# Build-Plan — Higgsfield-Kostenkalkulator

## Stand

- **Aktueller Schritt:** Schritt 16 — Integration, Gestaltung und lokale Installation
- **Zuletzt abgeschlossen:** Schritt 15 — Oberfläche, Ergebnisbereich (09.10.2026)
- **Zwischenänderung 25.10.2026 (außerhalb der Schritte, auf Wunsch des Autors):** Storyboard wahlweise und beim Start aus, Lichtbilder und Referenzbilder je Clip immer mit Pflicht-Bildmodell, einmalige Assets wahlweise aus Personen und Orten (SPEC Entscheidungen 15 bis 18, `docs/DECISIONS.md`). Das Standardbeispiel ergibt seither 374,63 € statt 346,53 €; 214 Tests grün. Am selben Tag mit `pnpm install:local` neu installiert; installierte Kommandozeile (374,63 €) und installierter MCP-Server (Pflichtfeld `clipImageModelId`, Assets 42 / 336 / 1.008) geprüft. Zweite Zwischenänderung am selben Tag: alle Felder vorbelegt, Dauer-Regler bis 15 Minuten, Credit-Stand live aus Higgsfield, Storyboard und Assets je in einer Box (SPEC Entscheidungen 19 bis 22); 219 Tests grün; App neu gebaut. Dritte Zwischenänderung: oben immer die Kosten deiner Auswahl mit Kaufplan, Listen als Akkordeon, Paketpreise vom 25.10.2026 (SPEC Entscheidungen 23 und 24); 220 Tests grün. Vierte Zwischenänderung: Pässe ausgebaut (Sicherung in `backup/`), Pakettabelle brutto mit Vergleichspaket, Paketpreise mit Stand und standardmäßig zum Rabattpreis, Vergleichsliste nach Preis-Leistung, Fehler „Auflösung springt bei den Versuchen“ behoben (SPEC Entscheidungen 25 bis 28); 207 Tests grün. Danach mit `pnpm install:local` neu installiert; installierte Kommandozeile und MCP-Server liefern dasselbe Ergebnis (375,73 €, Pakettabelle, keine Pässe). Fünfte Zwischenänderung: Gesamtkalkulation mehrerer Projekte (SPEC F15), Unterschied zu deiner Auswahl in der Vergleichsliste, Preise ohne Rahmen; 220 Tests grün. Sechste Zwischenänderung: vollständige Bewegung nach dem Prototyp „Angebotsrechner“ und Differenz-Schild am Preis (UI-RULES §11 neu, AC-F10-15, AC-F10-16, `docs/DECISIONS.md`); 227 Tests grün, in der Browser-Vorschau geprüft. Danach mit `pnpm tauri build` neu gebaut und erstmals in den Programmordner des Autors kopiert; Start ohne Warnung, in der echten App (WebKit) geprüft: Zählen, Differenz-Schild („+21,26 €“ / „−21,26 €“) und Akkordeon laufen. Hinweis: Eine zweite Instanz lief aus dem Build-Ordner `src-tauri/target/release/bundle/macos/`; vermutlich zeigt das Dock-Symbol noch dorthin. Danach Scrollen mit Nachlauf wie im Prototyp (AC-F10-17); 229 Tests grün. Siebte Zwischenänderung am 26.10.2026: Projekte löschen über den Papierkorb, umbenennen und Änderungen direkt speichern (AC-F9-7 bis AC-F9-9), Credit-Bedarf als zweite große Zahl in der Ergebniskarte (AC-F10-18, SPEC Entscheidungen 31 und 32).
- **Blocker:** keiner · offen: manuelle Prüfungen AC-F12-4 (Claude Desktop), AC-F10-5 (nur Tastatur) und Speichern/Überschreiben in der echten Tauri-App (AC-F9-1, AC-F9-3) durch den Autor

> Dieser Block wird nach jedem abgeschlossenen Schritt aktualisiert. Bei Widerspruch zwischen diesem Block und den Checkboxen unten gelten die **Checkboxen**.

## Schritte

Baue die App in dieser Reihenfolge. Jeder Schritt muss abgeschlossen und funktional sein, bevor der nächste beginnt. Feature-Nummern und Kriterien stehen in `docs/SPEC.md`.

### [x] Schritt 1: Projekt-Fundament
- [x] Versionen, Init-Befehle und Paketnamen gegen die offizielle Dokumentation prüfen; Abweichungen zur CLAUDE.md nach `docs/DECISIONS.md`
- [x] Projekt anlegen, ohne den Projektordner zu verlassen: hier im Projektordner `pnpm create tauri-app _geruest --template react-ts --manager pnpm --identifier io.github.cost-calculator-for-higgsfield -y` (`-y` beantwortet die Rückfragen des Assistenten mit den Vorgaben, weil Claude Code keine interaktiven Eingaben machen kann), dann den Inhalt von `_geruest/` eine Ebene nach oben kopieren, ohne `CLAUDE.md`, `docs/`, `design-system/`, `src/styles/tokens.css`, `.env.example` und `start-prompt.md` zu überschreiben; `_geruest/` sofort in `.gitignore` eintragen und danach nur nach Rückfrage beim Autor löschen
- [x] Abhängigkeiten laut CLAUDE.md installieren, `pnpm tauri add fs` und `pnpm tauri add http`; das Plugin `opener` aus der Vorlage entfernen (Paket, Rust-Abhängigkeit, Eintrag in `lib.rs` und in den Berechtigungen), weil die App keine Links oder Dateien öffnet
- [x] TypeScript strict mit `erasableSyntaxOnly`, damit Node 24 die Dateien in `src/kern`, `src/schema`, `src/laden/node`, `src/cli` und `src/mcp` direkt ausführen kann
- [x] Biome und Vitest einrichten; Skripte `test`, `lint`, `check`
- [x] Ordnerstruktur nach `docs/ARCHITECTURE.md` anlegen; `design-system/` liegt bereits im Projekt (nur prüfen, nicht verändern; die Datei `design-system/CLAUDE-CODE-ANLEITUNG.md` und `design-system/tokens.css` gelten hier nicht, maßgeblich sind `CLAUDE.md` und `src/styles/tokens.css`); Schriften nach `src/assets/fonts/` kopieren
- [x] `src/styles/tokens.css` aus dem Bauplan übernehmen und in `global.css` einbinden
- [x] Fenster: dunkle Titelleiste (`titleBarStyle: "Overlay"`, `hiddenTitle: true`), Mindestgröße 1100 × 720, Hintergrund `--color-surface`, Ad-hoc-Signatur (`signingIdentity: "-"`)
- [x] App-Icon: `src-tauri/icons/app-icon.svg` von Hand anlegen — 1024 × 1024, schwarze Fläche mit macOS-typischer Eckenrundung, darin der Pfad aus `design-system/assets/Logos/higgsfield-glyph-lime.svg` zentriert mit etwa 20 % Rand; danach `pnpm tauri icon src-tauri/icons/app-icon.svg`, das alle Größen erzeugt
- [x] Leeres Grundlayout: linke Spalte und Ergebnisbereich als Platzhalter

✅ Prüfpunkt: `pnpm tauri dev` öffnet ein dunkles Fenster mit beiden Bereichen und dem Lime-App-Icon im Dock; `pnpm test` und `pnpm lint` laufen grün (leere Suite erlaubt)
📝 Verifiziert am 09.10.2026: Versionen per `npm view` gegen das npm-Verzeichnis und Init-Optionen per `create-tauri-app --help` geprüft (alle aktuell, Details in `docs/DECISIONS.md`). `pnpm tauri dev` gestartet: Rust-Build ohne Fehler, Bildschirmfoto zeigt das dunkle Fenster 1280 × 800 mit Overlay-Titelleiste, Eingabespalte links und Ergebnisbereich rechts sowie das Lime-Icon im Dock. `pnpm test` grün (1 Test: Grundlayout mit Eingabespalte und Ergebnisbereich, jsdom), `pnpm lint` und `pnpm check` (tsc + Biome) ohne Fehler und Warnungen. Kontrast Platzhaltertext 5,5 : 1; Suchlauf nach Hex-, px-, ms- und rgba-Literalen außerhalb von `tokens.css` ohne Treffer.

### [x] Schritt 2: Preisdatenbasis (F8)
- [x] Zod-Schemas in `src/schema/` für `Price`, alle Preisdateien und Referenzen zwischen ihnen
- [x] `daten-vorlage/preise/*.json` aus `docs/RECHENREGELN.md` Abschnitt 3 und den Entscheidungen 1 und 2 in `docs/SPEC.md` befüllen; jeder Preis mit `asOf` und `source`; unbekannte Werte als `unknown`
- [x] `daten-vorlage/CLAUDE.md` mit den Pflegeregeln (Stand und Quelle Pflicht, nie 0, nach jeder Änderung `hfcalc daten pruefen`, danach Git-Commit mit Grund)
- [x] Ladeschicht `src/laden/node/daten.ts`: Datenordner finden (`HFCALC_DATA` oder Standardort), alle Dateien laden und prüfen, Fehler mit Datei und Feld
- [x] Erste Befehle `hfcalc preise` und `hfcalc daten pruefen`

✅ Prüfpunkt: AC-F8-1, AC-F8-2, AC-F8-3, AC-F8-4, AC-F8-5, AC-F8-6 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 22 Tests in `tests/laden/daten.test.ts` und `tests/cli/preise.test.ts` grün, jeweils gegen eine frische Kopie der Testdaten in einem temporären Ordner mit temporärem HOME. AC-F8-1: `hfcalc preise` als echter Prozess, jeder der Preise aus vier Dateien erscheint mit Wert, Einheit, Stand und Quelle. AC-F8-2: „4,5“ als Text und 4,5 als kaputtes JSON melden Datei und Feld. AC-F8-3: fehlendes Datum, fehlende und leere Quelle. AC-F8-4: Preis 0 scheitert und empfiehlt „unknown“. AC-F8-5: neues Modell wird ohne Code-Änderung geladen und gelistet (Auswahl und Vergleich folgen in Schritt 4 und 14, siehe `docs/DECISIONS.md`). AC-F8-6: Exitcode 0 bei gültigen, 2 bei ungültigen Daten und fehlendem Ordner. Zusätzlich: Verweise zwischen Dateien, doppelte Kennungen, Startdaten gegen die Werte aus RECHENREGELN 3 und SPEC Entscheidungen 1 und 2. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 3: Clipanzahl und abgerechnete Sekunden (F1)
- [x] `src/kern/clips.ts` mit Dezimalrechnung über big.js
- [x] Eingabe-Schema für den offenen Umfang (genau eines von Dauer MM:SS und Clipanzahl), Aufschlag, Cliplänge

✅ Prüfpunkt: AC-F1-1, AC-F1-2, AC-F1-3, AC-F1-4, AC-F1-5, AC-F1-6 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 13 Tests in `tests/kern/clips.test.ts` grün, Modelle aus den Testdaten. AC-F1-1: 225 s und 30 Clips. AC-F1-2: 216 s ÷ 7 s = 30,86 → 31 Clips. AC-F1-3 (neue Fassung): 20 offene Clips + 25 % = 25 Clips und 187,5 s; 7 Clips + 25 % = 8,75 → 9. AC-F1-4: Cliplänge 3 s wird mit 4 s abgerechnet, Hinweis nennt 4 s. AC-F1-5: Seedance 2.0 Standard mit 16 s abgelehnt mit Modellname und 15 s, Seedance 2.5 mit 16 s und 20 s erlaubt. AC-F1-6: „3:75“, leer, Text und 0:00 abgelehnt; „3:00“, „3“, „180s“ erkannt; weder Dauer noch Clips sowie beides zugleich abgelehnt. Zahlen exakt als big.js-Text verglichen. Zusätzlich `src/kern/index.ts` direkt mit Node ausgeführt. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 4: Credit-Bedarf je Produktionsweg (F2)
- [x] `src/kern/credits.ts`: alle Wege aus `docs/RECHENREGELN.md` 4.4 und 4.4a, Draft-Fertigstellung, Rabatt, Ton, Storyboard
- [x] Unzulässige und unbekannte Kombinationen
- [x] Zusätzlicher Test `AC-F8-5`: ein neues Videomodell in den Testdaten erscheint ohne Code-Änderung als Produktionsweg

✅ Prüfpunkt: AC-F2-1, AC-F2-2, AC-F2-3, AC-F2-4, AC-F2-5, AC-F2-6, AC-F2-7 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 15 Tests in `tests/kern/credits.test.ts` grün, Preise aus den Testdaten, Vergleich als exakter big.js-Text. AC-F2-1 und AC-F2-2: alle 30 Werte der Prüftabellen 4.4 und 4.4a für 1 bis 5 Versuche. AC-F2-3: Storyboard 30 Clips = 30 Credits (Flash) und 180 (Pro). AC-F2-4: mit 25 % Rabatt 1080p = 12 × v, Draft = 3 × v + 12, 720p, 2.0 Standard und Enhanced Fast unverändert. AC-F2-5: 2.0 Standard 720p mit 50 % Ton = 6,75, mit 100 % = 9, Seedance 2.5 unverändert. AC-F2-6: Mini 720p ohne Zahl und ohne Summe, Wege ohne Preis am Ende, gewählte Kombination ohne Preis meldet „kein Preis hinterlegt“. AC-F2-7: Seedance 2.5 in 4K nennt „480p, 720p, 1080p“, Draft nur 1080p, unbekanntes Modell und Bildmodell ohne Storyboard abgelehnt. Zusätzlich: Standardbeispiel 5.625 Video-Credits und 5.655 mit Storyboard (passt zu 3.655 fehlenden Credits in AC-F3-2), Anzeigeregel für 480p, Mindestlänge 4 s, Modelle mit zu kurzer Höchstlänge mit Hinweis ausgelassen, AC-F8-5 als Produktionsweg. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 5: Wechselkurs (F4)
- [x] `src/laden/node/kurs.ts`: Abruf mit Zeitlimit, Zwischenspeicher, Vorrang des manuellen Kurses
- [x] Tests mit einem lokalen Test-Server statt der echten Zentralbank

✅ Prüfpunkt: AC-F4-1, AC-F4-2, AC-F4-3, AC-F4-4, AC-F4-5, AC-F4-6 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 14 Tests in `tests/laden/kurs.test.ts` grün gegen einen lokalen `node:http`-Server im echten SDMX-JSON-Format der Zentralbank (Format vorher einmal an der echten Schnittstelle abgelesen), mit festem Datum statt Uhr und temporärem Datenordner. AC-F4-1: Kurs 1,0834 vom 08.10.2026, Hinweis nennt beides, Zwischenspeicher geschrieben. AC-F4-2: ohne Verbindung gespeicherter Kurs mit Datum und „Offline“. AC-F4-3: ohne alles kein Kurs und Hinweis „in Dollar“ (Ergebnis in Dollar folgt mit `calculate()` in Schritt 9). AC-F4-4: manueller Kurs hat Vorrang, null Abrufe. AC-F4-5: Zeitlimit aus den Einstellungen = 5 s; Verhalten bei Überschreitung mit 0,1 s Zeitlimit gegen 2 s Verzögerung geprüft (wie offline, mit und ohne gespeicherten Kurs). AC-F4-6: 108 $ ÷ 1,08 = 100 €, 374,255 $ = 346,53 €. Zusätzlich: Kurs vom aktuellen Bankarbeitstag ohne Abruf (auch am Sonntag mit Freitagskurs), älterer Kurs wird ersetzt, Fehlerstatus 500 wie offline, beschädigter Zwischenspeicher gemeldet und ersetzt, ohne Datenordner wird nichts angelegt. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 6: Euro-Kosten über Credit-Pakete (F3)
- [x] `src/kern/pakete.ts`: günstigste Kombination (exakte Suche), Gleichstandsregel, Steuer vor Umrechnung, Euro-Preise ohne Umrechnung

✅ Prüfpunkt: AC-F3-1, AC-F3-2, AC-F3-3, AC-F3-4, AC-F3-5, AC-F3-6, AC-F3-7 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 14 Tests in `tests/kern/pakete.test.ts` grün, Pakete aus den Testdaten, Werte als exakter big.js-Text. AC-F3-1: Credit-Stand 6.000 für 5.655 Bedarf → 0 €, 345 Credits übrig mit Hinweis „gedeckt“. AC-F3-2: 3.655 fehlend → 2.000 + 1.000 + 500 + 200 für 314,5 $. AC-F3-3: 374,255 $ brutto (angezeigt 374,26 $) → 346,53 €. AC-F3-4: weniger Pakete gewinnt (400 statt 2 × 200), danach kleinerer Überschuss (300 statt 500). AC-F3-5: 45 Credits übrig, Hinweis nennt 90 Tage. AC-F3-6: Rabattpreise 182 $ netto, 216,58 $ brutto, 200,54 €. AC-F3-7: 80 € netto → 95,2 € bei Kurs 1,08 und 2,0 gleich. Zusätzlich: gemischte Währungen in Euro verglichen, ohne Kurs Dollar vollständig und Euro-Pakete mit Hinweis ausgeschlossen, Pakete ohne Preis mit Hinweis, Fehlbetrag 2.027,5 → 2.000 + 100 mit 72,5 übrig, 1.000.000 Credits exakt. Laufzeit gemessen: Standardbeispiel 0,4–1,5 ms, 1.000.000 Credits rund 12 ms. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 7: Unlimited-Pässe (F5)
- [x] `src/kern/paesse.ts`: Gewinnschwelle, Generierungsdauer nach `docs/RECHENREGELN.md` 3.7, Erreichbarkeit, Vergleich mit dem Bedarf des Films, Storyboard über Credits, Hinweise

✅ Prüfpunkt: AC-F5-1, AC-F5-2, AC-F5-3, AC-F5-4, AC-F5-5, AC-F5-6, AC-F5-7 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 12 Tests in `tests/kern/paesse.test.ts` grün, Daten aus den Testdaten, Kurs 1,08, Werte als exakter big.js-Text. AC-F5-1: alle 24 Werte (vier 1-Tages-Pässe × Credits, Sekunden, Versuche, regulär und mit Rabattpreisen), vorher mit Dezimalrechnung nachgerechnet. AC-F5-2: 90 Versuche (720p) und 72 (1080p) je Tag, Spanne bis 102 und 85. AC-F5-3: 90 nötige Versuche in 1080p → 1-Tages-Pass „reicht nicht“. AC-F5-4: 3-Tage-Pass 595,00 €, Draft-Weg 526,82 €, „lohnt sich nicht“. AC-F5-5: mit Draft 90 direkte Versuche, Gewinnschwelle mit 16 Credits je Sekunde, Hinweis. AC-F5-6: Storyboard über Credits (652,715 $ bzw. 604,37 € ohne Credit-Stand). AC-F5-7: Hinweis „nicht bestätigt“ und Annahme bei allen drei Seedance-2.0-Pässen. Zusätzlich: 3-Tage-Pass bis 720p lohnt sich bei 5 Versuchen, Pass ohne Preis nicht bewertet, ohne Kurs Urteil in Dollar, Clips über 15 s. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 8: Empfehlungen (F6)
- [x] `src/kern/empfehlung.ts`: Antworten auf die Fragen 1 bis 5 aus `docs/RECHENREGELN.md` 5.1 als Satz, Begründung und Schwelle; Gesamtempfehlung nur für die gewählte Auflösung

✅ Prüfpunkt: AC-F6-1, AC-F6-2, AC-F6-3, AC-F6-4, AC-F6-5, AC-F6-6 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 13 Tests in `tests/kern/empfehlung.test.ts` grün, Daten aus den Testdaten, Kurs 1,08. AC-F6-1: 3 Versuche, Ziel 1080p → „Draft plus 1080p“, Schwelle wörtlich „bei 2 oder weniger Versuchen ist Seedance 2.0 Standard günstiger“. AC-F6-2: 1 Versuch → „Seedance 2.0 Standard in 1080p“, Schwelle „ab 3 Versuchen …“. AC-F6-3: Hinweis auf den fehlenden Referenz-Workflow nur bei Seedance 2.0. AC-F6-4: 4 Versuche → Gleichstand „Draft plus 1080p“ und „720p direkt“ mit je 28, Draft wegen 1080p vorgezogen. AC-F6-5: Gesamtempfehlung wörtlich „Seedance 2.5 Draft plus 1080p über Credit-Pakete, 346,53 €“, günstigere 720p-Kombination nur als Hinweis. AC-F6-6: Draft ohne Preis wird nie empfohlen und erscheint unter „Ohne Preis“. Zusätzlich: Pass-Empfehlungen mit Vergleich, Erreichbarkeit und Gewinnschwelle, ein Pass gewinnt die Gesamtempfehlung, ohne Kurs in Dollar, gedeckter Credit-Stand. Alle Sätze für das Standardbeispiel einmal vollständig gegengelesen. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 9: Einstieg mitten im Projekt und Restguthaben (F7)
- [x] `src/kern/rest.ts` und `calculate()` als einzige Einstiegsstelle des Kerns
- [x] Zusätzliche Tests `AC-F4-1` und `AC-F4-3` über `calculate()`: Ergebnis nennt Kurs und Datum; ohne Kurs erscheinen alle Credit- und Dollar-Werte, die Euro-Werte fehlen mit Meldung, Empfehlungen vergleichen in Dollar

✅ Prüfpunkt: AC-F7-1, AC-F7-2 erfüllt und getestet (AC-F7-3 entfällt seit 09.10.2026)
📝 Verifiziert am 09.10.2026: 10 Tests in `tests/kern/berechnung.test.ts` grün, rohe Eingaben durch `calculate()` mit Testdaten. AC-F7-1: 800 Credits, 12 offene Clips, 25 %, ohne Dauer und ohne Projekt → 15 Clips, 2.827,5 Credits Bedarf, 2.027,5 fehlend. AC-F7-2: Reichweite 79,6 s (exakt 79,5755…) und 10 ganze Clips, mit Hinweis. AC-F4-1: Ergebnis enthält Kurs 1,0834 vom 08.10.2026 und nennt beides. AC-F4-3: ohne Kurs alle Credit- und Dollar-Werte, Euro-Felder `null`, Gesamtempfehlung in Dollar (374,26 $) mit Hinweis. Zusätzlich: Standardbeispiel vollständig (346,53 €, Satz der Gesamtempfehlung), Ergebnis ist reines JSON, Standardwerte aus `einstellungen.json`, ungültige Eingabe mit Feld, unzulässige Kombination, gewählte Kombination ohne Preis, Leistung unter 50 ms (gemessen: Median 1,2 ms; 60 Minuten mit 20 Versuchen rund 30 ms). `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 10: Kommandozeile (F11)
- [x] `hfcalc rechnen` mit allen Optionen, Textausgabe und `--json`, `--help`, Exitcodes

✅ Prüfpunkt: AC-F11-1, AC-F11-3, AC-F11-4 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 10 Tests in `tests/cli/rechnen.test.ts` grün, `hfcalc` als echter Prozess mit temporärem HOME und Datenordner, fester Kurs statt Netzabruf. AC-F11-1: `rechnen --json` liefert das vollständige Ergebnis (englische Feldnamen, deutsche Sätze) und ist identisch mit `calculate()`. AC-F11-3: fehlendes `--modell`, alle Pflichtwerte fehlend und weder `--dauer` noch `--clips` → Exitcode 1 mit Nennung der Option. AC-F11-4: `hfcalc --help` zeigt alle 18 Optionen mit erlaubten Werten und Standardwerten (aus den Daten gelesen). Zusätzlich: Textausgabe beginnt mit der einen Antwort (346,53 €), `--clips 12` ergibt 15 Clips, ungültige Werte nennen die Option, unbekannte Option auf Deutsch, ungültige Daten → Exitcode 2. Textausgabe für das Standardbeispiel einmal vollständig gegengelesen. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 11: Projekte (F9)
- [x] `src/laden/node/projekte.ts` und die Befehle `hfcalc projekte`, `hfcalc projekt zeigen`, `hfcalc projekt speichern`

✅ Prüfpunkt: AC-F9-1, AC-F9-2, AC-F9-3, AC-F9-4 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 15 Tests grün, davon 10 in `tests/laden/projekte.test.ts` gegen echte temporäre Ordner und 5 in `tests/cli/projekte.test.ts` als echte Prozesse. AC-F9-1: gespeichert, in einem neuen Aufruf gelistet, Eingaben identisch. AC-F9-2: Datei enthält Eingaben, vollständiges Ergebnis (gleich `calculate()`) und Preisstand 2026-10-09. AC-F9-3: gleicher Name und gleicher Dateiname bei anderer Schreibweise ohne Bestätigung abgelehnt, Datei Byte für Byte unverändert, Exitcode 1; mit `--ueberschreiben` ersetzt, Anlagedatum erhalten. AC-F9-4: kaputtes JSON und fehlende Felder je eine Meldung, das gültige Projekt bleibt nutzbar. Zusätzlich: keine Zwischendatei bleibt liegen, ohne Datenordner wird nichts angelegt, unbekanntes Projekt verständlich gemeldet, Dateinamen aus Projektnamen. Neues `resultSchema`; ein Test prüft das echte Ergebnis dagegen, der Rechenkern prüft die Übereinstimmung beim Übersetzen. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 12: MCP-Server (F12)
- [x] `src/mcp/` mit fünf Werkzeugen, deutscher Server-Anweisung und Beschreibungen
- [x] Gleichheitstest Rechenkern · Kommandozeile · MCP-Server

✅ Prüfpunkt: AC-F12-1, AC-F12-2, AC-F12-3, AC-F11-2, AC-F9-5 erfüllt und getestet
📝 Verifiziert am 09.10.2026: 12 Tests grün über den echten MCP-Client des SDK gegen `node src/mcp/main.ts` (stdio) mit temporärem HOME und Datenordner. AC-F12-1: fünf Werkzeuge mit Beschreibung und Eingabeschema, Feldbeschreibungen und Server-Anweisung mit „Dollar je 1 Euro“. AC-F12-2 und AC-F11-2: Standardbeispiel und drei Grenzfälle (mitten im Projekt mit Clips; Rabatt, Ton und Rabattpreise; Auswahl ohne Preis mit Clips unter 4 s) ergeben über Rechenkern, `hfcalc rechnen --json` und `kosten_berechnen` zeichengleiches JSON. AC-F12-3: ungültiger Wert, fehlender Pflichtwert, unzulässige Kombination und unbekanntes Projekt nennen das Feld, danach rechnet der Server weiter. AC-F9-5: über die Kommandozeile gespeichertes Projekt kommt über `projekt_lesen` zeichengleich mit `hfcalc projekt zeigen --json`. Zusätzlich: `preise_lesen` gleich `hfcalc preise --json`, `projekt_speichern` überschreibt nur mit `overwrite: true`, Antwortzeit ohne Netz unter 500 ms. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 13: Einrichtung (F13)
- [x] `scripts/bundle-cli.ts` bündelt `hfcalc.mjs` und `mcp.mjs` mit Vite
- [x] `hfcalc einrichten`: Datenordner `~/Higgsfield-Kalkulator/` anlegen (nie überschreiben), dort `git init`, `.gitignore` mit `cache/` und erster Commit; Bündel kopieren, Startbefehl, PATH, drei MCP-Einträge mit Sicherungskopie und stabilem Node-Pfad — Ablauf genau nach `docs/ARCHITECTURE.md` „Einträge durch `hfcalc einrichten`“
- [x] Skript `pnpm install:local` = bündeln + `einrichten`
- [x] Tests gegen ein temporäres Home-Verzeichnis, nie gegen das echte

✅ Prüfpunkt: AC-F13-1, AC-F13-2, AC-F13-3, AC-F13-4, AC-F13-5, AC-F11-5 erfüllt und getestet; dazu Prüfanweisung für AC-F12-4 an den Autor: in Claude Desktop und in Codex nach den Kosten eines Beispielfilms fragen
📝 Verifiziert am 09.10.2026: 10 Tests in `tests/cli/einrichten.test.ts` grün; das Bündel wird im Test frisch gebaut, `hfcalc einrichten` läuft daraus gegen ein temporäres HOME mit einem protokollierenden Ersatzskript für `claude` und dem echten Git. AC-F13-1: Einträge in Claude Desktop, Codex und Claude Code (`mcp add --scope user …`); ohne `claude` steht der Befehl zum Nachholen in der Ausgabe. AC-F13-2: zweiter Lauf ohne doppelte Einträge (Desktop, Codex, `.zshrc`; bei Claude Code get → remove → add). AC-F13-3: fremde Einträge in allen vier Dateien unverändert, je genau eine Sicherungskopie mit dem alten Inhalt; ungültiges JSON bei Claude Desktop bleibt unangetastet und wird gemeldet. AC-F13-4: Startdaten Byte für Byte, vorhandener Datenordner unverändert. AC-F13-5: Git-Repository mit `.gitignore` (`cache/`) und genau einem Commit, Arbeitsstand sauber. AC-F11-5: nach Verschieben des Bündels laufen `~/.local/bin/hfcalc` und der installierte MCP-Server (fünf Werkzeuge) weiter. Echter Benutzerordner nach dem Testlauf geprüft: unberührt. Prüfanweisung zu AC-F12-4 an den Autor übergeben; der echte Lauf von `pnpm install:local` auf dem Mac des Autors wartet auf seine Freigabe. `pnpm lint` und `pnpm check` ohne Befund.

### [x] Schritt 14: Oberfläche, Eingabespalte (F10, Teil 1)
- [x] `src/laden/tauri/`: dieselben Ladefunktionen über plugin-fs und plugin-http
- [x] Bausteine nach `docs/UI-RULES.md`: Einstellungszeile, Zahlenfeld, Kacheln, Modellwähler, Menü, Pill-Reiter, Block-Regler, Kippschalter
- [x] Eingabespalte mit sieben Pflichtfeldern (darunter „Noch offen“ mit Umschalter Dauer/Clips) und zugeklapptem Bereich „Weitere Einstellungen“ mit Zähler der geänderten Felder
- [x] Validierung am Feld
- [x] Zusätzlicher Test `AC-F8-5`: ein neues Videomodell in den Testdaten erscheint ohne Code-Änderung im Modellwähler

✅ Prüfpunkt: AC-F10-2, AC-F10-3, AC-F10-6 erfüllt und getestet; Prüfanweisung für AC-F10-5 an den Autor: alle Felder nur mit der Tastatur durchgehen
📝 Verifiziert am 09.10.2026: 19 Tests in `tests/ui/eingabespalte.test.tsx` und `tests/ui/formular.test.ts` grün (jsdom, Testdaten statt Tauri). AC-F10-6: sieben Pflichtfelder außerhalb des geschlossenen `<details>`, optionale Felder darin, Zähler „0 geändert“ → „2 geändert“ → „1 geändert“. AC-F10-2: Rabatt-Schalter aus, beide Preisstände „Regulär“, Cliplänge „7,5“, Netto-Stunden 6. AC-F10-3: nach gültigem Standardbeispiel (346,53 €) „0“ Versuche → Feld markiert (`aria-invalid`), Meldung am Feld und im Ergebnisbereich, kein Euro-Betrag mehr; „3:75“ am Feld gemeldet. AC-F8-5: neues Modell im Modellwähler. Zwei Regressionstests (zu frühe Auflösungsmeldung, nicht angebotene Auflösung nach Modellwechsel). Im Browser (Vorschauseite): Standardbeispiel per Tastatur und Maus ausgefüllt → 346,53 €; Kontrast aller Texte gemessen (71 Texte inklusive offenem Modellwähler, Glas-Menü, Fehlerzustand, Platzhalter) alle ≥ 4,5 : 1 nach drei Korrekturen; kein Überlauf bei 1100 × 720; bei 375 px kein Überlauf, aber kein Platz für den Ergebnisbereich (in der App unerreichbar, Fenster mindestens 1100 px). In der echten Tauri-App: Preise aus `~/Higgsfield-Kalkulator` gelesen, Kurs 1,1206 vom 09.10.2026 über plugin-http geholt und in `cache/wechselkurs.json` gespeichert. `pnpm lint` und `pnpm check` ohne Befund. Prüfanweisung AC-F10-5 an den Autor übergeben.

### [x] Schritt 15: Oberfläche, Ergebnisbereich (F10, Teil 2)
- [x] Ergebniskarte mit Gesamtempfehlung oben, darunter Reiter „Produktionswege“, „Pässe“, „Details“
- [x] Hinweise an der passenden Stelle, Empfehlungskarten mit „Ändert sich bei“
- [x] Projekt speichern und laden in der App (Lime-Hauptaktion „Als Projekt speichern“, Rückfrage beim Überschreiben)
- [x] Projektliste bei jedem Öffnen des Projektmenüs neu aus dem Datenordner lesen (AC-F9-6)

✅ Prüfpunkt: AC-F10-1, AC-F10-4, AC-F10-7, AC-F9-6 erfüllt und getestet; AC-F9-1 und AC-F9-3 zusätzlich in der App geprüft
📝 Verifiziert am 09.10.2026: 15 neue Tests grün, davon 9 in `tests/ui/ergebnisbereich.test.tsx`, 5 in `tests/ui/projekte.test.tsx` (App-Komponente gegen einen echten temporären Datenordner) und 1 in `tests/kern/berechnung.test.ts`; gesamt 194 Tests grün. AC-F10-7: oben genau ein Betrag (346,53 €) und ein Satz, drei Reiter, immer nur einer sichtbar, Wechsel per Klick und Cmd+1 bis Cmd+3, „Deine Auswahl“ nur bei Abweichung (393,36 €), Hinweise an ihrem Ort (Feld `area`, vom Autor freigegeben). AC-F10-4: Gesamtempfehlung, Produktionsweg und jede der fünf Pass-Karten mit Satz, Begründung und „Ändert sich bei“. AC-F10-1: vier Änderungen in jsdom je unter 100 ms; im Browser 25–53 ms von der Eingabe bis zum neuen Betrag (Entwicklungsmodus). AC-F9-6: Projekt über den echten Prozess `hfcalc projekt speichern` angelegt, während die App offen war → erscheint beim nächsten Öffnen des Menüs und lädt (12 Clips, 800 Credits). AC-F9-1 in der App-Oberfläche: speichern, neu rendern, laden, erneut speichern → identische Eingaben. AC-F9-3 in der App-Oberfläche: gleicher Name → Rückfrage, Datei Byte für Byte unverändert bei Abbrechen, Überschreiben erhält `createdAt`. Zusätzlich AC-F9-4 im Menü, AC-F6-6 (eine Zeile „Ohne Preis“), AC-F4-3 und AC-F4-2 in der Anzeige. Im Browser (Vorschauseite, 1100 × 720): Standardbeispiel → 346,53 €, alle drei Reiter, Speicherdialog, Rückfrage, offenes Projektmenü (leer und gefüllt), Fehlerzustand; Kontrast aller Texte gemessen (bis 107 Texte je Zustand) nach zwei Korrekturen ohne Befund, außer dem deaktivierten Speichern-Knopf (3,4 : 1, von WCAG ausgenommen); kein Überlauf bei 1100 px; bei 375 px kein Seiten-Scroll, aber kein Platz für den Ergebnisbereich (in der App unerreichbar, Fenster mindestens 1100 px). Nicht geprüft: Speichern über plugin-fs in der echten Tauri-App, weil der Fernzugriff auf die App abgelehnt wurde; Prüfanweisung an den Autor übergeben. `pnpm lint` und `pnpm check` ohne Befund.

### [ ] Schritt 16: Integration, Gestaltung und lokale Installation
- [ ] Gesamte Oberfläche gegen `docs/UI-RULES.md` und `docs/referenz/kalkulator-bausteine-vorschau.html` abgleichen (F14)
- [ ] Leer-, Fehler- und Offline-Zustände überall
- [ ] `pnpm tauri build`, App nach `/Applications/` kopieren, Start ohne Warnung und ohne Datenschutz-Abfrage prüfen
- [ ] Kurze `README.md`: Installation, Befehle, Datenordner

✅ Prüfpunkt: Die gebaute App startet aus `/Applications/`, rechnet das Standardbeispiel aus `docs/SPEC.md` und zeigt 374,63 € bei manuellem Kurs 1,08 (bis 25.10.2026: 346,53 €, siehe SPEC Standardbeispiel); `hfcalc` liefert dieselbe Zahl
📝 Verifiziert am [Datum]: [wie geprüft]

### [ ] Schritt 17: Testabdeckung
- [ ] Jede AC-ID aus `docs/SPEC.md` hat mindestens einen Test; der Testname nennt die AC-ID
- [ ] `[manuell]`-Kriterien als Liste mit Prüfanweisung im Abschluss-Bericht

✅ Prüfpunkt: Alle Tests grün, keine AC-ID ohne Test; Liste der manuellen Prüfungen an den Autor übergeben
📝 Verifiziert am [Datum]: [wie geprüft]
