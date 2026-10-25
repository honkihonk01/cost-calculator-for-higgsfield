# Datenordner des Higgsfield-Kostenkalkulators

Dieser Ordner (`~/Higgsfield-Kalkulator/`) enthält die Preise und die gespeicherten Filmprojekte des Kalkulators. Die Mac-App, die Kommandozeile `hfcalc` und der MCP-Server für Claude und Codex lesen alle aus diesem Ordner. Gepflegt werden die Preise von Hand oder von Claude Code, nie über die App.

## Was wo liegt

| Ordner oder Datei | Inhalt |
|---|---|
| `preise/videomodelle.json` | Credits je Sekunde je Videomodell und Auflösung, ohne Rabatt und ohne Ton |
| `preise/bildmodelle.json` | Credits je Bild; `storyboard: true` heißt: auch als Storyboard-Modell wählbar. Für Lichtbilder und Referenzbilder je Clip und für die einmaligen Assets ist jedes Bildmodell wählbar. `imagesPerClip` gilt nur für das Storyboard |
| `preise/pakete.json` | Credit-Pakete mit regulärem und rabattiertem Preis, Mehrwertsteuer, Verfall |
| `preise/qualitaet.json` | Qualitätspunkte für das Preis-Leistungs-Ranking: Punkte je Auflösung und Faktor je Videomodell; jedes Videomodell braucht einen Faktor |
| `preise/einstellungen.json` | Standardwerte der Eingaben (Cliplänge, Rabatt, Preisstände, Zeitlimit des Kursabrufs) und die Bildwerte aus einem Testfilm des Autors: Bilder je Clip (3,5), Anläufe pro Asset (8), Assets je Person (3) und je Ort (9), Vorbelegung 5 Personen und 3 Orte; `startValues` = Vorbelegung aller Felder der App beim ersten Öffnen (Dauer 10:00, Seedance 2.5, 480p, 3 Versuche, Bildmodelle, Credit-Stand 0 bis zum Live-Abruf) |
| `projekte/` | ein gespeicherter Film je Datei; entsteht über die App oder `hfcalc projekt speichern` |
| `cache/` | zwischengespeicherter Wechselkurs; steht in `.gitignore` und wird nie committet |

## Pflegeregeln für Preise

1. **Jeder Preis hat Stand und Quelle.** Pflichtfelder sind `status`, `asOf` (Datum der Ablesung im Format `JJJJ-MM-TT`) und `source` (woher der Wert stammt, zum Beispiel „Generate-Button, Seedance 2.0 Mini, 720p, 8 s“). Bei `status: "known"` kommen `value` und `unit` dazu.
2. **Nie 0 eintragen.** Ist ein Preis nicht bekannt, gilt `"status": "unknown"` ohne `value`. Der Kalkulator zeigt dann „kein Preis hinterlegt“ und rechnet nicht mit diesem Weg. Eine 0 lehnt die Prüfung ab, weil sie den Weg fälschlich kostenlos machen würde.
3. **Nie schätzen.** Ein Wert kommt nur aus einer Ablesung in Higgsfield oder einer veröffentlichten Higgsfield-Quelle, nicht aus Preisen der Programmierschnittstelle und nicht aus Hochrechnungen.
4. **`unavailable` nur, wenn es die Kombination nicht gibt**, zum Beispiel 4K bei Seedance 2.5. Unbekannt ist nicht dasselbe wie nicht vorhanden.
5. **Dezimalzahlen mit Punkt**: `4.5`, nicht `4,5`.
6. **Einheiten:** `credits_per_second` bei Videomodellen, `credits_per_image` bei Bildmodellen, `USD` oder `EUR` bei Paketen. Euro-Preise sind netto; der Kalkulator schlägt die Mehrwertsteuer selbst auf und rechnet sie nicht um.
7. **Ein neues Videomodell** braucht einen Eintrag in `videomodelle.json` mit `family` `seedance-2.5` oder `seedance-2.0` und einen Faktor in `qualitaet.json`.
8. **Paketpreise ändern sich oft** (wechselnde Rabatte). Die App zeigt, von wann sie stammen; neue Preise mit neuem `asOf` eintragen. Es erscheint danach ohne Code-Änderung in Auswahl und Vergleich.

## Nach jeder Änderung

1. `hfcalc daten pruefen` ausführen. Exitcode 0 heißt gültig. Bei jedem anderen Exitcode nennt die Meldung Datei und Feld; erst beheben, dann weiter.
2. Danach einen Git-Commit mit Grund, zum Beispiel:
   `git commit -am "Seedance 2.0 Mini 720p am Generate-Button abgelesen: 3 Credits je Sekunde"`

Die Git-Historie ist die Versionsgeschichte der Preise und der Projekte. Die App selbst macht keine Commits.
