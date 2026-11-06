// Immutable tower operations: insert, remove, move, fuse. Index 0 is the foundation.
import { ROOMS, FUSIONS } from '../content.ts';
import type { Tower, TowerRoom } from './combat.ts';

export type { Tower, TowerRoom };

export const BASE_FLOORS = 8;

export interface FullTower extends Tower {
  maxFloors: number;
}

export function emptyTower(maxFloors = BASE_FLOORS): FullTower {
  return { rooms: [], maxFloors };
}

export const floorsUsed = (t: Tower): number => t.rooms.reduce((s, r) => s + ROOMS[r.id].height, 0);
export const fits = (t: FullTower, id: string): boolean => floorsUsed(t) + ROOMS[id].height <= t.maxFloors;

export function insert<T extends Tower>(t: T, room: TowerRoom, pos: number): T {
  const rooms = t.rooms.slice();
  rooms.splice(Math.max(0, Math.min(pos, rooms.length)), 0, { ...room });
  return { ...t, rooms };
}

export function remove<T extends Tower>(t: T, idx: number): T {
  const rooms = t.rooms.slice();
  rooms.splice(idx, 1);
  return { ...t, rooms };
}

export function move<T extends Tower>(t: T, from: number, to: number): T {
  const rooms = t.rooms.slice();
  const [r] = rooms.splice(from, 1);
  rooms.splice(to, 0, r);
  return { ...t, rooms };
}

export function setRoom<T extends Tower>(t: T, idx: number, patch: Partial<TowerRoom>): T {
  const rooms = t.rooms.slice();
  rooms[idx] = { ...rooms[idx], ...patch };
  return { ...t, rooms };
}

/**
 * Applies the hidden fusion recipes until none matches. A recipe matches consecutive rooms
 * from the foundation upwards. The fused room takes the highest tier and the first alloy.
 */
export function applyFusions<T extends Tower>(t: T): { tower: T; fused: string[] } {
  let rooms = t.rooms;
  const fused: string[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (const f of FUSIONS) {
      const L = f.pattern.length;
      for (let i = 0; i + L <= rooms.length; i++) {
        let ok = true;
        for (let k = 0; k < L; k++) {
          if (rooms[i + k].id !== f.pattern[k]) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const parts = rooms.slice(i, i + L);
        const merged: TowerRoom = {
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

export function describe(t: Tower): string {
  return t.rooms
    .map((r) => `${ROOMS[r.id].name}${r.tier ? ['', '²', '³', '⁴'][r.tier] : ''}${r.alloy ? `[${r.alloy}]` : ''}`)
    .join(' → ');
}
