> **Hinweis für Claude Code:** Das ist die ursprüngliche Beschreibung vom 09.10.2026. Sie ist die fachliche Grundlage für Rechenregeln, Prüfwerte und Startdaten (Abschnitte 2 bis 5). Abschnitt 8 („Vorgehen“) ist erledigt und keine Anweisung mehr. Wo diese Datei und `docs/SPEC.md` voneinander abweichen, gilt `docs/SPEC.md` — insbesondere die Abschnitte „Entscheidungen und Standardwerte“ (weitere Credit-Pakete, zweiter Seedance-2.0-Pass, Gesamtempfehlung nur für die gewählte Auflösung, Feld „Bereits fertig“). Diese Datei wird nicht verändert.

# Higgsfield-KI-Film-Kostenkalkulator

## 1. Ziel

Ich möchte einen Kostenkalkulator für KI-Filme bauen, die ich mit Higgsfield produziere. Der Kalkulator berechnet aus wenigen Ausgangsparametern die voraussichtlichen Kosten eines Films. Er gibt das Ergebnis immer in zwei Einheiten aus: einmal in Credits und einmal als reale Kosten in Euro.

Der Kalkulator rechnet nicht nur die Videogenerierung, sondern auch die Storyboard-Bilder mit ein. Beide Posten werden zu einer Gesamtsumme zusammengerechnet. Weitere Nebenkosten wie Referenzbilder, Figurenblätter oder Stimmen sind vernachlässigbar und bleiben in der ersten Version bewusst draußen. Die Datenbasis soll aber so gebaut sein, dass sich solche Posten später ergänzen lassen.

Die Euro-Kosten entstehen nicht aus einem Durchschnittspreis pro Credit. Sie entstehen aus dem Geld, das ich tatsächlich zusätzlich ausgeben muss: für Credit-Pakete, die meinen aktuellen Credit-Stand auffüllen, oder für einen Unlimited-Pass. Die genaue Rechenregel steht in Abschnitt 4.

Der Kalkulator ist auf drei Wegen bedienbar:

1. über eine grafische Oberfläche für mich als Menschen, mit allen Eingabefeldern und Einstellmöglichkeiten aus Abschnitt 2,
2. über die Kommandozeile,
3. durch KI-Agenten wie Claude oder ChatGPT.

Alle drei Wege nutzen denselben Rechenkern. Dadurch liefern sie bei gleichen Eingaben immer exakt dasselbe Ergebnis. Details stehen in Abschnitt 6.

---

## 2. Eingabeparameter

| Nr. | Parameter | Erlaubte Werte | Standardwert | Pflicht / optional | Hinweis |
|---|---|---|---|---|---|
| 1 | Aktueller Credit-Stand im Higgsfield-Konto | ganze Zahl, in Credits | – | Pflicht | Wird vom Credit-Bedarf abgezogen, bevor Pakete berechnet werden. |
| 2 | Voraussichtliche Dauer des Films | Format MM:SS | – | Pflicht | Geplante Nettolänge ohne Zwischenszenen und Inserts. |
| 3 | Durchschnittliche Cliplänge | 1 bis 20 Sekunden | 7,5 Sekunden | optional | Daraus leitet der Kalkulator die Anzahl der Clips ab. Regeln siehe Abschnitt 4.1. |
| 4 | Anzahl der Clips | 1 bis 1.000 | aus Dauer und Cliplänge abgeleitet | optional | Wenn angegeben, hat dieser Wert Vorrang. Wird für die Storyboard-Kosten gebraucht. |
| 5 | Videomodell | Seedance 2.5, Seedance 2.5 Draft, Seedance 2.0 Standard, Seedance 2.0 Enhanced Fast, Seedance 2.0 Mini | – | Pflicht | Seedance 2.5 Draft erzeugt immer 480p. |
| 6 | Auflösung | 480p, 720p, 1080p, 4K | – | Pflicht | Erlaubte Kombinationen siehe Abschnitt 3. Unzulässige Kombinationen lehnt der Kalkulator mit einer verständlichen Meldung ab. |
| 7 | Rabatt auf Generierungspreise | Prozentwert | 25 %, Kippschalter beim Start ausgeschaltet | optional | Per Kippschalter an- und abschaltbar. Beim Start ist der Rabatt ausgeschaltet, weil die Planung mit regulären Preisen rechnen soll. Zusätzlich lässt sich festlegen, auf welche Modelle und welche Auflösungen der Rabatt greift. |
| 8 | Durchschnittliche Anzahl der Versuche pro Clip | 1 bis 20 | – | Pflicht | Jeder Versuch kostet den vollen Clip-Preis. |
| 9 | Zusätzliche Zwischenszenen und Inserts | 20 % bis 50 %, in 5-%-Schritten | – | Pflicht | Aufschlag auf die voraussichtliche Filmdauer. |
| 10 | Bildmodell für das Storyboard | Seedream 5.0 Flash, Seedream 5.0 Pro | – | Pflicht | Pro Clip zwei Storyboard-Bilder. Preise siehe Abschnitt 3.4. |
| 11 | Preisstand der Credit-Pakete | regulär, mit Rabatt | regulär | optional | Legt fest, mit welchen Paketpreisen die Euro-Kosten berechnet werden. |
| 12 | Audio-Aufschlag für Seedance 2.0 | 0 %, 50 %, 100 % | 0 % | optional | Laut Higgsfield kann Ton bei Seedance 2.0 etwa 50 bis 100 % zusätzlich kosten. |
| 13 | Wechselkurs US-Dollar zu Euro | Zahl | live abgerufen | optional | Manuelle Eingabe überschreibt den Live-Wert. Regeln siehe Abschnitt 4.3. |
| 14 | Netto-Generierungsstunden pro Tag | 1 bis 24 Stunden | 6 Stunden | optional | Zeit, in der pro Tag tatsächlich generiert wird. Bestimmt, wie viele Versuche ein Unlimited-Pass schaffen kann. Regeln siehe Abschnitt 4.5. |
| 15 | Preisstand der Unlimited-Pässe | regulär, mit Rabatt | regulär | optional | Legt fest, mit welchen Passpreisen verglichen wird. Wie bei den Credit-Paketen gilt für die Planung standardmäßig der reguläre Preis. |

---

## 3. Preisdaten

Alle Credit-Preise gelten für das Seitenverhältnis 16:9.

### 3.1 Videomodell Seedance 2.5

Stand: 09.10.2026. Preis pro Sekunde Videolänge, ohne Rabatt.

| Modell | Auflösung | Credits pro Sekunde | Beispiel 5 s | Beispiel 10 s |
|---|---|---|---|---|
| Seedance 2.5 | 480p | 3 | 15 | 30 |
| Seedance 2.5 | 720p | 7 | 35 | 70 |
| Seedance 2.5 | 1080p | 16 | 80 | 160 |
| Seedance 2.5 Draft | 480p (Entwurf) | 3 | 15 | 30 |

Regeln für Seedance 2.5:

- Ein Draft ist ein Entwurf in 480p. Ein Draft kann innerhalb von 7 Tagen in 1080p fertiggestellt werden.
- Die Fertigstellung eines Drafts kostet zusätzlich den vollen 1080p-Preis von 16 Credits pro Sekunde. Der Inhalt des Videos bleibt bei der Fertigstellung gleich.
- Bei Rabattaktionen kostet 1080p 12 statt 16 Credits pro Sekunde. Am 09.10.2026 lief eine solche Aktion. Für die Planung gilt der reguläre Preis von 16 Credits.
- Die Preise steigen linear mit der Länge des Clips.
- Ein generierter Clip ist mindestens 4 und höchstens 30 Sekunden lang.
- 4K gibt es bei Seedance 2.5 nicht.

### 3.2 Videomodell Seedance 2.0

Stand: 09.10.2026. Quellen: [Higgsfield-Preisübersicht](https://higgsfield.ai/blog/seedance-2-0-pricing-2026) für 720p und [Higgsfield: AI Video Credits](https://higgsfield.ai/blog/ai-video-credits-explained) für 1080p. Preis ohne Rabatt, ohne Ton.

| Modell | Auflösung | Credits pro Sekunde | Beispiel 5 s | Beispiel 8 s | Beispiel 10 s |
|---|---|---|---|---|---|
| Seedance 2.0 Standard | 720p | 4,5 | ca. 23 | 36 | 45 |
| Seedance 2.0 Standard | 1080p | 9 | 45 | 72 | 90 |
| Seedance 2.0 Enhanced Fast | 720p | 3,5 | ca. 17,5 | 28 | 35 |
| Seedance 2.0 Standard | 480p | unbekannt | – | – | – |
| Seedance 2.0 Standard | 4K | unbekannt | – | – | – |
| Seedance 2.0 Enhanced Fast | 480p | unbekannt | – | – | – |
| Seedance 2.0 Mini | 480p, 720p | unbekannt | – | – | – |

Regeln für Seedance 2.0:

- Enhanced Fast gibt es nur in 480p und 720p. Standard unterstützt 480p bis 4K.
- Ein generierter Clip ist mindestens 4 und höchstens 15 Sekunden lang.
- Für die vier Varianten mit „unbekannt“ veröffentlicht Higgsfield keine festen Credit-Werte. Die genaue Zahl erscheint erst am Generate-Button, nachdem Modell, Auflösung, Länge und Ton gewählt wurden. Diese Werte werden weder geschätzt noch aus Preisen der Programmierschnittstelle abgeleitet. Sobald ich einen Wert am Generate-Button ablese, wird er in der Datenbasis nachgetragen.
- Wenn ein Preis „unbekannt“ ist, rechnet der Kalkulator nicht mit einer Schätzung. Er meldet stattdessen klar, dass für diese Kombination kein Preis hinterlegt ist.

Festlegung zur Modellwahl: Seedance 2.5 Draft bleibt meine Testbasis, weil Seedance 2.5 den aktuellen Referenz-Workflow bietet. Der Kalkulator soll trotzdem sichtbar machen, wo Seedance 2.0 günstiger ist:

- Bei 720p kostet Seedance 2.0 Enhanced Fast mit 3,5 Credits pro Sekunde nur halb so viel wie Seedance 2.5 mit 7 Credits pro Sekunde.
- Bei 1080p kostet Seedance 2.0 Standard mit 9 Credits pro Sekunde gut die Hälfte von Seedance 2.5 mit 16 Credits pro Sekunde.
- Für 1080p gibt es keinen Seedance-2.0-Pass. Der Seedance-2.0-Pass deckt nur Enhanced Fast und Mini bis 720p ab.

### 3.3 Bildmodelle

Stand: 09.10.2026. Preis pro Bild.

| Modell | Einstellung | Auflösung | Credits pro Bild |
|---|---|---|---|
| Seedream 5.0 Flash | – | alle | 0,5 |
| Seedream 5.0 Pro | – | alle | 3 |
| GPT Image 2.5 Sunburst | Qualität high | 1k | 1,5 |
| GPT Image 2.5 Sunburst | Qualität high | 2k | 2,75 |
| GPT Image 2.5 Sunburst | Qualität high | 4k | 4,25 |
| GPT Image 2.5 Flare | Qualität high | 1k | 1,5 |
| GPT Image 2.5 Flare | Qualität high | 2k | 2,75 |
| GPT Image 2.5 Flare | Qualität high | 4k | 4,25 |

Hinweise zu den Bildmodellen:

- Für Seedream 5.0 Pro gab es widersprüchliche Angaben (1,25 bis 3 Credits pro Bild). Festgelegt ist der höchste Wert von 3 Credits für alle Auflösungen. Die Planung fällt dadurch eher etwas zu teuer als zu billig aus.
- Sunburst und Flare kosten bei gleicher Einstellung gleich viel.
- Ob in den Bildpreisen ein Rabatt steckt, ist nicht bekannt. Es gibt keine Vergleichsliste ohne Rabatt.

### 3.4 Storyboard-Kosten

Pro Clip werden zwei Storyboard-Bilder generiert.

| Storyboard-Modell | Credits pro Bild | Credits pro Clip |
|---|---|---|
| Seedream 5.0 Flash | 0,5 | 1 |
| Seedream 5.0 Pro | 3 | 6 |

### 3.5 Higgsfield-Unlimited-Pässe

Stand: 09.10.2026. Quelle sind Bildschirmfotos aus meinem Higgsfield-Konto. Preise in US-Dollar, ohne Mehrwertsteuer.

Unlimited bedeutet: Ich zahle einmal und kann dann im gewählten Zeitraum ohne Credits unbegrenzt Videos mit dem jeweiligen Modell erzeugen. Unlimited ist kein Abo. Es gibt zwei Pässe für verschiedene Modelle.

#### Pass für Seedance 2.5

| Zeitraum | Stufe | Preis regulär | Preis mit Rabatt | Rabatt | Preis pro Tag mit Rabatt |
|---|---|---|---|---|---|
| 1 Tag | bis 720p | 120 $ | kein Rabatt | – | 120 $ |
| 3 Tage | bis 720p | 360 $ | 280 $ | 22 % | ca. 93 $ |
| 7 Tage | bis 720p | 840 $ | 540 $ | 36 % | ca. 77 $ |
| 1 Tag | bis 1080p | 180 $ | kein Rabatt | – | 180 $ |
| 3 Tage | bis 1080p | 540 $ | 420 $ | 22 % | 140 $ |
| 7 Tage | bis 1080p | 1.260 $ | 810 $ | 36 % | ca. 116 $ |

Bedingungen: eine Generierung gleichzeitig, Clips bis 30 Sekunden.

#### Pass für Seedance 2.0 Enhanced Fast und Mini

| Zeitraum | Stufe | Preis regulär | Preis mit Rabatt | Rabatt | Preis pro Tag mit Rabatt |
|---|---|---|---|---|---|
| 1 Tag | bis 720p | 30 $ | kein Rabatt | – | 30 $ |
| 3 Tage | bis 720p | 90 $ | 70 $ | 22 % | ca. 23 $ |
| 7 Tage | bis 720p | 210 $ | 135 $ | 36 % | ca. 19 $ |

Bedingungen: eine Generierung gleichzeitig, Clips bis 15 Sekunden, nur Enhanced Fast und Mini. Seedance 2.0 Standard ist in diesem Pass nicht enthalten.

#### Regeln für beide Pässe

- Der Entwurfsmodus (Draft) ist in keinem Pass enthalten. Drafts lassen sich also nicht über einen Pass erzeugen, und Drafts lassen sich auch nicht über einen Pass in 1080p fertigstellen. Der Draft-Weg läuft immer vollständig über Credits.
- Mit Credits sind im Tarif Ultra bis zu zehn Generierungen gleichzeitig möglich, mit einem Pass nur eine.
- Wann die Rabatte auf die 3- und 7-Tages-Pässe enden, ist nicht bekannt. Der Kalkulator rechnet deshalb wahlweise mit regulären oder rabattierten Passpreisen (Eingabefeld 15).

Noch nicht geklärt (vor dem Kauf in Higgsfield nachsehen):

- ob Ton, Referenzbilder und alle Modi enthalten sind,
- ob Unlimited-Generierungen in der Warteschlange hinten anstehen.

**Regel:** Auf alle Unlimited-Preise muss die deutsche Mehrwertsteuer von 19 % aufgeschlagen werden.

### 3.6 Credit-Pakete zum Einzelkauf

Stand: 09.10.2026, live abgefragt, Konto im Tarif Ultra. Preise in US-Dollar, ohne Mehrwertsteuer.

| Paket | Preis regulär | Preis mit Rabatt | Rabatt |
|---|---|---|---|
| 1.000 Credits | 85 $ | 49 $ | 42 % |
| 2.000 Credits | 170 $ | 95 $ | 44 % |
| 4.000 Credits | 340 $ | 190 $ | 44 % |

- Gekaufte Credits verfallen nach 90 Tagen.
- 4.000 Credits ist das größte einmalige Paket. Mehrere Pakete dürfen kombiniert werden.

**Regel:** Auf alle Paketpreise muss die deutsche Mehrwertsteuer von 19 % aufgeschlagen werden.

### 3.7 Generierungsdauer (für die Unlimited-Rechnung)

Stand: 09.10.2026. Quelle: von Higgsfield veröffentlichte Messwerte ([Higgsfield: gemessene Generierungszeiten](https://higgsfield.ai/blog/how-long-ai-video-generation-takes)). Eine Generierung gleichzeitig, Wartezeit in der Warteschlange eingerechnet. Für den Unlimited-Pass selbst gibt es keine bestätigte Generierungsdauer. Der Higgsfield-Support bestätigt nur, dass im Pass jeweils eine reguläre Generierung läuft, nennt aber keine Geschwindigkeit.

| Auflösung | Gemessene Dauer pro Versuch | Versuche in 6 Stunden netto |
|---|---|---|
| 720p | 8-s-Clip: 3,5 bis 4 Minuten | ca. 90 bis 103 |
| 1080p | 4-s-Clip: 3,8 Minuten; 15-s-Clip: 5,1 Minuten | ca. 70 bis 95 |

Praxiswerte für die Standard-Cliplänge von 7,5 Sekunden (Prüfwerte für Tests):

| Auflösung | Dauer pro Versuch | Versuche in 6 Stunden netto |
|---|---|---|
| 720p | rund 4 Minuten | ca. 90 |
| 1080p | rund 4,2 bis 5 Minuten | ca. 72 bis 85 |

Der 1080p-Wert ist unsicherer als der 720p-Wert, weil die veröffentlichten 1080p-Messungen keine Warteschlange im Unlimited-Pass berücksichtigen.

Regeln für die Generierungsdauer:

- Bei 1080p hängt die Dauer von der Cliplänge ab. Für Cliplängen zwischen 4 und 15 Sekunden wird linear zwischen den beiden Messwerten gerechnet. Für längere Clips wird die Gerade über 15 Sekunden hinaus fortgesetzt und ein Hinweis angezeigt, dass dieser Wert nicht gemessen ist.
- Bei 720p gibt es nur einen Messwert für 8-s-Clips. Er gilt vorerst für alle Cliplängen.
- Für die Empfehlung rechnet der Kalkulator mit dem langsameren Wert: 4 Minuten bei 720p und bei 1080p mindestens 5 Minuten, auch wenn die lineare Rechnung weniger ergibt (bei 7,5 Sekunden ergibt sie rund 4,2 Minuten). Der Grund: Eine Empfehlung für einen Pass soll nicht darauf beruhen, dass jeder Tag optimal läuft, und die 1080p-Werte sind für den Pass besonders unsicher. Die Spanne bis zum schnelleren Wert wird zusätzlich angezeigt.
- Für Seedance 2.0 Enhanced Fast und Mini gibt es keine Messwerte. Bis Messwerte vorliegen, rechnet der Kalkulator mit dem 720p-Wert von Seedance 2.5 und kennzeichnet ihn als Annahme. Diese Annahme ist eher vorsichtig, weil Higgsfield Enhanced Fast als schnellstes Seedance-2.0-Modell bewirbt.
- Die Messwerte stammen aus der Generierung mit Credits. Ob Unlimited-Generierungen in der Warteschlange hinten anstehen, ist nicht geklärt. Der Kalkulator weist darauf hin, dass der tatsächliche Durchsatz mit einem Pass niedriger sein kann.
- Die Messwerte liegen in der Datenbasis und lassen sich wie Preise aktualisieren.

---

## 4. Rechenregeln

### 4.1 Clipanzahl und Cliplänge

- Wird die Anzahl der Clips angegeben, gilt diese Zahl. Die Cliplänge ergibt sich dann aus der Filmdauer inklusive Aufschlag geteilt durch die Clipanzahl.
- Wird keine Clipanzahl angegeben, gilt: Clipanzahl = Filmdauer inklusive Aufschlag für Zwischenszenen und Inserts, geteilt durch die durchschnittliche Cliplänge, aufgerundet.
- Die Cliplänge im fertigen Film darf kürzer sein als die Mindestlänge einer Generierung, weil Clips im Schnitt gekürzt werden. Abgerechnet wird aber mindestens die Mindestlänge des Modells (4 Sekunden). Liegt die eingestellte Cliplänge darunter, rechnet der Kalkulator pro Versuch mit 4 Sekunden und zeigt einen Hinweis an.
- Liegt die Cliplänge über der Höchstlänge des Modells (15 Sekunden bei Seedance 2.0), lehnt der Kalkulator die Eingabe mit einer verständlichen Meldung ab.

### 4.2 Euro-Kosten über Credit-Pakete

1. Der Kalkulator berechnet den gesamten Credit-Bedarf des Films (Video, Draft-Fertigstellungen, Storyboard).
2. Er zieht den aktuellen Credit-Stand ab. Das Ergebnis ist der Fehlbetrag.
3. Ist der Fehlbetrag null oder negativ, entstehen keine zusätzlichen Euro-Kosten. Der Kalkulator zeigt dann an, wie viele Credits übrig bleiben.
4. Ist der Fehlbetrag positiv, sucht der Kalkulator die günstigste Kombination von Credit-Paketen, die den Fehlbetrag deckt. Er zeigt die gewählten Pakete, den Preis mit 19 % Mehrwertsteuer in US-Dollar und in Euro sowie die überschüssigen Credits.
5. Bei überschüssigen Credits weist der Kalkulator darauf hin, dass gekaufte Credits nach 90 Tagen verfallen.
6. Für den Vergleich mit einem Unlimited-Pass werden dessen Preis mit Mehrwertsteuer und die Paketkosten des gleichen Szenarios gegenübergestellt.

### 4.3 Wechselkurs und Währung

- Higgsfield rechnet in Euro ab. Eine Bankgebühr für Zahlungen in Fremdwährung fällt deshalb nicht an und wird nicht eingeplant.
- Die vorliegenden Preise für Pakete und Pässe sind in US-Dollar notiert. Sie werden mit dem Wechselkurs in Euro umgerechnet, nachdem die 19 % Mehrwertsteuer aufgeschlagen wurden.
- Die Datenbasis erlaubt pro Preis eine Währungsangabe. Sobald Higgsfield-Preise direkt in Euro vorliegen, werden diese hinterlegt und ohne Umrechnung verwendet, weil Higgsfields eigene Euro-Preise vom umgerechneten Dollarpreis abweichen können.
- Der Kalkulator ruft bei jeder Berechnung den aktuellen Referenzkurs der Europäischen Zentralbank für US-Dollar zu Euro ab. Dieser Kurs ist kostenlos, braucht keinen Zugangsschlüssel und wird an Bankarbeitstagen einmal täglich aktualisiert.
- Der zuletzt abgerufene Kurs wird mit Datum gespeichert. Ohne Internetverbindung rechnet der Kalkulator mit diesem gespeicherten Kurs und nennt dessen Datum im Ergebnis.
- Ein manuell übergebener Kurs hat Vorrang vor dem Live-Kurs.
- Das Ergebnis nennt immer den verwendeten Kurs und dessen Datum.

### 4.4 Die drei Produktionswege mit Credits

Pro Sekunde fertigem Film und je nach Anzahl der Versuche (v) kosten die Wege mit Seedance 2.5:

| Produktionsweg | Formel in Credits pro Sekunde | Ergebnis-Auflösung |
|---|---|---|
| 720p direkt | 7 × v | 720p |
| 1080p direkt | 16 × v | 1080p |
| 480p Draft plus 1080p-Fertigstellung | 3 × v + 16 | 1080p |

Prüfwerte für Tests:

| Versuche pro Clip | 720p direkt | 1080p direkt | Draft plus 1080p |
|---|---|---|---|
| 1 | 7 | 16 | 19 |
| 2 | 14 | 32 | 22 |
| 3 | 21 | 48 | 25 |
| 4 | 28 | 64 | 28 |
| 5 | 35 | 80 | 31 |

Daraus folgen zwei Schwellen:

- Gegenüber 1080p direkt ist der Draft-Weg ab 2 Versuchen pro Clip günstiger. Bei nur 1 Versuch ist 1080p direkt günstiger, weil dann die Draft-Kosten zusätzlich anfallen.
- Gegenüber 720p direkt kostet der Draft-Weg bei 4 Versuchen gleich viel. Ab 5 Versuchen ist der Draft-Weg günstiger und liefert zusätzlich 1080p statt 720p.

### 4.4a Seedance 2.0 als weitere Option im Vergleich

Seedance 2.0 steht in der Modellauswahl zur Verfügung und erscheint im Vergleich der Produktionswege als zusätzliche Option. Für Seedance 2.0 ist kein Draft-Modus hinterlegt. Alle Versuche werden deshalb direkt in der Zielauflösung gerechnet.

| Produktionsweg | Formel in Credits pro Sekunde | Ergebnis-Auflösung |
|---|---|---|
| Seedance 2.0 Enhanced Fast, 720p direkt | 3,5 × v | 720p |
| Seedance 2.0 Standard, 720p direkt | 4,5 × v | 720p |
| Seedance 2.0 Standard, 1080p direkt | 9 × v | 1080p |

Prüfwerte für Tests:

| Versuche pro Clip | 2.0 Enhanced Fast 720p | 2.0 Standard 720p | 2.0 Standard 1080p | zum Vergleich: 2.5 Draft plus 1080p |
|---|---|---|---|---|
| 1 | 3,5 | 4,5 | 9 | 19 |
| 2 | 7 | 9 | 18 | 22 |
| 3 | 10,5 | 13,5 | 27 | 25 |
| 4 | 14 | 18 | 36 | 28 |
| 5 | 17,5 | 22,5 | 45 | 31 |

Daraus folgen zwei weitere Schwellen:

- Für ein 1080p-Ergebnis ist Seedance 2.0 Standard bei 1 und 2 Versuchen günstiger als der Seedance-2.5-Draft-Weg. Ab 3 Versuchen ist der Draft-Weg günstiger.
- Seedance 2.0 Enhanced Fast in 720p ist im erlaubten Bereich von 1 bis 20 Versuchen immer günstiger als jeder Seedance-2.5-Weg. Es liefert aber nur 720p und nicht den Referenz-Workflow von Seedance 2.5.

Der Kalkulator nennt bei jeder Empfehlung, die auf Seedance 2.0 fällt, diesen Qualitätsunterschied, damit die Empfehlung nicht allein am Preis hängt.

### 4.5 Gewinnschwelle eines Unlimited-Passes

- Der Kalkulator vergleicht jeden Unlimited-Pass (1, 3 und 7 Tage) mit dem Credit-Weg desselben Modells in derselben Auflösungsstufe:
  - den Seedance-2.5-Pass bis 720p mit Seedance 2.5 in 720p über Credits,
  - den Seedance-2.5-Pass bis 1080p mit Seedance 2.5 in 1080p über Credits, mit dem Draft-Weg über Credits und mit Seedance 2.0 Standard in 1080p über Credits,
  - den Seedance-2.0-Pass mit Seedance 2.0 Enhanced Fast in 720p über Credits.
- Mit einem Pass kosten zusätzliche Versuche kein Geld, sondern nur Zeit. Der Vorteil des Draft-Wegs, nämlich billige Versuche, fällt im Pass deshalb weg. Im 1080p-Pass werden alle Versuche direkt in 1080p generiert, weil Drafts im Pass nicht enthalten sind.
- Für diesen Vergleich gilt der Paketpreis pro Credit, also der Preis des Pakets geteilt durch seine Credits, jeweils mit 19 % Mehrwertsteuer. Der Grund: Ein Unlimited-Pass ersetzt Credits, die ich sonst als Paket nachkaufen müsste.
- Die Gewinnschwelle ist die Menge an generierten Sekunden, ab der der Pass weniger kostet als die dafür nötigen Credits. Der Kalkulator gibt sie auf drei Arten aus: als generierte Sekunden, als brauchbare Sekunden fertigen Film (generierte Sekunden geteilt durch die Versuche pro Clip) und als Anzahl brauchbarer Clips.
- Weil bei Unlimited nur eine Generierung gleichzeitig läuft, prüft der Kalkulator zusätzlich, ob diese Menge im Zeitraum des Passes überhaupt erreichbar ist. Die erreichbare Menge ist: Netto-Generierungsstunden pro Tag mal Anzahl der Tage, geteilt durch die Dauer eines Versuchs aus Abschnitt 3.7. Ist die Schwelle nicht erreichbar, lautet die Empfehlung „lohnt sich nicht“.
- Der Kalkulator vergleicht außerdem die erreichbare Menge mit dem tatsächlichen Bedarf meines Films. Ein Pass, der mehr Versuche erlaubt, als der Film braucht, bringt keinen zusätzlichen Nutzen. Entscheidend ist also, ob der Pass günstiger ist als die Credits für genau die Versuche, die der Film benötigt.

Prüfwerte für Tests (1-Tages-Pass, Preise mit 19 % Mehrwertsteuer, Cliplänge 7,5 Sekunden):

| Pass | Vergleich mit Paketpreis | Gewinnschwelle in Credits | Gewinnschwelle in generierten Sekunden | entspricht Versuchen à 7,5 s | in 6 Stunden erreichbar |
|---|---|---|---|---|---|
| 720p, 120 $ | regulär (0,085 $ pro Credit) | ca. 1.412 | ca. 202 | ca. 27 | ja, ca. 90 Versuche |
| 720p, 120 $ | mit Rabatt (0,0475 $ pro Credit) | ca. 2.526 | ca. 361 | ca. 48 | ja, ca. 90 Versuche |
| 1080p, 180 $ | regulär (0,085 $ pro Credit) | ca. 2.118 | ca. 132 | ca. 18 | ja, ca. 72 bis 85 Versuche |
| 1080p, 180 $ | mit Rabatt (0,0475 $ pro Credit) | ca. 3.789 | ca. 237 | ca. 32 | ja, ca. 72 bis 85 Versuche |
| Seedance 2.0 Enhanced Fast 720p, 30 $ | regulär (0,085 $ pro Credit) | ca. 353 | ca. 101 | ca. 13 | ja, ca. 90 Versuche (Annahme) |
| Seedance 2.0 Enhanced Fast 720p, 30 $ | mit Rabatt (0,0475 $ pro Credit) | ca. 632 | ca. 180 | ca. 24 | ja, ca. 90 Versuche (Annahme) |

Die ersten vier Zeilen gelten für den Seedance-2.5-Pass.
- Deckt mein vorhandener Credit-Stand den Bedarf bereits ab, weist der Kalkulator darauf hin. In diesem Fall muss ich für den Credit-Weg kein Geld mehr ausgeben, ein Pass wäre also nur dann sinnvoll, wenn ich die vorhandenen Credits für ein anderes Projekt aufheben möchte.

---

## 5. Fragen, die der Kalkulator beantworten soll

Alle Fragen gelten wahlweise für den ganzen Film oder nur für den noch ausstehenden Rest des Films.

### 5.1 Entscheidungsfragen mit Empfehlung

Bei diesen Fragen nennt der Kalkulator nicht nur Zahlen, sondern eine klare Empfehlung mit Begründung und der Schwelle, ab der sich die Empfehlung ändert.

1. **Produktionsweg:** Soll ich den Film oder den Rest des Films direkt in 720p, direkt in 1080p oder mit Versuchen in 480p Draft und anschließender 1080p-Fertigstellung produzieren? Ab wie vielen Versuchen pro Clip lohnt sich welcher Weg? Als weitere Optionen erscheinen Seedance 2.0 Enhanced Fast in 720p sowie Seedance 2.0 Standard in 720p und 1080p. Rechenregeln siehe Abschnitte 4.4 und 4.4a.
2. **Seedance-2.5-Pass bis 720p:** Lohnt sich der Seedance-2.5-Pass bis 720p, und wenn ja, welcher Zeitraum (1, 3 oder 7 Tage)? Ab wie vielen brauchbaren Clips oder Sekunden ist der Pass günstiger als Credits? Rechenregeln siehe Abschnitt 4.5.
3. **Seedance-2.5-Pass bis 1080p:** Lohnt sich der Seedance-2.5-Pass bis 1080p, und wenn ja, welcher Zeitraum? Ab welcher Schwelle ist der Pass günstiger als 1080p über Credits und als der Draft-Weg über Credits?
4. **Unlimited-Pass für Seedance 2.0:** Lohnt sich der Pass für Seedance 2.0 Enhanced Fast und Mini, und wenn ja, welcher Zeitraum? Ab welcher Schwelle ist er günstiger als Enhanced Fast über Credits?
5. **Gesamtempfehlung:** Welche Kombination aus Produktionsweg und Bezahlweg (Credit-Pakete oder Unlimited-Pass) ist für meinen Film insgesamt am günstigsten?

### 5.2 Kosten- und Budgetfragen

6. **Reguläre Preise:** Wie hoch sind die aktuellen regulären Preise pro Sekunde und pro Clip für Seedance 2.5 in 480p Draft, 720p und 1080p, jeweils ohne zeitlich begrenzte Rabatte?
7. **Szenario vier Versuche:** Wie verändern sich die Gesamtkosten, wenn ich im Schnitt etwa vier Versuche pro Clip brauche?
8. **Budget für den Rest des Films:** Wie viel Budget brauche ich für den verbleibenden Film, wenn zusätzlich etwa 20 bis 25 % mehr Zwischenszenen, Inserts oder Korrekturclips entstehen?
9. **Reichweite des Restguthabens:** Wie viele Szenen beziehungsweise Sekunden kann ich mit meinem aktuellen Credit-Stand noch produzieren? Den Abgleich mit dem ursprünglichen Plan („Liege ich im Plan?“) übernimmt Claude im Chat. Der Kalkulator muss dafür nur die Kosten für den noch ausstehenden Filmanteil berechnen; eine eigene Planabgleich-Funktion ist nicht nötig.
---

## 6. Technische Anforderungen

### 6.1 Ein gemeinsamer Rechenkern

- Die gesamte Rechenlogik liegt in einem einzigen Rechenkern. Oberfläche, Kommandozeile und Agenten-Anbindung rufen nur diesen Kern auf und rechnen nichts selbst.
- Der Grund: Wenn jeder Bedienweg eigene Formeln hätte, könnten die Ergebnisse auseinanderlaufen, sobald eine Formel nur an einer Stelle geändert wird.

### 6.2 Grafische Oberfläche für Menschen

- Die Oberfläche enthält alle Eingabefelder aus Abschnitt 2 mit ihren erlaubten Werten, Standardwerten und Kippschaltern.
- Die Ergebnisse aktualisieren sich bei jeder Änderung eines Eingabefelds sofort.
- Die Entscheidungsfragen aus Abschnitt 5.1 erscheinen als klar formulierte Empfehlung mit Begründung und Schwelle, nicht nur als Zahlentabelle.
- Die Oberfläche dient zum Rechnen. Die Pflege der Preisdaten braucht keine Oberfläche (siehe Abschnitt 6.4).
- Ich bevorzuge eine native Desktop-App, zum Beispiel mit Tauri, Electron oder pywebview. Falls du stattdessen eine Web-App empfiehlst, nenne ausdrücklich die Nachteile des Browser-Verhaltens, begründe die Empfehlung und hole meine Bestätigung ein.

### 6.3 Bedienung über die Kommandozeile und durch KI-Agenten

- Der Kalkulator lässt sich über die Kommandozeile bedienen, also über Textbefehle im Terminal. Jedes Eingabefeld der Oberfläche gibt es dort als Parameter.
- Der Kalkulator muss von KI-Agenten wie Claude oder ChatGPT angesteuert werden können. Die Agenten müssen Parameter direkt aus dem Chat an den Kalkulator übergeben können.
- Die Ergebnisse müssen deshalb sowohl für Menschen lesbar als auch für Agenten maschinenlesbar ausgegeben werden können.
- Ein Agent muss die Preisdatenbasis auch direkt lesen können, damit er Fragen wie den Planabgleich selbst beantworten kann.

### 6.4 Editierbare Datenbasis

- Alle Parameter und Preise müssen dauerhaft editierbar bleiben. Ich will künftig weitere Modelle mit anderen Preisen hinzufügen und bestehende Parameter ändern können.
- Für die Pflege der Datenbasis braucht es keine Benutzeroberfläche. Änderungen erfolgen über die Kommandozeile oder über Claude Code.
- Ein möglicher effizienter Weg ist, die gesamte Datenbasis als CSV-Datei im Hintergrund abzulegen. Die Entscheidung über das beste Format überlasse ich dir; bitte begründe sie.
- Jeder Preis trägt ein Stand-Datum und eine Quelle, damit erkennbar ist, wie aktuell und wie verlässlich er ist.
- Unbekannte Preise werden ausdrücklich als „unbekannt“ hinterlegt, nicht als 0 und nicht als Schätzung.

---

## 7. Bewusst offen gelassene Punkte

Diese Punkte sind geklärt in dem Sinne, dass sie in der ersten Version bewusst nicht gelöst werden. Sie blockieren den Bau nicht.

1. **Unbekannte Seedance-2.0-Preise.** Für Seedance 2.0 Standard in 480p und 4K, für Enhanced Fast in 480p und für Mini gibt es keine festen Credit-Werte. Der Kalkulator meldet diese Kombinationen als „ohne Preis“, bis ein Wert nachgetragen wird.
2. **Ton bei Seedance 2.5.** Ob die Seedance-2.5-Preise Ton enthalten, wird vorerst ignoriert.
3. **Nebenkosten.** Referenzbilder, Figurenblätter und Stimmen bleiben in der ersten Version draußen.

---

## 8. Vorgehen

- Die Punkte in Abschnitt 7 sind bewusst offen gelassen und müssen vor dem Bau nicht geklärt werden.
- Lies vor dem Bau den Skill `tech-stack-advisor` und führe das strukturierte Interview durch.
- Falls du weitere Fragen hast oder etwas unklar ist, frage mich.
