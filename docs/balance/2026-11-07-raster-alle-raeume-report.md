# Raster-Prototyp: Simulation

Tüftler, 200 Runs, Seed 1, Integrität × 2, Laufzeit 54 s (0.27 s pro Run).

| Kennzahl | Wert |
|---|---|
| Mitternacht | 28 % |
| Mitternacht ohne Umbau | 20 % |
| Ø Kampfdauer | 17.9 s |
| Kämpfe nach höchstens 5 Takten | 0 |
| Kämpfe im Zeitzerfall (> 30 Takte) | 51 % |

Siegquote je Stunde: 1: 72 % · 2: 78 % · 3: 83 % · 4: 72 % · 5: 68 % · 6: 65 % · 7: 74 % · 8: 75 % · 9: 65 % · 10: 68 % · 11: 65 % · 12: 71 %

Belegte Felder je Stunde (Anteil am Turm): 1: 32 % · 2: 72 % · 3: 80 % · 4: 92 % · 5: 87 % · 6: 92 % · 7: 85 % · 8: 90 % · 9: 82 % · 10: 84 % · 11: 79 % · 12: 81 %

## Zählt die Anordnung?

End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust 0.18, spürbar schlechter 47 %.

## Vielfalt

200 verschiedene Raum-Kombinationen und 200 verschiedene Anordnungen bei 200 End-Türmen.

## Zünfte und Räume

Etagen-Anteil je aktiver Zunft (100 % = fair): alchemie 124 % · glocke 75 % · uhrwerk 137 % · wehr 60 %

| Raum | Form | Aufnahme bei aktiver Zunft |
|---|---|---|
| Rostkammer | 1 Felder | 78 % |
| Echokammer | 1 Felder | 74 % |
| Zahnradgetriebe | 1 Felder | 68 % |
| Quecksilberhemmung | 1 Felder | 62 % |
| Pendelkammer | 2 Felder | 61 % |
| Kleine Glocke | 1 Felder | 53 % |
| Salamanderhorst | 2 Felder | 53 % |
| Große Glocke | 2 Felder | 52 % |
| Doppelhemmung | 4 Felder | 52 % |
| Glockenseil | 1 Felder | 50 % |
| Phiolenlager | 2 Felder | 47 % |
| Lazarett | 2 Felder | 45 % |
| Bollwerk | 2 Felder | 43 % |
| Brennofen | 1 Felder | 40 % |
| Destille | 2 Felder | 39 % |
| Höllenküche | 2 Felder | 38 % |
| Waffenkammer | 1 Felder | 34 % |
| Ballista | 3 Felder | 28 % |
| Zeitschleife | 2 Felder | 26 % |
| Aufzugfeder | 1 Felder | 25 % |
| Katalysator | 1 Felder | 23 % |
| Unruh | 2 Felder | 19 % |
| Giftküche | 1 Felder | 19 % |
| Glockengießerei | 3 Felder | 17 % |
| Läutwerk | 1 Felder | 15 % |
| Resonanzraum | 2 Felder | 14 % |
| Schmiede | 1 Felder | 12 % |
| Wachturm | 2 Felder | 9 % |
| Säurebad | 2 Felder | 9 % |
| Antriebswerk | 3 Felder | 1 % |
| Turmuhr | 3 Felder | 1 % |

Verschmelzungen gefunden: Zeitschleife 20 % · Höllenküche 34 %

## Beispiel-Türme (Mitternacht erreicht)

```
Phiolenla    Phiolenla    ·           
Salamande    ·            ·           
Salamande    Salamande⁴   Salamande⁴  
Brennofen    Doppelhem    Doppelhem   
Höllenküc    Doppelhem    Doppelhem   
Höllenküc    Destille⁴    Destille⁴   
Katalysat³   Katalysat⁴   Pendelkam³  
Rostkamme    Echokamme    Pendelkam³  
```

```
·            ·            ·           
Lazarett³    ·            ·           
Lazarett³    Doppelhem    Doppelhem   
Zahnradge    Doppelhem    Doppelhem   
Große Glo⁴   Große Glo⁴   Glockense   
Zahnradge²   Pendelkam    Kleine Gl   
Quecksilb    Pendelkam    Glockense   
Glockense    Glockense    Echokamme   
```

```
Unruh        Unruh        ·           
Kleine Gl    Doppelhem    Doppelhem   
Waffenkam²   Doppelhem    Doppelhem   
Quecksilb    Zahnradge    Resonanzr³  
Zahnradge    Große Glo²   Resonanzr³  
Waffenkam⁴   Große Glo²   Glockense   
Kleine Gl⁴   Zahnradge    Pendelkam²  
Glockense    Echokamme    Pendelkam²  
```

```
Doppelhem    Doppelhem    Quecksilb   
Doppelhem    Doppelhem    Echokamme   
Unruh        Unruh        Echokamme²  
Zeitschle    Lazarett³    Lazarett³   
Zeitschle    Doppelhem³   Doppelhem³  
Aufzugfed³   Doppelhem³   Doppelhem³  
Zahnradge²   Echokamme²   Unruh       
Bollwerk⁴    Bollwerk⁴    Unruh       
```
