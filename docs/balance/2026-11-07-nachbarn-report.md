# Raster-Prototyp: Simulation

Tüftler, 200 Runs, Seed 2, Integrität × 2, Laufzeit 54 s (0.27 s pro Run).

| Kennzahl | Wert |
|---|---|
| Mitternacht | 28 % |
| Mitternacht ohne Umbau | 28 % |
| Ø Kampfdauer | 16.6 s |
| Kämpfe nach höchstens 5 Takten | 0 |
| Kämpfe im Zeitzerfall (> 30 Takte) | 42 % |

Siegquote je Stunde: 1: 69 % · 2: 75 % · 3: 80 % · 4: 69 % · 5: 69 % · 6: 67 % · 7: 70 % · 8: 68 % · 9: 74 % · 10: 71 % · 11: 70 % · 12: 72 %

Belegte Felder je Stunde (Anteil am Turm): 1: 32 % · 2: 72 % · 3: 81 % · 4: 93 % · 5: 88 % · 6: 93 % · 7: 86 % · 8: 90 % · 9: 81 % · 10: 83 % · 11: 77 % · 12: 78 %

## Zählt die Anordnung?

End-Türme gegen je 5 zufällige, kompakte Umbauten (Bewertung Stunde 12, Bilanz −1 bis +1,5): Ø Verlust 0.20, spürbar schlechter 50 %.

## Vielfalt

200 verschiedene Raum-Kombinationen und 200 verschiedene Anordnungen bei 200 End-Türmen.

## Zünfte und Räume

Etagen-Anteil je aktiver Zunft (100 % = fair): alchemie 110 % · glocke 89 % · uhrwerk 129 % · wehr 72 %

| Raum | Form | Aufnahme bei aktiver Zunft |
|---|---|---|
| Rostkammer | 1 Felder | 83 % |
| Echokammer | 1 Felder | 83 % |
| Quecksilberhemmung | 1 Felder | 77 % |
| Kleine Glocke | 1 Felder | 59 % |
| Große Glocke | 2 Felder | 55 % |
| Glockenseil | 1 Felder | 55 % |
| Lazarett | 2 Felder | 55 % |
| Doppelhemmung | 4 Felder | 51 % |
| Zahnradgetriebe | 1 Felder | 51 % |
| Salamanderhorst | 2 Felder | 47 % |
| Phiolenlager | 2 Felder | 45 % |
| Waffenkammer | 1 Felder | 43 % |
| Bollwerk | 2 Felder | 41 % |
| Brennofen | 1 Felder | 36 % |
| Höllenküche | 2 Felder | 36 % |
| Destille | 2 Felder | 33 % |
| Aufzugfeder | 1 Felder | 30 % |
| Ballista | 3 Felder | 27 % |
| Pendelkammer | 2 Felder | 26 % |
| Glockengießerei | 3 Felder | 24 % |
| Schmiede | 1 Felder | 22 % |
| Unruh | 2 Felder | 22 % |
| Giftküche | 1 Felder | 21 % |
| Zeitschleife | 2 Felder | 21 % |
| Wachturm | 2 Felder | 18 % |
| Resonanzraum | 2 Felder | 18 % |
| Turmuhr | 2 Felder | 14 % |
| Katalysator | 1 Felder | 14 % |
| Läutwerk | 1 Felder | 11 % |
| Säurebad | 2 Felder | 6 % |
| Glockenspiel | 3 Felder | 1 % |
| Antriebswerk | 3 Felder | 1 % |

Verschmelzungen gefunden: Zeitschleife 17 % · Höllenküche 29 %

## Beispiel-Türme (Mitternacht erreicht)

```
·            ·            ·           
·            ·            Salamande   
·            ·            Salamande   
Lazarett²    Lazarett²    Phiolenla²  
Bollwerk³    Bollwerk³    Phiolenla²  
Brennofen³   Salamande    Destille⁴   
Salamande    Salamande    Destille⁴   
Salamande    ·            Rostkamme³  
```

```
·            ·            ·           
·            ·            ·           
Doppelhem    Doppelhem    ·           
Doppelhem    Doppelhem    Echokamme   
Echokamme²   Lazarett³    Lazarett³   
Salamande    Salamande    Echokamme   
Salamande    Echokamme    Brennofen²  
Salamande    Rostkamme³   Quecksilb²  
```

```
·            ·            ·           
·            ·            ·           
Doppelhem    Doppelhem    ·           
Doppelhem    Doppelhem    ·           
·            Phiolenla    Phiolenla   
Salamande    Salamande³   Echokamme   
Salamande    Salamande³   Brennofen²  
Quecksilb    Rostkamme    Rostkamme²  
```

```
·            ·            ·           
·            ·            ·           
Doppelhem    Doppelhem    Höllenküc³  
Doppelhem    Doppelhem    Höllenküc³  
Salamande²   Salamande²   Echokamme²  
Zeitschle    Phiolenla    Phiolenla   
Zeitschle    Rostkamme³   Quecksilb   
Quecksilb    ·            Läutwerk    
```
