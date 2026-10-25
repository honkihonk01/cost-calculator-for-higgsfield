# Abschluss-Checkliste vor der lokalen Installation — Higgsfield-Kostenkalkulator

Die App wird nicht veröffentlicht, sondern auf dem Mac des Autors installiert. Umfang deshalb: Installation, Sicherheit, Funktion.

## Installation

- [ ] `pnpm install:local` läuft ohne Fehler; `hfcalc --help` funktioniert in einem neuen Terminal-Fenster
- [ ] `hfcalc daten pruefen` endet mit Exitcode 0 im echten Datenordner `~/Higgsfield-Kalkulator/`
- [ ] Der Datenordner ist ein Git-Repository mit `.gitignore` (`cache/`) und einem ersten Commit der Startdaten
- [ ] Die drei MCP-Einträge stehen in Claude Code, in der Claude-Desktop-App und in `~/.codex/config.toml`; Sicherungskopien der vorherigen Dateien liegen daneben
- [ ] `pnpm tauri build` erzeugt die App; sie liegt in `/Applications/` und startet per Doppelklick ohne Warnung
- [ ] Weder die App noch `hfcalc` im Terminal noch Claude Desktop beim Aufruf des MCP-Servers zeigen eine macOS-Datenschutz-Abfrage („… möchte auf Dateien im Ordner ‚Dokumente‘ zugreifen“); erscheint doch eine, liegt der Datenordner falsch
- [ ] Nach einer Neuinstallation der App funktioniert der Zugriff auf Projekte weiterhin ohne Abfrage
- [ ] Das App-Icon ist die Lime-Schlaufe auf Schwarz und im Dock scharf
- [ ] Der Projektordner mit dem Code lässt sich verschieben, ohne dass `hfcalc` oder der MCP-Server ausfallen

## Sicherheit

- [ ] Keine Geheimnisse im Repository (`git grep` nach `key`, `token`, `secret`)
- [ ] `pnpm audit` ohne kritische Befunde
- [ ] Tauri-Berechtigungen nur für `$HOME/Higgsfield-Kalkulator/**` und `data-api.ecb.europa.eu`; kein `opener`-Plugin
- [ ] In der gebauten App gibt es kein Browser-Kontextmenü und keine Entwicklerwerkzeuge

## Funktion

- [ ] Standardbeispiel aus `docs/SPEC.md` in der App, mit `hfcalc` und über Claude Desktop gerechnet: drei identische Ergebnisse
- [ ] Ohne Internet: App und `hfcalc` rechnen mit dem gespeicherten Kurs und nennen dessen Datum
- [ ] Projekt speichern, App beenden, neu öffnen, Projekt laden: Eingaben identisch
- [ ] Überschreiben eines Projekts fragt nach
- [ ] Ein absichtlich kaputter Preis (zum Beispiel „4,5“) in einer Kopie des Datenordners wird mit Datei und Feld gemeldet
- [ ] Alle `[manuell]`-Kriterien aus `docs/SPEC.md` (AC-F10-5, AC-F12-4) vom Autor durchgeführt und im Build-Plan vermerkt
- [ ] Keine Ruckler beim Tippen; Ergebnis folgt jeder Eingabe sofort
