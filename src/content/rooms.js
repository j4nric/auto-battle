// Raum-Definitionen (die "Items"). Werte sind Bronze-Werte, c.v() skaliert mit Stufe,
// Legierung und Nachbar-Auren. Index 0 im Turm ist das Fundament, "darüber" = Index + 1.

export const GUILDS = {
  wehr: { name: 'Wehr', color: '#9aa4b1' },
  uhrwerk: { name: 'Uhrwerk', color: '#d4a24c' },
  glocke: { name: 'Glocken', color: '#7fb3d5' },
  alchemie: { name: 'Alchemie', color: '#8bc34a' },
};

export const ROOMS = {};

function room(id, def) {
  ROOMS[id] = { id, fusion: false, tags: [], ...def };
}

const hasTag = (inst, ...tags) => inst && tags.some((t) => inst.def.tags.includes(t));

// ---------------------------------------------------------------- Wehr
room('waffenkammer', {
  name: 'Waffenkammer', guild: 'wehr', height: 1, tags: ['waffe'],
  text: 'Schaden 7',
  activate: (c) => c.damage(c.v(7)),
});
room('bollwerk', {
  name: 'Bollwerk', guild: 'wehr', height: 2, tags: ['schild'],
  text: 'Schild 20',
  activate: (c) => c.shield(c.v(20)),
});
room('lazarett', {
  name: 'Lazarett', guild: 'wehr', height: 2, tags: ['heilung'],
  text: 'Heilt 14 und entfernt je 1 Brand und Gift',
  activate: (c) => c.heal(c.v(14)),
});
room('ballista', {
  name: 'Ballista', guild: 'wehr', height: 3, tags: ['waffe'],
  text: 'Schaden 26',
  activate: (c) => c.damage(c.v(26)),
});
room('schmiede', {
  name: 'Schmiede', guild: 'wehr', height: 1, tags: ['werkzeug'],
  text: 'Raum darüber +50 % Wirkung (+25 % je Stufe). Schild 2',
  activate: (c) => c.shield(c.v(2)),
  aura: (src, rel) => (rel === 'above' ? 1.5 + 0.25 * src.tier : 1),
});
room('wachturm', {
  name: 'Wachturm', guild: 'wehr', height: 2, tags: ['waffe'],
  text: 'Schaden 4 + 4 je Waffen-Raum im Turm',
  activate: (c) => c.damage(c.v(4 + 4 * c.countTag('waffe'))),
});

// ---------------------------------------------------------------- Uhrwerk (Takt, Spannung)
room('feder', {
  name: 'Aufzugfeder', guild: 'uhrwerk', height: 1, tags: ['feder'],
  text: 'Schaden 2 + Spannung. Jede Auslösung +2 Spannung (bleibt den Kampf über)',
  activate: (c) => {
    c.damage(c.v(2) + c.room.charge);
    c.room.charge += c.v(2);
  },
});
room('zahnrad', {
  name: 'Zahnradgetriebe', guild: 'uhrwerk', height: 1, tags: ['zahnrad'],
  text: 'Beide Nachbarn +25 % Wirkung (+10 % je Stufe). Öl 1',
  activate: (c) => c.oil(1),
  aura: (src) => 1.25 + 0.1 * src.tier,
});
room('pendel', {
  name: 'Pendelkammer', guild: 'uhrwerk', height: 2, tags: ['pendel'],
  text: 'Öl 2, Schild 6',
  activate: (c) => {
    c.oil(2 + c.room.tier);
    c.shield(c.v(6));
  },
});
room('echo', {
  name: 'Echokammer', guild: 'uhrwerk', height: 1, tags: ['echo'],
  text: 'Löst den Raum darunter erneut aus, mit 60 % Wirkung (+20 % je Stufe)',
  activate: (c) => c.retrigger(c.below(), 0.6 + 0.2 * c.room.tier),
});
room('quecksilber', {
  name: 'Quecksilberhemmung', guild: 'uhrwerk', height: 1, tags: ['hemmung'],
  text: 'Schaden 2. Der nächste Raum braucht 1 Takt weniger',
  activate: (c) => {
    c.damage(c.v(2));
    c.freeNext();
  },
});
room('doppelhemmung', {
  name: 'Doppelhemmung', guild: 'uhrwerk', height: 3, tags: ['hemmung', 'funke'],
  text: 'Erste Auslösung: ein zweiter Funke startet am Fundament. Danach Öl 3',
  activate: (c) => {
    if (!c.room.spawned) {
      c.room.spawned = true;
      c.spawnSpark();
    } else c.oil(3 + c.room.tier);
  },
});
room('unruh', {
  name: 'Unruh', guild: 'uhrwerk', height: 2, tags: ['pendel'],
  text: 'Schaden 4 + 2 je eigenem Öl',
  activate: (c) => c.damage(c.v(4) + 2 * c.me.oil),
});

// ---------------------------------------------------------------- Glocken (Zähler, große Schläge)
room('kleineGlocke', {
  name: 'Kleine Glocke', guild: 'glocke', height: 1, tags: ['glocke'], counterMax: 2,
  text: 'Jede 2. Auslösung: Glockenschlag, Schaden 18',
  activate: (c) => c.advanceCounter(),
  strike: (c) => c.damage(c.v(18)),
});
room('grosseGlocke', {
  name: 'Große Glocke', guild: 'glocke', height: 2, tags: ['glocke'], counterMax: 3,
  text: 'Jede 3. Auslösung: Glockenschlag, Schaden 45 und Schild 15',
  activate: (c) => c.advanceCounter(),
  strike: (c) => {
    c.damage(c.v(45));
    c.shield(c.v(15));
  },
});
room('glockenseil', {
  name: 'Glockenseil', guild: 'glocke', height: 1, tags: ['seil'],
  text: 'Alle Glocken im Turm zählen um 1 weiter',
  activate: (c) => c.advanceAllBells(),
});
room('resonanz', {
  name: 'Resonanzraum', guild: 'glocke', height: 2, tags: ['resonanz'],
  text: 'Schild 4. Bei jedem eigenen Glockenschlag: Schild 6',
  activate: (c) => c.shield(c.v(4)),
  onEvent: (c, e) => {
    if (e === 'strike') c.shield(c.v(6));
  },
});
room('turmuhr', {
  name: 'Turmuhr', guild: 'glocke', height: 2, tags: ['uhr'],
  text: 'Schaden 3 + 4 je Glocke im Turm',
  activate: (c) => c.damage(c.v(3 + 4 * c.countTag('glocke'))),
});
room('laeutwerk', {
  name: 'Läutwerk', guild: 'glocke', height: 1, tags: ['uhr'],
  text: 'Immer wenn ein Funke eine Runde vollendet: Schaden 4',
  onEvent: (c, e) => {
    if (e === 'loop') c.damage(c.v(4));
  },
});
room('giesserei', {
  name: 'Glockengießerei', guild: 'glocke', height: 3, tags: ['werkzeug'],
  text: 'Schaden 8. Alle Glocken zählen um 1 weiter',
  activate: (c) => {
    c.damage(c.v(8));
    c.advanceAllBells();
  },
});

// ---------------------------------------------------------------- Alchemie (Status)
room('brennofen', {
  name: 'Brennofen', guild: 'alchemie', height: 1, tags: ['feuer'],
  text: 'Brand 3',
  activate: (c) => c.burn(c.v(3)),
});
room('giftkueche', {
  name: 'Giftküche', guild: 'alchemie', height: 1, tags: ['gift'],
  text: 'Gift 1',
  activate: (c) => c.poison(c.v(1)),
});
room('destille', {
  name: 'Destille', guild: 'alchemie', height: 2, tags: ['feuer', 'gift'],
  text: 'Brand 3, Gift 1',
  activate: (c) => {
    c.burn(c.v(3));
    c.poison(c.v(1));
  },
});
room('rostkammer', {
  name: 'Rostkammer', guild: 'alchemie', height: 1, tags: ['rost'],
  text: 'Rost 2 beim Gegner, +1 je Stufe (sein Funke wird langsamer)',
  activate: (c) => c.rust(2 + c.room.tier),
});
room('phiolen', {
  name: 'Phiolenlager', guild: 'alchemie', height: 2, tags: ['feuer'],
  text: 'Schaden 3 + doppelter Brand des Gegners',
  activate: (c) => c.damage(c.v(3) + 2 * c.foe.burn),
});
room('salamander', {
  name: 'Salamanderhorst', guild: 'alchemie', height: 2, tags: ['feuer', 'kreatur'],
  text: 'Brand 4. Doppelt, wenn darunter ein Feuer-Raum liegt',
  activate: (c) => c.burn(c.v(4) * (hasTag(c.below(), 'feuer') ? 2 : 1)),
});
room('saeurebad', {
  name: 'Säurebad', guild: 'alchemie', height: 2, tags: ['gift'],
  text: 'Zerstört 10 Schild des Gegners, Gift 1',
  activate: (c) => {
    c.breakShield(c.v(10));
    c.poison(c.v(1));
  },
});
room('katalysator', {
  name: 'Katalysator', guild: 'alchemie', height: 1, tags: ['werkzeug'],
  text: 'Feuer- und Gift-Nachbarn +35 % Wirkung (+15 % je Stufe). Brand 1',
  activate: (c) => c.burn(c.v(1)),
  aura: (src, rel, tgt) => (hasTag(tgt, 'feuer', 'gift') ? 1.35 + 0.15 * src.tier : 1),
});

// ---------------------------------------------------------------- Verschmelzungen (versteckt)
room('glockenspiel', {
  name: 'Glockenspiel', guild: 'glocke', height: 3, tags: ['glocke'], counterMax: 1, fusion: true,
  text: 'Glockenschlag bei jeder Auslösung: Schaden 45, Schild 15, alle anderen Glocken zählen um 1 weiter',
  activate: (c) => c.advanceCounter(),
  strike: (c) => {
    c.damage(c.v(45));
    c.shield(c.v(15));
    c.advanceAllBells();
  },
});
room('antriebswerk', {
  name: 'Antriebswerk', guild: 'uhrwerk', height: 3, tags: ['feder', 'zahnrad'], fusion: true,
  text: 'Schaden 10 + Spannung, Öl 2. Jede Auslösung +10 Spannung, alle anderen Federn +3',
  activate: (c) => {
    c.damage(c.v(10) + c.room.charge);
    c.oil(2);
    c.room.charge += c.v(10);
    for (const r of c.me.rooms) if (r !== c.room && hasTag(r, 'feder')) r.charge += 3;
  },
});
room('hoellenkueche', {
  name: 'Höllenküche', guild: 'alchemie', height: 2, tags: ['feuer', 'gift'], fusion: true,
  text: 'Brand 5, Gift 2',
  activate: (c) => {
    c.burn(c.v(5));
    c.poison(c.v(2));
  },
});
room('zeitschleife', {
  name: 'Zeitschleife', guild: 'uhrwerk', height: 2, tags: ['echo', 'hemmung'], fusion: true,
  text: 'Löst den Raum darunter zweimal aus, mit 80 % Wirkung (+20 % je Stufe)',
  activate: (c) => {
    c.retrigger(c.below(), 0.8 + 0.2 * c.room.tier);
    c.retrigger(c.below(), 0.8 + 0.2 * c.room.tier);
  },
});

// Muster von unten nach oben, direkt aufeinanderfolgend. Eine Verschmelzung muss klar stärker sein
// als ihre Teile, sonst baut sie niemand (Simulationsbefund). Glockenspiel und Antriebswerk sparen
// zusätzlich eine Etage (4 → 3).
export const FUSIONS = [
  // Dreier-Rezepte aus verschiedenen Räumen: gleiche Räume würden mit der Aufwertung durch Duplikate
  // konkurrieren und wurden in der Simulation praktisch nie gebaut.
  { pattern: ['glockenseil', 'kleineGlocke', 'grosseGlocke'], result: 'glockenspiel' },
  { pattern: ['zahnrad', 'feder', 'unruh'], result: 'antriebswerk' },
  { pattern: ['brennofen', 'giftkueche'], result: 'hoellenkueche' },
  { pattern: ['quecksilber', 'echo'], result: 'zeitschleife' },
];

export const SHOP_ROOMS = Object.values(ROOMS).filter((r) => !r.fusion);
