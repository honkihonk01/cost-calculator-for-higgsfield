# Teststrategie — Higgsfield-Kostenkalkulator

Risikobasiert, nicht nach Abdeckungsprozent. Getestet wird zuerst und am dichtesten, was beim Versagen am meisten schadet: eine falsche Kostenzahl oder überschriebene Daten.

## Prioritäten

1. **Rechenkern (Korrektheit absolut)** — test-first. Jede AC-ID aus F1 bis F7 als Unit-Test gegen die Prüfwerte in `docs/SPEC.md`, `docs/RECHENREGELN.md` 3.7, 4.4, 4.4a und 4.5. Grenz- und Gleichstandsfälle eingeschlossen (zum Beispiel 4 Versuche: Draft-Weg = 720p direkt).
2. **Datenverlust-Pfade** — test-first. Projekte speichern und überschreiben, atomares Schreiben, Einrichtung mit Sicherungskopien, „Datenordner nie überschreiben“.
3. **Persistenz und Ladeschicht** — Datenordner laden und prüfen, Zwischenspeicher des Kurses, Projektliste mit beschädigter Datei.
4. **Schnittstellen-Nähte** — Kommandozeile als echter Prozess, MCP-Server über den echten MCP-Client, Kursabruf gegen einen lokalen Test-Server, Gleichheitstest der drei Bedienwege.
5. **Oberfläche** — zuletzt und schmal: Komponententests für F10. Keine Rechenlogik in Komponenten, deshalb keine Rechenprüfung über die Oberfläche.

## Stack

| Ebene | Werkzeug | Naht |
|---|---|---|
| Unit (Kern) | Vitest | reine Funktionen, keine Mocks nötig |
| Integration (Laden, Projekte, Einrichtung) | Vitest + echte temporäre Ordner (`fs.mkdtemp`), `HFCALC_DATA` und ein temporäres `HOME` | echtes Dateisystem |
| Kursabruf | Vitest + lokaler `node:http`-Server, der Antworten, Verzögerung und Ausfall der Zentralbank nachstellt | Netz |
| Kommandozeile | Vitest + `node:child_process` (`node src/cli/main.ts …`) | Prozessgrenze, Exitcodes |
| MCP-Server | Vitest + `Client` aus `@modelcontextprotocol/sdk` über stdio gegen `node src/mcp/main.ts` | MCP-Protokoll |
| Oberfläche | Vitest + @testing-library/react + jsdom; Ladeschicht durch Testdaten ersetzt | Komponenten |
| Gebaute App | keine Automatisierung; Prüfanweisungen für `[manuell]`-Kriterien | — |

## Regeln

- **Kriterien-Kopplung:** Jede AC-ID aus `docs/SPEC.md` hat mindestens einen automatisierten Test, außer `[manuell]`-Kriterien. Der Testname beginnt mit der AC-ID.
- **Ebene nach Risiko:** Berechnung, Persistenz und Einrichtung auf Unit- oder Integrationsebene; die Oberfläche prüft nur Anzeige, Zustände und Bedienung.
- **Echte Ressourcen statt Mocks:** jeder Test bekommt einen frischen temporären Ordner und räumt ihn auf. Gemockt wird nur, was nicht herstellbar ist: die Zentralbank (lokaler Server) und die Uhr (Datum als Argument).
- **Nie gegen echte Orte:** Tests setzen `HOME` und `HFCALC_DATA` auf temporäre Ordner. Ein Test, der `~/Higgsfield-Kalkulator`, `~/.claude.json`, `~/.codex` oder `~/Library` berühren könnte, ist ein Fehler. Der Befehl `claude` wird in Tests durch ein kleines Ersatzskript im temporären `PATH` ersetzt, das seine Aufrufe protokolliert.
- **Gleichheitstest:** dieselben Eingaben (Standardbeispiel und drei Grenzfälle) durch `calculate()`, `hfcalc rechnen --json` und `kosten_berechnen`; die drei JSON-Ergebnisse sind textgleich (AC-F11-2, AC-F12-2).
- **Fixtures:** `tests/fixtures/daten/` ist eine Kopie von `daten-vorlage/` mit festem Stand-Datum. Tests verwenden immer den festen Kurs 1,08, außer sie prüfen den Kursabruf.
- **Regression zuerst:** Bei jedem Fehler erst einen roten Test, der ihn nachstellt, dann der Fix; Test-ID in `docs/DECISIONS.md`.
- **Deterministisch:** keine echte Zeit, kein echter Zufall, kein echtes Netz; Tests laufen parallel.
- **Rundung erst am Ende:** Prüfwerte werden gegen die exakten Dezimalwerte im Ergebnis verglichen (big.js-Text) oder gegen die gerundete Anzeige — nie gegen einen Zwischenwert, der schon gerundet wurde. Aufgerundet werden nur Gewinnschwellen und Clipanzahlen.
- **Leistung:** ein Test misst die Berechnungsdauer des Standardbeispiels (Grenze aus `docs/QUALITY.md`).

## Manuelle Prüfungen

Für `[manuell]`-Kriterien und die gebaute App gibt der jeweilige Build-Schritt der Nutzer eine kurze Prüfanweisung. Die Liste aller offenen manuellen Prüfungen steht im Abschlussbericht von Schritt 17.

## Test-Gate

Ein Schritt ist erst fertig, wenn:

- [ ] neue oder geänderte Logik Tests hat,
- [ ] jeder gefundene Fehler einen Regressionstest hat,
- [ ] alle Tests grün sind,
- [ ] `pnpm lint` und der TypeScript-Check ohne Warnungen laufen,
- [ ] die Tests isoliert und deterministisch sind,
- [ ] alle Akzeptanzkriterien des Schritts durch Tests abgedeckt und grün sind,
- [ ] am Ende festgehalten ist, was getestet ist und was bewusst nicht.
