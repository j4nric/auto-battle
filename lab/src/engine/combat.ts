// Deterministic combat: one spark per tower climbs from the foundation to the top. Every tick
// adds about one unit of tempo to the spark's meter; a room costs as much tempo as it is tall.
// With enough tempo the room fires and the spark climbs on. At the top (after the empty floors)
// the spark jumps back to the foundation: one loop.
//
// Room effects are data (game/data/content.json) interpreted here. game/core/combat.gd is a
// port of this file and must produce identical results (tests/golden/combat.json).
import { ROOMS, ALLOYS, TIER_MULT, TIER_NAMES, type RoomDef, type AlloyDef, type Op, type Term, type Trigger } from '../content.ts';
import { round } from '../rng.ts';

export { TIER_MULT, TIER_NAMES };
export const DECAY_START = 30; // from this tick on: time decay
/** Tuning knobs the simulation may vary. */
export const CONFIG = {
  emptyFloorCost: 0.5, // tempo per empty floor before the spark returns to the foundation
  decayPctPerTick: 1, // time decay: (tick - DECAY_START) × x % of max integrity
};
export const MAX_TICKS = 200;
const MAX_DEPTH = 4; // recursion guard for echo, copper and bell chains
const MAX_SPARKS = 3;

export interface TowerRoom {
  id: string;
  tier?: number;
  alloy?: string | null;
}
export interface Tower {
  rooms: TowerRoom[];
  maxFloors?: number;
}
export type Side = 'a' | 'b';

export interface RoomStats {
  dmg: number;
  shield: number;
  heal: number;
  burn: number;
  poison: number;
  activations: number;
}

interface RoomInst {
  id: string;
  def: RoomDef;
  tier: number;
  alloy: AlloyDef | null;
  idx: number;
  charge: number;
  counter: number;
  activations: number;
  broken: boolean;
  spawned: boolean;
  stats: RoomStats;
}

interface Spark {
  pos: number;
  meter: number;
  discount: number;
  loops: number;
  fresh: boolean;
}

interface Fighter {
  side: Side;
  rooms: RoomInst[];
  hp: number;
  maxHp: number;
  emptyCost: number;
  shield: number;
  burn: number;
  poison: number;
  rust: number;
  oil: number;
  sparks: Spark[];
}

export interface CombatEvent {
  side: Side;
  idx: number;
  type: string;
  n?: number;
}

export interface FrameSide {
  hp: number;
  shield: number;
  burn: number;
  poison: number;
  rust: number;
  oil: number;
  sparks: number[];
  rooms: Array<{ broken: boolean; charge: number; counter: number }>;
}

export interface Frame {
  tick: number;
  a: FrameSide;
  b: FrameSide;
  events: CombatEvent[];
}

export interface FightResult {
  winner: Side | 'draw';
  ticks: number;
  a: { hp: number; maxHp: number };
  b: { hp: number; maxHp: number };
  roomStats: { a: Array<{ id: string } & RoomStats>; b: Array<{ id: string } & RoomStats> };
  frames: Frame[] | null;
}

/** Everything an op needs to know about where it runs. */
interface Cx {
  me: Fighter;
  foe: Fighter;
  room: RoomInst;
  mult: number;
  depth: number;
  spark: Spark | null;
}

const hasTag = (r: RoomInst | null, tags: readonly string[]): boolean => !!r && tags.some((t) => r.def.tags.includes(t));
const countTag = (f: Fighter, tag: string): number => f.rooms.reduce((s, r) => s + (!r.broken && r.def.tags.includes(tag) ? 1 : 0), 0);

function below(f: Fighter, room: RoomInst): RoomInst | null {
  const n = f.rooms.length;
  return n > 1 ? f.rooms[(room.idx - 1 + n) % n] : null;
}

function makeFighter(side: Side, tower: Tower, hp: number): Fighter {
  const usedFloors = tower.rooms.reduce((n, r) => n + ROOMS[r.id].height, 0);
  const rooms: RoomInst[] = tower.rooms.map((r, i) => ({
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
    sparks: rooms.length ? [{ pos: 0, meter: 0, discount: 0, loops: 0, fresh: false }] : [],
  };
}

/** Sum of terms, left to right. `room` supplies tier and charge (for auras: the source). */
function evalTerms(terms: readonly Term[], me: Fighter, foe: Fighter, room: RoomInst, mult: number): number {
  let sum = 0;
  for (const t of terms) {
    if ('scaled' in t) sum += t.scaled * mult;
    else if ('scaledPerTag' in t) sum += t.scaledPerTag.n * countTag(me, t.scaledPerTag.tag) * mult;
    else if ('flat' in t) sum += t.flat;
    else if ('tier' in t) sum += t.tier * room.tier;
    else if ('charge' in t) sum += t.charge * room.charge;
    else if ('myOil' in t) sum += t.myOil * me.oil;
    else if ('foeBurn' in t) sum += t.foeBurn * foe.burn;
  }
  return sum;
}

/**
 * Product of the auras of both neighbours (top and foundation are neighbours in the loop).
 * The target sits 'below' the room above it and 'above' the room below it.
 */
function auraMult(f: Fighter, foe: Fighter, room: RoomInst): number {
  const n = f.rooms.length;
  if (n < 2) return 1;
  const up = f.rooms[(room.idx + 1) % n];
  const down = f.rooms[(room.idx - 1 + n) % n];
  const pairs: Array<[RoomInst, 'above' | 'below']> = up === down ? [[up, 'below']] : [[up, 'below'], [down, 'above']];
  let m = 1;
  for (const [src, rel] of pairs) {
    const aura = src.def.aura;
    if (src.broken || !aura) continue;
    if (aura.rel === 'above' && rel !== 'above') continue;
    if (aura.targetTags && !hasTag(room, aura.targetTags)) continue;
    m *= evalTerms(aura.value, f, foe, src, 1);
  }
  return m;
}

const roomCost = (room: RoomInst): number => room.def.height * (room.alloy?.costMult ?? 1);

class Combat {
  a: Fighter;
  b: Fighter;
  tick = 0;
  record: boolean;
  frames: Frame[] | null;
  events: CombatEvent[] = [];

  constructor(a: Fighter, b: Fighter, record: boolean) {
    this.a = a;
    this.b = b;
    this.record = record;
    this.frames = record ? [] : null;
  }

  foeOf(f: Fighter): Fighter {
    return f === this.a ? this.b : this.a;
  }

  log(ev: CombatEvent): void {
    if (this.record) this.events.push(ev);
  }

  hpDamage(target: Fighter, amount: number): void {
    if (amount <= 0) return;
    target.hp -= amount;
    for (const r of target.rooms) if (r.alloy?.glass && !r.broken) r.broken = true;
  }

  damage(target: Fighter, amount: number): number {
    amount = Math.max(0, round(amount));
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    this.hpDamage(target, amount - absorbed);
    return amount;
  }

  effectMult(me: Fighter, room: RoomInst, bonus: number): number {
    return TIER_MULT[room.tier] * auraMult(me, this.foeOf(me), room) * (room.alloy?.mult ?? 1) * bonus;
  }

  cx(me: Fighter, room: RoomInst, bonus: number, depth: number, spark: Spark | null): Cx {
    return { me, foe: this.foeOf(me), room, mult: this.effectMult(me, room, bonus), depth, spark };
  }

  runOps(ops: readonly Op[] | undefined, c: Cx): void {
    if (!ops) return;
    for (const op of ops) this.runOp(op, c);
  }

  runOp(op: Op, c: Cx): void {
    const { me, foe, room, depth, spark } = c;
    const st = room.stats;
    const side = me.side;
    switch (op.op) {
      case 'firstTime':
        if (!room.spawned) {
          room.spawned = true;
          this.runOps(op.then, c);
        } else this.runOps(op.else, c);
        return;
      case 'spawnSpark':
        if (me.sparks.length < MAX_SPARKS) me.sparks.push({ pos: 0, meter: 0, discount: 0, loops: 0, fresh: true });
        return;
      case 'advanceCounter':
        this.advanceCounter(me, room, depth, spark);
        return;
      case 'advanceAllBells':
        if (depth >= MAX_DEPTH) return;
        for (const r of me.rooms) {
          // Bells with counter 1 (Glockenspiel) strike every time anyway. Advancing them causes
          // ping-pong chains between two Glockenspiele (simulation finding).
          if (r !== room && !r.broken && (r.def.counterMax ?? 0) > 1) this.advanceCounter(me, r, depth + 1, spark);
        }
        return;
      case 'retrigger': {
        // Echo rooms never repeat other echo rooms: otherwise chains grow exponentially
        // (three Zeitschleifen on top of each other = 2³ activations, simulation finding).
        const target = below(me, room);
        if (!target || target === room || depth >= MAX_DEPTH || target.def.tags.includes('echo')) return;
        this.activate(me, target, depth + 1, spark, evalTerms(op.bonus, me, foe, room, c.mult));
        return;
      }
      case 'freeNext':
        if (spark) spark.discount += op.amount;
        return;
      case 'chargeOthers': {
        const n = evalTerms(op.value, me, foe, room, c.mult);
        for (const r of me.rooms) if (r !== room && r.def.tags.includes(op.tag)) r.charge += n;
        return;
      }
      default: {
        let n = evalTerms(op.value, me, foe, room, c.mult);
        if (op.timesIfBelowTag && hasTag(below(me, room), [op.timesIfBelowTag.tag])) n *= op.timesIfBelowTag.times;
        switch (op.op) {
          case 'damage': {
            const d = this.damage(foe, n);
            st.dmg += d;
            this.log({ side, idx: room.idx, type: 'dmg', n: d });
            return;
          }
          case 'shield': {
            const s = round(n);
            me.shield += s;
            st.shield += s;
            this.log({ side, idx: room.idx, type: 'shield', n: s });
            return;
          }
          case 'heal': {
            const healed = Math.min(round(n), me.maxHp - me.hp);
            me.hp += healed;
            me.burn = Math.max(0, me.burn - 1);
            me.poison = Math.max(0, me.poison - 1);
            st.heal += healed;
            this.log({ side, idx: room.idx, type: 'heal', n: healed });
            return;
          }
          case 'burn': {
            const b = round(n);
            foe.burn += b;
            st.burn += b;
            this.log({ side, idx: room.idx, type: 'burn', n: b });
            return;
          }
          case 'poison': {
            const p = round(n);
            foe.poison += p;
            st.poison += p;
            this.log({ side, idx: room.idx, type: 'poison', n: p });
            return;
          }
          case 'rust':
            foe.rust += round(n);
            this.log({ side, idx: room.idx, type: 'rust', n: round(n) });
            return;
          case 'oil':
            me.oil += round(n);
            this.log({ side, idx: room.idx, type: 'oil', n: round(n) });
            return;
          case 'breakShield':
            foe.shield = Math.max(0, foe.shield - round(n));
            return;
          case 'addCharge':
            room.charge += n;
            return;
        }
      }
    }
  }

  advanceCounter(me: Fighter, room: RoomInst, depth: number, spark: Spark | null): void {
    room.counter++;
    if (room.counter < (room.def.counterMax ?? 0)) return;
    room.counter = 0;
    this.runOps(room.def.on.strike, this.cx(me, room, 1, depth, spark));
    this.log({ side: me.side, idx: room.idx, type: 'strike' });
    this.emit(me, 'strikeEvent', depth + 1, spark);
  }

  emit(me: Fighter, trigger: Trigger, depth: number, spark: Spark | null): void {
    if (depth > MAX_DEPTH) return;
    for (const r of me.rooms) {
      if (!r.broken && r.def.on[trigger]) this.runOps(r.def.on[trigger], this.cx(me, r, 1, depth, spark));
    }
  }

  activate(me: Fighter, room: RoomInst, depth: number, spark: Spark | null, bonus = 1): void {
    if (room.broken || me.hp <= 0) return;
    const times = room.alloy?.times ?? 1;
    for (let t = 0; t < times; t++) {
      room.activations++;
      room.stats.activations++;
      this.log({ side: me.side, idx: room.idx, type: 'fire' });
      if (room.def.on.activate) this.runOps(room.def.on.activate, this.cx(me, room, bonus, depth, spark));
      if (room.alloy?.shieldPerFloor) {
        const s = room.alloy.shieldPerFloor * room.def.height * TIER_MULT[room.tier];
        me.shield += s;
        room.stats.shield += s;
      }
      // Copper only conducts when the spark fires the room directly. Otherwise a loop forms via
      // the wrap from top to foundation (simulation finding: Antriebswerk with copper).
      if (room.alloy?.conduct && depth === 0) {
        const prev = below(me, room);
        if (prev && prev !== room) this.activate(me, prev, depth + 1, spark);
      }
    }
    if (room.alloy?.breaksAfter && room.activations >= room.alloy.breaksAfter) room.broken = true;
  }

  stepFighter(f: Fighter): void {
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
          // Empty floors above the topmost room.
          if (spark.meter < f.emptyCost) break;
          spark.meter -= f.emptyCost;
          spark.pos = 0;
          spark.loops++;
          this.emit(f, 'loopEvent', 1, spark);
          continue;
        }
        const room = f.rooms[spark.pos];
        const cost = Math.max(0, roomCost(room) - spark.discount);
        if (spark.meter < cost) break;
        spark.meter -= cost;
        spark.discount = 0;
        this.activate(f, room, 0, spark);
        spark.pos++;
        if (f.hp <= 0 || this.foeOf(f).hp <= 0) return;
      }
    }
  }

  statusTick(f: Fighter): void {
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

  snapshot(): void {
    const s = (f: Fighter): FrameSide => ({
      hp: f.hp, shield: f.shield, burn: f.burn, poison: f.poison, rust: f.rust, oil: f.oil,
      sparks: f.sparks.map((sp) => Math.min(sp.pos, f.rooms.length)),
      rooms: f.rooms.map((r) => ({ broken: r.broken, charge: r.charge, counter: r.counter })),
    });
    this.frames!.push({ tick: this.tick, a: s(this.a), b: s(this.b), events: this.events });
    this.events = [];
  }

  run(): Side | 'draw' {
    if (this.record) this.snapshot();
    while (this.tick < MAX_TICKS) {
      this.tick++;
      // The order alternates every tick so neither side has a fixed advantage.
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
    if (this.a.hp <= 0 && this.b.hp <= 0) return 'draw';
    if (this.b.hp <= 0) return 'a';
    if (this.a.hp <= 0) return 'b';
    // Timeout: higher remaining share wins; compared without division so GDScript matches.
    return this.a.hp * this.b.maxHp >= this.b.hp * this.a.maxHp ? 'a' : 'b';
  }
}

/** Simulates one fight. Towers list rooms from the foundation upwards. */
export function fight(towerA: Tower, hpA: number, towerB: Tower, hpB: number, { record = false } = {}): FightResult {
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

/** Fight balance from A's point of view, -1..+1.5 (win bonus), used by bots to rate towers. */
export function margin(res: FightResult): number {
  const pa = Math.max(0, res.a.hp) / res.a.maxHp;
  const pb = Math.max(0, res.b.hp) / res.b.maxHp;
  return pa - pb + (res.winner === 'a' ? 0.5 : 0);
}
