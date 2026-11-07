# Raster-Prototyp: Simulation

Tüftler, 200 Runs, Seed 1, Integrität × 2, Laufzeit 105 s (0.53 s pro Run).

| Kennzahl | Wert |
|---|---|
| Mitternacht | 34 % |
| Mitternacht ohne Umbau | 24 % |
| Ø Kampfdauer | 17.3 s |
| Kämpfe nach höchstens 5 Takten | 0 |
| Kämpfe im Zeitzerfall (> 30 Takte) | 48 % |

Siegquote je Stunde: 1: 63 % · 2: 74 % · 3: 82 % · 4: 86 % · 5: 70 % · 6: 75 % · 7: 70 % · 8: 69 % · 9: 73 % · 10: 64 % · 11: 73 % · 12: 79 %

Belegte Felder je Stunde (Anteil am Turm): 1: 32 % · 2: 71 % · 3: 80 % · 4: 92 % · 5: 86 % · 6: 91 % · 7: 84 % · 8: 87 % · 9: 80 % · 10: 81 % · 11: 74 % · 12: 77 %

## Zählt die Anordnung?

End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust 0.18, spürbar schlechter 43 %.

## Vielfalt

200 verschiedene Raum-Kombinationen und 200 verschiedene Anordnungen bei 200 End-Türmen.

## Zünfte und Räume

Etagen-Anteil je aktiver Zunft (100 % = fair): alchemie 104 % · glocke 85 % · uhrwerk 129 % · wehr 81 %

| Raum | Form | Aufnahme bei aktiver Zunft |
|---|---|---|
| Rostkammer | 1 Felder | 80 % |
| Echokammer | 1 Felder | 80 % |
| Quecksilberhemmung | 1 Felder | 69 % |
| Lazarett | 2 Felder | 62 % |
| Zahnradgetriebe | 1 Felder | 57 % |
| Kleine Glocke | 1 Felder | 54 % |
| Große Glocke | 2 Felder | 53 % |
| Glockenseil | 1 Felder | 53 % |
| Bollwerk | 2 Felder | 49 % |
| Doppelhemmung | 4 Felder | 47 % |
| Salamanderhorst | 2 Felder | 46 % |
| Waffenkammer | 1 Felder | 41 % |
| Phiolenlager | 2 Felder | 39 % |
| Brennofen | 1 Felder | 38 % |
| Aufzugfeder | 1 Felder | 35 % |
| Pendelkammer | 2 Felder | 33 % |
| Destille | 2 Felder | 29 % |
| Höllenküche | 2 Felder | 29 % |
| Ballista | 3 Felder | 26 % |
| Schmiede | 1 Felder | 26 % |
| Glockengießerei | 3 Felder | 22 % |
| Giftküche | 1 Felder | 22 % |
| Wachturm | 2 Felder | 21 % |
| Unruh | 2 Felder | 20 % |
| Turmuhr | 2 Felder | 18 % |
| Resonanzraum | 2 Felder | 16 % |
| Zeitschleife | 2 Felder | 15 % |
| Katalysator | 1 Felder | 13 % |
| Läutwerk | 1 Felder | 10 % |
| Säurebad | 2 Felder | 8 % |
| Glockenspiel | 3 Felder | 2 % |
| Antriebswerk | 3 Felder | 1 % |

Verschmelzungen gefunden: Zeitschleife 11 % · Höllenküche 28 %

## Beispiel-Türme (Mitternacht erreicht)

```
·            ·            ·           
·            ·            ·           
·            ·            ·           
Lazarett²    Phiolenla    Phiolenla   
Lazarett²    Brennofen    Echokamme   
Destille³    Destille³    Bollwerk    
Doppelhem    Doppelhem    Bollwerk    
Doppelhem    Doppelhem    Rostkamme   
```

```
·            ·            ·           
·            ·            Läutwerk    
·            ·            Große Glo³  
·            ·            Große Glo³  
Doppelhem    Doppelhem    Zahnradge   
Doppelhem    Doppelhem    Echokamme   
Quecksilb    ·            Aufzugfed⁴  
Quecksilb    Giftküche    Rostkamme³  
```

```
·            ·            ·           
·            Giftküche²   ·           
Doppelhem    Doppelhem    Lazarett²   
Doppelhem    Doppelhem    Lazarett²   
Aufzugfed    Lazarett²    Lazarett²   
Schmiede     Säurebad²    Säurebad²   
Ballista³    Schmiede⁴    Rostkamme²  
Ballista³    Ballista³    Schmiede    
```

```
·            ·            ·           
Resonanzr³   Resonanzr³   Glockense   
Kleine Gl²   Lazarett     Lazarett    
Große Glo⁴   Große Glo⁴   Waffenkam   
Glockense²   Kleine Gl²   Glockengi³  
Giftküche⁴   Glockengi³   Glockengi³  
Glockense    Kleine Gl³   Glockense   
Glockense    Rostkamme³   Glockense   
```
