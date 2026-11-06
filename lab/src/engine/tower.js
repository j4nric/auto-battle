// Turm-Operationen (unveränderlich): Einfügen, Entfernen, Verschieben, Verschmelzen.
import { ROOMS, FUSIONS } from '../content/rooms.js';

export const BASE_FLOORS = 8;

export function emptyTower(maxFloors = BASE_FLOORS) {
  return { rooms: [], maxFloors };
}

export const floorsUsed = (t) => t.rooms.reduce((s, r) => s + ROOMS[r.id].height, 0);
export const fits = (t, id) => floorsUsed(t) + ROOMS[id].height <= t.maxFloors;

export function insert(t, room, pos) {
  const rooms = t.rooms.slice();
  rooms.splice(Math.max(0, Math.min(pos, rooms.length)), 0, { ...room });
  return { ...t, rooms };
}

export function remove(t, idx) {
  const rooms = t.rooms.slice();
  rooms.splice(idx, 1);
  return { ...t, rooms };
}

export function move(t, from, to) {
  const rooms = t.rooms.slice();
  const [r] = rooms.splice(from, 1);
  rooms.splice(to, 0, r);
  return { ...t, rooms };
}

export function setRoom(t, idx, patch) {
  const rooms = t.rooms.slice();
  rooms[idx] = { ...rooms[idx], ...patch };
  return { ...t, rooms };
}

/** Wendet versteckte Verschmelzungs-Rezepte an, bis keines mehr greift. */
export function applyFusions(t) {
  let rooms = t.rooms;
  const fused = [];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (const f of FUSIONS) {
      const L = f.pattern.length;
      for (let i = 0; i + L <= rooms.length; i++) {
        let ok = true;
        for (let k = 0; k < L; k++) if (rooms[i + k].id !== f.pattern[k]) { ok = false; break; }
        if (!ok) continue;
        const parts = rooms.slice(i, i + L);
        const merged = {
          id: f.result,
          tier: Math.max(...parts.map((p) => p.tier ?? 0)),
          alloy: parts.find((p) => p.alloy)?.alloy ?? null,
        };
        rooms = [...rooms.slice(0, i), merged, ...rooms.slice(i + L)];
        fused.push(f.result);
        changed = true;
        break outer;
      }
    }
  }
  return { tower: fused.length ? { ...t, rooms } : t, fused };
}

export function describe(t) {
  return t.rooms
    .map((r) => `${ROOMS[r.id].name}${r.tier ? ['', '²', '³', '⁴'][r.tier] : ''}${r.alloy ? `[${r.alloy}]` : ''}`)
    .join(' → ');
}
