// Grid tower operations (raster prototype, ADR 0008). Towers are immutable values.
import type { GridRoom, GridTower } from '../engine/combat.ts';
import { RASTER_ROOMS, RASTER_FUSIONS, cellsOf } from './content.ts';

export const WIDTH = 3;
/** Rows by hour: the tower grows from 3x3 by one row every two hours up to 3x8. */
export const rowsFor = (hour: number): number => Math.min(8, 3 + Math.floor((Math.max(1, hour) - 1) / 2));

export function emptyGrid(rows: number): GridTower {
  return { kind: 'grid', width: WIDTH, rows, rooms: [] };
}

/** Absolute cells of one placed room. */
export function cellsOfRoom(r: GridRoom): Array<[number, number]> {
  return cellsOf(RASTER_ROOMS[r.id], r.rot ?? 0).map(([x, y]) => [r.x + x, r.y + y] as [number, number]);
}

export const area = (id: string): number => cellsOf(RASTER_ROOMS[id]).length;
export const usedCells = (t: GridTower): number => t.rooms.reduce((s, r) => s + area(r.id), 0);

/** Occupancy map: room index per cell, -1 when empty. Skips room `skip`. */
function occupancy(t: GridTower, skip = -1): number[] {
  const occ = new Array(t.width * t.rows).fill(-1);
  t.rooms.forEach((r, i) => {
    if (i === skip) return;
    for (const [x, y] of cellsOfRoom(r)) occ[y * t.width + x] = i;
  });
  return occ;
}

/** Whether room `id` fits at (x, y, rot), ignoring room `skip` (for moves). */
export function canPlace(t: GridTower, id: string, x: number, y: number, rot: number, skip = -1): boolean {
  const occ = occupancy(t, skip);
  for (const [cx, cy] of cellsOf(RASTER_ROOMS[id], rot)) {
    const ax = x + cx;
    const ay = y + cy;
    if (ax < 0 || ay < 0 || ax >= t.width || ay >= t.rows || occ[ay * t.width + ax] >= 0) return false;
  }
  return true;
}

/** Distinct rotations of a room (a 1x1 room has one, a bar two, an L four). */
export function rotations(id: string): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (let rot = 0; rot < 4; rot++) {
    const key = JSON.stringify(cellsOf(RASTER_ROOMS[id], rot));
    if (!seen.has(key)) {
      seen.add(key);
      out.push(rot);
    }
  }
  return out;
}

export interface Spot {
  x: number;
  y: number;
  rot: number;
}

/** Every valid placement of a room. */
export function allSpots(t: GridTower, id: string, skip = -1): Spot[] {
  const out: Spot[] = [];
  for (const rot of rotations(id)) {
    for (let y = 0; y < t.rows; y++) for (let x = 0; x < t.width; x++) if (canPlace(t, id, x, y, rot, skip)) out.push({ x, y, rot });
  }
  return out;
}

/** Placements as low as possible per column and rotation (like a falling Tetris piece). */
export function dropSpots(t: GridTower, id: string, skip = -1): Spot[] {
  const out: Spot[] = [];
  for (const rot of rotations(id)) {
    for (let x = 0; x < t.width; x++) {
      for (let y = 0; y < t.rows; y++) {
        if (canPlace(t, id, x, y, rot, skip)) {
          out.push({ x, y, rot });
          break;
        }
      }
    }
  }
  return out;
}

export function place(t: GridTower, room: GridRoom): GridTower {
  return { ...t, rooms: [...t.rooms, { ...room }] };
}

export function remove(t: GridTower, idx: number): GridTower {
  return { ...t, rooms: t.rooms.filter((_, i) => i !== idx) };
}

export function moveRoom(t: GridTower, idx: number, s: Spot): GridTower {
  return { ...t, rooms: t.rooms.map((r, i) => (i === idx ? { ...r, x: s.x, y: s.y, rot: s.rot } : r)) };
}

export function setRoom(t: GridTower, idx: number, patch: Partial<GridRoom>): GridTower {
  return { ...t, rooms: t.rooms.map((r, i) => (i === idx ? { ...r, ...patch } : r)) };
}

/**
 * Pattern recipes (see PatternFusion): when every part of a recipe sits on exactly its cells,
 * the parts fuse into the result at the first part's first cell, with the highest tier and the
 * first alloy in part order. Recipes and rooms are tried in order, until none matches.
 */
export function applyFusions(t: GridTower): { tower: GridTower; fused: string[] } {
  let rooms = t.rooms;
  const fused: string[] = [];
  const key = (cells: Array<[number, number]>) => cells.map(([x, y]) => `${x},${y}`).sort().join(';');
  for (let changed = true; changed; ) {
    changed = false;
    outer: for (const f of RASTER_FUSIONS) {
      for (let a = 0; a < rooms.length; a++) {
        if (rooms[a].id !== f.parts[0].id) continue;
        const [ax, ay] = cellsOfRoom(rooms[a])[0];
        const used: number[] = [];
        for (const part of f.parts) {
          const want = key(part.cells.map(([x, y]) => [ax + x, ay + y] as [number, number]));
          const j = rooms.findIndex((r, k) => !used.includes(k) && r.id === part.id && key(cellsOfRoom(r)) === want);
          if (j < 0) break;
          used.push(j);
        }
        if (used.length !== f.parts.length) continue;
        const parts = used.map((k) => rooms[k]);
        const merged: GridRoom = {
          id: f.result,
          tier: Math.max(...parts.map((p) => p.tier ?? 0)),
          alloy: parts.find((p) => p.alloy)?.alloy ?? null,
          x: ax, y: ay, rot: 0,
        };
        rooms = [...rooms.filter((_, k) => !used.includes(k)), merged];
        fused.push(f.result);
        changed = true;
        break outer;
      }
    }
  }
  return { tower: fused.length ? { ...t, rooms } : t, fused };
}

/** Text picture of the tower, top row first, for reports. */
export function picture(t: GridTower): string {
  const occ = occupancy(t);
  const lines: string[] = [];
  for (let y = t.rows - 1; y >= 0; y--) {
    const row: string[] = [];
    for (let x = 0; x < t.width; x++) {
      const i = occ[y * t.width + x];
      row.push(i < 0 ? '·'.padEnd(12) : `${RASTER_ROOMS[t.rooms[i].id].name.slice(0, 9)}${t.rooms[i].tier ? ['', '²', '³', '⁴'][t.rooms[i].tier!] : ''}`.padEnd(12));
    }
    lines.push(row.join(' '));
  }
  return lines.join('\n');
}
