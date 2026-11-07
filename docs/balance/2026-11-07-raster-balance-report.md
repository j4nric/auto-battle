# Raster-Prototyp: Simulation

Tüftler, 200 Runs, Seed 1, Integrität × 2, Laufzeit 51 s (0.26 s pro Run).

| Kennzahl | Wert |
|---|---|
| Mitternacht | 22 % |
| Mitternacht ohne Umbau | 18 % |
| Ø Kampfdauer | 18.1 s |
| Kämpfe nach höchstens 5 Takten | 0 |
| Kämpfe im Zeitzerfall (> 30 Takte) | 54 % |

Siegquote je Stunde: 1: 69 % · 2: 76 % · 3: 82 % · 4: 66 % · 5: 65 % · 6: 70 % · 7: 69 % · 8: 65 % · 9: 76 % · 10: 72 % · 11: 77 % · 12: 59 %

Belegte Felder je Stunde (Anteil am Turm): 1: 32 % · 2: 71 % · 3: 81 % · 4: 92 % · 5: 87 % · 6: 93 % · 7: 86 % · 8: 91 % · 9: 83 % · 10: 87 % · 11: 81 % · 12: 84 %

## Zählt die Anordnung?

End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust 0.21, spürbar schlechter 43 %.

## Vielfalt

200 verschiedene Raum-Kombinationen und 200 verschiedene Anordnungen bei 200 End-Türmen.

## Zünfte und Räume

Etagen-Anteil je aktiver Zunft (100 % = fair): alchemie 119 % · glocke 85 % · uhrwerk 120 % · wehr 74 %

| Raum | Form | Aufnahme bei aktiver Zunft |
|---|---|---|
| Rostkammer | 1 Felder | 83 % |
| Echokammer | 1 Felder | 75 % |
| Quecksilberhemmung | 1 Felder | 70 % |
| Zahnradgetriebe | 1 Felder | 59 % |
| Glockenseil | 1 Felder | 55 % |
| Kleine Glocke | 1 Felder | 55 % |
| Große Glocke | 2 Felder | 54 % |
| Doppelhemmung | 4 Felder | 51 % |
| Lazarett | 2 Felder | 48 % |
| Salamanderhorst | 2 Felder | 47 % |
| Waffenkammer | 1 Felder | 45 % |
| Bollwerk | 2 Felder | 44 % |
| Brennofen | 1 Felder | 41 % |
| Phiolenlager | 2 Felder | 41 % |
| Destille | 2 Felder | 38 % |
| Höllenküche | 2 Felder | 35 % |
| Aufzugfeder | 1 Felder | 31 % |
| Ballista | 3 Felder | 31 % |
| Giftküche | 1 Felder | 31 % |
| Zeitschleife | 2 Felder | 24 % |
| Wachturm | 2 Felder | 23 % |
| Schmiede | 1 Felder | 22 % |
| Katalysator | 1 Felder | 20 % |
| Pendelkammer | 2 Felder | 19 % |
| Glockengießerei | 3 Felder | 19 % |
| Turmuhr | 2 Felder | 15 % |
| Resonanzraum | 2 Felder | 14 % |
| Läutwerk | 1 Felder | 12 % |
| Unruh | 2 Felder | 10 % |
| Säurebad | 2 Felder | 7 % |
| Glockenspiel | 3 Felder | 1 % |

Verschmelzungen gefunden: Zeitschleife 18 % · Höllenküche 30 %

## Beispiel-Türme (Mitternacht erreicht)

```
Wachturm³    Wachturm³    Quecksilb   
Unruh        Unruh        Wachturm³   
Doppelhem    Doppelhem    Wachturm³   
Doppelhem    Doppelhem    Wachturm²   
·            Quecksilb    Wachturm²   
Quecksilb    Lazarett³    Brennofen   
Zahnradge⁴   Lazarett³    Rostkamme²  
Aufzugfed⁴   Echokamme    Rostkamme²  
```

```
·            ·            ·           
·            ·            ·           
·            ·            Giftküche   
·            Doppelhem    Doppelhem   
Zeitschle³   Doppelhem    Doppelhem   
Zeitschle³   Läutwerk     Zeitschle   
Aufzugfed⁴   Zahnradge    Zeitschle   
·            ·            Rostkamme   
```

```
·            ·            ·           
Glockense    Echokamme²   ·           
Quecksilb    Große Glo²   Große Glo²  
Zeitschle    Glockengi    Glockengi   
Zeitschle    Glockense²   Glockengi   
Große Glo³   Große Glo³   Quecksilb²  
Turmuhr⁴     Turmuhr⁴     Kleine Gl⁴  
Glockense    Glockense    Waffenkam²  
```

```
Destille³    Destille³    ·           
Bollwerk     Bollwerk     Zahnradge   
·            Lazarett⁴    Lazarett⁴   
Quecksilb    Rostkamme²   Zahnradge   
Doppelhem    Doppelhem    Rostkamme³  
Doppelhem    Doppelhem    Salamande⁴  
Quecksilb    Echokamme    Salamande⁴  
Waffenkam⁴   Schmiede     Brennofen   
```
