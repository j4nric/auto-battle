// Deterministische Kampf-Simulation: Ein Funke läuft pro Turm von unten nach oben durch die
// Räume. Jeder Takt (Tick) füllt das Tempo-Konto des Funkens um ~1 auf. Ein Raum kostet so viel
// Tempo wie er hoch ist. Ist genug Tempo da, löst der Raum aus und der Funke steigt weiter.
// Oben angekommen springt er zurück zum Fundament ("Runde").
import { ROOMS } from '../content/rooms.js';
import { ALLOYS } from '../content/alloys.js';

export const TIER_MULT = [1, 2, 3, 4];
export const TIER_NAMES = ['Bronze', 'Silber', 'Gold', 'Diamant'];
export const DECAY_START = 30; // ab diesem Takt: Zeitzerfall
// Stellschrauben, die die Simulation variieren kann.
export const CONFIG = {
  emptyFloorCost: 0.5, // Tempo-Kosten pro leerer Etage, bevor der Funke zum Fundament springt
  decayPctPerTick: 1, // Zeitzerfall: (Takt - DECAY_START) × x % der max. Integrität
};
export const MAX_TICKS = 200;
const MAX_DEPTH = 4; // Rekursionsschutz für Echo, Kupfer, Glockenseil-Ketten
const MAX_SPARKS = 3;

function makeFighter(side, tower, hp) {
  const usedFloors = tower.rooms.reduce((n, r) => n + ROOMS[r.id].height, 0);
  const rooms = tower.rooms.map((r, i) => ({
    id: r.id,
    def: ROOMS[r.id],
    tier: r.tier ?? 0,
    alloy: r.alloy ? ALLOYS[r.alloy] : null,
    idx: i,
    charge: 0,
    counter: 0,
    activations: 0,
    broken: false,
    spawned: false,
    stats: { dmg: 0, shield: 0, heal: 0, burn: 0, poison: 0, activations: 0 },
  }));
  return {
    side, rooms, hp, maxHp: hp,
    emptyCost: Math.max(0, (tower.maxFloors ?? usedFloors) - usedFloors) * CONFIG.emptyFloorCost,
    shield: 0, burn: 0, poison: 0, rust: 0, oil: 0,
    sparks: rooms.length ? [{ pos: 0, meter: 0, free: false, loops: 0 }] : [],
  };
}

function neighbors(f, idx) {
  const n = f.rooms.length;
  if (n < 2) return [];
  const above = f.rooms[(idx + 1) % n];
  const below = f.rooms[(idx - 1 + n) % n];
  // Spitze und Fundament sind im Loop Nachbarn.
  return above === below ? [[above, 'below']] : [[above, 'below'], [below, 'above']];
}

// rel beschreibt, wo das Ziel relativ zur Aura-Quelle liegt.
function auraMult(f, room) {
  let m = 1;
  for (const [src, rel] of neighbors(f, room.idx)) {
    if (!src.broken && src.def.aura) m *= src.def.aura(src, rel, room);
  }
  return m;
}

function roomCost(room) {
  return room.def.height * (room.alloy?.costMult ?? 1);
}

class Combat {
  constructor(a, b, record) {
    this.a = a;
    this.b = b;
    this.tick = 0;
    this.record = record;
    this.frames = record ? [] : null;
    this.events = [];
  }

  foeOf(f) {
    return f === this.a ? this.b : this.a;
  }

  log(ev) {
    if (this.record) this.events.push(ev);
  }

  hpDamage(target, amount) {
    if (amount <= 0) return;
    target.hp -= amount;
    for (const r of target.rooms) if (r.alloy?.glass && !r.broken) r.broken = true;
  }

  damage(target, amount) {
    amount = Math.max(0, Math.round(amount));
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    this.hpDamage(target, amount - absorbed);
    return amount;
  }

  ctx(me, room, mult, depth, spark) {
    const cb = this;
    const foe = this.foeOf(me);
    const st = room.stats;
    return {
      me, foe, room, depth,
      v: (n) => n * mult,
      below: () => (me.rooms.length > 1 ? me.rooms[(room.idx - 1 + me.rooms.length) % me.rooms.length] : null),
      above: () => (me.rooms.length > 1 ? me.rooms[(room.idx + 1) % me.rooms.length] : null),
      countTag: (tag) => me.rooms.reduce((s, r) => s + (!r.broken && r.def.tags.includes(tag) ? 1 : 0), 0),
      damage(n) {
        const d = cb.damage(foe, n);
        st.dmg += d;
        cb.log({ side: me.side, idx: room.idx, type: 'dmg', n: d });
      },
      shield(n) {
        n = Math.round(n);
        me.shield += n;
        st.shield += n;
        cb.log({ side: me.side, idx: room.idx, type: 'shield', n });
      },
      heal(n) {
        n = Math.round(n);
        const healed = Math.min(n, me.maxHp - me.hp);
        me.hp += healed;
        me.burn = Math.max(0, me.burn - 1);
        me.poison = Math.max(0, me.poison - 1);
        st.heal += healed;
        cb.log({ side: me.side, idx: room.idx, type: 'heal', n: healed });
      },
      burn(n) {
        n = Math.round(n);
        foe.burn += n;
        st.burn += n;
        cb.log({ side: me.side, idx: room.idx, type: 'burn', n });
      },
      poison(n) {
        n = Math.round(n);
        foe.poison += n;
        st.poison += n;
        cb.log({ side: me.side, idx: room.idx, type: 'poison', n });
      },
      rust(n) {
        foe.rust += Math.round(n);
        cb.log({ side: me.side, idx: room.idx, type: 'rust', n: Math.round(n) });
      },
      oil(n) {
        me.oil += Math.round(n);
        cb.log({ side: me.side, idx: room.idx, type: 'oil', n: Math.round(n) });
      },
      breakShield(n) {
        foe.shield = Math.max(0, foe.shield - Math.round(n));
      },
      retrigger(target, bonus = 1) {
        // Echo-Räume lassen sich nicht selbst wiederholen: sonst entstehen exponentielle Ketten
        // (drei Zeitschleifen übereinander = 2³ Auslösungen, Simulationsbefund).
        if (!target || target === room || depth >= MAX_DEPTH || target.def.tags.includes('echo')) return;
        cb.activate(me, target, depth + 1, spark, bonus);
      },
      freeNext(amount = 1) {
        if (spark) spark.discount = (spark.discount ?? 0) + amount;
      },
      spawnSpark() {
        if (me.sparks.length < MAX_SPARKS) me.sparks.push({ pos: 0, meter: 0, free: false, loops: 0, fresh: true });
      },
      advanceCounter() {
        cb.advanceCounter(me, room, depth, spark);
      },
      advanceAllBells() {
        if (depth >= MAX_DEPTH) return;
        for (const r of me.rooms) {
          // Glocken mit Zähler 1 (Glockenspiel) schlagen ohnehin jedes Mal. Sie weiterzuzählen
          // erzeugt Ping-Pong-Ketten zwischen zwei Glockenspielen (Simulationsbefund).
          if (r !== room && !r.broken && r.def.counterMax > 1) cb.advanceCounter(me, r, depth + 1, spark);
        }
      },
    };
  }

  effectMult(me, room, bonus) {
    return TIER_MULT[room.tier] * auraMult(me, room) * (room.alloy?.mult ?? 1) * bonus;
  }

  advanceCounter(me, room, depth, spark) {
    room.counter++;
    if (room.counter < room.def.counterMax) return;
    room.counter = 0;
    room.def.strike(this.ctx(me, room, this.effectMult(me, room, 1), depth, spark));
    this.log({ side: me.side, idx: room.idx, type: 'strike' });
    this.emit(me, 'strike', depth + 1, spark);
  }

  emit(me, event, depth, spark) {
    if (depth > MAX_DEPTH) return;
    for (const r of me.rooms) {
      if (!r.broken && r.def.onEvent) r.def.onEvent(this.ctx(me, r, this.effectMult(me, r, 1), depth, spark), event);
    }
  }

  activate(me, room, depth, spark, bonus = 1) {
    if (room.broken || me.hp <= 0) return;
    const times = room.alloy?.times ?? 1;
    for (let t = 0; t < times; t++) {
      room.activations++;
      room.stats.activations++;
      this.log({ side: me.side, idx: room.idx, type: 'fire' });
      if (room.def.activate) room.def.activate(this.ctx(me, room, this.effectMult(me, room, bonus), depth, spark));
      if (room.alloy?.shieldPerFloor) {
        const s = room.alloy.shieldPerFloor * room.def.height * TIER_MULT[room.tier];
        me.shield += s;
        room.stats.shield += s;
      }
      // Kupfer leitet nur bei direkter Auslösung durch den Funken weiter. Sonst baut sich über den
      // Umlauf (Spitze ↔ Fundament) eine Endlosschleife (Simulationsbefund: Antriebswerk + Kupfer).
      if (room.alloy?.conduct && depth === 0) {
        const n = me.rooms.length;
        const prev = me.rooms[(room.idx - 1 + n) % n];
        if (prev && prev !== room) this.activate(me, prev, depth + 1, spark);
      }
    }
    if (room.alloy?.breaksAfter && room.activations >= room.alloy.breaksAfter) room.broken = true;
  }

  stepFighter(f) {
    if (!f.rooms.length) return;
    const gain = Math.min(1.6, Math.max(0.6, 1 + 0.06 * f.oil - 0.06 * f.rust));
    const sparks = f.sparks.slice();
    for (const spark of sparks) {
      if (spark.fresh) {
        spark.fresh = false;
        continue;
      }
      spark.meter += gain;
      let guard = 0;
      while (guard++ < 24) {
        if (spark.pos >= f.rooms.length) {
          // Leere Etagen über dem obersten Raum.
          if (spark.meter < f.emptyCost) break;
          spark.meter -= f.emptyCost;
          spark.pos = 0;
          spark.loops++;
          this.emit(f, 'loop', 1, spark);
          continue;
        }
        const room = f.rooms[spark.pos];
        const cost = Math.max(0, roomCost(room) - (spark.discount ?? 0));
        if (spark.meter < cost) break;
        spark.meter -= cost;
        spark.discount = 0;
        this.activate(f, room, 0, spark);
        spark.pos++;
        if (f.hp <= 0 || this.foeOf(f).hp <= 0) return;
      }
    }
  }

  statusTick(f) {
    if (f.burn > 0) {
      this.damage(f, f.burn);
      f.burn -= 1;
    }
    if (f.poison > 0) this.hpDamage(f, f.poison);
    if (this.tick % 3 === 0) {
      f.oil = Math.max(0, f.oil - 1);
      f.rust = Math.max(0, f.rust - 1);
    }
    if (this.tick > DECAY_START) {
      this.hpDamage(f, Math.ceil(((this.tick - DECAY_START) * CONFIG.decayPctPerTick * f.maxHp) / 100));
    }
  }

  snapshot() {
    const s = (f) => ({
      hp: f.hp, shield: f.shield, burn: f.burn, poison: f.poison, rust: f.rust, oil: f.oil,
      sparks: f.sparks.map((sp) => Math.min(sp.pos, f.rooms.length)),
      rooms: f.rooms.map((r) => ({ broken: r.broken, charge: r.charge, counter: r.counter })),
    });
    this.frames.push({ tick: this.tick, a: s(this.a), b: s(this.b), events: this.events });
    this.events = [];
  }

  run() {
    if (this.record) this.snapshot();
    while (this.tick < MAX_TICKS) {
      this.tick++;
      // Reihenfolge wechselt jeden Takt, damit keine Seite einen festen Vorteil hat.
      const order = this.tick % 2 ? [this.a, this.b] : [this.b, this.a];
      for (const f of order) {
        if (this.a.hp > 0 && this.b.hp > 0) this.stepFighter(f);
      }
      if (this.a.hp > 0 && this.b.hp > 0) {
        this.statusTick(this.a);
        this.statusTick(this.b);
      }
      if (this.record) this.snapshot();
      if (this.a.hp <= 0 || this.b.hp <= 0) break;
    }
    let winner;
    if (this.a.hp <= 0 && this.b.hp <= 0) winner = 'draw';
    else if (this.b.hp <= 0) winner = 'a';
    else if (this.a.hp <= 0) winner = 'b';
    else winner = this.a.hp / this.a.maxHp >= this.b.hp / this.b.maxHp ? 'a' : 'b';
    return winner;
  }
}

/**
 * Simuliert einen Kampf. tower = { rooms: [{ id, tier, alloy }] } von unten nach oben.
 * Rückgabe enthält Sieger, Dauer in Takten, Rest-Integrität und Beiträge pro Raum.
 */
export function fight(towerA, hpA, towerB, hpB, { record = false } = {}) {
  const a = makeFighter('a', towerA, hpA);
  const b = makeFighter('b', towerB, hpB);
  const c = new Combat(a, b, record);
  const winner = c.run();
  return {
    winner,
    ticks: c.tick,
    a: { hp: a.hp, maxHp: a.maxHp },
    b: { hp: b.hp, maxHp: b.maxHp },
    roomStats: { a: a.rooms.map((r) => ({ id: r.id, ...r.stats })), b: b.rooms.map((r) => ({ id: r.id, ...r.stats })) },
    frames: c.frames,
  };
}

/** Kampfbilanz aus Sicht von A, -1..+1.5 (Sieg-Bonus), für Bewertungen durch Bots. */
export function margin(res) {
  const pa = Math.max(0, res.a.hp) / res.a.maxHp;
  const pb = Math.max(0, res.b.hp) / res.b.maxHp;
  return pa - pb + (res.winner === 'a' ? 0.5 : 0);
}
