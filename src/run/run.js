// Ein Run: 12 Stunden. Jede Stunde = Werkstatt (Shop) → Vorzeichen (Gegnerwahl) → Kampf.
import { Rng, hashSeed } from '../rng.js';
import { ROOMS, SHOP_ROOMS, GUILDS, FUSIONS } from '../content/rooms.js';
import { ALLOY_IDS } from '../content/alloys.js';
import { fight } from '../engine/combat.js';
import * as T from '../engine/tower.js';

export const HOURS = 12;
export const LIVES = 3;
export const ACTIVE_GUILDS = 3; // von 4 Zünften sind pro Run 3 im Pool

export const OMENS = {
  schwach: { id: 'schwach', name: 'Streunende Rostwölfe', diff: 0.8, gold: 2 },
  normal: { id: 'normal', name: 'Uhrwerk-Wächter', diff: 1.0, gold: 5 },
  elite: { id: 'elite', name: 'Elite: Rostende Ruine', diff: 1.2, gold: 7, alloy: true },
  haendler: { id: 'haendler', name: 'Wandernder Händler', fight: false, gold: 3, merchant: 2 },
  boss: { id: 'boss', name: 'Mitternacht', diff: 1.3, gold: 0 },
};

// Integrität wächst überlinear, weil Schaden über Stufen und Synergien multiplikativ wächst.
export const playerHp = (hour) => Math.round(80 + 180 * hour ** 1.4);
export const income = (hour) => 9 + Math.ceil(hour / 2);
export const price = (id, tier = 0) => ROOMS[id].height * 3 * (tier + 1);
const MONSTER_NAMES = {
  wehr: 'Belagerungsturm', uhrwerk: 'Zeitdiebe', glocke: 'Totenglocke', alchemie: 'Giftmischer',
};

export function createRun(seed, { ghostPool = null } = {}) {
  const rng = new Rng(hashSeed('run', seed));
  const guilds = rng.shuffle(Object.keys(GUILDS)).slice(0, ACTIVE_GUILDS);
  return {
    seed, rng, guilds, ghostPool,
    hour: 0, gold: 0, lives: LIVES, wins: 0,
    tower: T.emptyTower(),
    offers: [], rerollCost: 1, merchant: 0,
    fusionsFound: [], fights: [], over: false, midnight: false,
  };
}

// ---------------------------------------------------------------- Werkstatt
function rollTier(rng, hour) {
  const r = rng.float();
  if (hour >= 9 && r < 0.25) return 2;
  if (hour >= 5 && r < 0.45) return 1;
  return 0;
}

// ownedWeight: Räume, die schon im Turm stehen, erscheinen öfter.
// recipePull: Liegt ein angefangenes Rezept im Turm (alle Teile bis auf eines, direkt übereinander),
// "ruft" der Turm das fehlende Teil und es erscheint entsprechend häufiger.
export const SHOP = { ownedWeight: 1, recipePull: 4 };

function calledRooms(tower) {
  const ids = tower.rooms.map((r) => r.id);
  const called = new Set();
  for (const f of FUSIONS) {
    const L = f.pattern.length;
    for (let miss = 0; miss < L; miss++) {
      const rest = f.pattern.filter((_, k) => k !== miss).join(',');
      for (let i = 0; i + L - 1 <= ids.length; i++) {
        if (ids.slice(i, i + L - 1).join(',') === rest) called.add(f.pattern[miss]);
      }
    }
  }
  return called;
}

function pickWeighted(rng, items, weight) {
  const total = items.reduce((s, x) => s + weight(x), 0);
  let r = rng.float() * total;
  for (const x of items) if ((r -= weight(x)) < 0) return x;
  return items[items.length - 1];
}

export function rollOffers(run) {
  const pool = SHOP_ROOMS.filter((r) => run.guilds.includes(r.guild));
  const owned = new Set(run.tower.rooms.map((r) => r.id));
  const called = calledRooms(run.tower);
  const n = 3 + run.merchant;
  run.offers = Array.from({ length: n }, () => {
    const def = pickWeighted(run.rng, pool, (d) => (owned.has(d.id) ? SHOP.ownedWeight : 1) * (called.has(d.id) ? SHOP.recipePull : 1));
    const tier = rollTier(run.rng, run.hour);
    return { id: def.id, tier, price: Math.round(price(def.id, tier) * (run.merchant ? 0.75 : 1)) };
  });
}

export function startHour(run) {
  run.hour++;
  run.gold += income(run.hour);
  run.rerollCost = 1;
  rollOffers(run);
  run.merchant = 0;
}

function commit(run, tower) {
  const { tower: t, fused } = T.applyFusions(tower);
  run.tower = t;
  for (const f of fused) if (!run.fusionsFound.includes(f)) run.fusionsFound.push(f);
  return fused;
}

/** Ergebnis eines Kaufs, ohne ihn auszuführen (für Bots und UI-Vorschau). */
// upgrade=true: Duplikat wertet den vorhandenen Raum auf. Sonst wird es als eigener Raum eingebaut
// (nötig für Verschmelzungen wie drei Kleine Glocken).
export function previewBuy(run, offerIdx, pos, upgrade = true) {
  const o = run.offers[offerIdx];
  if (!o || o.price > run.gold) return null;
  const dup = run.tower.rooms.findIndex((r) => r.id === o.id);
  if (dup >= 0 && upgrade) {
    const cur = run.tower.rooms[dup].tier;
    if (cur >= 3) return null;
    return T.setRoom(run.tower, dup, { tier: Math.min(3, Math.max(cur, o.tier) + 1) });
  }
  if (!T.fits(run.tower, o.id)) return null;
  return T.insert(run.tower, { id: o.id, tier: o.tier, alloy: null }, pos);
}

export function buy(run, offerIdx, pos, upgrade = true) {
  const t = previewBuy(run, offerIdx, pos, upgrade);
  if (!t) return false;
  run.gold -= run.offers[offerIdx].price;
  run.offers.splice(offerIdx, 1);
  commit(run, t);
  return true;
}

export function sell(run, idx) {
  const r = run.tower.rooms[idx];
  run.gold += Math.floor(price(r.id, r.tier) / 2);
  run.tower = T.remove(run.tower, idx);
}

export function reroll(run) {
  if (run.gold < run.rerollCost) return false;
  run.gold -= run.rerollCost;
  run.rerollCost++;
  rollOffers(run);
  return true;
}

export function setTower(run, tower) {
  commit(run, tower);
}

// ---------------------------------------------------------------- Vorzeichen und Gegner
export function omensFor(run) {
  if (run.hour === HOURS) return [OMENS.boss];
  if (run.hour === 4 || run.hour === 8) return [OMENS.elite];
  const rng = new Rng(hashSeed(run.seed, 'omen', run.hour));
  return rng.shuffle(['schwach', 'normal', 'elite', 'haendler']).slice(0, 3).map((k) => OMENS[k]);
}

export function generateMonster(seed, hour, diff = 1) {
  const rng = new Rng(hashSeed('monster', seed, hour));
  const guild = rng.pick(Object.keys(GUILDS));
  const pool = SHOP_ROOMS.filter((r) => r.guild === guild);
  const all = SHOP_ROOMS;
  const target = Math.min(T.BASE_FLOORS, 2 + hour);
  let tower = T.emptyTower();
  const base = (hour - 1) / 3;
  for (let tries = 0; tries < 40 && T.floorsUsed(tower) < target; tries++) {
    const def = rng.chance(0.6) ? rng.pick(pool) : rng.pick(all);
    if (T.floorsUsed(tower) + def.height > target) continue;
    const tier = Math.min(3, Math.floor(base + rng.float()));
    const alloy = hour >= 7 && rng.chance(0.15) ? rng.pick(ALLOY_IDS) : null;
    tower = T.insert(tower, { id: def.id, tier, alloy }, tower.rooms.length);
  }
  tower = T.applyFusions(tower).tower;
  return { name: MONSTER_NAMES[guild], tower, hp: Math.round(playerHp(hour) * diff), ghost: false };
}

function opponentFor(run, omen) {
  const pool = run.ghostPool?.[run.hour];
  if (run.hour >= 5 && pool?.length && run.rng.chance(0.5)) {
    const g = run.rng.pick(pool);
    return { name: 'Geister-Turm', tower: g, hp: Math.round(playerHp(run.hour) * omen.diff), ghost: true };
  }
  return generateMonster(hashSeed(run.seed, omen.id), run.hour, omen.diff);
}

export function resolveHour(run, omen, { record = false, chooseAlloyTarget } = {}) {
  run.gold += omen.gold ?? 0;
  if (omen.fight === false) {
    run.merchant = omen.merchant ?? 0;
    run.fights.push({ hour: run.hour, omen: omen.id, skipped: true });
    return null;
  }
  const opp = opponentFor(run, omen);
  const res = fight(run.tower, playerHp(run.hour), opp.tower, opp.hp, { record });
  const won = res.winner === 'a';
  const entry = {
    hour: run.hour, omen: omen.id, opponent: opp.name, ghost: opp.ghost, won,
    ticks: res.ticks, roomStats: res.roomStats.a, tower: run.tower, oppTower: opp.tower,
    hp: playerHp(run.hour), oppHp: opp.hp, frames: res.frames,
  };
  run.fights.push(entry);
  if (won) {
    run.wins++;
    if (omen.alloy && run.tower.rooms.length) {
      const alloy = run.rng.pick(ALLOY_IDS);
      const idx = chooseAlloyTarget ? chooseAlloyTarget(run, alloy) : run.rng.int(run.tower.rooms.length);
      if (idx != null && idx >= 0) run.tower = T.setRoom(run.tower, idx, { alloy });
      entry.alloy = alloy;
    }
    if (run.hour === HOURS) run.midnight = true;
  } else {
    run.lives--;
    if (run.lives <= 0) run.over = true;
  }
  if (run.hour >= HOURS) run.over = true;
  return entry;
}

export function recordGhost(run) {
  if (!run.ghostPool) return;
  const list = (run.ghostPool[run.hour] ??= []);
  list.push(run.tower);
  if (list.length > 150) list.shift();
}

/** Spielt einen kompletten Run mit einem Bot. */
export function playRun(seed, bot, opts = {}) {
  const run = createRun(seed, opts);
  while (!run.over) {
    startHour(run);
    bot.shop(run);
    if (bot.contributesGhosts) recordGhost(run);
    const omen = bot.chooseOmen(run, omensFor(run));
    resolveHour(run, omen, { record: opts.record, chooseAlloyTarget: bot.chooseAlloyTarget?.bind(bot) });
  }
  return run;
}
