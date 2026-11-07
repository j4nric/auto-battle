# Raster-Prototyp: Simulation

Tüftler, 150 Runs, Seed 1, Integrität × 2, Laufzeit 19 s (0.13 s pro Run).

| Kennzahl | Wert |
|---|---|
| Mitternacht | 20 % |
| Mitternacht ohne Umbau | 19 % |
| Ø Kampfdauer | 15.2 s |
| Kämpfe nach höchstens 5 Takten | 0 |
| Kämpfe im Zeitzerfall (> 30 Takte) | 29 % |

Siegquote je Stunde: 1: 72 % · 2: 82 % · 3: 81 % · 4: 63 % · 5: 70 % · 6: 64 % · 7: 68 % · 8: 58 % · 9: 65 % · 10: 70 % · 11: 67 % · 12: 71 %

Belegte Felder je Stunde (Anteil am Turm): 1: 32 % · 2: 68 % · 3: 74 % · 4: 86 % · 5: 81 % · 6: 86 % · 7: 79 % · 8: 81 % · 9: 74 % · 10: 77 % · 11: 69 % · 12: 70 %

## Zählt die Anordnung?

End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust 0.37, spürbar schlechter 59 %.

## Vielfalt

150 verschiedene Raum-Kombinationen und 150 verschiedene Anordnungen bei 150 End-Türmen.

## Zünfte und Räume

Etagen-Anteil je aktiver Zunft (100 % = fair): alchemie 117 % · glocke 70 % · uhrwerk 140 % · wehr 69 %

| Raum | Form | Aufnahme bei aktiver Zunft |
|---|---|---|
| Echokammer | 1 Felder | 82 % |
| Quecksilberhemmung | 1 Felder | 78 % |
| Bollwerk | 2 Felder | 73 % |
| Zahnradgetriebe | 1 Felder | 62 % |
| Höllenküche | 2 Felder | 59 % |
| Salamanderhorst | 2 Felder | 58 % |
| Kleine Glocke | 1 Felder | 55 % |
| Glockenseil | 1 Felder | 52 % |
| Große Glocke | 2 Felder | 51 % |
| Destille | 2 Felder | 51 % |
| Ballista | 3 Felder | 45 % |
| Brennofen | 1 Felder | 44 % |
| Zeitschleife | 2 Felder | 42 % |
| Waffenkammer | 1 Felder | 42 % |
| Aufzugfeder | 1 Felder | 22 % |
| Giftküche | 1 Felder | 22 % |
| Schmiede | 1 Felder | 15 % |
| Turmuhr | 3 Felder | 2 % |

Verschmelzungen gefunden: Zeitschleife 32 % · Höllenküche 48 %

## Beispiel-Türme (Mitternacht erreicht)

```
·            ·            ·           
·            ·            Große Glo³  
Glockense²   Kleine Gl³   Große Glo³  
Glockense²   Kleine Gl²   Große Glo²  
Große Glo³   Glockense²   Große Glo²  
Große Glo³   Ballista     Ballista    
Glockense    Glockense    Ballista    
Waffenkam³   Giftküche    Kleine Gl⁴  
```

```
·            ·            ·           
Echokamme    ·            ·           
Echokamme²   ·            ·           
Große Glo²   Glockense    ·           
Große Glo²   Große Glo⁴   Zahnradge   
Zahnradge⁴   Große Glo⁴   ·           
Höllenküc    Echokamme    Glockense   
Höllenküc    Kleine Gl⁴   Quecksilb   
```

```
·            ·            ·           
·            ·            ·           
Große Glo²   ·            ·           
Große Glo²   Große Glo²   Große Glo²  
Bollwerk²    Bollwerk²    Zahnradge   
Glockense    Zahnradge    Große Glo⁴  
Glockense    Quecksilb    Große Glo⁴  
Quecksilb    Kleine Gl    Zahnradge   
```

```
·            Quecksilb³   Brennofen³  
·            Quecksilb³   Quecksilb   
·            Quecksilb    Quecksilb   
Quecksilb²   Quecksilb    Bollwerk²   
Zeitschle    Quecksilb    Bollwerk²   
Zeitschle    Echokamme    Höllenküc   
·            Bollwerk²    Höllenküc   
Quecksilb    Bollwerk²    Echokamme⁴  
```
