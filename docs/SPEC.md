# Spezifikation — Higgsfield-Kostenkalkulator

Stand: 25.10.2026 · Fachliche Grundlage: `docs/RECHENREGELN.md` (Abschnittsnummern wie „4.4“ beziehen sich darauf)

Jedes Kriterium sagt, wann eine Funktion fertig ist. Verbindlich für alle Schritte in `docs/BUILD-PLAN.md`. Es folgt dem Muster „Angenommen …, wenn …, dann …“. Die Kennung `AC-F<Funktion>-<Nummer>` verbindet das Kriterium später mit Bauplan, Tests und Prüfung. `[manuell]` heißt: Das Kriterium lässt sich nicht sinnvoll automatisch prüfen und bekommt im Bauplan eine Prüfanweisung für den Nutzer.

Alle Beispielzahlen sind mit Werkzeugen nachgerechnet. Das **Standardbeispiel** lautet vollständig: noch offen 3:00 (als Dauer eingegeben), Aufschlag 25 %, Cliplänge 7,5 s, Videomodell Seedance 2.5 Draft, Zielauflösung 1080p, 3 Versuche pro Clip, Lichtbilder und Referenzbilder je Clip mit Seedream 5.0 Pro (3,5 Bilder je Clip), Storyboard aus, einmalige Assets aus, Credit-Stand 2.000, Rabatt aus, beide Preisstände regulär, Audio-Aufschlag 0 %, Netto-Stunden 6, Wechselkurs 1,08 $ je 1 €. Gerundet wird erst am Ende aus dem ungerundeten Wert. Das Standardbeispiel ergibt 374,63 €. (Geändert am 25.10.2026, weil das Storyboard seither standardmäßig aus ist und die Bilder je Clip immer mitzählen; bis dahin rechnete es mit Storyboard Seedream 5.0 Flash und ergab 346,53 €.)

---

## F1 — Clipanzahl und abgerechnete Sekunden

Der Kalkulator ist ein Kostenrechner, kein Film- oder Clipplaner. Eingegeben wird nur der Umfang, der noch offen ist: wahlweise als Dauer (MM:SS) oder als Anzahl Clips. Auf beides kommt der Aufschlag für Zwischenszenen, Inserts und Korrekturclips. Daraus entstehen die Clipanzahl (für Storyboard und Bilder je Clip) und die abgerechnete Cliplänge (für die Videokosten). Geändert am 09.10.2026 auf Wunsch des Autors, siehe `docs/DECISIONS.md`.

| ID | Kriterium |
|---|---|
| AC-F1-1 | Angenommen Dauer 3:00, Aufschlag 25 % und Cliplänge 7,5 s ohne Clipanzahl, wenn gerechnet wird, dann ergeben sich 225 s Gesamtdauer und 30 Clips. |
| AC-F1-2 | Angenommen Dauer 3:00, Aufschlag 20 % und Cliplänge 7 s, wenn gerechnet wird, dann wird die Clipanzahl von 30,86 auf 31 aufgerundet. |
| AC-F1-3 | Angenommen 20 offene Clips, Aufschlag 25 % und Cliplänge 7,5 s, wenn gerechnet wird, dann rechnet der Kalkulator mit 25 Clips und 187,5 s; bei 7 offenen Clips wird von 8,75 auf 9 Clips aufgerundet. (geändert 09.10.2026) |
| AC-F1-4 | Angenommen die Cliplänge liegt unter 4 s, wenn gerechnet wird, dann wird jeder Versuch mit 4 s abgerechnet und ein Hinweis nennt die Mindestlänge. |
| AC-F1-5 | Angenommen die Cliplänge liegt über der Höchstlänge des gewählten Modells (15 s bei Seedance 2.0, 30 s bei Seedance 2.5), wenn gerechnet wird, dann erscheint eine Meldung mit Modell und Höchstlänge und es entsteht kein Ergebnis. |
| AC-F1-6 | Angenommen die Dauer ist ungültig wie „3:75“, oder es ist weder eine Dauer noch eine Clipanzahl angegeben, oder es sind beide angegeben, wenn gerechnet wird, dann erscheint eine Meldung am Feld und es entsteht kein Ergebnis. (ergänzt 09.10.2026) |

**Nicht-Ziele:** kein Film- oder Clipplaner; keine Planung einzelner Szenen mit unterschiedlichen Cliplängen; keine Schnittliste; kein Erfassen, was schon fertig ist.

---

## F2 — Credit-Bedarf je Produktionsweg

Für jeden Produktionsweg entsteht der Credit-Bedarf aus Preis je Sekunde, Versuchen, Draft-Fertigstellung, Rabatt und Ton. Dazu kommen die Bilder: immer die Lichtbilder und Referenzbilder je Clip, wahlweise das Storyboard und wahlweise die einmalig erzeugten Assets. Bilder sind für alle Wege gleich. (Bilder ergänzt am 25.10.2026 auf Wunsch des Autors, siehe `docs/DECISIONS.md`.)

| ID | Kriterium |
|---|---|
| AC-F2-1 | Angenommen Seedance 2.5 und 1 bis 5 Versuche, wenn gerechnet wird, dann stimmen die Credits je Sekunde exakt mit der Prüftabelle in Abschnitt 4.4 überein (zum Beispiel 3 Versuche: 21 · 48 · 25). |
| AC-F2-2 | Angenommen Seedance 2.0 und 1 bis 5 Versuche, wenn gerechnet wird, dann stimmen die Credits je Sekunde exakt mit der Prüftabelle in Abschnitt 4.4a überein (zum Beispiel 3 Versuche: 10,5 · 13,5 · 27). |
| AC-F2-3 | Angenommen 30 Clips und das Storyboard ist eingeschaltet, wenn das Storyboard mit Seedream 5.0 Flash gerechnet wird, dann kostet es 30 Credits, mit Seedream 5.0 Pro 180 Credits. |
| AC-F2-4 | Angenommen der Rabatt von 25 % ist eingeschaltet mit dem Standardumfang Seedance 2.5 und Seedance 2.5 Draft in 1080p, wenn gerechnet wird, dann kostet 1080p direkt 12 statt 16 Credits je Sekunde, der Draft-Weg 3 × v + 12, und alle anderen Kombinationen bleiben unverändert. |
| AC-F2-5 | Angenommen Seedance 2.0 Standard in 720p mit 50 % Audio-Aufschlag, wenn gerechnet wird, dann kostet eine Sekunde 6,75 Credits; bei Seedance 2.5 ändert der Audio-Aufschlag nichts. |
| AC-F2-6 | Angenommen für eine Kombination ist der Preis „unbekannt“ hinterlegt, wenn gerechnet wird, dann erscheint „kein Preis hinterlegt“ statt einer Zahl, und dieser Weg geht in keine Summe und keine Empfehlung ein. |
| AC-F2-7 | Angenommen eine unzulässige Kombination wie Seedance 2.5 in 4K, wenn gerechnet wird, dann erscheint eine Meldung, welche Auflösungen das Modell erlaubt, und es entsteht kein Ergebnis. |
| AC-F2-8 | Angenommen das Storyboard ist nicht eingeschaltet, wenn gerechnet wird, dann entsteht kein Storyboard-Posten; eingeschaltet kommt es zu den übrigen Bildern dazu (Standardbeispiel mit Seedream 5.0 Flash: 60 Bilder, 30 Credits, Bilder zusammen 345 Credits). (ergänzt 25.10.2026) |
| AC-F2-9 | Angenommen 30 Clips, 3,5 Bilder je Clip und Seedream 5.0 Pro, wenn die Lichtbilder und Referenzbilder je Clip gerechnet werden, dann sind es 105 Bilder für 315 Credits; das Bildmodell dafür ist Pflicht. (ergänzt 25.10.2026) |
| AC-F2-10 | Angenommen die einmaligen Assets sind eingeschaltet mit 5 Personen, 3 Orten, 8 Anläufen und Seedream 5.0 Pro, wenn gerechnet wird, dann ergeben sich 5 × 3 + 3 × 9 = 42 Assets, 336 Bilder und 1.008 Credits; ausgeschaltet entsteht kein Posten. (ergänzt 25.10.2026) |

**Nicht-Ziele:** keine Stimmen, keine Musik und keine Nachbearbeitung wie Hochskalieren; keine Planung einzelner Assets (die Zahl der Assets ist eine grobe Ableitung aus Personen und Orten); keine Schätzung unbekannter Preise; kein Ton bei Seedance 2.5.

---

## F3 — Euro-Kosten über Credit-Pakete

Der Fehlbetrag an Credits wird mit der günstigsten Paketkombination gedeckt und in Euro umgerechnet.

| ID | Kriterium |
|---|---|
| AC-F3-1 | Angenommen der Credit-Stand deckt den Bedarf, wenn gerechnet wird, dann betragen die zusätzlichen Kosten 0 € und die übrigen Credits werden angezeigt. |
| AC-F3-2 | Angenommen 3.655 fehlende Credits und reguläre Preise, wenn die Pakete gesucht werden, dann ist das Ergebnis 2.000 + 1.000 + 500 + 200 Credits für 314,50 $ netto. |
| AC-F3-3 | Angenommen 314,50 $ netto und Kurs 1,08 $ je 1 €, wenn umgerechnet wird, dann wird zuerst die Mehrwertsteuer aufgeschlagen (374,26 $) und danach umgerechnet (346,53 €). |
| AC-F3-4 | Angenommen zwei Kombinationen kosten gleich viel, wenn gewählt wird, dann gewinnt die mit weniger Paketen, danach die mit weniger überschüssigen Credits. |
| AC-F3-5 | Angenommen nach dem Kauf bleiben Credits übrig, wenn das Ergebnis erscheint, dann nennt ein Hinweis die Zahl und dass gekaufte Credits nach 90 Tagen verfallen. |
| AC-F3-6 | Angenommen der Preisstand „mit Rabatt“ und alle Paketgrößen, wenn 3.655 Credits fehlen, dann kostet die Kombination 182 $ netto, 216,58 $ brutto, 200,54 €. |
| AC-F3-8 | Angenommen 6.566 fehlende Credits und die Rabattpreise vom 25.10.2026, wenn die Pakete gesucht werden, dann ist das Ergebnis 5.000 + 1.000 + 500 + 100 Credits für 341 $ netto, weil das günstiger ist als ein einzelnes 7.000er-Paket für 350 $; das Einzelpaket erscheint zum Vergleich. Ist ein einzelnes größeres Paket günstiger (6.900 Credits: 1 × 7.000 für 350 $ statt 364 $), wird es gewählt. (ergänzt 25.10.2026) |
| AC-F3-7 | Angenommen ein Paketpreis ist in Euro (netto) hinterlegt, wenn gerechnet wird, dann wird nur die Mehrwertsteuer aufgeschlagen und kein Wechselkurs verwendet. |

**Nicht-Ziele:** kein Kauf aus der App heraus; keine Abo-Tarife; keine automatische Aufladung.

---

## F4 — Wechselkurs

Der Referenzkurs der Europäischen Zentralbank wird abgerufen, gespeichert und nachvollziehbar angezeigt.

| ID | Kriterium |
|---|---|
| AC-F4-1 | Angenommen eine Internetverbindung, wenn gerechnet wird, dann nutzt das Ergebnis den aktuellen Referenzkurs und nennt Kurs und Datum. |
| AC-F4-2 | Angenommen keine Verbindung und ein gespeicherter Kurs, wenn gerechnet wird, dann nutzt das Ergebnis den gespeicherten Kurs und nennt dessen Datum mit dem Hinweis „offline“. |
| AC-F4-3 | Angenommen keine Verbindung, kein gespeicherter und kein manueller Kurs, wenn gerechnet wird, dann erscheinen alle Credit- und Dollar-Werte, Empfehlungen werden in Dollar verglichen, und die Euro-Werte fehlen mit einer Meldung. |
| AC-F4-4 | Angenommen ein manueller Kurs ist eingegeben, wenn gerechnet wird, dann hat er Vorrang und das Ergebnis nennt ihn als „manuell“. |
| AC-F4-5 | Angenommen die Zentralbank antwortet nicht innerhalb von 5 Sekunden, wenn gerechnet wird, dann verhält sich der Kalkulator wie ohne Verbindung. |
| AC-F4-6 | Angenommen ein Kurs von 1,08, wenn 108 $ umgerechnet werden, dann ergibt das 100 €, weil der Kurs „Dollar je 1 Euro“ bedeutet. |

**Nicht-Ziele:** keine anderen Währungen; kein Kursverlauf; keine Bankgebühren.

---

## F5 — Unlimited-Pässe (ausgesetzt seit 25.10.2026)

**Ausgesetzt:** Der Autor hat die Pässe am 25.10.2026 vorläufig ganz aus dem Kalkulator genommen (Entscheidung 28). Die Kriterien AC-F5-1 bis AC-F5-7 gelten nicht, solange die Pässe ausgebaut sind; der vollständige Stand mit Tests ist nicht Teil der öffentlichen Fassung.

Jeder Pass wird mit dem Credit-Weg verglichen, einschließlich Gewinnschwelle und Erreichbarkeit im Zeitraum.

| ID | Kriterium |
|---|---|
| AC-F5-1 | Angenommen 1-Tages-Pässe, 7,5 s Cliplänge und reguläre Paketpreise, wenn die Gewinnschwelle gerechnet wird, dann ergeben sich auf ganze Einheiten aufgerundet („ab“) 1.412 Credits · 202 s · 27 Versuche (2.5 bis 720p), 2.118 · 133 · 18 (2.5 bis 1080p), 353 · 101 · 14 (2.0 Enhanced Fast und Mini) und 765 · 219 · 30 (Unlimited Seedance 2.0, verglichen mit Enhanced Fast); mit Rabattpreisen 2.527 · 361 · 49, 3.790 · 237 · 32, 632 · 181 · 25 und 1.369 · 391 · 53. |
| AC-F5-2 | Angenommen 6 Netto-Stunden pro Tag, wenn die Erreichbarkeit gerechnet wird, dann schafft ein Tag 90 Versuche in 720p und 72 Versuche in 1080p. |
| AC-F5-3 | Angenommen der Film braucht 90 Versuche in 1080p, wenn der 1-Tages-Pass geprüft wird, dann lautet das Ergebnis „reicht nicht“ und der Pass wird nicht empfohlen. |
| AC-F5-4 | Angenommen das Standardbeispiel, wenn der 3-Tage-Pass bis 1080p nach Abschnitt 4.5 bewertet wird (Video-Credits des Films zum Paketpreis je Credit, ohne Bilder und ohne Abzug des Credit-Stands), dann kostet der Pass 595,00 €, der Draft-Weg 526,82 €, und das Urteil lautet „lohnt sich nicht“. |
| AC-F5-5 | Angenommen ein Pass wird gerechnet, wenn Drafts im Spiel sind, dann werden im Pass alle Versuche direkt in der Pass-Auflösung gerechnet, weil Drafts in keinem Pass enthalten sind. |
| AC-F5-6 | Angenommen der Pass-Weg, wenn die Gesamtkosten entstehen, dann kommen die Credits aller Bilder (Bilder je Clip, Storyboard, einmalige Assets) zusätzlich über Credits dazu, weil Bilder in keinem Pass enthalten sind. (geändert 25.10.2026) |
| AC-F5-7 | Angenommen eine Pass-Rechnung, wenn das Ergebnis erscheint, dann nennt ein Hinweis, dass die Generierungsdauer im Pass nicht bestätigt ist, und bei Seedance 2.0 zusätzlich, dass die Dauer eine Annahme ist. |

**Nicht-Ziele:** kein Pass-Kauf aus der App; keine Planung über mehrere Pässe hintereinander.

---

## F6 — Empfehlungen

Die Fragen 1 bis 5 aus Abschnitt 5.1 werden als Satz mit Begründung und Schwelle beantwortet.

| ID | Kriterium |
|---|---|
| AC-F6-1 | Angenommen 3 Versuche und Ziel 1080p, wenn der Produktionsweg empfohlen wird, dann lautet die Empfehlung „Draft plus 1080p“ mit der Schwelle „bei 2 oder weniger Versuchen ist Seedance 2.0 Standard günstiger“. |
| AC-F6-2 | Angenommen 1 Versuch und Ziel 1080p, wenn der Produktionsweg empfohlen wird, dann lautet die Empfehlung „Seedance 2.0 Standard in 1080p“. |
| AC-F6-3 | Angenommen eine Empfehlung fällt auf Seedance 2.0, wenn sie erscheint, dann nennt sie den fehlenden Referenz-Workflow von Seedance 2.5. |
| AC-F6-4 | Angenommen 4 Versuche, wenn die Seedance-2.5-Wege untereinander verglichen werden, dann nennt die Begründung den Gleichstand von „Draft plus 1080p“ und „720p direkt“ mit je 28 Credits je Sekunde und zieht den Draft-Weg wegen der höheren Auflösung vor. |
| AC-F6-5 | Angenommen das Standardbeispiel, wenn die Gesamtempfehlung entsteht, dann lautet sie „Draft plus 1080p über Credit-Pakete, 374,63 €“, weil sie für die Auswahl (Seedance 2.5 Draft in 1080p) Credit-Pakete und alle erreichbaren Pässe des Modells vergleicht und Drafts in keinem Pass enthalten sind. (geändert 25.10.2026: vorher wurden alle Modelle verglichen) |
| AC-F6-7 | Angenommen Seedance 2.5 in 720p mit 5 Versuchen, wenn die Gesamtempfehlung entsteht, dann bleibt sie beim gewählten Videomodell (Pass „Seedance 2.5 bis 720p“ für 3 Tage), und ein günstigeres anderes Modell erscheint nur als Hinweis und in der Vergleichsliste. (ergänzt 25.10.2026) |
| AC-F6-8 | Angenommen ein beliebiges Modell und eine Auflösung, wenn die Versuche pro Clip zwischen 1 und 20 geändert werden, dann bleiben Modell und Auflösung der Zahl oben immer die gewählten. (ergänzt 25.10.2026 als Regression: vorher konnte ein Pass bis 720p eine 480p-Auswahl oben ersetzen) |
| AC-F6-6 | Angenommen ein Weg hat einen unbekannten Preis, wenn empfohlen wird, dann taucht er als „ohne Preis“ auf und wird nie empfohlen. |

**Nicht-Ziele:** keine Qualitätsbewertung der Modelle über den Hinweis zum Referenz-Workflow hinaus; kein Planabgleich (übernimmt Claude im Chat).

---

## F7 — Einstieg mitten im Projekt und Restguthaben

Der Kalkulator braucht keine Vorgeschichte. Er lässt sich zum ersten Mal mitten in einem Filmprojekt aufrufen: aktueller Credit-Stand und offener Umfang (Dauer oder Clips, F1) genügen. Ein Feld „Bereits fertig“ gibt es nicht mehr, weil nur der offene Rest eingegeben wird. Geändert am 09.10.2026, siehe `docs/DECISIONS.md`.

| ID | Kriterium |
|---|---|
| AC-F7-1 | Angenommen der Kalkulator wird mitten im Projekt zum ersten Mal genutzt, mit Credit-Stand 800, 12 offenen Clips, Aufschlag 25 % und sonst den Werten des Standardbeispiels, wenn gerechnet wird, dann rechnet er mit 15 Clips, 2.970 Credits Bedarf und 2.170 fehlenden Credits, ohne frühere Eingaben oder ein gespeichertes Projekt. (geändert 09.10.2026 und 25.10.2026) |
| AC-F7-2 | Angenommen 2.000 Credits, Draft-Weg mit 3 Versuchen und Bilder je Clip mit Seedream 5.0 Pro (3,5 je Clip), wenn die Reichweite gerechnet wird, dann reicht das Guthaben für 75,8 s fertigen Film einschließlich aller Bilder. (geändert 25.10.2026, vorher 79,6 s mit Storyboard Seedream 5.0 Flash) |
| AC-F7-3 | entfällt seit 09.10.2026: Das Feld „Bereits fertig“ gibt es nicht mehr. |
| AC-F7-4 | Angenommen das Standardbeispiel mit eingeschalteten einmaligen Assets (5 Personen, 3 Orte, 8 Anläufe, Seedream 5.0 Pro: 1.008 Credits), wenn die Reichweite gerechnet wird, dann gehen die Assets zuerst vom Credit-Stand ab, und der Rest reicht für 37,6 s fertigen Film; reicht der Credit-Stand nicht einmal für die Assets, sind es 0 s. (ergänzt 25.10.2026) |

**Nicht-Ziele:** keine Erfassung fertiger Clips; kein Vergleich mit dem ursprünglichen Plan (übernimmt Claude im Chat).

---

## F8 — Preisdatenbasis

Die Preise liegen als geprüfte JSON-Dateien im Datenordner.

| ID | Kriterium |
|---|---|
| AC-F8-1 | Angenommen gültige Daten, wenn `hfcalc preise` aufgerufen wird, dann erscheint jeder Preis mit Wert, Währung, Stand-Datum und Quelle. |
| AC-F8-2 | Angenommen eine Datei enthält „4,5“ statt 4.5, wenn die Daten geladen werden, dann nennt eine Meldung Datei und Feld, und es wird nicht gerechnet. |
| AC-F8-3 | Angenommen ein Preis hat kein Stand-Datum oder keine Quelle, wenn die Daten geprüft werden, dann schlägt die Prüfung mit Meldung fehl. |
| AC-F8-4 | Angenommen ein Preis ist als 0 eingetragen, wenn die Daten geprüft werden, dann schlägt die Prüfung fehl und empfiehlt „unbekannt“. |
| AC-F8-5 | Angenommen ein neues Videomodell mit vorhandenen Regeln wird in die Datei geschrieben, wenn die App neu rechnet, dann erscheint es in Auswahl und Vergleich ohne Code-Änderung. |
| AC-F8-6 | Angenommen `hfcalc daten pruefen`, wenn die Daten gültig sind, dann endet der Befehl mit Exitcode 0, sonst mit einem anderen Exitcode. |

**Nicht-Ziele:** keine Oberfläche zur Preispflege; kein automatisches Auslesen der Higgsfield-Preise.

---

## F9 — Filme als Projekte

Ein Film lässt sich unter einem Namen speichern und wieder laden.

| ID | Kriterium |
|---|---|
| AC-F9-1 | Angenommen ein Film ist gerechnet, wenn er unter einem Namen gespeichert wird, dann erscheint er nach einem Neustart in der Projektliste mit identischen Eingaben. |
| AC-F9-2 | Angenommen ein Projekt wird gespeichert, wenn die Datei entsteht, dann enthält sie zusätzlich das Ergebnis und den Preisstand zum Zeitpunkt des Speicherns. |
| AC-F9-3 | Angenommen der Name existiert schon, wenn gespeichert wird, dann wird nichts überschrieben, bevor der Nutzer bestätigt. |
| AC-F9-4 | Angenommen eine Projektdatei ist beschädigt, wenn die Liste geladen wird, dann erscheint eine Meldung zu dieser Datei und alle anderen Projekte bleiben nutzbar. |
| AC-F9-5 | Angenommen ein gespeichertes Projekt, wenn ein Agent es über Kommandozeile oder MCP-Server liest, dann erhält er dieselben Eingaben und dasselbe gespeicherte Ergebnis. |
| AC-F9-6 | Angenommen die App ist geöffnet und ein Agent speichert über Kommandozeile oder MCP-Server ein Projekt, wenn der Nutzer danach das Projektmenü öffnet, dann erscheint das neue Projekt ohne Neustart der App und lässt sich laden. (ergänzt 09.10.2026) |
| AC-F9-7 | Angenommen ein Projekt ist geladen, wenn der Nutzer „Löschen“ wählt, dann fragt ein Dialog nach und nennt den Papierkorb; erst nach „In den Papierkorb“ wird die Datei unverändert nach `projekte/papierkorb/` verschoben, nie gelöscht. Sie verschwindet aus Projektmenü und Gesamtkalkulation; liegt im Papierkorb schon eine gleichnamige Datei, bekommt die neue den Zeitpunkt in den Namen. (ergänzt 26.10.2026) |
| AC-F9-8 | Angenommen ein Projekt ist geladen, wenn der Nutzer es umbenennt, dann behält es Eingaben, Ergebnis und Erstellzeit, die alte Datei liegt im Papierkorb, und die gemerkte Auswahl der Gesamtkalkulation trägt den neuen Namen. Ein Name, den schon ein anderes Projekt hat, wird abgelehnt, ohne etwas zu ändern. (ergänzt 26.10.2026) |
| AC-F9-9 | Angenommen ein Projekt ist geladen, wenn der Nutzer „Änderungen speichern“ wählt oder Cmd+S drückt, dann werden die aktuellen Eingaben ohne Rückfrage in dieses Projekt geschrieben (Erstellzeit bleibt). „Als neues Projekt speichern“ öffnet den Namensdialog mit leerem Feld und lässt das geladene Projekt unverändert. (ergänzt 26.10.2026) |

**Nicht-Ziele:** kein endgültiges Löschen, auch nicht aus dem Papierkorb (das geht im Finder); Löschen und Umbenennen nur in der App, nicht über Kommandozeile oder MCP-Server; keine Versionen eines Projekts (die Historie liefert Git).

---

## F10 — Oberfläche

Die Oberfläche ist einfach, übersichtlich und minimalistisch: Pflichtfelder sichtbar, alles Seltene eingeklappt, im Ergebnis zuerst genau eine Antwort. Aufbau und Bausteine stehen in `docs/UI-RULES.md`.

| ID | Kriterium |
|---|---|
| AC-F10-1 | Angenommen ein gültiger Stand, wenn ein Feld geändert wird, dann aktualisieren sich alle Ergebnisse ohne Knopf in unter 100 ms. |
| AC-F10-2 | Angenommen ein frischer Start, wenn die App öffnet, dann ist der Rabatt auf Generierungspreise aus, der Preisstand der Credit-Pakete steht wie in `einstellungen.json` (Startdaten: „Mit Rabatt“, also der aktuelle Preis bei Higgsfield) und die Cliplänge auf 7,5 s. (geändert 25.10.2026: Pass-Preisstand und Netto-Stunden entfallen) |
| AC-F10-9 | Angenommen ein frischer Start, wenn die App öffnet, dann sind alle Pflichtfelder vorbelegt (noch offen 10:00, Seedance 2.5, 480p, 3 Versuche, Seedream 5.0 Pro, Credit-Stand 0 bis zum Live-Stand), und rechts steht sofort ein Ergebnis; beim Einschalten sind Storyboard (Seedream 5.0 Flash) und einmalige Assets (Seedream 5.0 Pro) ebenfalls vorbelegt. (ergänzt 25.10.2026) |
| AC-F10-10 | Angenommen die Dauer, wenn der Nutzer den stufenlosen Regler (0 bis 15 Minuten, sekundengenau) bewegt, dann zeigt das Eingabefeld denselben Wert als M:SS; tippt er eine Dauer ins Feld, folgt der Regler, und Dauern über 15 Minuten gehen nur über das Feld (der Regler steht dann am Ende). (ergänzt 25.10.2026) |
| AC-F10-11 | Angenommen die App öffnet, wenn die angemeldete Higgsfield-Kommandozeile erreichbar ist, dann steht der Credit-Stand live aus dem Higgsfield-Konto im Feld (abgerundet auf ganze Credits) mit Uhrzeit des Abrufs; eine eigene Eingabe ersetzt ihn und bleibt, bis der Nutzer „Live-Stand übernehmen“ drückt; schlägt der Abruf fehl, sagt ein Hinweis warum, und gerechnet wird mit dem Wert im Feld. (ergänzt 25.10.2026) |
| AC-F10-3 | Angenommen ein Feld ist ungültig, wenn die Ergebnisse erscheinen sollen, dann ist das Feld markiert und der Ergebnisbereich zeigt die Meldung statt veralteter Zahlen. |
| AC-F10-4 | Angenommen eine Empfehlung zu einem Produktionsweg oder Pass, wenn der Nutzer ihre Zeile in der Vergleichsliste aufklappt, dann besteht sie aus einem Satz, einer Begründung und einer Schwelle, nicht nur aus Zahlen. (geändert 25.10.2026: oben steht keine Begründung mehr) |
| AC-F10-5 | [manuell] Angenommen nur die Tastatur, wenn der Nutzer alle Felder durchgeht, dann ist jedes Feld erreichbar und bedienbar. |
| AC-F10-6 | Angenommen ein frischer Start, wenn die App öffnet, dann sind die sieben Pflichtfelder sichtbar und darunter die beiden Kippschalter „Storyboard“ und „Einmalige Assets“, beide aus und jeweils mit ihren Einstellungen in einer gemeinsamen Box; die übrigen optionalen Felder liegen im zugeklappten Bereich „Weitere Einstellungen“, der anzeigt, wie viele davon vom Standard abweichen. (geändert 25.10.2026) |
| AC-F10-8 | Angenommen das Storyboard oder die einmaligen Assets sind aus, wenn der Nutzer die Eingabespalte ansieht, dann fragt sie nicht nach deren Bildmodell; erst eingeschaltet erscheint in derselben Box das vorbelegte Bildmodell (bei den Assets dazu Personen, Orte und Anläufe, vorbelegt mit 5, 3 und 8). Leert er das Bildmodell, zeigt der Ergebnisbereich statt eines Betrags, was noch fehlt. (ergänzt und geändert 25.10.2026) |
| AC-F10-7 | Angenommen ein gültiger Stand, wenn das Ergebnis erscheint, dann steht oben genau eine Antwort, die Kosten deiner Auswahl; Produktionswege, Pässe und Details sind über Reiter erreichbar und nicht gleichzeitig sichtbar; jede Zeile der Produktionswege und Pässe lässt sich aufklappen. (geändert 25.10.2026) |
| AC-F10-12 | Angenommen das Standardbeispiel, wenn das Ergebnis erscheint, dann steht oben „Seedance 2.5 Draft + 1080p über Credit-Pakete“, groß 374,63 € brutto, darunter etwas kleiner „5.940 Credits Bedarf“ (AC-F10-18), klein „netto 314,81 € · 3.940 Credits fehlen noch“ und darunter eine Tabelle „Zu kaufen“ mit den Spalten Anzahl, Paket, Preis je Paket und Summe (eine Zeile „1 × 4.000 Credits, 374,63 €, 374,63 €“) und der Zeile „Zusammen brutto“; jede aufgeklappte Zeile der Vergleichsliste zeigt dieselbe Tabelle für ihren Weg. Alle Euro-Beträge sind brutto, nur oben steht klein der Nettobetrag. (ergänzt 25.10.2026, Tabelle seit der zweiten Änderung am selben Tag) |
| AC-F10-14 | Angenommen das Standardbeispiel, wenn der Nutzer die Vergleichsliste ansieht, dann steht in jeder Zeile rechts der Preis brutto und darunter der Unterschied zu deiner Auswahl (bei Seedance 2.0 Enhanced Fast in 720p „−309,07 € zu deiner Auswahl“, bei der eigenen Zeile „deine Auswahl“), ohne Rahmen um die Zahlen; nur die grüne Empfehlungszeile trägt einen Rahmen. (ergänzt 25.10.2026) |
| AC-F10-13 | Angenommen das Standardbeispiel, wenn der Nutzer den Reiter „Produktionswege“ ansieht, dann steht über der Liste die Überschrift „Produktionswege im Vergleich, sortiert nach Preis-Leistung“, die Wege stehen nach Kosten brutto je Qualitätspunkt (ganzer Film, ohne Abzug des Credit-Stands), und die Empfehlung ist das beste Verhältnis: Seedance 2.0 Enhanced Fast in 720p mit 1,4 Punkten und 180,63 € je Punkt vor Seedance 2.5 Draft plus 1080p mit 187,31 € je Punkt. (ergänzt 25.10.2026) |
| AC-F10-15 | Angenommen die Bewegung ist erlaubt, wenn sich ein Betrag oder eine Credit-Zahl im Ergebnis ändert, dann zählt die Zahl sichtbar vom alten zum neuen Wert und endet exakt beim Text aus `calculate()`; Screenreader hören nur den fertigen Wert. Ist „Bewegung reduzieren“ eingeschaltet, steht jede Zahl sofort da, und nichts gleitet oder blendet. (ergänzt 25.10.2026) |
| AC-F10-16 | Angenommen die Bewegung ist erlaubt, wenn sich der große Preis oben ändert, dann erscheint daneben kurz ein Schild mit dem Unterschied zur Zahl, die vorher dastand („+12,40 €“ auf roter, „−12,40 €“ auf grüner Fläche, Schrift weiß); es blendet schnell ein, steht eine Sekunde und blendet langsam aus. Ändert sich der Preis nicht oder um weniger als einen Cent, erscheint kein Schild. (ergänzt 25.10.2026) |
| AC-F10-17 | Angenommen die Bewegung ist erlaubt, wenn der Nutzer in der Eingabespalte oder im Ergebnisbereich mit Mausrad oder Trackpad scrollt, dann gleitet der Bereich mit weichem Nachlauf zum Ziel und läuft sanft aus, wie im Prototyp „Angebotsrechner“; das Ziel ist dabei genau der Weg, den Mausrad oder Trackpad gemeldet haben. Tastatur und Scrollbalken scrollen wie gewohnt; bei „Bewegung reduzieren“ scrollt alles ohne Nachlauf. (ergänzt 25.10.2026) |
| AC-F10-18 | Angenommen ein Ergebnis mit Kaufplan, wenn die Ergebniskarte oben erscheint (Einzelprojekt und Gesamtkalkulation), dann steht unter dem Bruttopreis der Credit-Bedarf als große Zahl, zum Beispiel „5.940 Credits Bedarf“, kleiner als der Preis und in Sekundärfarbe, damit der Euro-Betrag die wichtigste Zahl bleibt; darunter klein Nettopreis und fehlende Credits. (ergänzt 26.10.2026) |

**Nicht-Ziele:** kein helles Erscheinungsbild; keine Mehrsprachigkeit; keine Fenster für mehrere Filme gleichzeitig; keine Diagramme; kein Einführungs-Rundgang.

---

## F11 — Kommandozeile `hfcalc`

| ID | Kriterium |
|---|---|
| AC-F11-1 | Angenommen alle Pflichtwerte als Parameter, wenn `hfcalc rechnen --json` läuft, dann erscheint das vollständige Ergebnis als JSON mit englischen Feldnamen und deutschen Texten. |
| AC-F11-2 | Angenommen dieselben Eingaben, wenn Kommandozeile, MCP-Server und Rechenkern rechnen, dann sind die drei Ergebnisse identisch. |
| AC-F11-3 | Angenommen ein Pflichtwert fehlt, wenn der Befehl läuft, dann endet er mit einem Exitcode ungleich 0 und nennt den fehlenden Parameter. |
| AC-F11-4 | Angenommen `hfcalc --help`, wenn der Befehl läuft, dann erscheinen alle Parameter mit erlaubten Werten und Standardwerten. |
| AC-F11-5 | Angenommen der Projektordner mit dem Code wurde verschoben, wenn `hfcalc` aufgerufen wird, dann funktioniert der Befehl weiter. |

**Nicht-Ziele:** keine interaktiven Rückfragen auf der Kommandozeile; überschrieben wird nur mit der Option `--ueberschreiben`, die als Bestätigung im Sinne von AC-F9-3 gilt.

---

## F12 — MCP-Server

| ID | Kriterium |
|---|---|
| AC-F12-1 | Angenommen ein Agent verbindet sich, wenn er die Werkzeuge abfragt, dann sieht er `kosten_berechnen`, `preise_lesen`, `projekte_auflisten`, `projekt_lesen` und `projekt_speichern`, jeweils mit Beschreibung und Eingabeschema. |
| AC-F12-2 | Angenommen gültige Eingaben, wenn `kosten_berechnen` aufgerufen wird, dann ist das Ergebnis identisch mit `hfcalc rechnen --json`. |
| AC-F12-3 | Angenommen eine ungültige Eingabe, wenn ein Werkzeug aufgerufen wird, dann antwortet der Server mit einer Fehlermeldung, die das Feld nennt, und läuft weiter. |
| AC-F12-4 | [manuell] Angenommen die Einrichtung ist erfolgt, wenn der Nutzer in Claude Desktop und in Codex nach den Kosten eines Films fragt, dann rufen beide `kosten_berechnen` auf. |

**Nicht-Ziele:** kein Server im Internet; kein Zugriff für ChatGPT im Browser.

---

## F13 — Einrichtung

| ID | Kriterium |
|---|---|
| AC-F13-1 | Angenommen eine frische Installation, wenn `hfcalc einrichten` läuft, dann ist der MCP-Server in der Claude-Desktop-App, in `~/.codex/config.toml` und bei Claude Code (für alle Projekte) eingetragen; fehlt der Befehl `claude`, nennt eine Meldung den Befehl zum Nachholen. |
| AC-F13-2 | Angenommen die Einrichtung lief schon einmal, wenn sie erneut läuft, dann entstehen keine doppelten Einträge. |
| AC-F13-3 | Angenommen die Konfigurationsdateien enthalten fremde Einträge, wenn eingerichtet wird, dann bleiben diese unverändert und vorher entsteht eine Sicherungskopie. |
| AC-F13-4 | Angenommen der Datenordner existiert noch nicht, wenn eingerichtet wird, dann entsteht er mit den Startdaten; ein vorhandener Datenordner wird nie überschrieben. |
| AC-F13-5 | Angenommen der Datenordner wurde gerade angelegt und Git ist vorhanden, wenn die Einrichtung endet, dann ist er ein Git-Repository mit `.gitignore` (Ordner `cache/`) und einem ersten Commit der Startdaten. |

**Nicht-Ziele:** kein Installer-Paket; keine automatische Aktualisierung.

---

## F15 — Gesamtkalkulation mehrerer Projekte (seit 25.10.2026)

Mehrere gespeicherte Projekte lassen sich summieren. Jedes Projekt wird mit den heutigen Preisen neu gerechnet, ohne seinen gespeicherten Kontostand; der aktuelle Kontostand gilt nur in der Gesamtkalkulation und wird genau einmal abgezogen. Beispiel: 5.000 + 8.000 + 2.000 = 15.000 Credits, abzüglich 3.000 im Konto ergibt 12.000 Credits zum Nachkaufen.

| ID | Kriterium |
|---|---|
| AC-F15-1 | Angenommen drei Projekte mit 5.940, 2.970 und 1.155 Credits Bedarf und ein Kontostand von 3.000, wenn die Gesamtkalkulation rechnet, dann ist die Summe 10.065 Credits und der Fehlbetrag 7.065 Credits. |
| AC-F15-2 | Angenommen die Projekte haben eigene gespeicherte Kontostände, wenn summiert wird, dann zählen diese nicht mit. |
| AC-F15-3 | Angenommen ein Fehlbetrag, wenn die Pakete gesucht werden, dann gilt die günstigste Kombination wie beim Einzelprojekt, als Tabelle mit Bruttopreisen. |
| AC-F15-4 | Angenommen der Kontostand deckt alle ausgewählten Projekte, wenn summiert wird, dann ist nichts zu kaufen, und ein Hinweis nennt die übrigen Credits. |
| AC-F15-5 | Angenommen ein Projekt hat für seine Kombination keinen Preis, wenn summiert wird, dann steht es mit Grund in der Liste, aber nicht in der Summe. |
| AC-F15-6 | Angenommen ein ungültiger Kontostand wie −5, wenn summiert wird, dann erscheint eine Meldung statt eines Betrags. |
| AC-F15-7 | Angenommen der Nutzer hakt Projekte an, wenn er die App neu startet, dann sind dieselben Projekte wieder angehakt (gemerkt in `gesamtkalkulation.json` im Datenordner); eine beschädigte Datei ergibt eine leere Auswahl mit Meldung. |
| AC-F15-8 | Angenommen zwei angehakte Projekte und 3.000 Credits Kontostand, wenn das Ergebnis erscheint, dann steht oben die Summe brutto mit Pakettabelle und darunter die Tabelle Projekt, Weg, Credit-Bedarf mit den Zeilen Summe, Abzüglich Kontostand und Nachzukaufen. |
| AC-F15-9 | Angenommen ein Kontostand in der Gesamtkalkulation, wenn der Nutzer zurück zum Einzelprojekt wechselt, dann ist der Credit-Stand dort unverändert. |

**Nicht-Ziele:** keine Gesamtkalkulation über Kommandozeile oder MCP-Server; keine benannten Gesamtkalkulationen; kein Bearbeiten der Projekte aus der Gesamtkalkulation heraus.

---

## F14 — Gestaltung im Higgsfield-Look

Keine Kriterien erforderlich. Die Gestaltung ist durch `src/styles/tokens.css` und `docs/UI-RULES.md` festgelegt.

---

## Entscheidungen und Standardwerte

**Vom Autor entschieden am 09.10.2026:**

1. **Alle Credit-Pakete kommen in die Datenbasis:** 100 (8,50 $ / Rabatt 6,25 $), 200 (17 $ / 12 $), 500 (42,50 $ / 26 $), 1.000 (85 $ / 49 $), 2.000 (170 $ / 95 $), 4.000 (340 $ / 190 $) und über den Regler 5.000 (425 $ / 235 $). Die Reglerstufen 7.000, 9.000, 11.000, 13.000, 15.000, 17.000, 19.000, 21.000, 23.000, 25.000 und 100.000 Credits werden mit Preis „unbekannt“ angelegt, weil nur die Stufe 5.000 abgelesen wurde. Stand: 09.10.2026, Quelle: Kauf-Fenster „Credits aufladen“ im Konto.
2. **Beide Seedance-2.0-Pässe kommen in die Datenbasis:** der Pass „Enhanced Fast und Mini“ mit den Werten aus der Beschreibung und zusätzlich der Pass „Unlimited Seedance 2.0“ mit 65 $ (1 Tag), 195 $ / 152 $ (3 Tage) und 455 $ / 293 $ (7 Tage) bis 720p. Die Stufe bis 1080p wird mit Preis „unbekannt“ angelegt. Bedingungen laut Kauf-Fenster: 1 Generierung gleichzeitig, Clips bis 15 s, nur Standard-Generierungsmodi. Welche Modelle der zweite Pass genau abdeckt, ist nicht bestätigt: Er wird für Seedance 2.0 Standard, Enhanced Fast und Mini hinterlegt, mit dem Vermerk „Modelle nicht bestätigt“, und der Kalkulator weist im Ergebnis darauf hin. Verglichen wird er wie jeder Pass mit dem günstigsten abgedeckten Modell in seiner Auflösungsstufe über Credits.
3. **Die Gesamtempfehlung vergleicht nur Wege, die die gewählte Auflösung liefern.** Günstigere Wege mit niedrigerer Auflösung erscheinen als Hinweis.

**Standardwerte, später leicht änderbar:**

4. Bruchteile von Credits (zum Beispiel 4,5 × 7,5 s = 33,75) werden genau gerechnet und nur in der Anzeige auf eine Nachkommastelle gerundet.
5. Das Feld „Auflösung“ ist die **Zielauflösung**. Bei gewähltem Modell „Seedance 2.5 Draft“ ist sie fest 1080p, die Versuche laufen in 480p und die 1080p-Fertigstellung wird einmal je Clip mitgerechnet; das Feld zeigt „480p → 1080p“.
6. ~~Neues optionales Eingabefeld „Bereits fertig (MM:SS)“~~ ⟶ überholt am 09.10.2026: Eingegeben wird nur der offene Umfang, wahlweise als Dauer oder als Clipanzahl, jeweils plus Aufschlag (F1, F7).
7. Für den Pass-Vergleich mit Rabattpreisen gilt der günstigste Rabattpreis je Credit unter den Paketen bis 4.000 Credits (0,0475 $), so wie in der Prüftabelle aus Abschnitt 4.5. Das 5.000er-Paket (0,047 $) ist dafür bewusst ausgenommen, damit die Prüfwerte aus 4.5 gelten.
8. Der Generate-Button zeigte für Seedance 2.0, 720p, 8 s, Ton an, Bitrate hoch 48 Credits statt 36. Die Datenbasis bleibt bei 4,5 Credits je Sekunde; der Nutzer prüft den Wert bei Gelegenheit am Button nach.
9. ~~**Zwei Euro-Maßstäbe, klar getrennt.**~~ ⟶ ruht seit 25.10.2026 mit den Pässen (Entscheidung 28). (a) Das Pass-Urteil und die Gewinnschwelle folgen Abschnitt 4.5: Video-Credits des Films bzw. des Passes zum Paketpreis je Credit, mit Mehrwertsteuer, ohne Bilder (sie fallen auf beiden Seiten gleich an) und ohne Abzug des Credit-Stands. (b) Die Gesamtempfehlung und die Zahl oben im Ergebnis vergleichen die tatsächlichen Zusatzkosten: Credit-Weg = günstigste Pakete für (Video + alle Bilder − Credit-Stand); Pass-Weg = Passpreis + günstigste Pakete für (alle Bilder − Credit-Stand). Erreichbar ist ein Pass-Weg nur, wenn die nötigen Versuche in seinen Zeitraum passen.
10. **Produktionswege:** Für jedes Videomodell und jede Auflösung mit Preis „known“ oder „unknown“ entsteht ein Weg; „unavailable“ entsteht nie. Das Draft-Modell erzeugt keinen eigenen Weg, sondern den Weg „Draft + 1080p-Fertigstellung“. Angezeigt werden alle Wege ab 720p und zusätzlich die Zielauflösung; Wege ohne Preis stehen als „ohne Preis“ am Ende. Empfohlen wird nur aus Wegen mit gleicher oder höherer Auflösung als die Zielauflösung.
11. **Abgerechnete Sekunden:** Video-Credits eines Wegs = Clipanzahl × max(Cliplänge, Mindestlänge) × Versuche × Credits je Sekunde; beim Draft-Weg zusätzlich Clipanzahl × max(Cliplänge, Mindestlänge) × Fertigstellungspreis. Bei aufgerundeter Clipanzahl wird die Cliplänge nicht neu berechnet.
12. **Rabatt:** Standardumfang Seedance 2.5 und Seedance 2.5 Draft in 1080p; die Draft-Fertigstellung zählt als Seedance 2.5 in 1080p. Gewinnschwellen in Sekunden rechnen mit den Credits je Sekunde einschließlich eines aktiven Rabatts.
13. **Wechselkurs-Abruf:** einmal beim Start der App bzw. bei jedem Aufruf von Kommandozeile oder MCP-Server; ein gespeicherter Kurs mit dem Datum des aktuellen Bankarbeitstags wird ohne Abruf verwendet. Die Oberfläche rechnet sofort mit dem gespeicherten Kurs und aktualisiert, sobald der Abruf zurück ist. Euro-Preise in den Daten sind netto. Ohne jeden Kurs wird in Dollar verglichen; Pakete mit Euro-Preis werden dann mit Hinweis ausgeschlossen.
14. ~~**Oben im Ergebnis** steht die Gesamtempfehlung.~~ ⟶ überholt am 25.10.2026 durch Entscheidung 23. Weicht die gewählte Kombination aus Modell und Auflösung davon ab, steht darunter eine Zeile „Deine Auswahl: … kostet … €“.

**Vom Autor entschieden am 25.10.2026 (Bilder):**

15. **Storyboard wahlweise, beim Start aus.** Erst eingeschaltet wird nach dem Bildmodell für das Storyboard gefragt. Kommandozeile und MCP-Server: Ohne `--storyboard` bzw. `storyboardModelId` ist es aus.
16. **Lichtbilder und Referenzbilder je Clip zählen immer.** Pflichtfeld ist das Bildmodell dafür (jedes Bildmodell aus `bildmodelle.json`). Die Zahl der Bilder je Clip ist 3,5 und steht in „Weitere Einstellungen“. Herkunft: Im Testfilm des Autors entstanden für 129 angenommene Clips 450 solcher Bilder, Fehlversuche und wiederverwendete Lichtbilder schon eingerechnet (Versuchsliste des Testfilms, ausgewertet am 25.10.2026).
17. **Einmalige Assets wahlweise, beim Start aus.** Eingeschaltet fragen sie nach Bildmodell, Personen und Orten im Film und Anläufen pro Asset. Zahl der Assets = Personen × 3 + Orte × 9; Bilder = Assets × Anläufe. Herkunft: Der Testfilm des Autors hatte 5 Personen und 3 Orte und am Ende 43 Assets im Ordner `03_Referenzen`, davon 16 zu Personen (Figuren, Varianten, persönliche Gegenstände) und 27 zu Orten (Ansichten, Ausstattung). Für diese 43 Assets entstanden rund 333 bezahlte Bilder, also knapp 8 Anläufe pro Asset. Der Nutzer hat sich für eine Zahl und einen Durchschnitt entschieden statt für getrennte Anläufe nach Art des Assets (Figuren brauchten rund 18, Orte rund 6, Gegenstände 1 bis 2).
18. **Seedream 5.0 Pro bleibt bei 3 Credits je Bild**, obwohl beim Testfilm des Autors 2,5 Credits abgebucht wurden. Der Kalkulator rechnet damit bewusst eher zu teuer als zu billig.

**Vom Autor entschieden am 25.10.2026 (Startwerte und Bedienung):**

19. **Rechts steht immer ein Ergebnis**, auch beim allerersten Öffnen: alle Felder sind vorbelegt (`startValues` in `einstellungen.json`). 3 Versuche pro Clip stammen aus einem Testfilm des Autors (381 Video-Generierungen für 129 angenommene Clips, 2,95 je Clip).
20. **Dauer über einen stufenlosen Regler bis 15 Minuten**, zusätzlich über das Eingabefeld; vorbelegt 10:00.
21. **Credit-Stand live aus dem Higgsfield-Konto**, von Hand überschreibbar. Der Abruf läuft über die auf dem Mac angemeldete Higgsfield-Kommandozeile; Kommandozeile `hfcalc` und MCP-Server holen ihn nicht selbst (Agenten haben dafür eigene Higgsfield-Werkzeuge).
22. **Storyboard und einmalige Assets** stehen eingeschaltet jeweils mit allen Einstellungen in einer Box mit dem Kippschalter, nur durch feine Linien getrennt.

**Vom Autor entschieden am 25.10.2026 (Ergebnis und Paketpreise):**

23. **Oben steht immer deine Auswahl.** Video- und Bildmodell sind bewusste Entscheidungen, keine Optionen: Die Zahl oben rechnet mit dem gewählten Videomodell in der gewählten Auflösung und vergleicht nur die Bezahlwege (Credit-Pakete oder ein erreichbarer Pass, der das Modell abdeckt). Groß der Bruttopreis, klein Nettopreis und Credits, dazu die Pakete, die zu kaufen sind. Begründung, Schwelle und Hinweise stehen nicht mehr oben, sondern aufgeklappt in den Vergleichslisten; dort dürfen andere Wege und Modelle mit ihrem Preis stehen.
24. **Paketpreise vom 25.10.2026** (Kauf-Fenster, Bildschirmfotos vom Autor): 100 (8,50 $ / Rabatt 6 $), 200 (17 $ / 12 $), 500 (42,50 $ / 29 $), 1.000 (85 $ / 56 $), 2.000 (170 $ / 105 $), 4.000 (340 $ / 211 $), 5.000 (425 $ / 250 $), 7.000 (595 $ / 350 $), 9.000 (765 $ / 450 $), 11.000 (935 $ / 550 $). Ab 13.000 Credits bleibt der Preis „unbekannt“. Die Prüfwerte dieser Spezifikation (zum Beispiel AC-F3-6, AC-F5-1, Entscheidung 7) beruhen weiter auf den Preisen vom 09.10.2026 und werden mit Testdaten in diesem Stand geprüft.

**Vom Autor entschieden am 25.10.2026 (Pakete, Pässe, Preis-Leistung):**

25. **Alle Euro-Beträge brutto.** Nur die große Zahl oben trägt klein zusätzlich den Nettobetrag. Was zu kaufen ist, steht als dezente Tabelle: Anzahl, Paket, Preis je Paket, Summe und am Ende alle Pakete zusammen. Darunter steht zum Vergleich das günstigste einzelne Paket, das allein reichen würde.
26. **Paketpreise aus der Datenbank, mit Stand.** Higgsfield bietet keinen offiziellen Abruf der Paketpreise (die Kommandozeile kennt keinen, Higgsfields Werkzeug für Claude zeigt nur ein Verkaufsfenster). Die App zeigt deshalb, von wann die Preise stammen („Paketpreise vom 25.10.2026“); ändern sich die Rabatte, trägt Claude sie nach einem Bildschirmfoto nach. Standard-Preisstand ist „Mit Rabatt“, also der Preis, den Higgsfield gerade verlangt. Die Paketsuche wählt immer die günstigste Kombination aller Paketgrößen mit Preis, auch gegen ein einzelnes größeres Paket (AC-F3-8).
27. **Vergleichsliste nach Preis-Leistung.** Qualitätspunkte = Punkte der Auflösung (480p = 1, 720p = 2, 1080p = 3, 4K = 4) × Modellfaktor (Seedance 2.5 und Draft = 1,0 wegen des Referenz-Workflows, 2.0 Standard = 0,8, 2.0 Enhanced Fast = 0,7, Mini = 0,6), hinterlegt in `preise/qualitaet.json`. Sortiert wird nach Kosten brutto je Punkt für den ganzen Film, ohne Abzug des Credit-Stands, damit das Guthaben die Reihenfolge nicht verzerrt. Empfehlung ist das beste Verhältnis, nicht zwingend der günstigste Weg.
28. **Unlimited-Pässe ausgebaut.** Der Kalkulator kennt keine Pässe mehr und schlägt nur Wege über Credit-Stand und Pakete vor. Die Sicherung ist nicht Teil der öffentlichen Fassung; F5 und Entscheidungen 2, 7 und 9 ruhen.

**Vom Autor entschieden am 25.10.2026 (Gesamtkalkulation und Liste):**

29. **Unterschied zu deiner Auswahl in der Vergleichsliste**, als „+… €“ oder „−… €“ brutto unter dem Preis. Keine Rahmen um Zahlen in den Listen; nur die grüne Empfehlungszeile behält ihren Rahmen.
30. **Gesamtkalkulation (F15):** nur in der App; die Projekte werden mit heutigen Preisen neu gerechnet; die letzte Auswahl wird im Datenordner gemerkt; Paketpreisstand wie in `einstellungen.json`.

**Vom Autor entschieden am 26.10.2026 (Projekte ändern und Credit-Zahl):**

31. **Credit-Bedarf groß, aber zweitrangig.** In der Ergebniskarte steht der Credit-Bedarf unter dem Bruttopreis als zweite große Zahl (Schriftgröße 28 statt 48, Sekundärfarbe). Damit ergänzt diese Entscheidung Entscheidung 23, die die Credits noch in der kleinen Zeile führte.
32. **Projekte ändern.** Löschen heißt Verschieben in den Papierkorb `projekte/papierkorb/` mit Rückfrage, weil die App nie Dateien löscht; zurückholen lässt sich ein Projekt durch Zurücklegen der Datei. Ein geladenes Projekt speichert „Änderungen speichern“ direkt ohne Rückfrage, weil ein geladenes Projekt bewusst weiterbearbeitet wird; daneben „Als neues Projekt speichern“ und „Umbenennen“.
