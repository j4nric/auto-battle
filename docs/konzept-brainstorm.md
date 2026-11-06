# Konzept-Brainstorm: Auto Battler (Arbeitstitel „Uhrturm“)

Inspiration: *The Bazaar* (Item-Board, Tags, Scaling, Shop-Tage, PvP-Geister) und *Loop Hero*
(Loop als Timer, Welt selbst gestalten, versteckte Kombinationsregeln, Rückzug mit Beute).

Zielplattform: Smartphone, Hochkant, einhändig spielbar. Der Build ist das Herzstück.

---

## 1. Das Herz: „Der Takt“ – ein sequenzieller Auto Battler

Der zentrale Unterschied zu The Bazaar: Dort laufen alle Item-Cooldowns parallel, was auf einem
Handy schnell unlesbar wird. Hier läuft stattdessen ein **Funke** (Puls) nacheinander durch den
Build. Jeder Raum, den der Funke passiert, löst aus. Oben angekommen springt der Funke zurück
zum Fundament: **der Build selbst ist der Loop.**

Was das für den Build bedeutet:

- **Reihenfolge ist eine Ressource.** „Vorheriger Raum“ und „nächster Raum“ sind feste Bezüge.
  A vor B ist etwas anderes als B vor A.
- **Länge ist Tempo.** Drei Räume feuern jeder alle drei Takte, acht Räume jeder alle acht Takte.
  Kompakter Build = hohe Frequenz, breiter Build = mehr Effekte pro Runde.
- **Wrap-around-Synergie.** Spitze und Fundament sind Nachbarn im Loop.
- **Takt-Manipulation als eigene Build-Achse:** Räume, die den Funken beschleunigen, bremsen,
  umkehren, den nächsten Raum überspringen, den vorherigen wiederholen (Echo) oder einen
  **zweiten Funken** erzeugen.
- **Zähler statt Cooldowns:** „Schlägt bei jedem 4. Durchlauf“ (Glocke) oder „lädt sich pro
  Durchlauf um 1 auf“ (Feder). Lesbar, planbar, aber mit Tiefe.

Hochkant passt perfekt: Der Build ist eine vertikale Säule, der Funke steigt von unten nach oben.
Im Kampf stehen beide Türme nebeneinander, beide Funken sind gleichzeitig sichtbar.

---

## 2. Theme: Der Uhrturm

**Prämisse:** Die Zeit ist stehengeblieben. Du bist Uhrmacher:in und baust den Uhrturm neu, Etage
für Etage. Jeder Run ist der Versuch, den Turm bis **Mitternacht** zum Schlagen zu bringen.
Dinge, die mit dem Stillstand gekommen sind (Rost, Wölfe, Zeitdiebe, rivalisierende Türme),
stellen sich dir stündlich in den Weg.

Warum das Theme trägt:

| Theme-Element | Mechanik |
|---|---|
| Takt / Pendel | der Funke, Tempo als Stat |
| Etagen des Turms | Slots, Räume mit Höhe 1–3 |
| Zahnräder | Verbindungen zwischen Nachbarräumen (Adjazenz-Synergien) |
| Federn | Scaling-Räume, die pro Durchlauf permanent stärker werden |
| Glocken | große Payoffs bei jedem N-ten Durchlauf |
| Legierungen (Gold, Silber, Quecksilber, Rost) | Verzauberungen, die jeden Raum verändern |
| Stunden 1–12 | Run-Struktur, Mitternacht = Boss |
| Uhrmacher:innen | Helden, die den Pool biasen |

Fantasy bleibt erlaubt: Alchemielabor, Krypta, Observatorium, Taubenschlag, Drachenhorst sind
Räume neben Werkstatt, Glockenstube und Pendelkammer. Das hält die Loot-Vielfalt von Bazaar.

### Alternativen, die geprüft wurden

- **Totem / Geisterpfahl:** optisch stark, aufsteigende Flamme als Funke. Verworfen wegen
  kultureller Nähe zu realen Traditionen und engerer Zielgruppe.
- **Spieluhr / Walze:** der sequenzielle Trigger ist wörtlich (Stifte auf einer Walze). Sehr
  charmant, aber Kampf-Fantasy fühlt sich abstrakt an. Als Sub-Zunft („Spielwerk“) wiederverwendbar.
- **Karawane / Handelszug:** nah an Bazaar-Händler-Vibe, aber der sequenzielle Puls hat dort
  keine natürliche Erklärung.
- **Rube-Goldberg-Kettenreaktion:** passt mechanisch perfekt, Schaden und HP sind aber schwer
  zu verkörpern.

---

## 3. Räume (die Items)

Jeder Raum hat:

- **Höhe** 1, 2 oder 3 Etagen (Bazaar-Slotgrößen). Turm startet mit 8 Etagen, erweiterbar auf 10–12.
- **Tags** (2–3): z. B. Feuer, Uhrwerk, Glocke, Kreatur, Gift, Schild, Händler, Spielwerk.
- **Beim Durchlauf:** der Haupteffekt, wenn der Funke passiert.
- **Passiv:** gilt immer, oft bezogen auf Nachbarn („Raum darüber erhält +50 % Schaden“).
- optional **Zähler** (jeder N-te Durchlauf) oder **Spannung** (permanentes Scaling).

Stufen: Bronze → Silber → Gold → Diamant durch Kauf eines Duplikats (Bazaar-Upgrade).

### Versteckte Verschmelzungen (Loop-Hero-Rezepte)

Bestimmte Nachbarschaften verschmelzen zu einem neuen, einzigartigen Raum:

- Bibliothek über Krypta → **Verbotenes Archiv**
- drei Glocken hintereinander → **Glockenspiel** (schlägt jeden Takt, aber schwächer)
- Feder neben Feder neben Feder → **Antriebswerk** (verdoppelt alle Spannung)
- Taubenschlag unter Observatorium → **Brieftaubenstation** (kopiert den Effekt des Gegner-Raums)

Entdeckte Rezepte landen im **Kodex**. Hinweise kommen über Monster-Builds, die diese Räume
bereits kombiniert zeigen, und über Fragmente in Ereignissen. Das ist der Hauptmotor für
„Synergien selbst finden“.

### Legierungen (Bazaar-Enchantments)

Eine Legierung pro Raum, aus Ereignissen, Elite-Beute oder dem Schmied:

- **Gold:** löst zweimal aus
- **Silber:** gibt Schild in Höhe des Effekts
- **Quecksilber:** Funke überspringt die Wartezeit des nächsten Raums
- **Kupfer:** Effekt wird auch beim vorherigen Raum ausgelöst (Leitfähigkeit)
- **Rost:** doppelter Effekt, aber der Raum verfällt nach 6 Durchläufen (Hochrisiko)
- **Glas:** dreifacher Effekt, zerbricht beim ersten Treffer

---

## 4. Kampf

- Beide Türme nebeneinander, Funken laufen gleichzeitig, Basis-Takt 0,6 s. Ein Kampf dauert
  20–40 s, Speed-Toggle 2x, Haptik auf jedem Takt (Rhythmusgefühl).
- Stats: Integrität (HP), Schaden, Schild.
- Status-Effekte bewusst nur vier: **Brand** (steigender Schaden pro Takt), **Gift** (ignoriert
  Schild, stapelt), **Rost** (gegnerischer Funke verliert Takte), **Öl** (eigener Funke gewinnt Takte).
- Nach **30 Takten** beginnt „Zeitzerfall“: beide Türme erhalten pro Takt steigenden Schaden
  (Bazaar-Sandsturm), damit Kämpfe nicht endlos werden.
- Kampf-Zusammenfassung zeigt „Top-Beiträge“: welcher Raum wie viel Schaden, Schild und Heilung
  geliefert hat. Das lehrt Synergien ohne Tutorial.

---

## 5. Game Loop eines Runs (12 Stunden, ca. 15–20 Minuten)

Jede **Stunde** besteht aus drei kurzen Phasen:

1. **Werkstatt (Shop):** 3 Raum-Angebote, 1 Legierungs-/Händler-Slot, Reroll, Verkaufen,
   Räume umstellen. Gold pro Stunde plus Einkommen aus Händler-Räumen.
2. **Vorzeichen (Loop-Hero-Element):** Wähle 1 von 3 Karten, die den nächsten Gegner und
   seine Beute bestimmen. Beispiele: „Wolfsrudel: schnell, schwach, Beute: Kreatur-Raum“,
   „Rostende Ruine: Elite mit Rost, Beute: garantierte Legierung“, „Wandernder Händler: kein
   Kampf, Rabatt-Shop“. Der Spieler gestaltet so selbst Risiko und Beute, wie beim Legen der
   Loop-Hero-Kacheln.
3. **Kampf:** Auto Battle gegen Monster (Stunde 1–6) oder Geister-Türme anderer Spieler
   (Stunde 7–12). Stunde 4 und 8 sind Elite-Gegner, 12 ist Mitternacht (Boss).

Verlieren kostet einen von **drei Rissen**. Der dritte Riss stürzt den Turm ein.

**Rückzug (Loop Hero):** Nach jeder Stunde darf man abbrechen und behält alle gesammelten
Zahnräder (Meta-Ressource). Einsturz behält ein Drittel. Mitternacht geschafft: doppelte Beute.
Das erzeugt die „eine Stunde noch?“-Spannung.

Jede Stunde ist ein sauberer Speicherpunkt. Ein Run lässt sich jederzeit unterbrechen, was für
Mobile entscheidend ist.

---

## 6. Warum jeder Run anders ist

1. **Zunft-Rotation (Dominion-Prinzip):** Es gibt 9 Zünfte (Raum-Familien). Pro Run sind nur
   4 aktiv, sichtbar beim Start. Der Pool erzwingt andere Synergien statt immer denselben Build.
2. **Uhrmacher:in** (Held) biased den Pool und gibt ein Turm-Passiv. Start mit fünf:
   - *Die Glöcknerin* (Zähler, große Schläge)
   - *Der Alchemist* (Brand, Gift)
   - *Die Tierbändigerin* (Kreaturen, die mitkämpfen)
   - *Der Schmied* (Schild, günstige Upgrades, Legierungen)
   - *Die Zeitdiebin* (Takt-Manipulation, Doppelfunke)
3. **Vorzeichen** steuern Risiko und Beute pro Stunde.
4. **Legierungen** und **Verschmelzungen** verändern vorhandene Räume unvorhersehbar.
5. **Monster-Builds** zeigen Kombinationen, auf die man selbst nicht gekommen wäre, und
   lassen ihre Räume fallen.
6. **Tagesseed** („Stundenlauf“) für ein tägliches, vergleichbares Rennen.

---

## 7. Hochkant-UI

Shop-/Bau-Phase:

- oben: Stunde, Gold, Risse, Uhrmacher:in
- Mitte: der eigene Turm, 8–12 Etagen, alle sichtbar ohne Scrollen
- unten (Daumenzone): 3 Angebote plus Reroll/Weiter
- Platzieren per **Tippen und Tippen** (Angebot wählen, Etage wählen), Drag optional.
  Long-Press öffnet die Raumdetails mit Tags und Nachbar-Bezügen.
- Beim Antippen eines Raums leuchten die Räume auf, mit denen er interagiert (Synergie-Funken).

Kampf-Phase:

- zwei Türme nebeneinander, eigener links, Gegner rechts
- jeder Raum nur Icon, Tag-Farbe und eine Kennzahl; Zahlen poppen beim Funken auf
- unten: HP-Balken beider Türme, Speed, Skip

---

## 8. Meta-Progression (Loop-Hero-Lager)

Das **Dorf** am Fuß des Turms. Zahnräder bauen Gebäude, die freischalten:

- neue Zünfte und Räume im Pool
- zusätzliche Etagen (9., 10., 11., 12.)
- neue Uhrmacher:innen
- der Kodex (Rezepte bleiben erhalten)
- kosmetisches Zifferblatt pro Mitternacht-Sieg

Keine Stat-Boosts kaufen, nur Optionen. Die Stärke muss aus dem Build kommen.

---

## 9. Offene Fragen und Risiken

- **Ist sequenziell spannend genug?** Parallele Cooldowns erzeugen Chaos, sequenziell kann
  träge wirken. Gegenmittel: kurzer Basis-Takt, Doppelfunke, Echo, Haptik. Muss im Prototyp
  gefühlt werden.
- **Tempo-Balance:** Kompakte Türme mit 3 Räumen könnten dominieren. Hebel: Zeitzerfall, Räume
  mit „benötigt Nachbarn“, Glocken, die große Loops belohnen.
- **Geister-PvP** braucht Spielerbasis. Fallback: generierte Türme aus Zunft-Vorlagen.
- **12 Stunden zu lang?** Alternative: 8 Stunden mit Boss bei 8, Mitternacht als Endless-Modus.
- **Lesbarkeit zweier Türme auf 390 px Breite** muss früh getestet werden.

---

## 10. Vorschlag für einen ersten Prototyp

Scope, der die Kernfrage „macht der Takt Spaß?“ beantwortet:

- 1 Uhrmacher:in, 3 Zünfte mit je 10 Räumen, 4 Legierungen, 3 Verschmelzungs-Rezepte
- 12 feste Monster-Türme, keine Geister, kein Dorf
- Kampf-Engine als deterministische, seedbare Simulation ohne UI, damit sich tausende Kämpfe
  headless testen lassen (Balance, Tempo, Dominanz einzelner Räume)
- UI als Web-App im Hochkant-Format (PWA), damit sofort auf dem Handy getestet werden kann
