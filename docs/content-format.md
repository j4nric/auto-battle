# Inhaltsformat

Alle Räume, Verschmelzungen und Legierungen stehen in `game/data/content.json`. Das Labor (`lab/src/content.ts`) und das Spiel (`game/core/content.gd`) lesen dieselbe Datei. Wer einen Raum ändert, ändert ihn damit für beide. Danach müssen die Golden-Vektoren neu erzeugt werden (`cd lab && npm run golden`).

## Raum

| Feld | Bedeutung |
|---|---|
| `id` | Kennung, camelCase, englisch oder deutsch ohne Umlaute |
| `name`, `text` | Anzeige auf Deutsch |
| `guild` | Zunft: `wehr`, `uhrwerk`, `glocke`, `alchemie` |
| `height` | Etagen, zugleich Takte, die der Funke für den Raum braucht |
| `tags` | Schlagworte, auf die andere Räume reagieren |
| `counterMax` | Nur Glocken: jede n-te Auslösung schlägt |
| `fusion` | `true` für Räume, die nur durch Verschmelzung entstehen |
| `aura` | Verstärkt Nachbarn, siehe unten |
| `on` | Effekte je Auslöser, siehe unten |

## Auslöser in `on`

| Auslöser | Wann |
|---|---|
| `activate` | Der Funke oder ein Echo löst den Raum aus |
| `strike` | Der Zähler einer Glocke ist voll |
| `strikeEvent` | Irgendeine Glocke im eigenen Turm schlägt |
| `loopEvent` | Ein Funke vollendet eine Runde |

## Effekte (Ops)

Effekte laufen in der Reihenfolge, in der sie stehen.

| Op | Wirkung |
|---|---|
| `damage`, `shield`, `heal`, `burn`, `poison` | Schaden am Gegner, Schild und Heilung für sich, Brand und Gift beim Gegner |
| `rust`, `oil` | Rost beim Gegner, Öl für sich. Ganzzahlig, nicht mit der Stufe skaliert, außer über `tier`-Terme |
| `breakShield` | Zerstört Schild des Gegners |
| `addCharge` | Erhöht die Spannung des Raums. Sie bleibt den Kampf über |
| `chargeOthers` | Erhöht die Spannung aller anderen Räume mit `tag` |
| `retrigger` | Löst den Raum darunter erneut aus, Wirkung mal `bonus`. Echo-Räume werden nie wiederholt |
| `freeNext` | Der nächste Raum braucht `amount` Takte weniger |
| `firstTime` | Beim ersten Mal `then`, danach `else` |
| `spawnSpark` | Ein weiterer Funke startet am Fundament, höchstens drei |
| `advanceCounter` | Zählt die eigene Glocke weiter |
| `advanceAllBells` | Zählt alle anderen Glocken weiter, außer solchen mit `counterMax` 1 |

Wertbasierte Ops dürfen `timesIfBelowTag: { tag, times }` tragen. Dann wird der Wert vervielfacht, wenn der Raum darunter das Schlagwort hat.

## Werte (Terme)

Ein Wert ist eine Liste von Termen, die von links nach rechts addiert werden. Die Reihenfolge zählt, weil Labor und Spiel Kommazahlen exakt gleich rechnen müssen.

| Term | Beitrag |
|---|---|
| `{ "scaled": n }` | n × Wirkungsfaktor (Stufe, Legierung, Auren der Nachbarn, Echo-Bonus) |
| `{ "scaledPerTag": { "tag": t, "n": n } }` | n × Anzahl Räume mit Schlagwort t × Wirkungsfaktor |
| `{ "flat": n }` | n |
| `{ "tier": n }` | n × Stufe (0 bis 3) |
| `{ "charge": n }` | n × Spannung des Raums |
| `{ "myOil": n }` | n × eigenes Öl |
| `{ "foeBurn": n }` | n × Brand des Gegners |

## Aura

`aura: { rel, targetTags?, value }` multipliziert die Wirkung von Nachbarn. `rel: "above"` wirkt nur auf den Raum darüber, `rel: "any"` auf beide Nachbarn. Spitze und Fundament sind Nachbarn. Mit `targetTags` wirkt die Aura nur auf Räume mit einem dieser Schlagworte. `tier`-Terme beziehen sich auf die Stufe der Quelle.

## Rivalen und Vorzeichen

Die Gegner sind rivalisierende Uhrmacher:innen, eine Person je Zunft (`rivals`: `name`, `title`). Die Vorzeichen (`omens`) bestimmen den Rang des Gegners und die Belohnung: `diff` als Faktor auf die Integrität, `gold`, optional `alloy` (Legierung als Belohnung), `fight: false` mit `merchant` für den Händler.

## Legierung

| Feld | Wirkung |
|---|---|
| `times` | Löst so oft aus |
| `shieldPerFloor` | Zusätzlicher Schild je Etage und Stufenfaktor |
| `costMult` | Faktor auf die Takte, die der Funke braucht |
| `conduct` | Löst auch den Raum darunter aus, nur bei direkter Auslösung durch den Funken |
| `mult` | Faktor auf die Wirkung |
| `breaksAfter` | Zerbricht nach so vielen Auslösungen |
| `glass` | Zerbricht beim ersten Treffer auf die Integrität |

## Neue Op oder neuer Term

Beides ist eine Regeländerung: erst im Labor (`lab/src/engine/combat.ts`), dann im Port (`game/core/combat.gd`), dann hier dokumentieren. Golden-Vektoren neu erzeugen und einen Fall ergänzen, der die neue Op benutzt.

## Raster (ADR 0008)

`game/data/raster.json` enthält die Räume für den 3 Felder breiten Turm. Gegenüber `content.json`
kommt ein Feld dazu:

| Feld | Bedeutung |
|---|---|
| `shape` | Felder `[x, y]` relativ zum Ursprung, `y` zeigt nach oben. `height` ist die Zahl der Felder und damit die Tempo-Kosten. Ohne `shape` ist ein Raum eine Spalte aus `height` Feldern. |

Platzierte Räume tragen `x`, `y` und `rot` (Vierteldrehungen im Uhrzeigersinn). Im Raster gilt:
`rel: "above"` wirkt auf Räume, die direkt über einem Feld der Quelle liegen, `rel: "any"` auf alle
Räume mit gemeinsamer Kante. „Der Raum darunter“ (`retrigger`, `timesIfBelowTag`, Kupfer) ist der
Raum davor auf dem Funkenweg. Rezepte sind Muster: `pattern[1]` liegt direkt über `pattern[0]`.
