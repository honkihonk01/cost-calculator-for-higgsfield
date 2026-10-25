# Architektur — Higgsfield-Kostenkalkulator

Stand: 09.10.2026. Dieses Dokument beschreibt den aktuellen Zustand. Bei jeder Änderung an Datenmodell, Schnittstellen, Struktur oder Umgebungsvariablen wird der betroffene Abschnitt korrigiert (nicht ergänzt) und in `docs/DECISIONS.md` vermerkt.

## Grundprinzip

Ein Rechenkern aus reinen Funktionen (`src/kern/`). Er bekommt geprüfte Eingaben, geladene Preisdaten und einen Wechselkurs übergeben und gibt ein Ergebnis zurück. Er liest keine Dateien, ruft kein Netz auf und kennt keine Uhrzeit. Oberfläche, Kommandozeile und MCP-Server laden Daten über je eine Ladeschicht (`src/laden/`) und rufen nur den Kern auf.

```
Oberfläche (React, Tauri) ─┐
Kommandozeile hfcalc ──────┼──► src/kern (reine Funktionen) ◄── src/schema (Zod)
MCP-Server (stdio) ────────┘              ▲
        │                                 │ Preisdaten, Kurs, Eingaben
        └──── src/laden/node · src/laden/tauri ──► Datenordner, EZB
```

## Projektstruktur (vollständig)

```
higgsfield-kalkulator/
├── CLAUDE.md
├── docs/                         Bauplan, Spezifikation, Regeln, Referenzen
│   └── referenz/                 Bausteine-Vorschau (HTML), gemessene Website-Variablen (JSON)
├── daten-vorlage/                Startdaten für den Datenordner (siehe „Datenmodell“), mit Git versioniert
│   ├── CLAUDE.md                 Pflegeregeln der Datenbasis (wird mit kopiert)
│   └── preise/*.json
├── src/
│   ├── kern/                     Rechenkern: clips, credits, bilder (Storyboard, Bilder je Clip, einmalige Assets), pakete, kaufplan (Pakete mit Preisen), preisleistung (Qualitätspunkte, Ranking), empfehlung(-weg), rest, waehrung (Kurs; seit 25.10.2026 auch grossChange, die Differenz zweier Bruttobeträge für das Differenz-Schild), text, berechnung (calculate), index.ts
│   ├── schema/                   Zod-Schemas: preis, preise, preise-pruefen (Prüfung aus Text, ohne Dateizugriff), fehler, eingaben, projekt, ergebnis, index.ts
│   ├── laden/
│   │   ├── gemeinsam/            Abläufe ohne Datei- und Netzzugriff: Kursabruf (manuell → aktueller Zwischenspeicher → EZB → offline) und Projekte (Liste, Lesen, Speichern mit Überschreib-Schutz); Node und Tauri liefern nur das Lesen und Schreiben
│   │   ├── node/                 Datenordner, Kurs-Abruf mit fetch, Cache, Projekte (für CLI und MCP)
│   │   └── tauri/                Preise, Kurs und Projekte über @tauri-apps/plugin-fs und plugin-http, Credit-Stand über den Befehl higgsfield_credits (für die App)
│   ├── cli/                      hfcalc: Befehle, Ausgabe Text/JSON, einrichten
│   ├── mcp/                      MCP-Server mit fünf Werkzeugen
│   ├── ui/
│   │   ├── components/           Bausteine nach docs/UI-RULES.md (felder, auswahl, schalter, hinweis, ergebnis, knoepfe, Icon, Fehlergrenze; CSS bausteine/auswahl/ergebnis)
│   │   ├── bewegung/             Bewegung nach docs/UI-RULES.md §11: Aufbau-Regie und Staffeln (aufbau), zählende Zahl (Zahl, zahl), Aufklappen, Umsortieren, gleitende Markierung, Puls (hooks), Scrollen mit Nachlauf (scrollen), Einblender, bewegt() und Zeiten aus tokens.css (zeit); CSS bewegung.css
│   │   ├── views/                Eingabespalte, BilderSchalter (Storyboard und einmalige Assets), WeitereEinstellungen, Ergebnisbereich, ErgebnisReiter, Projekte (Projektwahl, Speichern), DifferenzSchild (kurzes „+/− … €“ am Preis), anzeige (Ergebnis für die Anzeige aufbereiten, ohne Rechnung), auswahllisten
│   │   ├── formular.ts           Formularzustand → rohe Eingaben, Standardwerte, Zähler „geändert“ (keine Rechenlogik)
│   │   ├── bewertung.ts          Formular → validateInputs/calculate → Fehler je Feld oder Ergebnis
│   │   ├── quelle.ts             Datenquelle der Oberfläche (App: quelle-tauri.ts, Tests: Testdaten)
│   │   ├── vorschau.tsx          nur Entwicklung: dieselbe App mit daten-vorlage/ für die Prüfung im Browser (vorschau.html, nicht im App-Build)
│   │   └── App.tsx
│   ├── styles/
│   │   ├── tokens.css            einzige Quelle aller Gestaltungswerte
│   │   └── global.css
│   └── assets/fonts/             Inter und Space Grotesk mit ihren Lizenztexten (SIL Open Font License 1.1)
├── src-tauri/                    Tauri-Hülle: tauri.conf.json, capabilities/, icons/ (mit app-icon.svg als Quelle)
├── scripts/                      bundle-cli.ts (Vite-Bündel nach dist-cli/: hfcalc.mjs, mcp.mjs, daten-vorlage/); `pnpm install:local` = bündeln + `node dist-cli/hfcalc.mjs einrichten`
└── tests/
    ├── kern/                     Prüfwert-Tests je AC-ID
    ├── laden/                    Datenordner und Kurs gegen temporäre Ordner
    ├── cli/ · mcp/               Aufruf-Tests, Gleichheitstest der drei Bedienwege
    └── fixtures/                 Testdaten (Kopie der Startdaten)
```

## Laufzeit-Orte auf dem Mac

| Was | Ort | Warum |
|---|---|---|
| Datenordner | `~/Higgsfield-Kalkulator/` (direkt im Benutzerordner) | fester Ort, damit der Dateizugriff der App eng begrenzt bleiben kann; bewusst nicht in „Dokumente“, weil macOS dort für jede neu gebaute App, für das Terminal und für Claude Desktop und Codex eine Datenschutz-Abfrage zeigt, die beim MCP-Server unbemerkt scheitern kann |
| Preise | `<Datenordner>/preise/*.json` | von Claude Code gepflegt, Git-versioniert |
| Projekte | `<Datenordner>/projekte/<name-als-slug>.json` | ein Film pro Datei |
| Auswahl der Gesamtkalkulation | `<Datenordner>/gesamtkalkulation.json` | `{ projects: string[] }`, Namen der angehakten Projekte (SPEC F15); atomar geschrieben, nur in einen vorhandenen Datenordner |
| Kurs-Zwischenspeicher | `<Datenordner>/cache/wechselkurs.json` | in `.gitignore` des Datenordners; sichtbarer Ordnername, weil Tauri versteckte Pfade nur mit Zusatzregeln freigibt |
| Gebündelte Kommandozeile | `~/.local/share/higgsfield-kalkulator/hfcalc.mjs` | unabhängig vom Projektordner |
| Gebündelter MCP-Server | `~/.local/share/higgsfield-kalkulator/mcp.mjs` | unabhängig vom Projektordner |
| Startbefehl | `~/.local/bin/hfcalc` (Shell-Skript, ruft Node mit `hfcalc.mjs` auf) | `einrichten` ergänzt `~/.local/bin` einmalig in `~/.zshrc`, falls nicht im PATH |
| App | `/Applications/Cost Calculator for Higgsfield.app` | lokal gebaut, Ad-hoc-signiert; jeder andere Programmordner geht ebenso (Entscheidung vom 09.10.2026) |

Umgebungsvariable `HFCALC_DATA` überschreibt den Datenordner (nur für Tests und Notfälle).

## Datenmodell

Alle JSON-Dateien nutzen englische Feldnamen. Texte für Menschen sind deutsch. Jede Datei wird beim Laden mit dem zugehörigen Zod-Schema geprüft (`src/schema/`). Unbekannte Felder sind ein Prüffehler, damit Tippfehler wie `soruce` auffallen. Die Prüfung (`checkPriceFiles` in `src/schema/preise-pruefen.ts`) bekommt die Dateien als Text und liest selbst nichts; `src/laden/node` und später `src/laden/tauri` lesen nur und rufen sie auf.

### Preis (`Price`) — Baustein in allen Preisdateien

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `status` | `"known" \| "unknown" \| "unavailable"` | ja | `unavailable` = Kombination gibt es nicht (zum Beispiel 4K bei Seedance 2.5) |
| `value` | Zahl > 0 | nur bei `known` | Betrag; 0 ist verboten (AC-F8-4) |
| `unit` | `"credits_per_second" \| "credits_per_image" \| "USD" \| "EUR"` | bei `known`; bei `unknown` erlaubt, bei `unavailable` nicht | |
| `asOf` | Datum `YYYY-MM-DD` | ja | Stand |
| `source` | Text | ja | Quelle, zum Beispiel „Kauf-Fenster Credits aufladen, Konto Ultra“ |

### `preise/videomodelle.json`

`{ "models": VideoModel[] }`

| Feld | Typ | Bedeutung |
|---|---|---|
| `id` | Text, eindeutig | `seedance-2.5`, `seedance-2.5-draft`, `seedance-2.0-standard`, `seedance-2.0-enhanced-fast`, `seedance-2.0-mini` |
| `name` | Text | Anzeigename |
| `family` | `"seedance-2.5" \| "seedance-2.0"` | Gruppe im Modellwähler |
| `clipMinSeconds` / `clipMaxSeconds` | Zahl | 4/30 bei 2.5, 4/15 bei 2.0 |
| `resolutions` | Objekt `{"480p","720p","1080p","4K"}` → `Price` | Credits je Sekunde ohne Rabatt und ohne Ton |
| `draft` | `null \| { "finishModelId", "finishResolution", "finishWithinDays" }` | nur beim Draft-Modell: Fertigstellung über `seedance-2.5` in `1080p` innerhalb 7 Tagen |
| `audioSurchargeAllowed` | Boolean | `true` nur bei Seedance 2.0 |
| `badge` | `null \| "top" \| "new"` | Anzeige im Modellwähler |

### `preise/bildmodelle.json`

`{ "imagesPerClip": 2, "models": ImageModel[] }` mit `ImageModel = { id, name, pricePerImage: Price, storyboard: boolean }`. `imagesPerClip` gilt nur für das Storyboard (2 Bilder je Clip). Storyboard-fähig: Seedream 5.0 Flash (0,5) und Pro (3). GPT Image 2.5 Sunburst/Flare werden mit `storyboard: false` hinterlegt, je Auflösung ein eigener Eintrag (zum Beispiel `gpt-image-2.5-sunburst-high-2k`), weil ein Bildmodell genau einen Preis hat. Für die Bilder je Clip und die einmaligen Assets ist jedes Bildmodell wählbar (seit 25.10.2026).

### `preise/pakete.json`

`{ "vatPercent": 19, "expiryDays": 90, "packages": Package[] }` mit `Package = { credits: number, regular: Price, discounted: Price }`. Startdaten: 100, 200, 500, 1.000, 2.000, 4.000, 5.000 mit Preisen; 7.000 bis 25.000 in Zweierschritten und 100.000 mit `unknown` (siehe SPEC, Entscheidung 1).

### `preise/qualitaet.json` (seit 25.10.2026)

`{ "resolutionPoints": { "480p": 1, "720p": 2, "1080p": 3, "4K": 4 }, "modelFactors": { "<VideoModel.id>": Faktor }, "asOf", "source" }`. Qualitätspunkte eines Wegs = Punkte seiner Auflösung (beim Draft-Weg die der Fertigstellung) × Faktor seines Modells. Jedes Videomodell braucht einen Faktor; ein Faktor für ein unbekanntes Modell ist ein Prüffehler. Grundlage des Preis-Leistungs-Rankings (`src/kern/preisleistung.ts`).

Die früheren Dateien `preise/paesse.json` und `preise/generierungsdauer.json` liest der Kalkulator seit dem Ausbau der Pässe am 25.10.2026 nicht mehr; ältere Datenordner dürfen sie behalten (die Sicherung des Codes ist nicht Teil der öffentlichen Fassung).

### `preise/einstellungen.json`

Standardwerte der Eingaben: `clipLengthSeconds: 7.5`, `discountPercent: 25`, `discountEnabled: false`, `discountScope: { "modelIds": ["seedance-2.5", "seedance-2.5-draft"], "resolutions": ["1080p"] }` (SPEC, Entscheidung 12), `packagePriceLevel: "discounted"` (seit 25.10.2026; vorher `"regular"`), `passPriceLevel` und `netHoursPerDay` nur noch geduldet (Pässe ausgebaut), `audioSurchargePercent: 0`, `ecbTimeoutMs: 5000`. Seit 25.10.2026 dazu die Bildwerte aus einem Testfilm des Autors: `clipImagesPerClip: 3.5` (Lichtbilder und Referenzbilder je Clip einschließlich Fehlversuchen), `attemptsPerAsset: 8`, `assetsPerPerson: 3`, `assetsPerLocation: 9`, `assetPeople: 5` und `assetLocations: 3` (Vorbelegung, wenn die einmaligen Assets eingeschaltet werden). Dazu `startValues` (seit 25.10.2026): Vorbelegung der Oberfläche beim ersten Öffnen, damit rechts sofort ein Ergebnis steht — `durationSeconds: 600`, `modelId: "seedance-2.5"`, `resolution: "480p"`, `attemptsPerClip: 3` (Durchschnitt aus einem Testfilm des Autors), `clipImageModelId: "seedream-5.0-pro"`, `storyboardModelId: "seedream-5.0-flash"`, `assetModelId: "seedream-5.0-pro"`, `creditBalance: 0` (bis der Live-Stand da ist). Kommandozeile und MCP-Server nutzen `startValues` nicht. Fehlen diese sechs Felder oder `startValues` in einem älteren Datenordner, setzt das Schema dieselben Werte ein (`.default()` in `settingsFileSchema`), damit der Datenordner gültig bleibt.

### Eingaben (`Inputs`, Schema `src/schema/eingaben.ts`)

| Feld | Typ | Pflicht | Standard |
|---|---|---|---|
| `creditBalance` | ganze Zahl ≥ 0 | ja | – |
| `durationSeconds` | Zahl > 0 (Eingabe MM:SS) — noch offene Dauer | genau eines von `durationSeconds` und `clipCount` | – |
| `clipCount` | ganze Zahl 1–1.000 — noch offene Clips | genau eines von `durationSeconds` und `clipCount` | – |
| `clipLengthSeconds` | 1–20 | nein | 7,5 |
| `modelId` | ID aus `videomodelle.json` | ja | – |
| `resolution` | `480p \| 720p \| 1080p \| 4K` — die **Zielauflösung** | ja | bei Draft fest `1080p` (Versuche in 480p, Fertigstellung in 1080p; SPEC, Entscheidung 5) |
| `discount` | `{ enabled, percent, modelIds[], resolutions[] }` | nein | aus `einstellungen.json` (`discountEnabled`, `discountPercent`, `discountScope`) |
| `attemptsPerClip` | ganze Zahl 1–20 | ja | – |
| `extraScenesPercent` | 20–50 in 5er-Schritten; gilt für Dauer und Clipanzahl | ja | – |
| `clipImageModelId` | ID aus `bildmodelle.json` — Bildmodell für Lichtbilder und Referenzbilder je Clip | ja | – |
| `clipImagesPerClip` | 0–20, Dezimalzahl erlaubt | nein | 3,5 aus `einstellungen.json` |
| `storyboardModelId` | ID aus `bildmodelle.json` mit `storyboard: true`; **fehlt der Wert, ist das Storyboard aus** | nein | aus |
| `oneTimeAssets` | `{ modelId, people?, locations?, attemptsPerAsset? }` — einmalig erzeugte Assets; **fehlt der Block, sind sie aus**. `modelId` Pflicht im Block; `people` und `locations` ganze Zahlen 0–100, `attemptsPerAsset` 1–50 | nein | aus; im Block 5 Personen, 3 Orte, 8 Anläufe aus `einstellungen.json` |
| `packagePriceLevel` | `regular \| discounted` | nein | `regular` |
| `audioSurchargePercent` | `0 \| 50 \| 100` | nein | 0 |
| `manualExchangeRate` | Zahl > 0, Dollar je 1 Euro | nein | – |

Eingegeben wird immer nur der offene Umfang (SPEC, F1 und F7). Mit Dauer: Clipanzahl = aufgerundet(Dauer × (1 + Aufschlag) ÷ Cliplänge). Mit Clipanzahl: Clipanzahl = aufgerundet(offene Clips × (1 + Aufschlag)), Cliplänge aus `clipLengthSeconds`.

Pflichtfelder in der Oberfläche (AC-F10-6): „Noch offen“ (`durationSeconds` oder `clipCount`, umschaltbar), `extraScenesPercent`, `modelId`, `resolution`, `attemptsPerClip`, `clipImageModelId`, `creditBalance`. Darunter stehen sichtbar zwei Kippschalter, beim Start aus: „Storyboard“ (eingeschaltet: Bildmodell, wird zu `storyboardModelId`) und „Einmalige Assets“ (eingeschaltet: Bildmodell, Personen, Orte, Anläufe, wird zu `oneTimeAssets`). `clipImagesPerClip` liegt in „Weitere Einstellungen“.

**Bilder (seit 25.10.2026):** Storyboard = Clips × `imagesPerClip` × Preis je Bild. Bilder je Clip = Clips × `clipImagesPerClip` × Preis je Bild. Einmalige Assets: Zahl der Assets = Personen × `assetsPerPerson` + Orte × `assetsPerLocation`; Bilder = Assets × Anläufe; Credits = Bilder × Preis je Bild. Alle Bilder zusammen kommen zu den Video-Credits jedes Wegs; Bilder sind in keinem Pass enthalten.

### Wechselkurs (`ExchangeRate`)

`{ value: number /* Dollar je 1 Euro */, date: "YYYY-MM-DD", origin: "ecb" | "cached" | "manual" }`. Abruf: `https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A?lastNObservations=1&format=jsondata`, Zeitlimit aus Einstellungen. Umrechnung: Euro = Dollar brutto ÷ `value`. `origin`: `ecb` = aktueller Referenzkurs (frisch abgerufen oder gespeicherter Kurs vom aktuellen Bankarbeitstag), `cached` = gespeicherter älterer Kurs, weil kein Abruf gelang (Hinweis „offline“), `manual` = von Hand eingegeben (Datum = heute, kein Abruf). Der Zwischenspeicher `cache/wechselkurs.json` enthält `{ value, date }`, wird atomar geschrieben und nur, wenn der Datenordner schon existiert. Die Antwort der Zentralbank (SDMX-JSON: Kurs in `dataSets[0].series[…].observations`, Datum in `structure.dimensions.observation` mit `id` `TIME_PERIOD`) wird mit Zod geprüft; die reinen Teile liegen in `src/schema/kurs.ts`, das Abrufen in `src/laden/node/kurs.ts`. Bankarbeitstag = Montag bis Freitag; ein Feiertag kostet nur einen zusätzlichen Abruf.

### Ergebnis (`Result`, Schema `src/schema/ergebnis.ts`)

Das Ergebnis gilt immer für den eingegebenen offenen Umfang plus Aufschlag; eine Vorgeschichte gibt es nicht (AC-F7-1). `openSeconds` zeigt, welche Dauer gerechnet wurde.

| Feld | Inhalt |
|---|---|
| `openSeconds` | gerechnete Dauer einschließlich Aufschlag: Dauer × (1 + Aufschlag) bzw. Clipanzahl einschließlich Aufschlag × Cliplänge |
| `clips` | `{ count, lengthSeconds, billedSecondsPerAttempt }` |
| `paths[]` | je Produktionsweg (SPEC, Entscheidung 10): `{ id, label, modelId, resolution, creditsPerSecond \| null, videoCredits \| null, status: "ok" \| "no-price" }`; `id` = `<modelId>@<Auflösung>`, beim Draft-Weg mit der Auflösung der Fertigstellung (`seedance-2.5-draft@1080p`); `creditsPerSecond` = Credits je Sekunde fertigem Film einschließlich aller Versuche, Rabatt, Ton und Draft-Fertigstellung |
| `images` | `{ storyboard: { images, credits } \| null, clipImages: { images, credits }, assets: { count, images, credits } \| null, totalCredits }`; `storyboard` und `assets` sind `null`, wenn sie aus sind; `credits` bzw. `totalCredits` sind `null`, wenn einem Bildmodell der Preis fehlt (dann gibt es auch keine Gesamtsumme). Ersetzt seit 25.10.2026 das Feld `storyboardCredits` |
| `selected` | die vom Nutzer gewählte Kombination („Deine Auswahl“); hat sie keinen Preis, sind alle Zahlen `null` und `packages` leer: `{ pathId, totalCredits, shortfall, packages: {credits,count}[], creditsBought, usdNet, usdGross, eurNet, eur \| null, leftoverCredits }`; `usdNet`/`usdGross` summieren die Dollar-Preise, `eurNet` die Euro-Preise (nur Mehrwertsteuer, keine Umrechnung, AC-F3-7); `eur` = `usdGross` ÷ Kurs + `eurNet` × (1 + Mehrwertsteuer), ohne Kurs `null` |
| `exchangeRate` | `ExchangeRate \| null` |
| `recommendations` | `{ productionPath, bestValue, overall }` (unten); `bestValue` = bestes Preis-Leistungs-Verhältnis, Empfehlung der Vergleichsliste (seit 25.10.2026) |
| `valueRanking` | Kennungen der Wege nach Kosten brutto je Qualitätspunkt, bestes Verhältnis zuerst; Wege ohne Preis oder Qualitätsfaktor am Ende |
| `paths[].differenceToSelection` | `{ eur, usd } \| null`: Kosten brutto des Wegs minus Kosten brutto deiner Auswahl (positiv = teurer; SPEC Entscheidung 29) |
| `paths[].quality`, `paths[].costPerQualityPoint` | `{ points, resolutionPoints, factor } \| null` und Kosten brutto je Punkt für den ganzen Film ohne Abzug des Credit-Stands (Euro mit Kurs, sonst Dollar) |
| `paths[].plan`, `recommendations.overall.plan` | Kaufplan (`src/kern/kaufplan.ts`): `{ pathId, creditsNeeded, shortfall, packages: { credits, count, unitGross: { eur, usd }, lineGross: { eur, usd } }[], leftoverCredits, gross: { eur, usd }, net: { eur, usd }, singlePackage: { credits, gross } \| null, pricesAsOf }`; `eur` ohne Kurs nur bei reinen Euro-Preisen, `usd` nur ohne Euro-Preise; `null` ohne Preis. `selected.packages` tragen zusätzlich `unitNet` und `currency`, `selected.singlePackage` und `selected.pricesAsOf` wie im Plan |
| `reach` | `{ finishedSeconds, clips } \| null` — wie viel fertiger Film (und wie viele ganze Clips) der Credit-Stand trägt, einschließlich aller Bilder, mit der gewählten Kombination (AC-F7-2). Die einmaligen Assets fallen unabhängig von der Filmlänge an und gehen deshalb zuerst vom Credit-Stand ab; der Rest wird auf Video, Storyboard und Bilder je Clip verteilt (AC-F7-4). `null` ohne Preis |
| `notes[]` | `{ kind: "info" \| "assumption" \| "no-price" \| "covered" \| "error", text, area, passId? }`; `area` sagt, wohin der Hinweis in der Oberfläche gehört: `clips`, `images` (bis 25.10.2026 `storyboard`), `paths`, `rate`, `packages`, `passes` oder `reach`; `passId` nur bei Hinweisen zu genau einem Pass. In Projektdateien, die vor Schritt 15 gespeichert wurden, darf `area` fehlen. Die Hinweise innerhalb der Empfehlungen (`recommendations.*.notes`) haben kein `area`, weil sie schon an ihrer Empfehlung hängen. |

**Die zwei Euro-Maßstäbe** (SPEC, Entscheidung 9) stehen in getrennten Feldern, damit sie nie vermischt werden:

| Feld | Maßstab | Wofür |
|---|---|---|
| `recommendations.overall.eur` | (b) tatsächliche Zusatzkosten deiner Auswahl (gewähltes Modell und Auflösung, günstigster Bezahlweg; seit 25.10.2026, SPEC Entscheidung 23) | die eine Zahl oben im Ergebnis (AC-F6-5, AC-F10-7) |


`recommendations.productionPath` und `recommendations.bestValue` haben die Form `{ sentence, reason, threshold, notes[] }`; `productionPath` trägt zusätzlich `pathId`, jede Pass-Empfehlung `passId`. `recommendations.overall` hat zusätzlich `{ pathId \| null, payment: "credits" \| "pass" \| null, passId \| null, days \| null, eur \| null, usd \| null }`; `eur` ist `null`, wenn kein Kurs vorliegt (AC-F4-3), `usd` ist `null`, wenn Euro-Pakete im Spiel sind; ohne jede Kombination mit Preis sind `pathId` und `payment` `null`. Geldbeträge in den Sätzen sind auf Cent gerundet; die Zahlenfelder bleiben exakt.

Alle Zahlen im Ergebnis sind exakte Dezimalwerte als Text (big.js `toString()`). Gerundet wird erst in der Anzeige, nie in einem Zwischenschritt; einzige Ausnahme sind die ausdrücklich aufgerundeten Gewinnschwellen und Clipanzahlen.

### Gesamtkalkulation (`calculateTotal`, `src/kern/gesamt.ts`, seit 25.10.2026)

`calculateTotal(projects: { name, inputs }[], creditBalance, prices, rate)` rechnet jedes Projekt über `calculate()` mit `creditBalance: 0`, summiert `selected.totalCredits` und deckt die Summe minus Kontostand mit `planForCredits` (`src/kern/kaufplan.ts`). Ergebnis `{ projects: { name, pathLabel, credits, problem }[], totalCredits, creditBalance, plan, notes }`. calculate() bleibt die einzige Stelle, die einen Film rechnet; `calculateTotal` summiert nur. Nur die App nutzt sie (SPEC F15).

### Projekt (`projekte/<slug>.json`)

`{ name, createdAt, updatedAt, inputs: Inputs, snapshot: { result: Result, pricesAsOf: "YYYY-MM-DD", savedAt } }`, geprüft mit `projectSchema` (`src/schema/projekt.ts`), das Ergebnis mit `resultSchema` (`src/schema/ergebnis.ts`). `pricesAsOf` ist das jüngste `asOf` aller Preise und der Generierungsdauer im Datenordner. Der Dateiname entsteht aus dem Namen (`projectSlug`: Kleinbuchstaben, Umlaute ausgeschrieben, alles andere zu Bindestrichen; „Die Route – Teil 2“ → `die-route-teil-2.json`); zwei Namen mit gleichem Dateinamen gelten als dasselbe Projekt. Gespeichert werden die Eingaben, wie sie angegeben wurden (ohne ergänzte Standardwerte). Beim Überschreiben bleibt `createdAt` erhalten. Die Liste ist nach `updatedAt` sortiert, neueste zuerst; eine beschädigte Datei ergibt eine Meldung `invalid-project` und wird übersprungen.

### Beziehungen

`Inputs.modelId` → `VideoModel.id`; `Inputs.storyboardModelId`, `Inputs.clipImageModelId` und `Inputs.oneTimeAssets.modelId` → `ImageModel.id` (beim Storyboard nur Modelle mit `storyboard: true`; geprüft beim Rechnen, Meldung mit Feld); `Pass.modelIds[]` → `VideoModel.id`; `VideoModel.draft.finishModelId` → `VideoModel.id`. Eine fehlende Referenz ist ein Prüffehler beim Laden (AC-F8-2).

## Schnittstellen

### Rechenkern (öffentliche API, `src/kern/index.ts`)

| Funktion | Zweck |
|---|---|
| `calculate(rohEingaben, prices, rate) → Outcome<Result>` | einzige Einstiegsstelle für alle Bedienwege; prüft die Eingaben selbst mit `inputsSchema`, füllt fehlende optionale Werte aus `einstellungen.json` und liefert reines JSON (Zahlen als exakter Dezimaltext) oder eine Fehlerliste mit Feld |
| `validateInputs(raw) → Outcome<Inputs>` | über `src/schema`; `Outcome<T>` = `{ ok: true, value } \| { ok: false, errors: AppError[] }` |

### Kommandozeile `hfcalc`

| Befehl | Zweck |
|---|---|
| `hfcalc rechnen [Optionen] [--json]` | rechnet; jede Eingabe als Option, zum Beispiel `--dauer 3:00 --versuche 3 --modell seedance-2.5-draft`; statt `--dauer` geht `--clips 20` (genau eine der beiden Optionen) |
| `hfcalc preise [--json]` | listet alle Preise mit Stand und Quelle; `--json` liefert `{ dataDir, videoModels, imageModels, packages, passes, generationTimes, settings }`, jeweils der geprüfte Inhalt der Datei |
| `hfcalc daten pruefen` | prüft den Datenordner; Exitcode 0 = gültig |
| `hfcalc projekte [--json]` | listet Projekte |
| `hfcalc projekt zeigen <name> [--json]` | Eingaben und Schnappschuss |
| `hfcalc projekt speichern <name> [Optionen] [--ueberschreiben] [--json]` | rechnet mit denselben Optionen wie `rechnen` und speichert; ohne `--ueberschreiben` kein Überschreiben (Exitcode 1) |
| `hfcalc einrichten` | Datenordner anlegen, Bündel kopieren, PATH, MCP-Einträge (AC-F13-*) |

Exitcodes: 0 Erfolg · 1 ungültige Eingabe · 2 ungültige Daten · 3 sonstiger Fehler. Optionen von `hfcalc rechnen`: `--dauer` oder `--clips`, `--aufschlag`, `--modell`, `--aufloesung`, `--versuche`, `--bildmodell`, `--credits` (Pflicht) sowie `--storyboard <id>` (schaltet das Storyboard ein), `--assets <id>` (schaltet die einmaligen Assets ein) mit `--personen`, `--orte`, `--anlaeufe`, dazu `--bilder-je-clip`, `--cliplaenge`, `--rabatt <prozent>`, `--rabatt-modelle`, `--rabatt-aufloesungen`, `--paketpreise regulaer|rabatt`, `--passpreise regulaer|rabatt`, `--audio`, `--kurs`, `--stunden`, `--json`. Zahlen dürfen ein deutsches Komma haben. Die Hilfe liest erlaubte Modelle und Standardwerte aus dem Datenordner.

### MCP-Server (stdio, `@modelcontextprotocol/sdk` 1.32)

| Werkzeug | Eingabe | Ausgabe |
|---|---|---|
| `kosten_berechnen` | `Inputs` (Zod-Schema) | `Result` als JSON, identisch zu `hfcalc rechnen --json` |
| `preise_lesen` | keine | alle Preisdateien |
| `projekte_auflisten` | keine | Namen, Stand |
| `projekt_lesen` | `name` | Projekt |
| `projekt_speichern` | `name`, `inputs`, `overwrite` (Standard `false`) | Projekt |

Server-Anweisung (`instructions`) und Werkzeugbeschreibungen erklären auf Deutsch, wofür jedes Werkzeug da ist, welche Felder Pflicht sind und dass der Wechselkurs „Dollar je 1 Euro“ bedeutet. Jedes Werkzeug antwortet mit einem Textinhalt, der genau dem JSON des entsprechenden Kommandozeilen-Befehls entspricht (`kosten_berechnen` = `hfcalc rechnen --json`, `preise_lesen` = `hfcalc preise --json`, `projekte_auflisten` = `hfcalc projekte --json`, `projekt_lesen` = `hfcalc projekt zeigen --json`). Die Daten werden bei jedem Aufruf neu geladen, damit geänderte Preise ohne Neustart gelten. Eingaben prüft das SDK mit `inputsSchema` (Feldbeschreibungen über `.describe()`); Fehler kommen als Werkzeugantwort mit `isError`, der Server läuft weiter. Kursabruf und Rechnung laufen für Kommandozeile und MCP-Server über dieselbe Funktion `calculateWithRate` (`src/laden/node/rechnen.ts`).

### Einträge durch `hfcalc einrichten`

| Ziel | Art |
|---|---|
| Claude Code | nur wenn `claude` gefunden wird: Sicherungskopie von `~/.claude.json`, dann `claude mcp get higgsfield-kalkulator`; existiert der Eintrag, zuerst `claude mcp remove --scope user higgsfield-kalkulator`, danach `claude mcp add --scope user higgsfield-kalkulator -- <node> <mcp.mjs>`. So entsteht nie ein doppelter Eintrag (AC-F13-2). Fehlt `claude`, gibt die Einrichtung genau diesen Befehl zum Nachholen aus (AC-F13-1). |
| Claude-Desktop-App | Eintrag `mcpServers.higgsfield-kalkulator` in `~/Library/Application Support/Claude/claude_desktop_config.json` (gleichnamigen Eintrag ersetzen, alle anderen unverändert lassen) |
| Codex | Block `[mcp_servers.higgsfield-kalkulator]` mit `command`/`args` in `~/.codex/config.toml` (gleichnamigen Block ersetzen, alles andere unverändert lassen) |

`<node>` ist ein absoluter Pfad, weil Programme mit Oberfläche den PATH der Shell nicht erben. Gewählt wird der erste vorhandene von `/opt/homebrew/bin/node`, `/opt/homebrew/opt/node@24/bin/node` und `/usr/local/bin/node`, weil diese Pfade ein Node-Update überleben. Nur wenn keiner existiert, gilt `process.execPath`; dann nennt die Einrichtung den Hinweis „Nach einem Node-Update `hfcalc einrichten` erneut ausführen“. Derselbe Pfad steht im Startskript `~/.local/bin/hfcalc`.

Vor jeder Änderung an einer bestehenden Konfigurationsdatei (Claude Desktop, Codex, `~/.zshrc`, `~/.claude.json`) entsteht eine Sicherungskopie `<datei>.bak-<JJJJ-MM-TTThh-mm-ss>`; eine vorhandene Sicherung wird nie überschrieben, und ist eine Datei schon aktuell, wird sie weder gesichert noch neu geschrieben. Geschrieben wird atomar: erst in eine Zwischendatei im selben Ordner, dann umbenennen. Ungültiges JSON bei Claude Desktop wird nicht angefasst, sondern gemeldet. Bei Codex werden der eigene Block und seine Unterabschnitte (`[mcp_servers.higgsfield-kalkulator.*]`) ersetzt. `einrichten` läuft nur aus dem Bündel, weil es die Dateien neben sich (`hfcalc.mjs`, `mcp.mjs`, `daten-vorlage/`) nach `~/.local/share/higgsfield-kalkulator/` kopiert. Der Datenordner entsteht in einem versteckten Zwischenordner daneben und wird erst vollständig umbenannt, damit es nie einen halben Datenordner gibt. Hat Git noch keine Identität, schreibt der erste Commit als „Higgsfield-Kalkulator <hfcalc@localhost>“. Die Programmdateien in `~/.local/share/` werden ohne Sicherungskopie ersetzt, weil sie aus dem Projekt neu erzeugt werden.

### Tauri

Ein eigener Rust-Befehl seit 25.10.2026: `higgsfield_credits` in `src-tauri/src/lib.rs` holt den Credit-Stand über die angemeldete Higgsfield-Kommandozeile (`higgsfield account status --json`, Feld `credits`). Er sucht `higgsfield` im PATH, in `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin` und in `~/.nvm/versions/node/*/bin`, ruft es mit diesem Ordner im PATH auf (die Kommandozeile ist ein Node-Skript; eine aus dem Finder gestartete App kennt den Suchpfad des Terminals nicht) und bricht nach 15 Sekunden ab. Fehler kommen als deutscher Satz zurück; die Oberfläche zeigt sie unter dem Feld (`src/laden/tauri/credits.ts`, `src/ui/creditstand.ts`). Gerechnet wird weiterhin nur im Frontend. Berechtigungen in `src-tauri/capabilities/default.json`: `fs` lesen/schreiben nur unter `$HOME/Higgsfield-Kalkulator/**`; `http` nur für `https://data-api.ecb.europa.eu/*`. Weitere Plugins (zum Beispiel `plugin-opener` aus der Vorlage) werden entfernt, weil die App sie nicht braucht.

## Feature-Zuordnung

| Feature | Daten | Schnittstellen |
|---|---|---|
| F1 | Inputs | `calculate` |
| F2 | VideoModel, ImageModel, Price | `calculate` |
| F3 | Package, ExchangeRate | `calculate` |
| F4 | ExchangeRate, `cache/wechselkurs.json` | `src/laden/*` |
| F5 | Pass, generierungsdauer | `calculate` |
| F6 | Result.recommendations | `calculate` |
| F7 | Inputs.creditBalance, Inputs.clipCount, Result.reach | `calculate` |
| F8 | alle Preisdateien | `hfcalc preise`, `hfcalc daten pruefen`, `preise_lesen` |
| F9 | Projekt | `hfcalc projekt*`, `projekt_*`, App |
| F10 | – | App |
| F11 | – | `hfcalc` |
| F12 | – | MCP-Server |
| F13 | Laufzeit-Orte | `hfcalc einrichten` |

## Design-System

Dunkles Higgsfield-Erscheinungsbild nach den Messwerten der Higgsfield-App. Alle Werte in `src/styles/tokens.css`. Nur ein dunkles Thema. Schriften aus `src/assets/fonts/`, eigene Icons in `src/ui/components/Icon.tsx`. Logos, Icons und Bilder von Higgsfield sind bewusst nicht enthalten.

## Environment-Variablen

| Name | Zweck |
|---|---|
| `HFCALC_DATA` | optional: anderer Datenordner statt `~/Higgsfield-Kalkulator/`, nur für Tests und Notfälle; gilt nur für Kommandozeile und MCP-Server, weil die App aus Sicherheitsgründen nur den festen Ordner lesen darf |
