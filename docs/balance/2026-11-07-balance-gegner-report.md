# Raster-Prototyp: Simulation

Tüftler, 200 Runs, Seed 1, Integrität × 2, Laufzeit 111 s (0.56 s pro Run).

| Kennzahl | Wert |
|---|---|
| Mitternacht | 28 % |
| Mitternacht ohne Umbau | 22 % |
| Ø Kampfdauer | 17.3 s |
| Kämpfe nach höchstens 5 Takten | 0 |
| Kämpfe im Zeitzerfall (> 30 Takte) | 49 % |

Siegquote je Stunde: 1: 63 % · 2: 73 % · 3: 81 % · 4: 87 % · 5: 68 % · 6: 75 % · 7: 70 % · 8: 72 % · 9: 72 % · 10: 73 % · 11: 68 % · 12: 72 %

Belegte Felder je Stunde (Anteil am Turm): 1: 32 % · 2: 71 % · 3: 80 % · 4: 91 % · 5: 86 % · 6: 91 % · 7: 83 % · 8: 87 % · 9: 80 % · 10: 82 % · 11: 75 % · 12: 75 %

## Zählt die Anordnung?

End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust 0.20, spürbar schlechter 43 %.

## Vielfalt

200 verschiedene Raum-Kombinationen und 200 verschiedene Anordnungen bei 200 End-Türmen.

## Zünfte und Räume

Etagen-Anteil je aktiver Zunft (100 % = fair): alchemie 101 % · glocke 84 % · uhrwerk 133 % · wehr 82 %

| Raum | Form | Aufnahme bei aktiver Zunft |
|---|---|---|
| Echokammer | 1 Felder | 82 % |
| Rostkammer | 1 Felder | 78 % |
| Quecksilberhemmung | 1 Felder | 69 % |
| Lazarett | 2 Felder | 63 % |
| Zahnradgetriebe | 1 Felder | 60 % |
| Doppelhemmung | 4 Felder | 53 % |
| Große Glocke | 2 Felder | 52 % |
| Glockenseil | 1 Felder | 52 % |
| Bollwerk | 2 Felder | 51 % |
| Kleine Glocke | 1 Felder | 50 % |
| Salamanderhorst | 2 Felder | 47 % |
| Waffenkammer | 1 Felder | 44 % |
| Brennofen | 1 Felder | 44 % |
| Phiolenlager | 2 Felder | 38 % |
| Aufzugfeder | 1 Felder | 34 % |
| Pendelkammer | 2 Felder | 29 % |
| Ballista | 3 Felder | 28 % |
| Höllenküche | 2 Felder | 28 % |
| Destille | 2 Felder | 27 % |
| Schmiede | 1 Felder | 25 % |
| Giftküche | 1 Felder | 21 % |
| Wachturm | 2 Felder | 20 % |
| Glockengießerei | 3 Felder | 20 % |
| Unruh | 2 Felder | 18 % |
| Resonanzraum | 2 Felder | 18 % |
| Zeitschleife | 2 Felder | 16 % |
| Turmuhr | 2 Felder | 15 % |
| Katalysator | 1 Felder | 13 % |
| Läutwerk | 1 Felder | 12 % |
| Säurebad | 2 Felder | 5 % |
| Antriebswerk | 3 Felder | 2 % |
| Glockenspiel | 3 Felder | 1 % |

Verschmelzungen gefunden: Zeitschleife 12 % · Höllenküche 27 %

## Beispiel-Türme (Mitternacht erreicht)

```
·            ·            ·           
Echokamme²   Echokamme²   ·           
Unruh        Unruh        Zahnradge   
Echokamme²   Aufzugfed    Echokamme   
Doppelhem    Doppelhem    Unruh       
Doppelhem    Doppelhem    Unruh       
Quecksilb    Echokamme³   Zahnradge   
·            Lazarett⁴    Lazarett⁴   
```

```
·            ·            ·           
·            ·            ·           
Quecksilb³   ·            ·           
Lazarett²    Phiolenla    Phiolenla   
Lazarett²    Brennofen    Echokamme   
Destille³    Destille³    Bollwerk    
Doppelhem    Doppelhem    Bollwerk    
Doppelhem    Doppelhem    Rostkamme   
```

```
·            ·            ·           
·            ·            Giftküche   
·            ·            Große Glo³  
·            ·            Große Glo³  
Doppelhem    Doppelhem    Zahnradge   
Doppelhem    Doppelhem    Echokamme²  
Quecksilb    Läutwerk     Aufzugfed³  
Quecksilb²   ·            Rostkamme³  
```

```
Bollwerk³    Doppelhem    Doppelhem   
Bollwerk³    Doppelhem    Doppelhem   
Pendelkam³   Pendelkam³   ·           
Bollwerk²    Bollwerk²    ·           
·            Lazarett³    Lazarett³   
Schmiede²    Säurebad²    Säurebad²   
Ballista⁴    Schmiede³    Giftküche³  
Ballista⁴    Ballista⁴    Schmiede    
```
