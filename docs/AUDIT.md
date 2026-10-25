# Code-Audit — Higgsfield-Kostenkalkulator

**Dieser Audit läuft in frischem Kontext:** in einer neuen Claude-Code-Session oder durch einen Subagenten ohne Build-Historie. Eingabe sind ausschließlich `CLAUDE.md`, der Ordner `docs/` und der Code — nicht der Gesprächsverlauf des Builds und nicht die Schritt-Zusammenfassungen. Fehlt eine Information, die nur im Verlauf stand, ist das selbst ein Befund: Sie gehörte in `docs/DECISIONS.md`.

Prüfe den gesamten Code gegen `docs/QUALITY.md` und das Test-Gate in `docs/TESTING.md`. Bewerte jede Kategorie mit ✅ bestanden · ⚠️ teilweise (was fehlt) · ❌ nicht bestanden (was falsch ist + Fix).

## Kategorie 0: Dokumenten-Drift

Vor allen Code-Prüfungen:

- Stimmt das Datenmodell in `docs/ARCHITECTURE.md` mit den Zod-Schemas und den Dateien in `daten-vorlage/` überein (Felder, Typen, Verweise)?
- Existieren alle dokumentierten Befehle, MCP-Werkzeuge und Laufzeit-Orte — und ist umgekehrt jeder Befehl und jedes Werkzeug im Code dokumentiert?
- Entspricht die Projektstruktur der Beschreibung?
- Stehen alle Umgebungsvariablen des Codes in `.env.example` und `docs/ARCHITECTURE.md`?
- Nennt `CLAUDE.md` die tatsächlich verwendeten Versionen (`package.json`, `Cargo.toml`)?
- Verletzt Code ein Akzeptanzkriterium, das unverändert in `docs/SPEC.md` steht?

Jede Abweichung ist 🔴. Korrektur: Dokument nachziehen, Eintrag in `docs/DECISIONS.md`.

## Kategorie 1: Kriterien-Abnahme

Jede AC-ID aus `docs/SPEC.md` als erfüllt / nicht erfüllt / nicht prüfbar markieren.

- Nicht erfüllt = 🔴.
- Erfüllt, aber ohne zugeordneten Test (Testname mit AC-ID) = 🟡.
- Nicht prüfbar = Mangel der Spezifikation, melden.
- `[manuell]`-Kriterien (AC-F10-5, AC-F12-4) gelten als offen bis zum Handdurchlauf und stehen als eigene Liste am Ende des Berichts.

## Kategorie 2: Stufe 1 aus `docs/QUALITY.md`

- Rechenkern rein? Suche nach `fs`, `fetch`, `Date`, `Math.random`, `process` in `src/kern/`.
- Rechnen alle Credit- und Geldwerte mit big.js? Suche nach `+`, `*`, `/`, `<` auf Zahlenwerten außerhalb von Anzeige-Formatierern.
- Wird `unknown` nirgends als 0 behandelt?
- Laufen alle drei Bedienwege ausschließlich über `calculate()`?
- Prüft jeder Eingang mit dem gemeinsamen Zod-Schema? Werden Daten mit Verweisen geprüft?
- Wird nur an den erlaubten Orten geschrieben, mit Sicherungskopie und atomar? Löscht die App irgendwo Dateien?
- Error Boundaries vorhanden? Jede Grenze nach außen mit Fehlerbehandlung?
- Tauri-Berechtigungen auf Datenordner und Zentralbank begrenzt?
- TypeScript strict, kein `any`, kein `console.log`, keine Datei über 300 Zeilen, Importe nur über `index.ts`, Biome ohne Warnungen?
- Gestaltungswerte: Suchlauf nach Hex-Farben, `px` und `rgba(` außerhalb von `src/styles/tokens.css`.

## Kategorie 3: Stufe 2 (LEICHT, Kern voll) und Stufe 3 (Accessibility Basis)

- Testtiefe wie in `docs/QUALITY.md` und `docs/TESTING.md` beschrieben? Gleichheitstest vorhanden und grün? Berechnungsdauer innerhalb der Grenze?
- Fehlermeldungen sagen, was zu tun ist?
- Tastaturbedienung, verknüpfte Beschriftungen, Kontraste, `aria-live`, Klickflächen?

## Kategorie 4: Oberfläche gegen `docs/UI-RULES.md`

- Leitbild (§0): sieben Pflichtfelder sichtbar, Rest eingeklappt mit Zähler; oben genau eine Antwort; ein Lime-Button; keine Tabellenwände außerhalb von „Details“; Einheiten an jeder Zahl.
- Aufbau (§A) und Bausteine (§B) wie beschrieben; Primitive nach §16; eigene Nachbauten mit `/* TODO: justify custom */` begründet?
- Bewegung nach §11: asymmetrisches Hover, Zeiten aus den Tokens, keine Einblend-Choreografie.
- Zustände: Hover, Fokus, Deaktiviert, Fehler, Leer, Laden, offline — ohne Layout-Sprünge.
- Kein horizontaler Scrollbalken bei 1100 × 720.

## Kategorie 5: Allgemeine Code-Qualität

- Ungenutzte Importe, Variablen, Abhängigkeiten (`pnpm dlx depcheck`)?
- Doppelte Codeblöcke über 10 Zeilen?
- Einheitliche Benennung nach `CLAUDE.md`?
- Hart codierte Werte, die in die Preisdaten oder Einstellungen gehören (Preise, Mehrwertsteuer, Verfallsfrist, Zeitlimit)?

## Nach dem Audit

Priorisierte Fix-Liste:

1. 🔴 KRITISCH: nicht erfüllte Kriterien, Drift, Stufe-1-Verletzungen — sofort beheben
2. 🟡 WICHTIG: Kriterien ohne Test, Stufe-2-Verletzungen — vor der Installation beheben
3. 🔵 EMPFOHLEN: Stufe 3 und allgemeine Verbesserungen
4. 💡 NICE-TO-HAVE: Feinschliff ohne Funktionsbezug

Behebe alle 🔴 und 🟡. Trage die Fix-Liste als eigenen Schritt mit Checkboxen am Ende von `docs/BUILD-PLAN.md` ein. Bewusst nicht behobene Befunde kommen mit Begründung nach `docs/DECISIONS.md`.

## UX-Abnahme (externe Skills)

Ab hier läuft die App — damit liegt erstmals Interaktionszugriff vor, die Voraussetzung für einen tiefen UX-Audit. Dieser Code-Audit deckt UX nicht ab und soll es auch nicht.

1. `ux-ui-expert`, Modus B Deep Audit — Zustand der einzelnen Ansichten: Hierarchie, Zustände, Kontrast, Icon-Bedeutung, Accessibility. Maßstab ist zusätzlich das Leitbild in `docs/UI-RULES.md` §0: Findet der Nutzer ohne Erklärung in unter einer Minute die Kosten seines Films?
2. `userflow-pruefung` — für die Abläufe „neuen Film rechnen und als Projekt speichern“, „gespeichertes Projekt öffnen und Rest des Films rechnen“ und „Projekt überschreiben“. Quellen für die Storys: `docs/SPEC.md` (mit Nicht-Zielen), `docs/DECISIONS.md`, `docs/BUILD-PLAN.md`.
3. Befunde beider Läufe kommen als **eine** Fix-Liste ans Ende von `docs/BUILD-PLAN.md`, mit denselben Markern (🔴/🟡/🔵/💡). Bewusst nicht behobene Befunde mit Begründung nach `docs/DECISIONS.md`.
