// Deterministic combat: one spark per tower climbs from the foundation to the top. Every tick
// adds about one unit of tempo to the spark's meter; a room costs as much tempo as it is tall.
// With enough tempo the room fires and the spark climbs on. At the top (after the empty floors)
// the spark jumps back to the foundation: one loop.
//
// Room effects are data (game/data/content.json) interpreted here. game/core/combat.gd is a
// port of this file and must produce identical results (tests/golden/combat.json).
import { ROOMS, ALLOYS, TIER_MULT, TIER_NAMES, type RoomDef, type AlloyDef, type Op, type Term, type Trigger } from '../content.ts';
import { round } from '../rng.ts';
import { RASTER_ROOMS, cellsOf } from '../raster/content.ts';

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
/** Grid tower (raster prototype, ADR 0008): rooms with a position and rotation. */
export interface GridRoom extends TowerRoom {
  x: number;
  y: number;
  rot?: number;
}
export interface GridTower {
  kind: 'grid';
  width: number;
  rows: number;
  rooms: GridRoom[];
}
export type AnyTower = Tower | GridTower;
export const isGrid = (t: AnyTower): t is GridTower => (t as GridTower).kind === 'grid';
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
  /** Neighbours whose auras reach this room, with this room's position relative to them. */
  nbrs: Array<[RoomInst, 'above' | 'below']>;
  /** The room the spark fires before this one ("the room below" in a single column). */
  prev: RoomInst | null;
}

/** One step of the spark's path: a room segment or empty space. */
interface PathStep {
  room: number; // room index, -1 for empty space
  cells: number; // tempo cost before alloys and discounts
  fire: boolean; // the room fires when this step is paid (its first segment on the path)
}

interface Spark {
  pos: number;
  meter: number;
  discount: number;
  /** The room just fired was entered with a discount: it passes no discount on (no chains). */
  chained: boolean;
  loops: number;
  fresh: boolean;
}

interface Fighter {
  side: Side;
  rooms: RoomInst[];
  hp: number;
  maxHp: number;
  path: PathStep[];
  /** Tempo per tick multiplier: the tower width, so a grid spark crosses about one row per tick. */
  speed: number;
  shield: number;
  burn: number;
  poison: number;
  rust: number;
  oil: number;
  sparks: Spark[];
  /** Grid tower (ADR 0008): neighbour effects reach every room sharing an edge (q15). */
  grid: boolean;
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

/** Strength of copper's extra activations in the grid, where it reaches every neighbour. */
const CONDUCT_GRID = 0.5;

function below(_f: Fighter, room: RoomInst): RoomInst | null {
  return room.prev;
}

/**
 * Rooms a neighbour effect reaches: in the grid every room sharing an edge, in room order
 * (q15, 07.11.2026); in the single column the room below.
 */
function adjacent(f: Fighter, room: RoomInst): RoomInst[] {
  if (f.grid) return room.nbrs.map(([r]) => r);
  const b = below(f, room);
  return b ? [b] : [];
}

function makeFighter(side: Side, tower: AnyTower, hp: number): Fighter {
  const defs = isGrid(tower) ? RASTER_ROOMS : ROOMS;
  const rooms: RoomInst[] = tower.rooms.map((r, i) => ({
    id: r.id,
    def: defs[r.id],
    tier: r.tier ?? 0,
    alloy: r.alloy ? ALLOYS[r.alloy] : null,
    idx: i,
    charge: 0,
    counter: 0,
    activations: 0,
    broken: false,
    spawned: false,
    stats: { dmg: 0, shield: 0, heal: 0, burn: 0, poison: 0, activations: 0 },
    nbrs: [],
    prev: null,
  }));
  const path = isGrid(tower) ? gridLayout(tower, rooms) : columnLayout(tower, rooms);
  return {
    side, rooms, hp, maxHp: hp, path, speed: isGrid(tower) ? tower.width : 1,
    shield: 0, burn: 0, poison: 0, rust: 0, oil: 0,
    sparks: rooms.length ? [{ pos: 0, meter: 0, discount: 0, chained: false, loops: 0, fresh: false }] : [],
    grid: isGrid(tower),
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
 * Single column: the spark climbs room by room, then crosses the empty floors and loops.
 * Top and foundation are neighbours in the loop. A room sits 'below' the room above it and
 * 'above' the room below it.
 */
function columnLayout(tower: Tower, rooms: RoomInst[]): PathStep[] {
  const n = rooms.length;
  for (const r of rooms) {
    if (n < 2) break;
    const up = rooms[(r.idx + 1) % n];
    const down = rooms[(r.idx - 1 + n) % n];
    r.nbrs = up === down ? [[up, 'below']] : [[up, 'below'], [down, 'above']];
    r.prev = down;
  }
  const used = tower.rooms.reduce((s, r) => s + ROOMS[r.id].height, 0);
  const path: PathStep[] = rooms.map((r) => ({ room: r.idx, cells: r.def.height, fire: true }));
  path.push({ room: -1, cells: Math.max(0, (tower.maxFloors ?? used) - used) * CONFIG.emptyFloorCost, fire: false });
  return path;
}

/** Cells in the order the spark visits them: row by row from the bottom, alternating direction. */
export function snakeOrder(width: number, rows: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < rows; y++) {
    for (let i = 0; i < width; i++) out.push([y % 2 === 0 ? i : width - 1 - i, y]);
  }
  return out;
}

/**
 * Grid (ADR 0008): the spark walks the cells in snake order. Each room cell costs 1 tempo, an
 * empty cell half. A room fires once per loop, when the spark leaves its first stretch of cells.
 * Rooms sharing an edge are neighbours; 'above' means the target has a cell right above a cell
 * of the source. The previous room is the one fired before it on the path (wrapping around).
 */
function gridLayout(tower: GridTower, rooms: RoomInst[]): PathStep[] {
  const owner: number[] = new Array(tower.width * tower.rows).fill(-1);
  const at = (x: number, y: number): number => (x < 0 || y < 0 || x >= tower.width || y >= tower.rows ? -1 : owner[y * tower.width + x]);
  tower.rooms.forEach((r, i) => {
    for (const [cx, cy] of cellsOf(rooms[i].def, r.rot ?? 0)) owner[(r.y + cy) * tower.width + r.x + cx] = i;
  });
  const path: PathStep[] = [];
  const seen = new Set<number>();
  for (const [x, y] of snakeOrder(tower.width, tower.rows)) {
    const o = at(x, y);
    const last = path[path.length - 1];
    if (last && last.room === o) last.cells += o < 0 ? CONFIG.emptyFloorCost : 1;
    else path.push({ room: o, cells: o < 0 ? CONFIG.emptyFloorCost : 1, fire: false });
  }
  for (const st of path) if (st.room >= 0 && !seen.has(st.room)) { seen.add(st.room); st.fire = true; }
  const order = path.filter((st) => st.fire).map((st) => st.room);
  order.forEach((ri, k) => { if (order.length > 1) rooms[ri].prev = rooms[order[(k - 1 + order.length) % order.length]]; });
  // Neighbours by shared edges, in room order so aura products are deterministic.
  for (let ti = 0; ti < rooms.length; ti++) {
    const rel = new Map<number, 'above' | 'below'>();
    for (let y = 0; y < tower.rows; y++) {
      for (let x = 0; x < tower.width; x++) {
        if (at(x, y) !== ti) continue;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const si = at(x + dx, y + dy);
          if (si < 0 || si === ti) continue;
          if (dy === -1) rel.set(si, 'above'); // the source lies right below this cell
          else if (!rel.has(si)) rel.set(si, 'below');
        }
      }
    }
    rooms[ti].nbrs = [...rel.entries()].sort((p, q) => p[0] - q[0]).map(([si, r]) => [rooms[si], r]);
  }
  return path;
}

/** Product of the auras of all neighbours. */
function auraMult(f: Fighter, foe: Fighter, room: RoomInst): number {
  let m = 1;
  for (const [src, rel] of room.nbrs) {
    const aura = src.def.aura;
    if (src.broken || !aura) continue;
    if (aura.rel === 'above' && rel !== 'above') continue;
    if (aura.targetTags && !hasTag(room, aura.targetTags)) continue;
    m *= evalTerms(aura.value, f, foe, src, 1);
  }
  return m;
}



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
        if (me.sparks.length < MAX_SPARKS) me.sparks.push({ pos: 0, meter: 0, discount: 0, chained: false, loops: 0, fresh: true });
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
        const bonus = evalTerms(op.bonus, me, foe, room, c.mult);
        for (const target of adjacent(me, room)) {
          if (target === room || depth >= MAX_DEPTH || target.def.tags.includes('echo')) continue;
          // Bells advance their counter in full even at reduced strength, so an echo between
          // bells and bell ropes chains strikes (simulation finding, q15).
          if (op.skipTags && hasTag(target, op.skipTags)) continue;
          this.activate(me, target, depth + 1, spark, bonus);
        }
        return;
      }
      case 'freeNext':
        if (spark && !spark.chained) spark.discount += op.amount;
        return;
      case 'chargeOthers': {
        const n = evalTerms(op.value, me, foe, room, c.mult);
        for (const r of me.rooms) if (r !== room && r.def.tags.includes(op.tag)) r.charge += n;
        return;
      }
      default: {
        let n = evalTerms(op.value, me, foe, room, c.mult);
        if (op.timesIfBelowTag && adjacent(me, room).some((r) => hasTag(r, [op.timesIfBelowTag!.tag]))) n *= op.timesIfBelowTag.times;
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
        // Grid: every neighbour at half strength; column: the room below in full.
        for (const t of adjacent(me, room)) if (t !== room) this.activate(me, t, depth + 1, spark, me.grid ? CONDUCT_GRID : 1);
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
      spark.meter += gain * f.speed;
      let guard = 0;
      while (guard++ < 24 * f.speed) {
        const step = f.path[spark.pos];
        const room = step.room >= 0 ? f.rooms[step.room] : null;
        const cost = room ? Math.max(0, step.cells * (room.alloy?.costMult ?? 1) - spark.discount) : step.cells;
        if (spark.meter < cost) break;
        spark.meter -= cost;
        if (room) {
          spark.chained = spark.discount > 0;
          spark.discount = 0;
          if (step.fire) this.activate(f, room, 0, spark);
        }
        spark.pos++;
        if (spark.pos >= f.path.length) {
          spark.pos = 0;
          spark.loops++;
          this.emit(f, 'loopEvent', 1, spark);
        }
        if (room && (f.hp <= 0 || this.foeOf(f).hp <= 0)) return;
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
      sparks: f.sparks.map((sp) => sp.pos), // index into the path (in a column: the room, or the empty floors)
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
export function fight(towerA: AnyTower, hpA: number, towerB: AnyTower, hpB: number, { record = false } = {}): FightResult {
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
