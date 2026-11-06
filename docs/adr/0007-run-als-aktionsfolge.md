# 0007: Ein Run ist Seed plus Aktionsfolge

Datum: 2026-11-06 · Status: Angenommen

## Kontext

M3 braucht Speichern, und die Idee „Fehler melden“ soll Claude einen Run exakt nachspielen lassen. Dazu muss die Run-Logik in Labor und Spiel gleich sein, so wie die Kampf-Engine (ADR 0003).

## Entscheidung

- Ein Run ist eine Zustandsmaschine mit den Phasen Werkstatt, Vorzeichen, Legierung und Ende.
- Jede Spieleraktion ist ein kleines Objekt: kaufen, verkaufen, verschieben, neu würfeln, Werkstatt beenden, Vorzeichen wählen, Legierung vergeben. `act()` prüft sie und protokolliert nur angenommene Aktionen. Unerlaubte Aktionen ändern nichts.
- Seed plus Aktionsliste ergeben den Run exakt. Das ist der Spielstand, die Wiederholung für Fehlermeldungen und der Vertrag zwischen Labor und Port (`tests/golden/runs.json`, Zustand nach jeder Aktion).
- Wer Entscheidungen trifft, Spieler oder Bot, zieht nie Zufall aus dem Generator des Runs. Sonst stünden Zufallszüge außerhalb der Aktionsliste, und der Run ließe sich nicht mehr nachspielen. Gefunden, als der Zufallsbot genau das tat.

## Folgen

- Speichern bedeutet: Seed und Aktionen sichern. Laden bedeutet: nachspielen.
- Die Bots spielen über dieselben Aktionen wie Menschen.
- Gemessen beim Port: 12 Runs mit 338 Aktionen stimmen nach jeder einzelnen Aktion überein.
